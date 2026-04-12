"use client";

import React from "react";

const BG_MAP: Record<string, { background: string; color: string }> = {
  dark:   { background: "#0D0D18",                                  color: "#E2E8F0" },
  purple: { background: "linear-gradient(135deg,#1e1b4b,#4c1d95)", color: "#EDE9FE" },
  blue:   { background: "linear-gradient(135deg,#0f172a,#1d4ed8)", color: "#BAE6FD" },
  red:    { background: "linear-gradient(135deg,#1a0000,#7f1d1d)", color: "#FEE2E2" },
  green:  { background: "linear-gradient(135deg,#052e16,#14532d)", color: "#D1FAE5" },
  amber:  { background: "linear-gradient(135deg,#1c1000,#78350f)", color: "#FEF3C7" },
};

const DEFAULT_BG = BG_MAP.dark;

interface Props {
  caption:        string;
  textBackground?: string | null;
}

export function PostTextViewer({ caption, textBackground }: Props) {
  const theme = (textBackground ? BG_MAP[textBackground] : null) ?? DEFAULT_BG;

  return (
    <div
      style={{
        margin:         "0 16px 12px",
        borderRadius:   "14px",
        overflow:       "hidden",
        background:     theme.background,
        minHeight:      "140px",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        padding:        "28px 20px",
      }}
    >
      <p
        style={{
          margin:        0,
          fontSize:      "18px",
          fontWeight:    700,
          lineHeight:    1.45,
          textAlign:     "center",
          letterSpacing: "-0.01em",
          color:         theme.color,
          whiteSpace:    "pre-wrap",
          wordBreak:     "break-word",
          fontFamily:    "'Inter', sans-serif",
        }}
      >
        {caption}
      </p>
    </div>
  );
}

export default PostTextViewer;