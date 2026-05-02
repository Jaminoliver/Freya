"use client";

import { useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { UploadJob } from "@/lib/context/StoryUploadContext";
import { useStoryUploadState } from "@/lib/hooks/useStoryUploadState";
import StoryPickPhase    from "@/components/story/upload/StoryPickPhase";
import StoryClipPhase    from "@/components/story/upload/StoryClipPhase";
import StoryPreviewPhase from "@/components/story/upload/StoryPreviewPhase";
import StoryTextPhase    from "@/components/story/upload/StoryTextPhase";

interface StoryUploadModalProps {
  onClose:       () => void;
  onUploadStart: (job: UploadJob) => void;
}

export default function StoryUploadModal({ onClose, onUploadStart }: StoryUploadModalProps) {
  const state = useStoryUploadState({ onClose, onUploadStart });

  // Cross-phase CTA drag refs — live here so the window listener can access
  // whichever phase's card is currently mounted
  const ctaDragRef        = useRef<{ active: boolean; startY: number; startPosY: number }>({ active: false, startY: 0, startPosY: 0.75 });
  const ctaPosRef         = useRef(0.75);
  const ctaCardRefPreview = useRef<HTMLDivElement>(null);
  const ctaCardRefText    = useRef<HTMLDivElement>(null);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Window-level CTA drag listener — needs access to both card refs
  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!ctaDragRef.current.active) return;
      const clientY = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const card    = ctaCardRefPreview.current ?? ctaCardRefText.current;
      if (!card || !card.parentElement) return;
      const parentH = card.parentElement.clientHeight;
      const cardH   = card.offsetHeight;
      const dy      = clientY - ctaDragRef.current.startY;
      const newTop  = Math.max(0, Math.min(parentH - cardH - 80, ctaDragRef.current.startPosY + dy));
      ctaPosRef.current  = (newTop + 72) / parentH;
      card.style.top     = `${newTop}px`;
    };
    const onUp = () => {
      if (!ctaDragRef.current.active) return;
      ctaDragRef.current.active = false;
      state.setCtaPositionForSlide(state.carouselIdx, ctaPosRef.current);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("mouseup",   onUp);
    window.addEventListener("touchend",  onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup",   onUp);
      window.removeEventListener("touchend",  onUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (typeof document === "undefined") return null;

  const { phase } = state;

  return createPortal(
    <>
      <style>{`
        @keyframes sum-in       { from{opacity:0;transform:scale(0.97)} to{opacity:1;transform:scale(1)} }
        @keyframes sum-sheet-in { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes sum-cta-in   { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes sum-sweep    { 0%{left:-80%} 100%{left:130%} }
        @keyframes sb-spin      { to{transform:rotate(360deg)} }
        .sum-wrap { animation: sum-in 0.18s ease forwards; }
        .sum-caption { background:none;border:none;outline:none;width:100%;color:#fff;font-size:14px;font-family:'Inter',sans-serif;text-shadow:0 1px 4px rgba(0,0,0,0.6),0 0px 12px rgba(0,0,0,0.4); }
        .sum-caption::placeholder { color:rgba(255,255,255,0.7);text-shadow:0 1px 4px rgba(0,0,0,0.7); }
        .sum-scrub { cursor:grab; }
        .sum-scrub:active { cursor:grabbing; }
        .sum-thumb-remove { opacity:0;transition:opacity 0.15s; }
        .sum-thumb-wrap:hover .sum-thumb-remove { opacity:1; }
        .sum-pick-btn:hover { background:rgba(255,255,255,0.07) !important; border-color:rgba(255,255,255,0.18) !important; }
        .sum-add-more:hover { border-color:rgba(255,255,255,0.25) !important; background:rgba(255,255,255,0.05) !important; }
      `}</style>

      <div
        onClick={phase === "pick" ? onClose : undefined}
        style={{ position:"fixed", inset:0, zIndex:9998, background:"rgba(0,0,0,0.95)", display:"flex", alignItems:"center", justifyContent:"center" }}
      >
        {phase === "pick" && (
          <StoryPickPhase
            selected={state.selected}
            error={state.error}
            canAddMore={state.canAddMore}
            onClose={onClose}
            handleContinue={state.handleContinue}
            addFiles={state.addFiles}
            removeFile={state.removeFile}
            setPhase={state.setPhase}
            setCtaType={(t) => state.setCtaTypeForSlide(0, t)}
            setCtaMessage={(m) => state.setCtaMessageForSlide(0, m)}
            setTextContent={state.setTextContent}
            setTextBg={state.setTextBg}
          />
        )}

        {phase === "clip" && state.videoEntry && (
          <StoryClipPhase
            videoEntry={state.videoEntry}
            clipStart={state.clipStart}
            setClipStart={state.setClipStart}
            clipEnd={state.clipEnd}
            setClipEnd={state.setClipEnd}
            videoDuration={state.videoDuration}
            thumbnails={state.thumbnails}
            thumbsLoading={state.thumbsLoading}
            setPhase={state.setPhase}
            setCarouselIdx={state.setCarouselIdx}
          />
        )}

        {phase === "preview" && state.selected.length > 0 && (
          <StoryPreviewPhase
            selected={state.selected}
            carouselIdx={state.carouselIdx}
            setCarouselIdx={state.setCarouselIdx}
            getCtaForSlide={state.getCtaForSlide}
            setCtaTypeForSlide={state.setCtaTypeForSlide}
            setCtaMessageForSlide={state.setCtaMessageForSlide}
            setCtaPositionForSlide={state.setCtaPositionForSlide}
            caption={state.caption}
            setCaption={state.setCaption}
            captionFocus={state.captionFocus}
            setCaptionFocus={state.setCaptionFocus}
            isMuted={state.isMuted}
            setIsMuted={state.setIsMuted}
            toolbarOpen={state.toolbarOpen}
            setToolbarOpen={state.setToolbarOpen}
            clipStart={state.clipStart}
            clipEnd={state.clipEnd}
            setPhase={state.setPhase}
            handleSend={state.handleSend}
            ctaDragRef={ctaDragRef}
            ctaPosRef={ctaPosRef}
            ctaCardRef={ctaCardRefPreview}
          />
        )}

        {phase === "text" && (
          <StoryTextPhase
            getCtaForSlide={state.getCtaForSlide}
            setCtaTypeForSlide={state.setCtaTypeForSlide}
            setCtaMessageForSlide={state.setCtaMessageForSlide}
            setCtaPositionForSlide={state.setCtaPositionForSlide}
            textContent={state.textContent}
            setTextContent={state.setTextContent}
            textBg={state.textBg}
            setTextBg={state.setTextBg}
            textPosting={state.textPosting}
            textPostErr={state.textPostErr}
            setPhase={state.setPhase}
            handleSendText={state.handleSendText}
            ctaDragRef={ctaDragRef}
            ctaPosRef={ctaPosRef}
            ctaCardRef={ctaCardRefText}
          />
        )}
      </div>
    </>,
    document.body,
  );
}