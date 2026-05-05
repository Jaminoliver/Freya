"use client";

import { useEffect, useRef } from "react";
import { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string;
  change: string;
  changeType: "up" | "down" | "alert";
  changeLabel?: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  sparkData: number[];
  sparkColor: string;
  alert?: boolean;
}

export default function StatCard({
  label, value, change, changeType, changeLabel,
  icon: Icon, iconColor, iconBg,
  sparkData, sparkColor, alert = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const min = Math.min(...sparkData);
    const max = Math.max(...sparkData);
    const range = max - min || 1;
    const pts = sparkData.map((v, i) => ({
      x: (i / (sparkData.length - 1)) * W,
      y: H - ((v - min) / range) * (H - 8) - 4,
    }));

    ctx.clearRect(0, 0, W, H);

    // Gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, sparkColor + "33");
    grad.addColorStop(1, sparkColor + "00");

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const cp1x = (pts[i - 1].x + pts[i].x) / 2;
      ctx.bezierCurveTo(cp1x, pts[i - 1].y, cp1x, pts[i].y, pts[i].x, pts[i].y);
    }
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const cp1x = (pts[i - 1].x + pts[i].x) / 2;
      ctx.bezierCurveTo(cp1x, pts[i - 1].y, cp1x, pts[i].y, pts[i].x, pts[i].y);
    }
    ctx.strokeStyle = sparkColor;
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [sparkData, sparkColor]);

  return (
    <div className={`stat-card ${alert ? "alert" : ""}`}>
      <div className="card-top">
        <div className="icon-wrap" style={{ background: iconBg }}>
          <Icon size={18} color={iconColor} />
        </div>
      </div>

      <div className="card-label">{label}</div>
      <div className="card-value">{value}</div>

      <div className={`card-change ${changeType}`}>
        {changeType === "up" && <span className="arrow">↗</span>}
        {changeType === "down" && <span className="arrow">↘</span>}
        {changeType === "alert" && <span className="arrow">+</span>}
        <span>{changeType === "alert" ? changeLabel : change}</span>
      </div>

      <canvas
        ref={canvasRef}
        width={200}
        height={52}
        style={{ width: "100%", height: "52px", display: "block", marginTop: "12px" }}
      />

      <style jsx>{`
        .stat-card {
          background: #fff;
          border: 1px solid #eeecf8;
          border-radius: 16px;
          padding: 20px 20px 0;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          cursor: default;
          overflow: hidden;
          animation: cardIn 0.4s ease both;
        }
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(124,58,237,0.08);
        }
        .stat-card.alert {
          border-color: #fecaca;
          border-width: 1.5px;
        }
        .stat-card.alert:hover {
          box-shadow: 0 8px 24px rgba(239,68,68,0.08);
        }
        .card-top {
          margin-bottom: 14px;
        }
        .icon-wrap {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .card-label {
          font-size: 12.5px;
          color: #9b9aaa;
          font-weight: 500;
          margin-bottom: 6px;
        }
        .card-value {
          font-size: 28px;
          font-weight: 700;
          color: #0f0e1a;
          letter-spacing: -1px;
          line-height: 1;
        }
        .card-change {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 8px;
          font-size: 12.5px;
          font-weight: 500;
        }
        .card-change.up { color: #16a34a; }
        .card-change.down { color: #dc2626; }
        .card-change.alert { color: #dc2626; }
        .arrow { font-size: 13px; }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}