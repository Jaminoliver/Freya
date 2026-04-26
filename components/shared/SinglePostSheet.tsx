"use client";

import { useEffect, useRef, useState } from "react";
import PostView from "@/components/shared/PostView";

interface SinglePostSheetProps {
  postId:          string | null;
  sourceIsMessage: boolean;
  onClose:         () => void;
}

export default function SinglePostSheet({ postId, sourceIsMessage, onClose }: SinglePostSheetProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState<{ left: number; right: number }>({ left: 0, right: 0 });

  useEffect(() => {
    if (!postId) {
      document.body.style.overflow = "";
      return;
    }

    const main = document.querySelector("main");
    if (main) {
      const rect = main.getBoundingClientRect();
      setBounds({ left: rect.left, right: window.innerWidth - rect.right });
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [postId]);

  if (!postId) return null;

  return (
    <>
      <style>{`
        @keyframes sheetSlideIn {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        .single-post-sheet::-webkit-scrollbar { display: none; }
      `}</style>

      <div
        onClick={onClose}
        style={{
          position:        "fixed",
          top:             0,
          bottom:          0,
          left:            `${bounds.left}px`,
          right:           `${bounds.right}px`,
          zIndex:          300,
          backgroundColor: "rgba(0,0,0,0.4)",
        }}
      />

      <div
        ref={scrollRef}
        className="single-post-sheet"
        style={{
          position:        "fixed",
          top:             0,
          bottom:          0,
          left:            `${bounds.left}px`,
          right:           `${bounds.right}px`,
          zIndex:          301,
          backgroundColor: "#0A0A0F",
          overflowY:       "auto",
          overflowX:       "hidden",
          scrollbarWidth:  "none",
          WebkitOverflowScrolling: "touch",
          animation:       "sheetSlideIn 0.28s cubic-bezier(0.32, 0.72, 0, 1) forwards",
        } as React.CSSProperties}
      >
        <PostView
          postId={postId}
          sourceIsMessage={sourceIsMessage}
          onBack={onClose}
          scrollRef={scrollRef}
        />
      </div>
    </>
  );
}