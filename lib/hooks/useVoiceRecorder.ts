"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type RecorderState = "idle" | "requesting" | "recording" | "denied" | "error";

export interface RecordResult {
  blob:     Blob;
  duration: number;
  peaks:    number[];
  mimeType: string;
}

interface Options {
  maxDuration?: number;                          // seconds, default 120
  onStop?:      (result: RecordResult) => void;  // fired on stop or auto-stop (not on cancel)
}

const PREFERRED_FORMATS = [
  "audio/mp4",
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
];

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  return PREFERRED_FORMATS.find((f) => {
    try { return MediaRecorder.isTypeSupported(f); } catch { return false; }
  }) || "";
}

function downsamplePeaks(samples: number[], target = 50): number[] {
  if (samples.length === 0) return new Array(target).fill(0);
  if (samples.length <= target) {
    const pad = new Array(target - samples.length).fill(samples[samples.length - 1] ?? 0);
    return [...samples, ...pad];
  }
  const result: number[] = [];
  const bucketSize = samples.length / target;
  for (let i = 0; i < target; i++) {
    const start = Math.floor(i * bucketSize);
    const end   = Math.floor((i + 1) * bucketSize);
    let max = 0;
    for (let j = start; j < end; j++) {
      if (samples[j] > max) max = samples[j];
    }
    result.push(max);
  }
  return result;
}

export function useVoiceRecorder(options: Options = {}) {
  const { maxDuration = 120, onStop } = options;

  const [state,    setState]    = useState<RecorderState>("idle");
  const [duration, setDuration] = useState(0);
  const [level,    setLevel]    = useState(0);
  const [error,    setError]    = useState<string | null>(null);

  const streamRef         = useRef<MediaStream | null>(null);
  const recorderRef       = useRef<MediaRecorder | null>(null);
  const audioCtxRef       = useRef<AudioContext | null>(null);
  const analyserRef       = useRef<AnalyserNode | null>(null);
  const chunksRef         = useRef<BlobPart[]>([]);
  const peakSamplesRef    = useRef<number[]>([]);
  const startTimeRef      = useRef<number>(0);
  const rafRef            = useRef<number | null>(null);
  const sampleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mimeTypeRef       = useRef<string>("");
  const cancelledRef      = useRef<boolean>(false);
  const onStopRef         = useRef(onStop);
  onStopRef.current = onStop;

  const cleanup = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    if (sampleIntervalRef.current) clearInterval(sampleIntervalRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {});
    }
    streamRef.current         = null;
    recorderRef.current       = null;
    audioCtxRef.current       = null;
    analyserRef.current       = null;
    rafRef.current            = null;
    sampleIntervalRef.current = null;
    setLevel(0);
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const start = useCallback(async () => {
    setError(null);
    cancelledRef.current = false;
    setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      mimeTypeRef.current = mimeType;
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorderRef.current    = recorder;
      chunksRef.current      = [];
      peakSamplesRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const wasCancelled = cancelledRef.current;
        const blob  = new Blob(chunksRef.current, { type: mimeTypeRef.current || "audio/webm" });
        const dur   = (Date.now() - startTimeRef.current) / 1000;
        const peaks = downsamplePeaks(peakSamplesRef.current, 50);
        cleanup();
        chunksRef.current = [];
        if (!wasCancelled && blob.size > 0) {
          onStopRef.current?.({
            blob,
            duration: Math.max(0, dur),
            peaks,
            mimeType: mimeTypeRef.current || "audio/webm",
          });
        }
        setState("idle");
      };

      // Web Audio for live level + peaks
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;
      const source   = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length / 255;
        setLevel(avg);

        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setDuration(elapsed);

        if (elapsed >= maxDuration) {
          try { recorderRef.current?.stop(); } catch {}
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };

      // Peak sampling for waveform — every 50ms
      sampleIntervalRef.current = setInterval(() => {
        if (!analyserRef.current) return;
        const buf = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(buf);
        let max = 0;
        for (let i = 0; i < buf.length; i++) if (buf[i] > max) max = buf[i];
        peakSamplesRef.current.push(max / 255);
      }, 50);

      startTimeRef.current = Date.now();
      recorder.start();
      setState("recording");
      setDuration(0);
      rafRef.current = requestAnimationFrame(tick);
    } catch (err: any) {
      cleanup();
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setState("denied");
        setError("Microphone permission denied");
      } else {
        setState("error");
        setError(err?.message || "Failed to start recording");
      }
    }
  }, [cleanup, maxDuration]);

  const stop = useCallback(() => {
    cancelledRef.current = false;
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      try { rec.stop(); } catch {}
    }
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      try { rec.stop(); } catch {}
    }
    cleanup();
    setState("idle");
    setDuration(0);
    chunksRef.current = [];
  }, [cleanup]);

  return {
    state,
    duration,
    level,
    error,
    start,
    stop,
    cancel,
  };
}