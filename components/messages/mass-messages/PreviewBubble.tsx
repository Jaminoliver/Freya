"use client";

import { Lock } from "lucide-react";
import type { VaultItem } from "@/components/vault/VaultPicker";

export type VaultItemWithPreview = VaultItem & { objectURL?: string };

interface PreviewBubbleProps {
  text:     string;
  media:    VaultItemWithPreview[];
  isPPV:    boolean;
  ppvPrice: string;
}

export function PreviewBubble({ text, media, isPPV, ppvPrice }: PreviewBubbleProps) {
  const hasMedia = media.length > 0;
  const showPPV  = isPPV && hasMedia;

  return (
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <div
        style={{
          maxWidth:        "min(75%, 280px)",
          backgroundColor: "#8B5CF6",
          borderRadius:    "18px 18px 4px 18px",
          padding:         hasMedia ? "4px" : "10px 14px",
          color:           "#FFFFFF",
          fontSize:        "14px",
          lineHeight:      1.4,
          overflow:        "hidden",
        }}
      >
        {hasMedia && (
          <div
            style={{
              display:             "grid",
              gridTemplateColumns: media.length > 1 ? "1fr 1fr" : "1fr",
              gap:                 "2px",
              borderRadius:        "14px",
              overflow:            "hidden",
              marginBottom:        text.trim() ? "4px" : 0,
            }}
          >
            {media.slice(0, 4).map((m) => {
              // Use objectURL for instant local preview, fall back to remote URL
              const src = m.objectURL ?? m.thumbnail_url ?? m.file_url ?? null;
              return (
                <div
                  key={Number(m.id)}
                  style={{
                    position:        "relative",
                    aspectRatio:     "1 / 1",
                    backgroundColor: "#0D0D18",
                  }}
                >
                  {showPPV && (
                    <div
                      style={{
                        position:            "absolute",
                        inset:               0,
                        backdropFilter:      "blur(20px)",
                        WebkitBackdropFilter:"blur(20px)",
                        backgroundColor:     "rgba(0,0,0,0.5)",
                        zIndex:              1,
                        display:             "flex",
                        alignItems:          "center",
                        justifyContent:      "center",
                        flexDirection:       "column",
                        gap:                 "4px",
                      }}
                    >
                      <Lock size={20} color="#FFF" strokeWidth={2} />
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#FFF" }}>
                        ₦{ppvPrice || "—"}
                      </span>
                    </div>
                  )}
                  {src && (
                    <img
                      src={src}
                      alt=""
                      style={{
                        width:      "100%",
                        height:     "100%",
                        objectFit:  "cover",
                        display:    "block",
                        filter:     showPPV ? "blur(8px)" : "none",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {text.trim() && (
          <div style={{ padding: hasMedia ? "8px 10px 4px" : 0, whiteSpace: "pre-wrap" }}>
            {text}
          </div>
        )}

        {!hasMedia && !text.trim() && (
          <span style={{ color: "rgba(255,255,255,0.6)", fontStyle: "italic" }}>
            Empty message
          </span>
        )}
      </div>
    </div>
  );
}