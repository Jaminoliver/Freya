"use client";

import { useEffect, useRef, useState } from "react";

type Range = "Daily" | "Weekly" | "Monthly";

const DATA: Record<Range, { label: string; value: number }[]> = {
  Daily: [
    { label: "Apr 28", value: 7800 }, { label: "Apr 29", value: 8200 },
    { label: "Apr 30", value: 9600 }, { label: "May 1", value: 8900 },
    { label: "May 2", value: 9200 }, { label: "May 3", value: 9800 },
    { label: "May 4", value: 9950 },
  ],
  Weekly: [
    { label: "W1", value: 52000 }, { label: "W2", value: 61000 },
    { label: "W3", value: 58000 }, { label: "W4", value: 67000 },
    { label: "W5", value: 72000 }, { label: "W6", value: 69000 },
    { label: "W7", value: 78000 },
  ],
  Monthly: [
    { label: "Oct", value: 180000 }, { label: "Nov", value: 210000 },
    { label: "Dec", value: 245000 }, { label: "Jan", value: 198000 },
    { label: "Feb", value: 231000 }, { label: "Mar", value: 267000 },
    { label: "Apr", value: 284920 },
  ],
};

export default function RevenueOverTimeChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [range, setRange] = useState<Range>("Weekly");
  const [progress, setProgress] = useState(0);
  const animRef = useRef<number>(0);

  useEffect(() => {
    setProgress(0);
    let start: number | null = null;
    const duration = 900;

    function animate(ts: number) {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setProgress(eased);
      if (p < 1) animRef.current = requestAnimationFrame(animate);
    }

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [range]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const data = DATA[range];
const dpr = window.devicePixelRatio || 1;
canvas.width = 600 * dpr;
canvas.height = 240 * dpr;
ctx.scale(dpr, dpr);
const W = 600;
const H = 240;
    const padL = 56;
    const padR = 20;
    const padT = 16;
    const padB = 36;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    const values = data.map((d) => d.value);
    const maxVal = Math.max(...values) * 1.1;
    const minVal = 0;

    function xPos(i: number) {
      return padL + (i / (data.length - 1)) * chartW;
    }
    function yPos(v: number) {
      return padT + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;
    }

    ctx.clearRect(0, 0, W, H);

    // Grid lines
    const gridCount = 4;
    for (let i = 0; i <= gridCount; i++) {
      const y = padT + (i / gridCount) * chartH;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.strokeStyle = "rgba(0,0,0,0.05)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Y labels
      const val = maxVal - (i / gridCount) * maxVal;
      ctx.fillStyle = "#9b9aaa";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(
        val >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${val.toFixed(0)}`,
        padL - 8,
        y + 4
      );
    }

    // X labels
    data.forEach((d, i) => {
      ctx.fillStyle = "#9b9aaa";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(d.label, xPos(i), H - 8);
    });

    // Clipping for animation
    ctx.save();
    ctx.beginPath();
    ctx.rect(padL, 0, chartW * progress, H);
    ctx.clip();

    // Points
    const pts = data.map((d, i) => ({ x: xPos(i), y: yPos(d.value) }));

    // Gradient fill
    const grad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
    grad.addColorStop(0, "rgba(168,85,247,0.25)");
    grad.addColorStop(1, "rgba(168,85,247,0)");

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const cpx = (pts[i - 1].x + pts[i].x) / 2;
      ctx.bezierCurveTo(cpx, pts[i - 1].y, cpx, pts[i].y, pts[i].x, pts[i].y);
    }
    ctx.lineTo(pts[pts.length - 1].x, padT + chartH);
    ctx.lineTo(pts[0].x, padT + chartH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const cpx = (pts[i - 1].x + pts[i].x) / 2;
      ctx.bezierCurveTo(cpx, pts[i - 1].y, cpx, pts[i].y, pts[i].x, pts[i].y);
    }
    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Dots
    pts.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.strokeStyle = "#a855f7";
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    ctx.restore();
  }, [range, progress]);

  return (
    <div className="chart-card">
      <div className="chart-header">
        <span className="chart-title">Revenue Over Time</span>
        <div className="toggle-group">
          {(["Daily", "Weekly", "Monthly"] as Range[]).map((r) => (
            <button
              key={r}
              className={`toggle-btn ${range === r ? "active" : ""}`}
              onClick={() => setRange(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={600}
        height={240}
        style={{ width: "100%", height: "240px", display: "block" }}
        role="img"
        aria-label="Revenue over time area chart"
      />

      <style jsx>{`
        .chart-card {
          background: #fff;
          border: 1px solid #eeecf8;
          border-radius: 16px;
          padding: 20px 20px 12px;
          flex: 1;
          min-width: 0;
        }
        .chart-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .chart-title {
          font-size: 15px;
          font-weight: 600;
          color: #0f0e1a;
        }
        .toggle-group {
          display: flex;
          background: #f5f3ff;
          border-radius: 8px;
          padding: 3px;
          gap: 2px;
        }
        .toggle-btn {
          padding: 5px 12px;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          background: transparent;
          color: #9b9aaa;
          transition: all 0.2s ease;
        }
        .toggle-btn.active {
          background: #fff;
          color: #7c3aed;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
        }
      `}</style>
    </div>
  );
}