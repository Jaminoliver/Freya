"use client";

import { useEffect, useRef, useState } from "react";

const segments = [
  { label: "Fans",     value: 95.8, count: "136,680", color: "#a855f7" },
  { label: "Creators", value: 4.2,  count: "5,991",   color: "#10b981" },
];

export default function CreatorFanRatioChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    let start: number | null = null;
    function animate(ts: number) {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 1000, 1);
      setProgress(1 - Math.pow(1 - p, 3));
      if (p < 1) animRef.current = requestAnimationFrame(animate);
    }
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 200 * dpr; canvas.height = 200 * dpr;
    ctx.scale(dpr, dpr);
    const W = 200, H = 200, cx = W / 2, cy = H / 2;
    const outerR = Math.min(W, H) / 2 - 8, innerR = outerR * 0.6;
    ctx.clearRect(0, 0, W, H);
    let startAngle = -Math.PI / 2;
    const total = segments.reduce((s, g) => s + g.value, 0);
    segments.forEach((seg, i) => {
      const sweep = (seg.value / total) * 2 * Math.PI * progress;
      const isHov = hovered === i;
      const r = isHov ? outerR + 6 : outerR;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle + 0.025, startAngle + sweep - 0.025);
      ctx.arc(cx, cy, innerR, startAngle + sweep - 0.025, startAngle + 0.025, true);
      ctx.closePath(); ctx.fillStyle = seg.color;
      ctx.globalAlpha = isHov ? 1 : 0.9; ctx.fill(); ctx.globalAlpha = 1;
      startAngle += sweep;
    });
    if (progress > 0.8) {
      ctx.fillStyle = "#0f0e1a"; ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("142K", cx, cy - 8);
      ctx.fillStyle = "#9b9aaa"; ctx.font = "11px sans-serif";
      ctx.fillText("Total Users", cx, cy + 12);
    }
  }, [progress, hovered]);

  return (
    <div className="card">
      <div className="card-title">Creator vs Fan Ratio</div>
      <div className="card-body">
        <canvas
          ref={canvasRef}
          style={{ width: "170px", height: "170px", flex: "0 0 170px", cursor: "pointer" }}
          onMouseMove={(e) => {
            const canvas = canvasRef.current; if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (canvas.width / rect.width);
            const y = (e.clientY - rect.top) * (canvas.height / rect.height);
            const cx = canvas.width / 2, cy = canvas.height / 2;
            const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
            const outerR = Math.min(canvas.width, canvas.height) / 2 - 8;
            const innerR = outerR * 0.6;
            if (dist < innerR || dist > outerR + 10) { setHovered(null); return; }
            let angle = Math.atan2(y - cy, x - cx) + Math.PI / 2;
            if (angle < 0) angle += 2 * Math.PI;
            let acc = 0;
            for (let i = 0; i < segments.length; i++) {
              acc += (segments[i].value / 100) * 2 * Math.PI;
              if (angle <= acc) { setHovered(i); return; }
            }
            setHovered(null);
          }}
          onMouseLeave={() => setHovered(null)}
        />
        <div className="legend">
          {segments.map((seg, i) => (
            <div key={seg.label} className={`leg-item ${hovered === i ? "hov" : ""}`}
              onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
              <span className="leg-dot" style={{ background: seg.color }} />
              <div>
                <div className="leg-label">{seg.label}</div>
                <div className="leg-count">{seg.count} users</div>
              </div>
              <span className="leg-pct">{seg.value}%</span>
            </div>
          ))}
          <div className="ratio-info">
            <div className="ratio-label">Creator : Fan Ratio</div>
            <div className="ratio-val">1 : 22.8</div>
          </div>
        </div>
      </div>
      <style jsx>{`
        .card {
          background: #fff; border: 1px solid #eeecf8; border-radius: 16px;
          padding: 20px; flex: 1; min-width: 0; box-sizing: border-box;
        }
        .card-title { font-size: 15px; font-weight: 600; color: #0f0e1a; margin-bottom: 16px; }
        .card-body { display: flex; align-items: center; gap: 20px; }
        .legend { display: flex; flex-direction: column; gap: 10px; flex: 1; }
        .leg-item {
          display: flex; align-items: center; gap: 10px; padding: 8px;
          border-radius: 8px; cursor: pointer; transition: background 0.15s;
        }
        .leg-item.hov { background: #f9f7ff; }
        .leg-dot { width: 12px; height: 12px; border-radius: 4px; flex-shrink: 0; }
        .leg-label { font-size: 13px; font-weight: 500; color: #0f0e1a; }
        .leg-count { font-size: 11.5px; color: #9b9aaa; }
        .leg-pct { font-size: 15px; font-weight: 700; color: #0f0e1a; margin-left: auto; }
        .ratio-info {
          margin-top: 8px; padding: 10px 12px; background: #f9f7ff;
          border-radius: 10px; border: 1px solid #f0ebff;
        }
        .ratio-label { font-size: 11px; color: #9b9aaa; margin-bottom: 2px; }
        .ratio-val { font-size: 18px; font-weight: 700; color: #7c3aed; }
      `}</style>
    </div>
  );
}