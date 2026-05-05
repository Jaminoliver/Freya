"use client";

import { useEffect, useRef, useState } from "react";

type Range = "Daily" | "Weekly" | "Monthly";

const DATA: Record<Range, { label: string; fans: number; creators: number }[]> = {
  Daily: [
    { label: "Apr 28", fans: 380, creators: 32 }, { label: "Apr 29", fans: 420, creators: 38 },
    { label: "Apr 30", fans: 510, creators: 45 }, { label: "May 1",  fans: 470, creators: 41 },
    { label: "May 2",  fans: 560, creators: 52 }, { label: "May 3",  fans: 590, creators: 58 },
    { label: "May 4",  fans: 620, creators: 63 },
  ],
  Weekly: [
    { label: "W1", fans: 2100, creators: 180 }, { label: "W2", fans: 2450, creators: 210 },
    { label: "W3", fans: 2300, creators: 195 }, { label: "W4", fans: 2700, creators: 240 },
    { label: "W5", fans: 2900, creators: 265 }, { label: "W6", fans: 2750, creators: 248 },
    { label: "W7", fans: 3100, creators: 290 },
  ],
  Monthly: [
    { label: "Oct", fans: 8200,  creators: 620 }, { label: "Nov", fans: 9100,  creators: 710 },
    { label: "Dec", fans: 10500, creators: 820 }, { label: "Jan", fans: 8800,  creators: 680 },
    { label: "Feb", fans: 9600,  creators: 750 }, { label: "Mar", fans: 11200, creators: 890 },
    { label: "Apr", fans: 12400, creators: 980 },
  ],
};

export default function RegistrationsOverTimeChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [range, setRange] = useState<Range>("Weekly");
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
  }, [range]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 700 * dpr; canvas.height = 240 * dpr;
    ctx.scale(dpr, dpr);
    const W = 700, H = 240;
    const padL = 56, padR = 20, padT = 16, padB = 36;
    const chartW = W - padL - padR, chartH = H - padT - padB;
    const data = DATA[range];
    const maxVal = Math.max(...data.map(d => d.fans)) * 1.15;

    function xPos(i: number) { return padL + (i / (data.length - 1)) * chartW; }
    function yPos(v: number) { return padT + chartH - (v / maxVal) * chartH; }

    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i <= 4; i++) {
      const y = padT + (i / 4) * chartH;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y);
      ctx.strokeStyle = "rgba(0,0,0,0.05)"; ctx.lineWidth = 1; ctx.stroke();
      const val = maxVal - (i / 4) * maxVal;
      ctx.fillStyle = "#9b9aaa"; ctx.font = "11px sans-serif"; ctx.textAlign = "right";
      ctx.fillText(val >= 1000 ? `${(val/1000).toFixed(1)}k` : Math.round(val).toString(), padL - 8, y + 4);
    }
    data.forEach((d, i) => {
      ctx.fillStyle = "#9b9aaa"; ctx.font = "11px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(d.label, xPos(i), H - 8);
    });

    ctx.save();
    ctx.beginPath(); ctx.rect(padL, 0, chartW * progress, H); ctx.clip();

    // Fans series
    const fanPts = data.map((d, i) => ({ x: xPos(i), y: yPos(d.fans) }));
    const fanGrad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
    fanGrad.addColorStop(0, "#a855f728"); fanGrad.addColorStop(1, "#a855f700");
    ctx.beginPath(); ctx.moveTo(fanPts[0].x, fanPts[0].y);
    for (let i = 1; i < fanPts.length; i++) {
      const cpx = (fanPts[i-1].x + fanPts[i].x) / 2;
      ctx.bezierCurveTo(cpx, fanPts[i-1].y, cpx, fanPts[i].y, fanPts[i].x, fanPts[i].y);
    }
    ctx.lineTo(fanPts[fanPts.length-1].x, padT + chartH); ctx.lineTo(fanPts[0].x, padT + chartH);
    ctx.closePath(); ctx.fillStyle = fanGrad; ctx.fill();
    ctx.beginPath(); ctx.moveTo(fanPts[0].x, fanPts[0].y);
    for (let i = 1; i < fanPts.length; i++) {
      const cpx = (fanPts[i-1].x + fanPts[i].x) / 2;
      ctx.bezierCurveTo(cpx, fanPts[i-1].y, cpx, fanPts[i].y, fanPts[i].x, fanPts[i].y);
    }
    ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 2.5; ctx.stroke();
    fanPts.forEach(p => {
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#fff"; ctx.fill(); ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 2; ctx.stroke();
    });

    // Creators series (scaled ×10 for visibility)
    const crPts = data.map((d, i) => ({ x: xPos(i), y: yPos(d.creators * 10) }));
    const crGrad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
    crGrad.addColorStop(0, "#10b98128"); crGrad.addColorStop(1, "#10b98100");
    ctx.beginPath(); ctx.moveTo(crPts[0].x, crPts[0].y);
    for (let i = 1; i < crPts.length; i++) {
      const cpx = (crPts[i-1].x + crPts[i].x) / 2;
      ctx.bezierCurveTo(cpx, crPts[i-1].y, cpx, crPts[i].y, crPts[i].x, crPts[i].y);
    }
    ctx.lineTo(crPts[crPts.length-1].x, padT + chartH); ctx.lineTo(crPts[0].x, padT + chartH);
    ctx.closePath(); ctx.fillStyle = crGrad; ctx.fill();
    ctx.beginPath(); ctx.moveTo(crPts[0].x, crPts[0].y);
    for (let i = 1; i < crPts.length; i++) {
      const cpx = (crPts[i-1].x + crPts[i].x) / 2;
      ctx.bezierCurveTo(cpx, crPts[i-1].y, cpx, crPts[i].y, crPts[i].x, crPts[i].y);
    }
    ctx.strokeStyle = "#10b981"; ctx.lineWidth = 2.5; ctx.stroke();
    crPts.forEach(p => {
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#fff"; ctx.fill(); ctx.strokeStyle = "#10b981"; ctx.lineWidth = 2; ctx.stroke();
    });

    ctx.restore();
  }, [range, progress]);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <span className="card-title">New Registrations</span>
          <div className="legend">
            <span className="leg"><span className="dot" style={{ background: "#a855f7" }} />Fans</span>
            <span className="leg"><span className="dot" style={{ background: "#10b981" }} />Creators (×10 scale)</span>
          </div>
        </div>
        <div className="toggle-group">
          {(["Daily", "Weekly", "Monthly"] as Range[]).map(r => (
            <button key={r} className={`toggle-btn ${range === r ? "active" : ""}`} onClick={() => setRange(r)}>{r}</button>
          ))}
        </div>
      </div>
      <canvas ref={canvasRef} style={{ width: "100%", height: "240px", display: "block" }} aria-label="Registrations over time" />
      <style jsx>{`
        .card {
          background: #fff; border: 1px solid #eeecf8; border-radius: 16px;
          padding: 20px 20px 12px; width: 100%; box-sizing: border-box; overflow: hidden;
        }
        .card-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          margin-bottom: 16px; flex-wrap: wrap; gap: 10px;
        }
        .card-title { font-size: 15px; font-weight: 600; color: #0f0e1a; display: block; margin-bottom: 6px; }
        .legend { display: flex; gap: 12px; }
        .leg { display: flex; align-items: center; gap: 5px; font-size: 12px; color: #9b9aaa; }
        .dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
        .toggle-group { display: flex; background: #f5f3ff; border-radius: 8px; padding: 3px; gap: 2px; }
        .toggle-btn {
          padding: 5px 12px; border: none; border-radius: 6px; font-size: 12px;
          font-weight: 500; cursor: pointer; background: transparent; color: #9b9aaa; transition: all 0.2s;
        }
        .toggle-btn.active { background: #fff; color: #7c3aed; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
      `}</style>
    </div>
  );
}