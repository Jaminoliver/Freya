"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Minus } from "lucide-react";
import Link from "next/link";

const MIN_PRICE    = 10000;
const MAX_DISCOUNT = 50;
const STEP         = 5;

const fmt = (n: number) => "₦" + n.toLocaleString("en-NG");

interface Step3Data {
  monthly_price: number;
  three_month_price: number;
  six_month_price: number;
  bio: string;
  confirmed_18: boolean;
  agreed_terms: boolean;
}

interface CreatorOnboardingStep3Props {
  onLaunch: (data: Step3Data) => void;
  onBack: () => void;
  defaultValues?: Partial<Step3Data>;
  launching?: boolean;
}

export function CreatorOnboardingStep3({
  onLaunch, onBack, defaultValues = {}, launching = false,
}: CreatorOnboardingStep3Props) {
  const [monthlyPrice,       setMonthlyPrice]       = useState(defaultValues.monthly_price ?? 0);
  const [monthlyInput,       setMonthlyInput]       = useState(String(defaultValues.monthly_price ?? ""));
  const [threeMonthDiscount, setThreeMonthDiscount] = useState(0);
  const [sixMonthDiscount,   setSixMonthDiscount]   = useState(0);
  const [bio,                setBio]                = useState(defaultValues.bio ?? "");
  const [confirmed18,        setConfirmed18]        = useState(defaultValues.confirmed_18 ?? false);
  const [agreedTerms,        setAgreedTerms]        = useState(defaultValues.agreed_terms ?? false);
  const [errors,             setErrors]             = useState<{
    bio?: string; confirmed_18?: string; agreed_terms?: string; monthly_price?: string;
  }>({});
  const [focused, setFocused] = useState(false);
  const isFirstRender = useRef(true);

  const threeBase       = monthlyPrice * 3;
  const sixBase         = monthlyPrice * 6;
  const threeMonthPrice = Math.round(threeBase * (1 - threeMonthDiscount / 100));
  const sixMonthPrice   = Math.round(sixBase   * (1 - sixMonthDiscount   / 100));

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setThreeMonthDiscount(0);
    setSixMonthDiscount(0);
  }, [monthlyPrice]);

  const handleMonthlyChange = (val: string) => {
    setMonthlyInput(val);
    const num = parseInt(val.replace(/\D/g, ""), 10);
    setMonthlyPrice(!isNaN(num) && num > 0 ? num : 0);
    setErrors((prev) => ({ ...prev, monthly_price: undefined }));
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

  const isFormValid =
    bio.trim().length > 0 &&
    confirmed18 &&
    agreedTerms &&
    (monthlyPrice === 0 || monthlyPrice >= MIN_PRICE);

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (monthlyPrice > 0 && monthlyPrice < MIN_PRICE)
      e.monthly_price = `Minimum price is ${fmt(MIN_PRICE)} (or leave empty for free)`;
    if (!bio.trim()) e.bio = "Bio is required — tell subscribers what to expect";
    if (!confirmed18) e.confirmed_18 = "You must confirm you are at least 18 years old";
    if (!agreedTerms) e.agreed_terms = "You must agree to the Terms of Service and Creator Policy";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const bundles = [
    { months: 3, discount: threeMonthDiscount, setDiscount: setThreeMonthDiscount, total: threeMonthPrice, base: threeBase },
    { months: 6, discount: sixMonthDiscount,   setDiscount: setSixMonthDiscount,   total: sixMonthPrice,   base: sixBase   },
  ] as const;

  const checkboxRow = (
    checked: boolean,
    onChange: () => void,
    label: React.ReactNode,
    error?: string,
  ) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <div onClick={onChange} style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", userSelect: "none" }}>
        <div style={{
          width: "18px", height: "18px", borderRadius: "5px",
          border: `1.5px solid ${error ? "#EF4444" : checked ? "#8B5CF6" : "#2A2A3D"}`,
          backgroundColor: checked ? "#8B5CF6" : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, marginTop: "1px", transition: "all 0.15s",
        }}>
          {checked && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <span style={{ fontSize: "13px", color: "#A3A3C2", lineHeight: 1.5 }}>{label}</span>
      </div>
      {error && <span style={{ fontSize: "11px", color: "#EF4444", marginLeft: "28px" }}>{error}</span>}
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .tier-step-btn:hover:not(:disabled) {
          background: rgba(139,92,246,0.12) !important;
          border-color: #8B5CF6 !important;
        }
        .step3-textarea::placeholder { color: #303048; }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif" }}>

        {/* ── Section heading ── */}
        <div style={{ marginBottom: "22px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#F0F0FF", margin: "0 0 4px" }}>
            Launch Setup
          </h2>
          <p style={{ fontSize: "13px", color: "#A3A3C2", margin: 0 }}>
            Almost there — set your pricing and tell the world about you.
          </p>
        </div>

        {/* ── Monthly price ── */}
        <div style={{ marginBottom: "20px" }}>
          <p style={{ fontSize: "12px", fontWeight: 600, color: "#C4C4D4", margin: "0 0 8px" }}>
            Monthly price
          </p>
          <div style={{
            display: "flex", alignItems: "center",
            background: "#0E0E20",
            border: `1px solid ${errors.monthly_price ? "#EF4444" : focused ? "#8B5CF6" : "#1E1E35"}`,
            borderRadius: "12px", overflow: "hidden",
            transition: "border-color 0.15s",
          }}>
            <div style={{
              padding: "0 14px", alignSelf: "stretch",
              display: "flex", alignItems: "center",
              background: "#111126", borderRight: "1px solid #1E1E35",
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
                background: "#111126", borderLeft: "1px solid #1E1E35",
              }}>
                <span style={{ fontSize: "12px", color: "#6B6B8A", whiteSpace: "nowrap" }}>
                  ~${(monthlyPrice / 1600).toFixed(2)} USD
                </span>
              </div>
            )}
          </div>
          {errors.monthly_price ? (
            <p style={{ fontSize: "12px", color: "#EF4444", margin: "8px 0 0" }}>{errors.monthly_price}</p>
          ) : (
            <p style={{ fontSize: "12px", color: "#6B6B8A", margin: "8px 0 0" }}>
              Minimum ₦10,000 · Leave empty for free
            </p>
          )}
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
                background: "#0E0E20", border: "1px solid #1E1E35",
                borderRadius: "14px", padding: "14px",
                opacity: monthlyPrice === 0 ? 0.4 : 1,
                transition: "opacity 0.2s",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#fff" }}>
                    {months} months
                  </span>
                  {discount > 0 ? (
                    <span style={{
                      fontSize: "11px", fontWeight: 700, color: "#EC4899",
                      background: "rgba(236,72,153,0.1)", border: "1px solid rgba(236,72,153,0.2)",
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
                  >−</button>

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
                  >+</button>
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

        {/* ── Divider ── */}
        <div style={{ height: "1px", background: "#1A1A2E", marginBottom: "20px" }} />

        {/* ── Bio ── */}
        <div style={{ marginBottom: "20px" }}>
          <p style={{ fontSize: "12px", fontWeight: 600, color: "#C4C4D4", margin: "0 0 8px" }}>
            Bio
          </p>
          <textarea
            className="step3-textarea"
            value={bio}
            onChange={(e) => { setBio(e.target.value); setErrors((prev) => ({ ...prev, bio: undefined })); }}
            placeholder="Tell subscribers what to expect from your page..."
            rows={4}
            style={{
              width: "100%", borderRadius: "12px", padding: "13px 14px",
              fontSize: "14px", outline: "none",
              background: "#0E0E20",
              border: `1px solid ${errors.bio ? "#EF4444" : "#1E1E35"}`,
              color: "#fff", boxSizing: "border-box",
              fontFamily: "'Inter', sans-serif",
              resize: "none", lineHeight: 1.6,
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = errors.bio ? "#EF4444" : "#8B5CF6")}
            onBlur={(e) => (e.currentTarget.style.borderColor = errors.bio ? "#EF4444" : "#1E1E35")}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "5px" }}>
            {errors.bio
              ? <span style={{ fontSize: "11px", color: "#EF4444" }}>{errors.bio}</span>
              : <span style={{ fontSize: "11px", color: "#6B6B8A" }}>Shown on your creator page</span>
            }
            <span style={{ fontSize: "11px", color: bio.length > 300 ? "#EF4444" : "#6B6B8A" }}>
              {bio.length}/500
            </span>
          </div>
        </div>

        {/* ── Divider ── */}
        <div style={{ height: "1px", background: "#1A1A2E", marginBottom: "20px" }} />

        {/* ── Checkboxes ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "28px" }}>
          {checkboxRow(
            confirmed18,
            () => { setConfirmed18((p) => !p); setErrors((prev) => ({ ...prev, confirmed_18: undefined })); },
            "I confirm I am at least 18 years old",
            errors.confirmed_18,
          )}
          {checkboxRow(
            agreedTerms,
            () => { setAgreedTerms((p) => !p); setErrors((prev) => ({ ...prev, agreed_terms: undefined })); },
            <span>
              I agree to Freya&apos;s{" "}
              <Link href="/terms" style={{ color: "#8B5CF6", textDecoration: "none" }} onClick={(e) => e.stopPropagation()}>Terms of Service</Link>
              {" "}and{" "}
              <Link href="/creator-policy" style={{ color: "#8B5CF6", textDecoration: "none" }} onClick={(e) => e.stopPropagation()}>Creator Policy</Link>
            </span>,
            errors.agreed_terms,
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          paddingTop: "20px", borderTop: "1px solid #1C1C2E",
        }}>
          <button
            type="button"
            onClick={onBack}
            disabled={launching}
            style={{
              padding: "11px 20px", borderRadius: "10px",
              fontSize: "14px", fontWeight: 600,
              border: "1px solid #1E1E2E", cursor: launching ? "not-allowed" : "pointer",
              background: "transparent", color: "#A3A3C2",
              fontFamily: "'Inter', sans-serif", opacity: launching ? 0.5 : 1,
              transition: "all 0.2s",
            }}
          >
            ← Back
          </button>

          <button
            type="button"
            disabled={launching || !isFormValid}
            onClick={() => {
              if (validate()) onLaunch({
                monthly_price: monthlyPrice,
                three_month_price: threeMonthPrice,
                six_month_price: sixMonthPrice,
                bio, confirmed_18: confirmed18, agreed_terms: agreedTerms,
              });
            }}
            style={{
              padding: "11px 26px", borderRadius: "10px",
              fontSize: "14px", fontWeight: 600, border: "none",
              cursor: (launching || !isFormValid) ? "not-allowed" : "pointer",
              background: (launching || !isFormValid)
                ? "#2A2040"
                : "linear-gradient(to right, #8B5CF6, #EC4899)",
              color: (launching || !isFormValid) ? "#4A3A70" : "#FFFFFF",
              display: "flex", alignItems: "center", gap: "8px",
              boxShadow: (launching || !isFormValid) ? "none" : "0 4px 24px rgba(139,92,246,0.28)",
              fontFamily: "'Inter', sans-serif",
              transition: "all 0.2s",
              opacity: (launching || !isFormValid) ? 0.5 : 1,
            }}
          >
            {launching
              ? <><div style={{ width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /> Launching…</>
              : "🚀 Launch My Page"
            }
          </button>
        </div>

      </div>
    </>
  );
}