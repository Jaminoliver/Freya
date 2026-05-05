// components/messages/VoiceRecorder.tsx
"use client";

import { useState, useEffect } from "react";
import { Mic } from "lucide-react";
import { VoiceRecorderMobile }  from "@/components/messages/VoiceRecorderMobile";
import { VoiceRecorderDesktop } from "@/components/messages/VoiceRecorderDesktop";
import type { RecordResult } from "@/lib/hooks/useVoiceRecorder";

interface Props {
  onSendVoice:             (result: RecordResult) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
  disabled?:               boolean;
}

export function VoiceRecorder({ onSendVoice, onRecordingStateChange, disabled }: Props) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const check = () => {
      const touch = typeof window !== "undefined" && (("ontouchstart" in window) || navigator.maxTouchPoints > 0);
      const narrow = typeof window !== "undefined" && window.innerWidth < 768;
      setIsMobile(touch && narrow);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // SSR / pre-mount placeholder — neutral mic button so layout doesn't shift
  if (isMobile === null) {
    return (
      <button
        disabled
        style={{
          background:     "none",
          border:         "none",
          cursor:         "default",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          padding:        "8px",
          borderRadius:   "8px",
          color:          "#4A4A6A",
        }}
      >
        <Mic size={20} strokeWidth={1.8} />
      </button>
    );
  }

  return isMobile
    ? <VoiceRecorderMobile  onSendVoice={onSendVoice} onRecordingStateChange={onRecordingStateChange} disabled={disabled} />
    : <VoiceRecorderDesktop onSendVoice={onSendVoice} onRecordingStateChange={onRecordingStateChange} disabled={disabled} />;
}