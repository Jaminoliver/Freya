"use client";

import { useEffect, useRef, useState } from "react";

const segments = [
  { label: "Subscriptions", value: 58, color: "#a855f7" },
  { label: "PPV", value: 24, color: "#3b82f6" },
  { label: "Tips", value: 12, color: "#ec4899" },
  { label: "Live", value: 6, color: "#f59e0b" },
];

export default function RevenueBreakdownChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    let start: number | null = null;
    const duration = 1000;
    function animate(ts: number) {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setProgress(eased);
      if (p < 1) animRef.current = requestAnimationFrame(animate);
    }
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
canvas.width = 200 * dpr;
canvas.height = 200 * dpr;
ctx.scale(dpr, dpr);
const W = 200;
const H = 200;
    const cx = W / 2;
    const cy = H / 2;
    const outerR = Math.min(W, H) / 2 - 8;
    const innerR = outerR * 0.62;

    ctx.clearRect(0, 0, W, H);

    let startAngle = -Math.PI / 2;
    const total = segments.reduce((s, g) => s + g.value, 0);

    segments.forEach((seg, i) => {
      const sweep = (seg.value / total) * 2 * Math.PI * progress;
      const isHov = hovered === i;
      const r = isHov ? outerR + 6 : outerR;
      const gap = 0.025;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle + gap, startAngle + sweep - gap);
      ctx.arc(cx, cy, innerR, startAngle + sweep - gap, startAngle + gap, true);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.globalAlpha = isHov ? 1 : 0.9;
      ctx.fill();
      ctx.globalAlpha = 1;

      startAngle += sweep;
    });

    // Center text
    if (progress > 0.8) {
      ctx.fillStyle = "#0f0e1a";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("$284K", cx, cy - 8);
      ctx.fillStyle = "#9b9aaa";
      ctx.font = "11px sans-serif";
      ctx.fillText("Total Revenue", cx, cy + 12);
    }
  }, [progress, hovered]);

  return (
    <div className="chart-card">
      <div className="chart-header">
        <span className="chart-title">Revenue Breakdown</span>
      </div>

      <div className="chart-body">
        <canvas
          ref={canvasRef}
          width={200}
          height={200}
          style={{ width: "180px", height: "180px", flex: "0 0 180px", cursor: "pointer" }}
          role="img"
          aria-label="Revenue breakdown donut chart"
          onMouseMove={(e) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (canvas.width / rect.width);
            const y = (e.clientY - rect.top) * (canvas.height / rect.height);
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
            const outerR = Math.min(canvas.width, canvas.height) / 2 - 8;
            const innerR = outerR * 0.62;
            if (dist < innerR || dist > outerR + 10) { setHovered(null); return; }
            let angle = Math.atan2(y - cy, x - cx) + Math.PI / 2;
            if (angle < 0) angle += 2 * Math.PI;
            let acc = 0;
            const total = segments.reduce((s, g) => s + g.value, 0);
            for (let i = 0; i < segments.length; i++) {
              acc += (segments[i].value / total) * 2 * Math.PI;
              if (angle <= acc) { setHovered(i); return; }
            }
            setHovered(null);
          }}
          onMouseLeave={() => setHovered(null)}
        />

        <div className="legend">
          {segments.map((seg, i) => (
            <div
              key={seg.label}
              className={`legend-item ${hovered === i ? "hov" : ""}`}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <span className="legend-dot" style={{ background: seg.color }} />
              <span className="legend-label">{seg.label}</span>
              <span className="legend-val">{seg.value}%</span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .chart-card {
          background: #fff;
          border: 1px solid #eeecf8;
          border-radius: 16px;
          padding: 20px;
          min-width: 280px;
        }
        .chart-header { margin-bottom: 16px; }
        .chart-title {
          font-size: 15px;
          font-weight: 600;
          color: #0f0e1a;
        }
        .chart-body {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .legend {
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex: 1;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 7px;
          transition: background 0.15s;
        }
        .legend-item.hov { background: #f9f7ff; }
        .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 3px;
          flex-shrink: 0;
        }
        .legend-label {
          font-size: 13px;
          color: #3d3b52;
          flex: 1;
        }
        .legend-val {
          font-size: 13px;
          font-weight: 600;
          color: #0f0e1a;
        }
      `}</style>
    </div>
  );
}