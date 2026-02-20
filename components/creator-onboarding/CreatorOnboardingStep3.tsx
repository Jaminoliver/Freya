"use client";

import { useState, useEffect } from "react";
import { Plus, Minus } from "lucide-react";
import Link from "next/link";

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

export function CreatorOnboardingStep3({ onLaunch, onBack, defaultValues = {}, launching = false }: CreatorOnboardingStep3Props) {
  const [monthlyPrice, setMonthlyPrice] = useState(defaultValues.monthly_price ?? 0);
  const [monthlyInput, setMonthlyInput] = useState(String(defaultValues.monthly_price ?? ""));
  const [threeMonthDiscount, setThreeMonthDiscount] = useState(0);
  const [sixMonthDiscount, setSixMonthDiscount] = useState(0);
  const [bio, setBio] = useState(defaultValues.bio ?? "");
  const [confirmed18, setConfirmed18] = useState(defaultValues.confirmed_18 ?? false);
  const [agreedTerms, setAgreedTerms] = useState(defaultValues.agreed_terms ?? false);
  const [errors, setErrors] = useState<{ bio?: string; confirmed_18?: string; agreed_terms?: string; monthly_price?: string }>({});

  const MAX_DISCOUNT = 50;
  const STEP = 5;
  const threeBase = monthlyPrice * 3;
  const sixBase = monthlyPrice * 6;
  const threeMonthPrice = Math.round(threeBase * (1 - threeMonthDiscount / 100));
  const sixMonthPrice = Math.round(sixBase * (1 - sixMonthDiscount / 100));

  useEffect(() => {
    setThreeMonthDiscount(0);
    setSixMonthDiscount(0);
  }, [monthlyPrice]);

  const handleMonthlyChange = (val: string) => {
    setMonthlyInput(val);
    const num = parseInt(val.replace(/\D/g, ""), 10);
    if (!isNaN(num) && num > 0) setMonthlyPrice(num);
    setErrors((prev) => ({ ...prev, monthly_price: undefined }));
  };

  const handleMonthlyBlur = () => {
    if (!monthlyInput.trim() || monthlyPrice === 0) {
      setMonthlyPrice(0);
      setMonthlyInput("");
    } else if (monthlyPrice < 1000) {
      setMonthlyPrice(1000);
      setMonthlyInput("1000");
    } else {
      setMonthlyInput(String(monthlyPrice));
    }
  };

  const isFormValid =
    bio.trim().length > 0 &&
    confirmed18 &&
    agreedTerms &&
    (monthlyPrice === 0 || monthlyPrice >= 1000);

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (monthlyPrice > 0 && monthlyPrice < 1000) e.monthly_price = "Minimum price is ₦1,000 (or leave empty for free)";
    if (!bio.trim()) e.bio = "Bio is required — tell subscribers what to expect";
    if (!confirmed18) e.confirmed_18 = "You must confirm you are at least 18 years old";
    if (!agreedTerms) e.agreed_terms = "You must agree to the Terms of Service and Creator Policy";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const inputBase: React.CSSProperties = {
    width: "100%", borderRadius: "10px", padding: "12px 14px", fontSize: "14px",
    outline: "none", backgroundColor: "#141420", border: "1.5px solid #2A2A3D",
    color: "#F1F5F9", boxSizing: "border-box", fontFamily: "'Inter', sans-serif",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "13px", fontWeight: 500, color: "#8B5CF6", marginBottom: "6px", display: "block",
  };

  const bundleBtnStyle = (active: boolean): React.CSSProperties => ({
    width: "28px", height: "28px", borderRadius: "6px", border: "1.5px solid #2A2A3D",
    backgroundColor: active ? "#1C1C2E" : "#0F0F18", color: active ? "#F1F5F9" : "#3A3A50",
    cursor: active ? "pointer" : "not-allowed", display: "flex", alignItems: "center",
    justifyContent: "center", flexShrink: 0, transition: "all 0.15s",
  });

  const checkboxRow = (checked: boolean, onChange: () => void, label: React.ReactNode, error?: string) => (
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

  const formatNaira = (n: number) => `₦${n.toLocaleString("en-NG")}`;
  const discountBadge = (discount: number) =>
    discount > 0 ? (
      <span style={{ fontSize: "11px", color: "#34D399", backgroundColor: "rgba(52,211,153,0.1)", borderRadius: "4px", padding: "2px 6px", marginLeft: "6px" }}>
        {discount}% off
      </span>
    ) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#F1F5F9", margin: "0 0 3px" }}>Creator Setup</h2>
        <p style={{ fontSize: "13px", color: "#A3A3C2", margin: 0 }}>Almost there — set your pricing and tell the world about you.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Monthly Price */}
        <div>
          <label style={labelStyle}>Monthly Subscription Price <span style={{ color: "#6B6B8A", fontWeight: 400 }}>(optional)</span></label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", color: "#A3A3C2", pointerEvents: "none" }}>₦</span>
            <input type="text" inputMode="numeric" value={monthlyInput}
              onChange={(e) => handleMonthlyChange(e.target.value)}
              onBlur={handleMonthlyBlur}
              placeholder="Leave empty for free"
              style={{ ...inputBase, paddingLeft: "28px", border: `1.5px solid ${errors.monthly_price ? "#EF4444" : "#2A2A3D"}` }}
            />
          </div>
          <span style={{ fontSize: "11px", color: "#6B6B8A", marginTop: "4px", display: "block" }}>
            Leave empty for a free page · Minimum ₦1,000 if paid
          </span>
          {errors.monthly_price && <span style={{ fontSize: "11px", color: "#EF4444", marginTop: "2px", display: "block" }}>{errors.monthly_price}</span>}
        </div>

        {/* Bundle Pricing */}
        <div>
          <div style={{ marginBottom: "10px" }}>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#F1F5F9" }}>Bundle Pricing</span>
            <p style={{ fontSize: "12px", color: "#6B6B8A", margin: "2px 0 0" }}>Optional — reward subscribers with discounts</p>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            {/* 3 Months */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "12px", color: "#A3A3C2", marginBottom: "6px", display: "flex", alignItems: "center" }}>
                3 months ₦{discountBadge(threeMonthDiscount)}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#141420", border: "1.5px solid #2A2A3D", borderRadius: "10px", padding: "10px 12px" }}>
                <button type="button" disabled={threeMonthDiscount >= MAX_DISCOUNT} onClick={() => setThreeMonthDiscount((d) => Math.min(d + STEP, MAX_DISCOUNT))} style={bundleBtnStyle(threeMonthDiscount < MAX_DISCOUNT)}>
                  <Minus size={12} />
                </button>
                <span style={{ flex: 1, textAlign: "center", fontSize: "14px", color: "#F1F5F9", fontWeight: 500 }}>{formatNaira(threeMonthPrice)}</span>
                <button type="button" disabled={threeMonthDiscount === 0} onClick={() => setThreeMonthDiscount((d) => Math.max(d - STEP, 0))} style={bundleBtnStyle(threeMonthDiscount > 0)}>
                  <Plus size={12} />
                </button>
              </div>
            </div>
            {/* 6 Months */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "12px", color: "#A3A3C2", marginBottom: "6px", display: "flex", alignItems: "center" }}>
                6 months ₦{discountBadge(sixMonthDiscount)}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#141420", border: "1.5px solid #2A2A3D", borderRadius: "10px", padding: "10px 12px" }}>
                <button type="button" disabled={sixMonthDiscount >= MAX_DISCOUNT} onClick={() => setSixMonthDiscount((d) => Math.min(d + STEP, MAX_DISCOUNT))} style={bundleBtnStyle(sixMonthDiscount < MAX_DISCOUNT)}>
                  <Minus size={12} />
                </button>
                <span style={{ flex: 1, textAlign: "center", fontSize: "14px", color: "#F1F5F9", fontWeight: 500 }}>{formatNaira(sixMonthPrice)}</span>
                <button type="button" disabled={sixMonthDiscount === 0} onClick={() => setSixMonthDiscount((d) => Math.max(d - STEP, 0))} style={bundleBtnStyle(sixMonthDiscount > 0)}>
                  <Plus size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bio */}
        <div>
          <label style={labelStyle}>Bio</label>
          <textarea value={bio} onChange={(e) => { setBio(e.target.value); setErrors((prev) => ({ ...prev, bio: undefined })); }}
            placeholder="Tell subscribers what to expect from your page..." rows={4}
            style={{ ...inputBase, resize: "none", lineHeight: 1.6, border: `1.5px solid ${errors.bio ? "#EF4444" : "#2A2A3D"}` }}
          />
          {errors.bio && <span style={{ fontSize: "11px", color: "#EF4444", marginTop: "4px", display: "block" }}>{errors.bio}</span>}
        </div>

        <div style={{ height: "1px", backgroundColor: "#2A2A3D" }} />

        {/* Checkboxes */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {checkboxRow(confirmed18, () => { setConfirmed18((p) => !p); setErrors((prev) => ({ ...prev, confirmed_18: undefined })); },
            "I confirm I am at least 18 years old", errors.confirmed_18)}
          {checkboxRow(agreedTerms, () => { setAgreedTerms((p) => !p); setErrors((prev) => ({ ...prev, agreed_terms: undefined })); },
            <span>I agree to Freya's{" "}
              <Link href="/terms" style={{ color: "#8B5CF6", textDecoration: "none" }} onClick={(e) => e.stopPropagation()}>Terms of Service</Link>{" "}
              and{" "}
              <Link href="/creator-policy" style={{ color: "#8B5CF6", textDecoration: "none" }} onClick={(e) => e.stopPropagation()}>Creator Policy</Link>
            </span>, errors.agreed_terms)}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "28px" }}>
        <button type="button" onClick={onBack} disabled={launching}
          style={{ padding: "10px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: 500, border: "1.5px solid #2A2A3D", cursor: launching ? "not-allowed" : "pointer", backgroundColor: "transparent", color: "#A3A3C2", fontFamily: "'Inter', sans-serif", opacity: launching ? 0.5 : 1 }}>
          ← Back
        </button>
        <button type="button" disabled={launching || !isFormValid}
          onClick={() => { if (validate()) onLaunch({ monthly_price: monthlyPrice, three_month_price: threeMonthPrice, six_month_price: sixMonthPrice, bio, confirmed_18: confirmed18, agreed_terms: agreedTerms }); }}
          style={{ padding: "11px 24px", borderRadius: "8px", fontSize: "14px", fontWeight: 600, border: "none", cursor: (launching || !isFormValid) ? "not-allowed" : "pointer", background: (launching || !isFormValid) ? "#3A2F6B" : "linear-gradient(to right, #8B5CF6, #EC4899)", color: "#FFFFFF", display: "flex", alignItems: "center", gap: "8px", boxShadow: (launching || !isFormValid) ? "none" : "0 4px 20px rgba(139,92,246,0.35)", fontFamily: "'Inter', sans-serif", opacity: (launching || !isFormValid) ? 0.5 : 1 }}>
          {launching ? "Launching..." : "🚀 Launch My Page"}
        </button>
      </div>
    </div>
  );
}