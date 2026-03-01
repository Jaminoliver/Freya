"use client";

import * as React from "react";

interface HeartBurst {
  id: number;
  x: number;
  y: number;
}

interface DoubleTapLikeProps {
  onSingleTap?: () => void;
  onDoubleTap:  () => void;
  children:     React.ReactNode;
  style?:       React.CSSProperties;
}

export default function DoubleTapLike({ onSingleTap, onDoubleTap, children, style }: DoubleTapLikeProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const lastTap      = React.useRef<number>(0);
  const timer        = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef        = React.useRef(0);
  // Tracks whether last interaction was touch, to suppress synthetic mouse click
  const touchActive  = React.useRef(false);
  const [bursts, setBursts] = React.useState<HeartBurst[]>([]);

  const triggerHeart = React.useCallback((x: number, y: number) => {
    const id = ++idRef.current;
    setBursts((prev) => [...prev, { id, x, y }]);
    setTimeout(() => setBursts((prev) => prev.filter((b) => b.id !== id)), 900);
    onDoubleTap();
  }, [onDoubleTap]);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleTouchEnd = (e: TouchEvent) => {
      touchActive.current = true;
      // Reset after synthetic click window has passed
      setTimeout(() => { touchActive.current = false; }, 500);

      const now  = Date.now();
      const diff = now - lastTap.current;
      lastTap.current = now;

      if (diff < 300 && diff > 0) {
        // Double tap — prevent synthetic click from also firing
        e.preventDefault();
        e.stopPropagation();
        if (timer.current) { clearTimeout(timer.current); timer.current = null; }
        const touch = e.changedTouches[0];
        const rect  = el.getBoundingClientRect();
        triggerHeart(touch.clientX - rect.left, touch.clientY - rect.top);
      } else {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          timer.current = null;
          onSingleTap?.();
        }, 300);
      }
    };

    // passive: false required so e.preventDefault() is respected
    el.addEventListener("touchend", handleTouchEnd, { passive: false });
    return () => el.removeEventListener("touchend", handleTouchEnd);
  }, [triggerHeart, onSingleTap]);

  // Desktop mouse double-click fallback
  const lastClickTime = React.useRef<number>(0);
  const clickTimer    = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = (e: React.MouseEvent) => {
    // Always suppress synthetic mouse clicks generated after touchend
    if (touchActive.current) return;

    const now  = Date.now();
    const diff = now - lastClickTime.current;
    lastClickTime.current = now;

    if (diff < 300 && diff > 0) {
      e.preventDefault();
      e.stopPropagation();
      if (clickTimer.current) { clearTimeout(clickTimer.current); clickTimer.current = null; }
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      triggerHeart(e.clientX - rect.left, e.clientY - rect.top);
    } else {
      if (clickTimer.current) clearTimeout(clickTimer.current);
      clickTimer.current = setTimeout(() => {
        clickTimer.current = null;
        onSingleTap?.();
      }, 300);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        // Eliminates 300ms tap delay + prevents double-tap zoom on this element.
        // This stops the browser from generating synthetic mouse events after touchend,
        // which was causing lightbox to open on double-tap.
        touchAction: "manipulation",
        ...style,
      }}
      onClick={handleClick}
    >
      {children}

      {bursts.map((burst) => (
        <div
          key={burst.id}
          style={{
            position:      "absolute",
            left:          burst.x,
            top:           burst.y,
            transform:     "translate(-50%, -50%)",
            pointerEvents: "none",
            zIndex:        99,
            fontSize:      "64px",
            animation:     "heartBurst 0.9s ease-out forwards",
          }}
        >
          ❤️
        </div>
      ))}

      <style>{`
        @keyframes heartBurst {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.2); }
          20%  { opacity: 1; transform: translate(-50%, -50%) scale(1.3); }
          60%  { opacity: 1; transform: translate(-50%, -50%) scale(1.0); }
          100% { opacity: 0; transform: translate(-50%, -90%) scale(1.1); }
        }
      `}</style>
    </div>
  );
}