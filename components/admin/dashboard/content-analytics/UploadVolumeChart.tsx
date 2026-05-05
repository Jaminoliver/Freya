"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type Range = "Daily" | "Weekly" | "Monthly";

const DATA: Record<Range, { label: string; photo: number; video: number; audio: number }[]> = {
  Daily: [
    { label: "Apr 28", photo: 320, video: 180, audio: 45 },
    { label: "Apr 29", photo: 290, video: 210, audio: 38 },
    { label: "Apr 30", photo: 410, video: 240, audio: 62 },
    { label: "May 1",  photo: 380, video: 195, audio: 51 },
    { label: "May 2",  photo: 430, video: 260, audio: 70 },
    { label: "May 3",  photo: 460, video: 290, audio: 58 },
    { label: "May 4",  photo: 510, video: 310, audio: 80 },
  ],
  Weekly: [
    { label: "W1", photo: 2100, video: 1200, audio: 310 },
    { label: "W2", photo: 2450, video: 1380, audio: 360 },
    { label: "W3", photo: 2200, video: 1290, audio: 290 },
    { label: "W4", photo: 2800, video: 1520, audio: 420 },
    { label: "W5", photo: 3100, video: 1700, audio: 480 },
    { label: "W6", photo: 2950, video: 1640, audio: 410 },
    { label: "W7", photo: 3300, video: 1850, audio: 530 },
  ],
  Monthly: [
    { label: "Oct", photo: 8200,  video: 4800,  audio: 1200 },
    { label: "Nov", photo: 9400,  video: 5200,  audio: 1380 },
    { label: "Dec", photo: 11200, video: 6100,  audio: 1650 },
    { label: "Jan", photo: 9800,  video: 5400,  audio: 1420 },
    { label: "Feb", photo: 10600, video: 5900,  audio: 1580 },
    { label: "Mar", photo: 12400, video: 6800,  audio: 1820 },
    { label: "Apr", photo: 13100, video: 7200,  audio: 1960 },
  ],
};

const SERIES = [
  { key: "photo" as const, label: "Photos", color: "#a855f7" },
  { key: "video" as const, label: "Videos", color: "#3b82f6" },
  { key: "audio" as const, label: "Audio",  color: "#10b981" },
];

type TooltipData = {
  x: number; y: number;
  label: string; photo: number; video: number; audio: number;
} | null;

export default function UploadVolumeChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState<Range>("Weekly");
  const [active, setActive] = useState(new Set(["photo", "video", "audio"]));
  const [progress, setProgress] = useState(0);
  const [tooltip, setTooltip] = useState<TooltipData>(null);
  const [hoveredGroup, setHoveredGroup] = useState<number | null>(null);
  const animRef = useRef<number>(0);

  const PAD = { L: 56, R: 20, T: 16, B: 36 };

  useEffect(() => {
    setProgress(0);
    setTooltip(null);
    setHoveredGroup(null);
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

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 700 * dpr;
    canvas.height = 260 * dpr;
    ctx.scale(dpr, dpr);
    const W = 700, H = 260;
    const { L, R, T, B } = PAD;
    const chartW = W - L - R;
    const chartH = H - T - B;
    const data = DATA[range];
    const groupW = chartW / data.length;
    const activeSeries = SERIES.filter(s => active.has(s.key));
    const barW = Math.min(14, (groupW - 12) / activeSeries.length);
    const allVals = data.flatMap(d => activeSeries.map(s => d[s.key]));
    const maxVal = allVals.length ? Math.max(...allVals) * 1.15 : 1;

    ctx.clearRect(0, 0, W, H);

    for (let i = 0; i <= 4; i++) {
      const y = T + (i / 4) * chartH;
      ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(W - R, y);
      ctx.strokeStyle = "rgba(0,0,0,0.05)"; ctx.lineWidth = 1; ctx.stroke();
      const val = maxVal - (i / 4) * maxVal;
      ctx.fillStyle = "#9b9aaa"; ctx.font = "11px sans-serif"; ctx.textAlign = "right";
      ctx.fillText(val >= 1000 ? `${(val / 1000).toFixed(1)}k` : `${Math.round(val)}`, L - 8, y + 4);
    }

    data.forEach((d, i) => {
      ctx.fillStyle = "#9b9aaa"; ctx.font = "11px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(d.label, L + (i + 0.5) * groupW, H - 8);
    });

    data.forEach((d, i) => {
      const isHov = hoveredGroup === i;
      if (isHov) {
        ctx.fillStyle = "rgba(124,58,237,0.04)";
        ctx.fillRect(L + i * groupW, T, groupW, chartH);
      }
      const groupX = L + i * groupW + groupW / 2;
      const totalBarW = activeSeries.length * barW + (activeSeries.length - 1) * 3;
      let startX = groupX - totalBarW / 2;
      activeSeries.forEach(({ key, color }) => {
        const val = d[key] * progress;
        const barH = (val / maxVal) * chartH;
        const x = startX;
        const y = T + chartH - barH;
        const r = Math.min(4, barW / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + barW - r, y);
        ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
        ctx.lineTo(x + barW, y + barH);
        ctx.lineTo(x, y + barH);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.globalAlpha = isHov ? 1 : 0.82;
        ctx.fill();
        ctx.globalAlpha = 1;
        startX += barW + 3;
      });
    });
  }, [range, active, progress, hoveredGroup]);

  useEffect(() => { draw(); }, [draw]);

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = 700 / rect.width;
    const x = (e.clientX - rect.left) * scaleX;
    const data = DATA[range];
    const chartW = 700 - PAD.L - PAD.R;
    const groupW = chartW / data.length;
    const idx = Math.floor((x - PAD.L) / groupW);
    if (idx < 0 || idx >= data.length) {
      setTooltip(null); setHoveredGroup(null); return;
    }
    setHoveredGroup(idx);
    const d = data[idx];
    const ttX = e.clientX - wrap.getBoundingClientRect().left;
    const ttY = e.clientY - wrap.getBoundingClientRect().top;
    setTooltip({ x: ttX, y: ttY, label: d.label, photo: d.photo, video: d.video, audio: d.audio });
  }

  function toggle(key: string) {
    setActive(prev => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size > 1) next.delete(key); }
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Upload Volume</span>
        <div className="controls">
          <div className="legend">
            {SERIES.map(s => (
              <button key={s.key} className={`leg-btn ${active.has(s.key) ? "on" : "off"}`} onClick={() => toggle(s.key)}>
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

      <div className="canvas-wrap" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "260px", display: "block", cursor: "crosshair" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => { setTooltip(null); setHoveredGroup(null); }}
        />
        {tooltip && (
          <div
            className="tooltip"
            style={{
              left: tooltip.x + 14,
              top: tooltip.y - 10,
              transform: tooltip.x > 500 ? "translateX(-110%)" : "none",
            }}
          >
            <div className="tt-label">{tooltip.label}</div>
            {active.has("photo") && (
              <div className="tt-row"><span className="tt-dot" style={{ background: "#a855f7" }} />Photos<span className="tt-val">{tooltip.photo.toLocaleString()}</span></div>
            )}
            {active.has("video") && (
              <div className="tt-row"><span className="tt-dot" style={{ background: "#3b82f6" }} />Videos<span className="tt-val">{tooltip.video.toLocaleString()}</span></div>
            )}
            {active.has("audio") && (
              <div className="tt-row"><span className="tt-dot" style={{ background: "#10b981" }} />Audio<span className="tt-val">{tooltip.audio.toLocaleString()}</span></div>
            )}
            <div className="tt-total">
              Total <span className="tt-val">{(
                (active.has("photo") ? tooltip.photo : 0) +
                (active.has("video") ? tooltip.video : 0) +
                (active.has("audio") ? tooltip.audio : 0)
              ).toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .card { background: #fff; border: 1px solid #eeecf8; border-radius: 16px; padding: 20px 20px 12px; width: 100%; box-sizing: border-box; }
        .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 10px; }
        .card-title { font-size: 15px; font-weight: 600; color: #0f0e1a; }
        .controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .legend { display: flex; align-items: center; gap: 8px; }
        .leg-btn { display: flex; align-items: center; gap: 5px; background: none; border: none; cursor: pointer; font-size: 12px; color: #6b6880; padding: 4px 8px; border-radius: 6px; transition: background 0.15s; }
        .leg-btn.off { opacity: 0.4; }
        .leg-btn:hover { background: #f5f3ff; }
        .leg-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
        .toggle-group { display: flex; background: #f5f3ff; border-radius: 8px; padding: 3px; gap: 2px; }
        .toggle-btn { padding: 5px 12px; border: none; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; background: transparent; color: #9b9aaa; transition: all 0.2s; }
        .toggle-btn.active { background: #fff; color: #7c3aed; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
        .canvas-wrap { position: relative; }
        .tooltip {
          position: absolute;
          background: #0f0e1a;
          border-radius: 10px;
          padding: 10px 12px;
          pointer-events: none;
          z-index: 10;
          min-width: 140px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        }
        .tt-label { font-size: 11px; font-weight: 600; color: #9b9aaa; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em; }
        .tt-row { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: #e2e0f0; margin-bottom: 3px; }
        .tt-dot { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }
        .tt-val { margin-left: auto; font-weight: 700; color: #fff; }
        .tt-total { display: flex; align-items: center; font-size: 12.5px; color: #9b9aaa; margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.1); }
      `}</style>
    </div>
  );
}