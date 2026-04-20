"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";

const MIN_PRICE    = 10000;
const MAX_DISCOUNT = 50;
const STEP         = 5;
type SaveState = "idle" | "saving" | "saved" | "error";

const fmt = (n: number) => "₦" + n.toLocaleString("en-NG");

// ─── Skeleton ─────────────────────────────────

const SHIMMER_KEYFRAMES = `
@keyframes shimmer {
  0%   { background-position: -600px 0; }
  100% { background-position:  600px 0; }
}
@keyframes spin { to { transform: rotate(360deg); } }
`;

const shimmerStyle: React.CSSProperties = {
  backgroundImage: "linear-gradient(90deg, #0F0F1A 0px, #1A1A2E 80px, #0F0F1A 160px)",
  backgroundSize: "600px 100%",
  animation: "shimmer 1.6s infinite linear",
  borderRadius: "6px",
};

function SkeletonBlock({
  width, height, style,
}: {
  width?: string | number; height?: string | number; style?: React.CSSProperties;
}) {
  return <div style={{ ...shimmerStyle, width: width ?? "100%", height: height ?? "14px", borderRadius: "6px", ...style }} />;
}

function SubscriptionSkeleton() {
  return (
    <>
      <style>{SHIMMER_KEYFRAMES}</style>
      <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
        {/* Monthly price section */}
        <div style={{ marginBottom: "20px" }}>
          <SkeletonBlock width="30%" height={12} style={{ marginBottom: "8px" }} />
          <SkeletonBlock width="100%" height={52} style={{ borderRadius: "12px" }} />
          <SkeletonBlock width="50%" height={10} style={{ marginTop: "8px" }} />
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: "#1A1A2E", marginBottom: "20px" }} />

        {/* Bundle discounts section */}
        <div style={{ marginBottom: "20px" }}>
          <SkeletonBlock width="35%" height={12} style={{ marginBottom: "6px" }} />
          <SkeletonBlock width="65%" height={10} style={{ marginBottom: "16px" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {[0, 1].map((i) => (
              <div key={i} style={{ background: "#0E0E20", border: "1px solid #1E1E35", borderRadius: "14px", padding: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <SkeletonBlock width="60px" height={12} />
                  <SkeletonBlock width="50px" height={20} style={{ borderRadius: "20px" }} />
                </div>
                <SkeletonBlock width="70px" height={20} style={{ marginBottom: "4px" }} />
                <SkeletonBlock width="50px" height={10} style={{ marginBottom: "12px" }} />
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <SkeletonBlock width={28} height={28} style={{ borderRadius: "8px", flexShrink: 0 }} />
                  <SkeletonBlock width="40px" height={12} />
                  <SkeletonBlock width={28} height={28} style={{ borderRadius: "8px", flexShrink: 0 }} />
                </div>
                <SkeletonBlock width="100%" height={4} style={{ borderRadius: "2px" }} />
              </div>
            ))}
          </div>
        </div>

        {/* Save button */}
        <SkeletonBlock width="100%" height={46} style={{ borderRadius: "50px" }} />
      </div>
    </>
  );
}

// ─── Main ─────────────────────────────────────

export default function SubscriptionTiersTab({ username }: { username: string }) {
  const router = useRouter();

  const [monthlyPrice,       setMonthlyPrice]      = useState(0);
  const [monthlyInput,       setMonthlyInput]       = useState("");
  const [threeMonthDiscount, setThreeMonthDiscount] = useState(0);
  const [sixMonthDiscount,   setSixMonthDiscount]   = useState(0);
  const [saveState,          setSaveState]          = useState<SaveState>("idle");
  const [errorMsg,           setErrorMsg]           = useState<string | null>(null);
  const [focused,            setFocused]            = useState(false);
  const [loading,            setLoading]            = useState(true);

  const [savedThreeDisc, setSavedThreeDisc] = useState(0);
  const [savedSixDisc,   setSavedSixDisc]   = useState(0);

  const isFirstRender = useRef(true);

  const threeBase       = monthlyPrice * 3;
  const sixBase         = monthlyPrice * 6;
  const threeMonthPrice = Math.round(threeBase * (1 - threeMonthDiscount / 100));
  const sixMonthPrice   = Math.round(sixBase   * (1 - sixMonthDiscount   / 100));

  useEffect(() => {
    fetch("/api/settings/pricing")
      .then((r) => r.json())
      .then((json) => {
        const { pricing } = json;
        if (pricing?.price_monthly !== undefined) {
          const monthly = Number(pricing.price_monthly);
          setMonthlyPrice(monthly);
          setMonthlyInput(monthly > 0 ? String(monthly) : "");

          if (pricing.three_month_price && monthly > 0) {
            const d = Math.round((1 - Number(pricing.three_month_price) / (monthly * 3)) * 100);
            const clamped = Math.max(0, Math.min(MAX_DISCOUNT, d));
            setThreeMonthDiscount(clamped);
            setSavedThreeDisc(clamped);
          }
          if (pricing.six_month_price && monthly > 0) {
            const d = Math.round((1 - Number(pricing.six_month_price) / (monthly * 6)) * 100);
            const clamped = Math.max(0, Math.min(MAX_DISCOUNT, d));
            setSixMonthDiscount(clamped);
            setSavedSixDisc(clamped);
          }
        }
      })
      .catch((err) => console.error("[SubscriptionTiersTab] GET error:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setThreeMonthDiscount(0);
    setSixMonthDiscount(0);
  }, [monthlyPrice]);

  const handleMonthlyChange = (val: string) => {
    setMonthlyInput(val);
    const num = parseInt(val.replace(/\D/g, ""), 10);
    setMonthlyPrice(!isNaN(num) && num > 0 ? num : 0);
  };

  const handleMonthlyBlur = () => {
    setFocused(false);
    if (!monthlyInput.trim() || monthlyPrice === 0) {
      setMonthlyPrice(0);
      setMonthlyInput("");
    } else {
      setMonthlyInput(String(monthlyPrice));
    }
  };

  const handleSave = async () => {
    setErrorMsg(null);
    if (monthlyPrice > 0 && monthlyPrice < MIN_PRICE) {
      setErrorMsg(`Minimum subscription price is ${fmt(MIN_PRICE)}`);
      return;
    }
    setSaveState("saving");
    const payload = {
      monthly_price:     monthlyPrice > 0 ? monthlyPrice    : null,
      three_month_price: monthlyPrice > 0 ? threeMonthPrice : null,
      six_month_price:   monthlyPrice > 0 ? sixMonthPrice   : null,
    };
    try {
      const res  = await fetch("/api/settings/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.message ?? "Failed to save");
        setSaveState("error");
        return;
      }
      setSavedThreeDisc(threeMonthDiscount);
      setSavedSixDisc(sixMonthDiscount);
      setSaveState("saved");
      setTimeout(() => router.push(`/${username}`), 900);
    } catch (err) {
      console.error("[SubscriptionTiersTab] PATCH error:", err);
      setErrorMsg("Something went wrong");
      setSaveState("error");
    }
  };

  if (loading) return <SubscriptionSkeleton />;

  const bundles = [
    { months: 3, discount: threeMonthDiscount, setDiscount: setThreeMonthDiscount, total: threeMonthPrice, base: threeBase },
    { months: 6, discount: sixMonthDiscount,   setDiscount: setSixMonthDiscount,   total: sixMonthPrice,   base: sixBase   },
  ] as const;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .tier-step-btn:hover:not(:disabled) {
          background: rgba(139,92,246,0.12) !important;
          border-color: #8B5CF6 !important;
        }
      `}</style>

      {/* ── Monthly price ── */}
      <div style={{ marginBottom: "20px" }}>
        <p style={{ fontSize: "12px", fontWeight: 600, color: "#C4C4D4", margin: "0 0 8px" }}>
          Monthly price
        </p>
        <div style={{
          display: "flex", alignItems: "center",
          background: "#0E0E20",
          border: `1px solid ${focused ? "#8B5CF6" : "#1E1E35"}`,
          borderRadius: "12px",
          overflow: "hidden",
          transition: "border-color 0.15s",
        }}>
          <div style={{
            padding: "0 14px", alignSelf: "stretch",
            display: "flex", alignItems: "center",
            background: "#111126",
            borderRight: "1px solid #1E1E35",
          }}>
            <span style={{ fontSize: "15px", fontWeight: 700, color: "#6B6B8A" }}>₦</span>
          </div>
          <input
            type="text"
            inputMode="numeric"
            value={monthlyInput}
            onChange={(e) => handleMonthlyChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={handleMonthlyBlur}
            placeholder="Leave empty for free"
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              fontSize: "16px", fontWeight: 600, color: "#fff",
              padding: "13px 14px", fontFamily: "'Inter', sans-serif",
            }}
          />
          {monthlyPrice > 0 && (
            <div style={{
              padding: "0 14px", alignSelf: "stretch",
              display: "flex", alignItems: "center",
              background: "#111126",
              borderLeft: "1px solid #1E1E35",
            }}>
              <span style={{ fontSize: "12px", color: "#6B6B8A", whiteSpace: "nowrap" }}>
                ~${(monthlyPrice / 1600).toFixed(2)} USD
              </span>
            </div>
          )}
        </div>
        <p style={{ fontSize: "12px", color: "#6B6B8A", margin: "8px 0 0" }}>
          Minimum ₦10,000 · Leave empty for free
        </p>
      </div>

      {/* ── Divider ── */}
      <div style={{ height: "1px", background: "#1A1A2E", marginBottom: "20px" }} />

      {/* ── Bundle discounts ── */}
      <div style={{ marginBottom: "20px" }}>
        <p style={{ fontSize: "12px", fontWeight: 600, color: "#C4C4D4", margin: "0 0 4px" }}>
          Bundle discounts
        </p>
        <p style={{ fontSize: "12px", color: "#6B6B8A", margin: "0 0 16px" }}>
          Reward longer commitments. Steps of 5%, max 50% off.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {bundles.map(({ months, discount, setDiscount, total, base }) => (
            <div key={months} style={{
              background: "#0E0E20",
              border: "1px solid #1E1E35",
              borderRadius: "14px",
              padding: "14px",
              opacity: monthlyPrice === 0 ? 0.4 : 1,
              transition: "opacity 0.2s",
            }}>
              <div style={{
                display: "flex", alignItems: "center",
                justifyContent: "space-between", marginBottom: "10px",
              }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#fff" }}>
                  {months} months
                </span>
                {discount > 0 ? (
                  <span style={{
                    fontSize: "11px", fontWeight: 700, color: "#EC4899",
                    background: "rgba(236,72,153,0.1)",
                    border: "1px solid rgba(236,72,153,0.2)",
                    padding: "2px 8px", borderRadius: "20px",
                  }}>
                    -{discount}%
                  </span>
                ) : (
                  <span style={{ fontSize: "11px", color: "#2A2A40" }}>No discount</span>
                )}
              </div>

              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "17px", fontWeight: 700, color: monthlyPrice > 0 ? "#fff" : "#2A2A40" }}>
                  {monthlyPrice > 0 ? fmt(total) : "—"}
                </div>
                {monthlyPrice > 0 && discount > 0 && (
                  <div style={{ fontSize: "11px", color: "#10B981", marginTop: "3px" }}>
                    saves {fmt(base - total)}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <button
                  type="button"
                  className="tier-step-btn"
                  disabled={discount === 0 || monthlyPrice === 0}
                  onClick={() => setDiscount((d) => Math.max(d - STEP, 0))}
                  style={{
                    width: "28px", height: "28px", borderRadius: "8px",
                    border: "1px solid #2A2A40", background: "transparent",
                    color: discount === 0 || monthlyPrice === 0 ? "#2A2A40" : "#C4B5FD",
                    fontSize: "18px", lineHeight: "1",
                    cursor: discount === 0 || monthlyPrice === 0 ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    transition: "background 0.15s, border-color 0.15s",
                  }}
                >
                  −
                </button>

                <span style={{
                  flex: 1, textAlign: "center",
                  fontSize: "13px", fontWeight: 700,
                  color: discount > 0 ? "#C4B5FD" : "#2A2A40",
                }}>
                  {discount}%
                </span>

                <button
                  type="button"
                  className="tier-step-btn"
                  disabled={discount >= MAX_DISCOUNT || monthlyPrice === 0}
                  onClick={() => setDiscount((d) => Math.min(d + STEP, MAX_DISCOUNT))}
                  style={{
                    width: "28px", height: "28px", borderRadius: "8px",
                    border: "1px solid #2A2A40", background: "transparent",
                    color: discount >= MAX_DISCOUNT || monthlyPrice === 0 ? "#2A2A40" : "#C4B5FD",
                    fontSize: "18px", lineHeight: "1",
                    cursor: discount >= MAX_DISCOUNT || monthlyPrice === 0 ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    transition: "background 0.15s, border-color 0.15s",
                  }}
                >
                  +
                </button>
              </div>

              <div style={{ height: "4px", background: "#1E1E35", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: "2px",
                  background: "linear-gradient(90deg, #8B5CF6, #EC4899)",
                  width: `${(discount / MAX_DISCOUNT) * 100}%`,
                  transition: "width 0.2s",
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "5px" }}>
                <span style={{ fontSize: "10px", color: "#2A2A40" }}>0%</span>
                <span style={{ fontSize: "10px", color: "#2A2A40" }}>50% max</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Error ── */}
      {errorMsg && (
        <p style={{ fontSize: "13px", color: "#EF4444", marginBottom: "12px" }}>
          {errorMsg}
        </p>
      )}

      {/* ── Save button ── */}
      <button
        onClick={handleSave}
        disabled={saveState === "saving"}
        style={{
          width: "100%", padding: "13px",
          borderRadius: "50px", border: "none",
          background:
            saveState === "saved" ? "#059669" :
            saveState === "error" ? "#EF4444" :
            "linear-gradient(135deg, #8B5CF6, #EC4899)",
          color: "#fff", fontSize: "14px", fontWeight: 700,
          cursor: saveState === "saving" ? "not-allowed" : "pointer",
          fontFamily: "'Inter', sans-serif",
          transition: "opacity 0.15s",
          display: "flex", alignItems: "center",
          justifyContent: "center", gap: "8px",
        }}
        onMouseEnter={(e) => {
          if (saveState === "idle")
            (e.currentTarget as HTMLButtonElement).style.opacity = "0.85";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.opacity = "1";
        }}
      >
        {saveState === "saving" && (
          <Loader2 size={14} style={{ animation: "spin 0.9s linear infinite" }} />
        )}
        {saveState === "saved" && <Check size={14} />}
        {saveState === "saving" ? "Saving…"
          : saveState === "saved"  ? "Saved"
          : saveState === "error"  ? "Retry"
          : "Save pricing"}
      </button>
    </div>
  );
}