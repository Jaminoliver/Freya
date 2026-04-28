"use client";

import * as React from "react";

interface VisibilityGateProps {
  /** Aspect ratio for the placeholder (e.g. 1, 0.8, 1.91). Prevents layout shift. */
  aspectRatio?: number;
  /** Maximum height for the placeholder. */
  maxHeight?:   string;
  /** If true, mount immediately without gating. Use for above-the-fold posts. */
  eager?:       boolean;
  /** Distance in viewports to start mounting before entering view. Default 1.5. */
  rootMarginVH?: number;
  /** Children render only after the gate opens. */
  children:     React.ReactNode;
  /** Optional placeholder content (e.g. blurhash). Shown until gate opens. */
  placeholder?: React.ReactNode;
}

/**
 * Mounts children only when the element is within `rootMarginVH` viewports
 * of the visible area. Once mounted, stays mounted (no unmount on scroll-away)
 * so videos/images don't re-fetch when scrolled back to.
 */
export default function VisibilityGate({
  aspectRatio  = 1,
  maxHeight    = "85svh",
  eager        = false,
  rootMarginVH = 1.5,
  children,
  placeholder,
}: VisibilityGateProps) {
  const [mounted, setMounted] = React.useState(eager);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (mounted) return;
    const el = ref.current;
    if (!el) return;

    const margin = `${Math.round(rootMarginVH * 100)}%`;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          console.log(`%c[VisibilityGate] 🟢 MOUNT`, "color: #10B981; font-weight: bold", { rootMargin: margin });
          setMounted(true);
          observer.disconnect();
        }
      },
      { rootMargin: `${margin} 0px ${margin} 0px` }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [mounted, rootMarginVH]);

  React.useEffect(() => {
    if (eager) {
      console.log(`%c[VisibilityGate] ⚡ EAGER (mounted immediately)`, "color: #F59E0B; font-weight: bold");
    } else {
      console.log(`%c[VisibilityGate] ⏸  GATED (placeholder shown)`, "color: #6B6B8A");
    }
  }, [eager]);

  if (mounted) return <>{children}</>;

  return (
    <div
      ref={ref}
      style={{
        width:           "100%",
        aspectRatio:     String(aspectRatio),
        maxHeight,
        backgroundColor: "#0A0A0F",
        position:        "relative",
        overflow:        "hidden",
      }}
    >
      {placeholder}
    </div>
  );
}