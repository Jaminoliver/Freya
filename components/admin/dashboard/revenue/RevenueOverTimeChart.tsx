"use client";

import { useEffect, useRef, useState } from "react";

type Range = "Daily" | "Weekly" | "Monthly";

const DATA: Record<Range, { label: string; gross: number; commission: number; payout: number }[]> = {
  Daily: [
    { label: "Apr 28", gross: 7800, commission: 1170, payout: 6630 },
    { label: "Apr 29", gross: 8200, commission: 1230, payout: 6970 },
    { label: "Apr 30", gross: 9600, commission: 1440, payout: 8160 },
    { label: "May 1",  gross: 8900, commission: 1335, payout: 7565 },
    { label: "May 2",  gross: 9200, commission: 1380, payout: 7820 },
    { label: "May 3",  gross: 9800, commission: 1470, payout: 8330 },
    { label: "May 4",  gross: 9950, commission: 1493, payout: 8457 },
  ],
  Weekly: [
    { label: "W1", gross: 52000, commission: 7800,  payout: 44200 },
    { label: "W2", gross: 61000, commission: 9150,  payout: 51850 },
    { label: "W3", gross: 58000, commission: 8700,  payout: 49300 },
    { label: "W4", gross: 67000, commission: 10050, payout: 56950 },
    { label: "W5", gross: 72000, commission: 10800, payout: 61200 },
    { label: "W6", gross: 69000, commission: 10350, payout: 58650 },
    { label: "W7", gross: 78000, commission: 11700, payout: 66300 },
  ],
  Monthly: [
    { label: "Oct", gross: 180000, commission: 27000, payout: 153000 },
    { label: "Nov", gross: 210000, commission: 31500, payout: 178500 },
    { label: "Dec", gross: 245000, commission: 36750, payout: 208250 },
    { label: "Jan", gross: 198000, commission: 29700, payout: 168300 },
    { label: "Feb", gross: 231000, commission: 34650, payout: 196350 },
    { label: "Mar", gross: 267000, commission: 40050, payout: 226950 },
    { label: "Apr", gross: 284920, commission: 42738, payout: 242182 },
  ],
};

const SERIES = [
  { key: "gross",      label: "Gross Revenue",   color: "#a855f7" },
  { key: "commission", label: "Commission",       color: "#3b82f6" },
  { key: "payout",     label: "Creator Payouts",  color: "#10b981" },
] as const;

export default function RevenueOverTimeChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [range, setRange] = useState<Range>("Weekly");
  const [active, setActive] = useState<Set<string>>(new Set(["gross", "commission", "payout"]));
  const [progress, setProgress] = useState(0);
  const animRef = useRef<number>(0);

  useEffect(() => {
    setProgress(0);
    let start: number | null = null;
    function animate(ts: number) {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 900, 1);
      setProgress(1 - Math.pow(1 - p, 3));
      if (p < 1) animRef.current = requestAnimationFrame(animate);
    }
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [range, active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 700 * dpr;
    canvas.height = 260 * dpr;
    ctx.scale(dpr, dpr);
    const W = 700, H = 260;
    const padL = 60, padR = 20, padT = 16, padB = 36;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;
    const data = DATA[range];

    const allVals = data.flatMap(d =>
      SERIES.filter(s => active.has(s.key)).map(s => d[s.key])
    );
    const maxVal = allVals.length ? Math.max(...allVals) * 1.12 : 1;

    function xPos(i: number) { return padL + (i / (data.length - 1)) * chartW; }
    function yPos(v: number) { return padT + chartH - (v / maxVal) * chartH; }

    ctx.clearRect(0, 0, W, H);

    for (let i = 0; i <= 4; i++) {
      const y = padT + (i / 4) * chartH;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y);
      ctx.strokeStyle = "rgba(0,0,0,0.05)"; ctx.lineWidth = 1; ctx.stroke();
      const val = maxVal - (i / 4) * maxVal;
      ctx.fillStyle = "#9b9aaa"; ctx.font = "11px sans-serif"; ctx.textAlign = "right";
      ctx.fillText(val >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${val.toFixed(0)}`, padL - 8, y + 4);
    }

    data.forEach((d, i) => {
      ctx.fillStyle = "#9b9aaa"; ctx.font = "11px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(d.label, xPos(i), H - 8);
    });

    ctx.save();
    ctx.beginPath(); ctx.rect(padL, 0, chartW * progress, H); ctx.clip();

    SERIES.filter(s => active.has(s.key)).forEach(({ key, color }) => {
      const pts = data.map((d, i) => ({ x: xPos(i), y: yPos(d[key]) }));
      const grad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
      grad.addColorStop(0, color + "28"); grad.addColorStop(1, color + "00");
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        const cpx = (pts[i-1].x + pts[i].x) / 2;
        ctx.bezierCurveTo(cpx, pts[i-1].y, cpx, pts[i].y, pts[i].x, pts[i].y);
      }
      ctx.lineTo(pts[pts.length-1].x, padT + chartH);
      ctx.lineTo(pts[0].x, padT + chartH);
      ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        const cpx = (pts[i-1].x + pts[i].x) / 2;
        ctx.bezierCurveTo(cpx, pts[i-1].y, cpx, pts[i].y, pts[i].x, pts[i].y);
      }
      ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.stroke();
      pts.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#fff"; ctx.fill();
        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
      });
    });

    ctx.restore();
  }, [range, active, progress]);

  function toggleSeries(key: string) {
    setActive(prev => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size > 1) next.delete(key); }
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="chart-card">
      <div className="chart-header">
        <span className="chart-title">Revenue Over Time</span>
        <div className="controls">
          <div className="legend">
            {SERIES.map(s => (
              <button
                key={s.key}
                className={`leg-btn ${active.has(s.key) ? "on" : "off"}`}
                onClick={() => toggleSeries(s.key)}
              >
                <span className="leg-dot" style={{ background: active.has(s.key) ? s.color : "#d1d5db" }} />
                {s.label}
              </button>
            ))}
          </div>
          <div className="toggle-group">
            {(["Daily", "Weekly", "Monthly"] as Range[]).map(r => (
              <button key={r} className={`toggle-btn ${range === r ? "active" : ""}`} onClick={() => setRange(r)}>{r}</button>
            ))}
          </div>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "260px", display: "block" }}
        aria-label="Revenue over time"
      />
      <style jsx>{`
        .chart-card {
          background: #fff;
          border: 1px solid #eeecf8;
          border-radius: 16px;
          padding: 20px 20px 12px;
          width: 100%;
          box-sizing: border-box;
          overflow: hidden;
        }
        .chart-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 10px;
        }
        .chart-title { font-size: 15px; font-weight: 600; color: #0f0e1a; }
        .controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .legend { display: flex; align-items: center; gap: 8px; }
        .leg-btn {
          display: flex; align-items: center; gap: 5px;
          background: none; border: none; cursor: pointer;
          font-size: 12px; color: #6b6880; padding: 4px 8px;
          border-radius: 6px; transition: background 0.15s;
        }
        .leg-btn.off { opacity: 0.4; }
        .leg-btn:hover { background: #f5f3ff; }
        .leg-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
        .toggle-group {
          display: flex; background: #f5f3ff;
          border-radius: 8px; padding: 3px; gap: 2px;
        }
        .toggle-btn {
          padding: 5px 12px; border: none; border-radius: 6px;
          font-size: 12px; font-weight: 500; cursor: pointer;
          background: transparent; color: #9b9aaa; transition: all 0.2s;
        }
        .toggle-btn.active { background: #fff; color: #7c3aed; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
      `}</style>
    </div>
  );
}