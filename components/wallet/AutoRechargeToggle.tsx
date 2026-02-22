"use client";

import { useState, useRef, useEffect } from "react";

interface AutoRechargeToggleProps {
  enabled: boolean;
  onChange: (val: boolean) => void;
}

const MIN_OPTIONS = [
  { label: "₦500 or less", value: "500" },
  { label: "₦1,000 or less", value: "1000" },
  { label: "₦2,000 or less", value: "2000" },
  { label: "₦5,000 or less", value: "5000" },
];

const RECHARGE_OPTIONS = [
  { label: "₦1,000", value: "1000" },
  { label: "₦2,500", value: "2500" },
  { label: "₦5,000", value: "5000" },
  { label: "₦10,000", value: "10000" },
];

function CustomSelect({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} style={{ position: "relative", flex: 1 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          backgroundColor: "transparent",
          border: "none",
          borderBottom: `1px solid ${open ? "#8B5CF6" : "#2A2A3D"}`,
          borderRadius: 0,
          padding: "6px 0",
          fontSize: "13px",
          color: selected ? "#F1F5F9" : "#6B6B8A",
          fontFamily: "'Inter', sans-serif",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          transition: "border-color 0.2s",
        }}
      >
        <span>{selected ? selected.label : placeholder}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#6B6B8A"
          strokeWidth="2.5"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            backgroundColor: "#1C1C2E",
            border: "1px solid #2A2A3D",
            borderRadius: "8px",
            overflow: "hidden",
            zIndex: 50,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                padding: "10px 14px",
                fontSize: "13px",
                color: value === opt.value ? "#A78BFA" : "#F1F5F9",
                backgroundColor: value === opt.value ? "rgba(139,92,246,0.1)" : "transparent",
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                transition: "background-color 0.1s",
              }}
              onMouseEnter={(e) => { if (value !== opt.value) (e.currentTarget as HTMLDivElement).style.backgroundColor = "#141420"; }}
              onMouseLeave={(e) => { if (value !== opt.value) (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent"; }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AutoRechargeToggle({ enabled, onChange }: AutoRechargeToggleProps) {
  const [minBalance, setMinBalance] = useState("");
  const [topUpAmount, setTopUpAmount] = useState("");
  const [saved, setSaved] = useState(false);

  const canSave = minBalance.length > 0 && topUpAmount.length > 0;

  const handleToggle = () => {
    if (enabled) { setSaved(false); onChange(false); }
    else { onChange(true); setSaved(false); }
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Divider */}
      <div style={{ height: "1px", backgroundColor: "#1E1E2E", margin: "0 20px 20px" }} />

      <div style={{ padding: "0 20px" }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: enabled && !saved ? "16px" : "0" }}>
          <div>
            <p style={{ fontSize: "15px", fontWeight: 700, color: "#F1F5F9", margin: "0 0 3px", letterSpacing: "-0.1px" }}>
              Auto-recharge
            </p>
            <p style={{ fontSize: "11px", color: "#6B6B8A", margin: 0 }}>
              {saved && enabled
                ? `Top up ₦${parseInt(topUpAmount).toLocaleString()} when below ₦${parseInt(minBalance).toLocaleString()}`
                : "Top up automatically when balance runs low"}
            </p>
          </div>

          {/* Toggle */}
          <div
            onClick={handleToggle}
            style={{
              width: "36px", height: "20px", borderRadius: "50px",
              backgroundColor: enabled ? "#8B5CF6" : "#2A2A3D",
              cursor: "pointer", position: "relative", flexShrink: 0,
              transition: "background-color 0.2s",
            }}
          >
            <div
              style={{
                position: "absolute", top: "3px",
                left: enabled ? "19px" : "3px",
                width: "14px", height: "14px", borderRadius: "50%",
                backgroundColor: "#fff", transition: "left 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
              }}
            />
          </div>
        </div>

        {/* Custom dropdowns */}
        {enabled && !saved && (
          <div style={{ display: "flex", gap: "16px", alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "10px", color: "#6B6B8A", margin: "0 0 6px", letterSpacing: "0.04em" }}>Minimum</p>
              <CustomSelect
                options={MIN_OPTIONS}
                value={minBalance}
                onChange={setMinBalance}
                placeholder="Select"
              />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "10px", color: "#6B6B8A", margin: "0 0 6px", letterSpacing: "0.04em" }}>Recharge</p>
              <CustomSelect
                options={RECHARGE_OPTIONS}
                value={topUpAmount}
                onChange={setTopUpAmount}
                placeholder="Select"
              />
            </div>
            <button
              onClick={() => { if (canSave) setSaved(true); }}
              disabled={!canSave}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: "none",
                backgroundColor: canSave ? "#8B5CF6" : "#1E1E2E",
                color: canSave ? "#fff" : "#6B6B8A",
                fontSize: "12px",
                fontWeight: 600,
                cursor: canSave ? "pointer" : "not-allowed",
                fontFamily: "'Inter', sans-serif",
                flexShrink: 0,
                marginBottom: "2px",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => { if (canSave) (e.currentTarget as HTMLButtonElement).style.opacity = "0.85"; }}
              onMouseLeave={(e) => { if (canSave) (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
            >
              Save
            </button>
          </div>
        )}
      </div>
    </div>
  );
}