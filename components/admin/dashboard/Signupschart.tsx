"use client";

import { useEffect, useRef, useState } from "react";

type View = "All" | "Fans" | "Creators";

const days = ["Apr 6","Apr 8","Apr 10","Apr 12","Apr 14","Apr 16","Apr 18","Apr 20","Apr 22","Apr 24","Apr 26","Apr 28","Apr 30","May 2","May 4"];

const fansData =     [420, 390, 510, 480, 560, 530, 610, 590, 680, 650, 720, 700, 790, 760, 840];
const creatorsData = [ 38,  42,  35,  50,  48,  55,  52,  61,  58,  66,  63,  72,  70,  78,  85];

const STATS = [
  { label: "Total Signups", value: "8,241", change: "+14.2%", up: true },
  { label: "New Fans", value: "7,893", change: "+13.8%", up: true },
  { label: "New Creators", value: "348", change: "+22.4%", up: true },
  { label: "Creator Ratio", value: "4.2%", change: "+0.6%", up: true },
];

export default function SignupsChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [view, setView] = useState<View>("All");
  const [progress, setProgress] = useState(0);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; fans: number; creators: number } | null>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    setProgress(0);
    let start: number | null = null;
    const duration = 900;
    function animate(ts: number) {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setProgress(1 - Math.pow(1 - p, 3));
      if (p < 1) animRef.current = requestAnimationFrame(animate);
    }
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [view]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

const dpr = window.devicePixelRatio || 1;
canvas.width = 700 * dpr;
canvas.height = 220 * dpr;
ctx.scale(dpr, dpr);
const W = 700;
const H = 220;
    const padL = 48, padR = 20, padT = 16, padB = 36;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    const showFans = view !== "Creators";
    const showCreators = view !== "Fans";

    // Compute max across visible series
    const allVals = [
      ...(showFans ? fansData : []),
      ...(showCreators ? creatorsData.map(v => v * 10) : []),
    ];
    const maxVal = Math.max(...allVals) * 1.15;

    function xPos(i: number) { return padL + (i / (days.length - 1)) * chartW; }
    function yPos(v: number) { return padT + chartH - (v / maxVal) * chartH; }

    ctx.clearRect(0, 0, W, H);

    // Grid
    for (let i = 0; i <= 4; i++) {
      const y = padT + (i / 4) * chartH;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.strokeStyle = "rgba(0,0,0,0.05)";
      ctx.lineWidth = 1;
      ctx.stroke();
      const val = maxVal - (i / 4) * maxVal;
      ctx.fillStyle = "#9b9aaa";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(val >= 1000 ? `${(val / 1000).toFixed(1)}k` : Math.round(val).toString(), padL - 6, y + 4);
    }

    // X labels (every 3rd)
    days.forEach((d, i) => {
      if (i % 3 !== 0) return;
      ctx.fillStyle = "#9b9aaa";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(d, xPos(i), H - 8);
    });

    // Clip for animation
    ctx.save();
    ctx.beginPath();
    ctx.rect(padL, 0, chartW * progress, H);
    ctx.clip();

    function drawSeries(data: number[], color: string, scale = 1) {
      const pts = data.map((v, i) => ({ x: xPos(i), y: yPos(v * scale) }));

      // Fill
      const grad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
      grad.addColorStop(0, color + "28");
      grad.addColorStop(1, color + "00");
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        const cpx = (pts[i-1].x + pts[i].x) / 2;
        ctx.bezierCurveTo(cpx, pts[i-1].y, cpx, pts[i].y, pts[i].x, pts[i].y);
      }
      ctx.lineTo(pts[pts.length-1].x, padT + chartH);
      ctx.lineTo(pts[0].x, padT + chartH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Line
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        const cpx = (pts[i-1].x + pts[i].x) / 2;
        ctx.bezierCurveTo(cpx, pts[i-1].y, cpx, pts[i].y, pts[i].x, pts[i].y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Dots
      pts.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }

    if (showFans) drawSeries(fansData, "#a855f7");
    if (showCreators) drawSeries(creatorsData, "#f59e0b", 10);

    ctx.restore();
  }, [view, progress]);

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const padL = 48, padR = 20;
    const chartW = canvas.width - padL - padR;
    const idx = Math.round(((x - padL) / chartW) * (days.length - 1));
    if (idx < 0 || idx >= days.length) { setTooltip(null); return; }
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      label: days[idx],
      fans: fansData[idx],
      creators: creatorsData[idx],
    });
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="card-header">
        <div>
          <span className="card-title">New Signups</span>
          <span className="card-sub"> — last 30 days</span>
        </div>
        <div className="toggle-group">
          {(["All", "Fans", "Creators"] as View[]).map(v => (
            <button key={v} className={`toggle-btn ${view === v ? "active" : ""}`} onClick={() => setView(v)}>{v}</button>
          ))}
        </div>
      </div>

      {/* Mini stat row */}
      <div className="stats-row">
        {STATS.map(s => (
          <div key={s.label} className="mini-stat">
            <div className="mini-val">{s.value}</div>
            <div className="mini-label">{s.label}</div>
            <div className="mini-change up">{s.change}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="chart-wrap">
        <canvas
          ref={canvasRef}
          width={700}
          height={220}
          style={{ width: "100%", height: "220px", display: "block" }}
          role="img"
          aria-label="New signups over 30 days showing fans and creators"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
        />
        {tooltip && (
          <div className="tooltip" style={{ left: tooltip.x + 12, top: tooltip.y - 20 }}>
            <div className="tt-label">{tooltip.label}</div>
            <div className="tt-row"><span className="tt-dot fans" />Fans: <b>{tooltip.fans}</b></div>
            <div className="tt-row"><span className="tt-dot creators" />Creators: <b>{tooltip.creators}</b></div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="legend">
        <span className="leg-item"><span className="leg-dot fans" />Fans</span>
        <span className="leg-item"><span className="leg-dot creators" />Creators (×10 scale)</span>
      </div>

      <style jsx>{`
        .card {
          background: #fff;
          border: 1px solid #eeecf8;
          border-radius: 16px;
          padding: 20px;
          margin: 16px 32px 0;
        }
        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 10px;
        }
        .card-title { font-size: 15px; font-weight: 600; color: #0f0e1a; }
        .card-sub { font-size: 13px; color: #9b9aaa; }
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
        .stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }
        .mini-stat {
          background: #faf8ff;
          border-radius: 10px;
          padding: 12px 14px;
          border: 1px solid #f0ebff;
        }
        .mini-val { font-size: 20px; font-weight: 700; color: #0f0e1a; letter-spacing: -0.5px; }
        .mini-label { font-size: 11.5px; color: #9b9aaa; margin-top: 2px; }
        .mini-change { font-size: 11.5px; font-weight: 600; margin-top: 4px; }
        .mini-change.up { color: #16a34a; }
        .chart-wrap { position: relative; }
        .tooltip {
          position: absolute;
          background: #0f0e1a;
          color: #fff;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 12px;
          pointer-events: none;
          z-index: 10;
          white-space: nowrap;
        }
        .tt-label { font-weight: 600; margin-bottom: 4px; color: #d1d5db; }
        .tt-row { display: flex; align-items: center; gap: 6px; margin-top: 2px; }
        .tt-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .tt-dot.fans { background: #a855f7; }
        .tt-dot.creators { background: #f59e0b; }
        .legend {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-top: 10px;
          padding-left: 48px;
        }
        .leg-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #9b9aaa;
        }
        .leg-dot {
          width: 10px;
          height: 10px;
          border-radius: 3px;
          flex-shrink: 0;
        }
        .leg-dot.fans { background: #a855f7; }
        .leg-dot.creators { background: #f59e0b; }
      `}</style>
    </div>
  );
}