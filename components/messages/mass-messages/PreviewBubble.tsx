"use client";

import type { VaultItem } from "@/components/vault/VaultPicker";
import { MediaGrid }      from "@/components/messages/MediaGrid";

export type VaultItemWithPreview = VaultItem & {
  objectURL?:      string;
  uploadProgress?: number;
  isFailed?:       boolean;
};

interface PreviewBubbleProps {
  text:           string;
  media:          VaultItemWithPreview[];
  isPPV:          boolean;
  ppvPrice:       string;
  uploadProgress: number;
  isSending?:     boolean;
  isSent?:        boolean;
}

export function PreviewBubble({ text, media, isPPV, ppvPrice, uploadProgress, isSending: isSendingProp, isSent }: PreviewBubbleProps) {
  const hasMedia  = media.length > 0;
  const isSending = isSendingProp ?? media.some((m) => Number(m.id) < 0);

  const mediaItems = media.map((m) => {
    const isVideo  = m.media_type === "video";
    const thumbUrl = m.thumbnail_url ?? null;
const src      = m.objectURL ?? thumbUrl ?? (!isVideo ? m.file_url : null) ?? "";
return {
  url:  src,
  type: (isVideo && !src ? "video" : "image") as "image" | "video",
};
  });

  return (
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <div
        style={{
          width:           "280px",
          backgroundColor: "#8B5CF6",
          borderRadius:    "18px 18px 4px 18px",
          padding:         hasMedia ? "0" : "10px 14px",
          color:           "#FFFFFF",
          fontSize:        "14px",
          lineHeight:      1.4,
          overflow:        "hidden",
        }}
      >
        {hasMedia && (
          <MediaGrid
            mediaItems={mediaItems}
            isPPV={isPPV}
            price={isPPV && ppvPrice ? Math.round(Number(ppvPrice) * 100) : undefined}
            isUnlocked={true}
            isSending={isSending}
            uploadProgress={uploadProgress}
          />
        )}

        {text.trim() && (
          <div style={{ padding: hasMedia ? "8px 10px 8px" : 0, whiteSpace: "pre-wrap" }}>
            {text}
          </div>
        )}

        {!hasMedia && !text.trim() && (
          <span style={{ color: "rgba(255,255,255,0.6)", fontStyle: "italic" }}>
            Empty message
          </span>
        )}

        {/* Sent status tick */}
        <div style={{
          display:        "flex",
          justifyContent: "flex-end",
          padding:        hasMedia ? "4px 8px 6px" : "4px 0 0",
          gap:            "4px",
          alignItems:     "center",
        }}>
          {isSending && !isSent && (
            <svg width="14" height="14" viewBox="0 0 14 14" style={{ animation: "mmSpin 0.8s linear infinite", opacity: 0.7 }}>
              <circle cx="7" cy="7" r="5.5" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
              <path d="M7 1.5a5.5 5.5 0 0 1 5.5 5.5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
          {isSent && (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 8l4 4 8-8" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}