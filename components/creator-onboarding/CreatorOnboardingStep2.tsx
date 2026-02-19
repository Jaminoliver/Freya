"use client";

import { useState } from "react";
import { ChevronDown, Info, Check, Loader2 } from "lucide-react";

const NIGERIAN_BANKS = [
  "Access Bank", "Citibank Nigeria", "Ecobank Nigeria", "Fidelity Bank",
  "First Bank of Nigeria", "First City Monument Bank (FCMB)", "Globus Bank",
  "Guaranty Trust Bank (GTBank)", "Heritage Bank", "Keystone Bank",
  "Kuda Bank", "Moniepoint MFB", "Opay", "Palmpay", "Polaris Bank",
  "Providus Bank", "Stanbic IBTC Bank", "Standard Chartered Bank",
  "Sterling Bank", "SunTrust Bank", "Titan Trust Bank", "Union Bank of Nigeria",
  "United Bank for Africa (UBA)", "Unity Bank", "VFD Microfinance Bank",
  "Wema Bank", "Zenith Bank",
];

interface Step2Data {
  legal_name: string;
  bank_name: string;
  account_number: string;
  resolved_account_name: string;
}

interface CreatorOnboardingStep2Props {
  onContinue: (data: Step2Data) => void;
  onBack: () => void;
  defaultValues?: Partial<Step2Data>;
}

export function CreatorOnboardingStep2({
  onContinue,
  onBack,
  defaultValues = {},
}: CreatorOnboardingStep2Props) {
  const [form, setForm] = useState<Step2Data>({
    legal_name: defaultValues.legal_name ?? "",
    bank_name: defaultValues.bank_name ?? "",
    account_number: defaultValues.account_number ?? "",
    resolved_account_name: defaultValues.resolved_account_name ?? "",
  });

  const [bankOpen, setBankOpen] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const set = (key: keyof Step2Data, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const resolveAccount = async (accountNumber: string) => {
    if (accountNumber.length !== 10 || !form.bank_name) return;
    setResolving(true);
    setResolveError(null);
    set("resolved_account_name", "");
    try {
      // TODO: Replace with real API route
      // const res = await fetch(`/api/paystack/resolve-account?account_number=${accountNumber}&bank_name=${encodeURIComponent(form.bank_name)}`);
      // const data = await res.json();
      // if (data.account_name) set("resolved_account_name", data.account_name);
      // else setResolveError("Could not verify account.");
      await new Promise((r) => setTimeout(r, 1200));
      setResolveError("Connect your API to resolve account names.");
    } catch {
      setResolveError("Could not verify account. Please check details.");
    } finally {
      setResolving(false);
    }
  };

  const handleAccountNumberChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    set("account_number", digits);
    set("resolved_account_name", "");
    setResolveError(null);
    if (digits.length === 10) resolveAccount(digits);
  };

  const inputBase: React.CSSProperties = {
    width: "100%",
    borderRadius: "10px",
    padding: "12px 14px",
    fontSize: "14px",
    outline: "none",
    backgroundColor: "#141420",
    border: "1.5px solid #2A2A3D",
    color: "#F1F5F9",
    boxSizing: "border-box",
    fontFamily: "'Inter', sans-serif",
    transition: "border-color 0.2s",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "13px",
    fontWeight: 500,
    color: "#8B5CF6",
    marginBottom: "6px",
    display: "block",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#F1F5F9", margin: "0 0 3px" }}>
          Payout Details
        </h2>
        <p style={{ fontSize: "13px", color: "#A3A3C2", margin: 0 }}>
          Set up how you'll receive your earnings
        </p>
      </div>

      {/* Info banner */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", backgroundColor: "rgba(139,92,246,0.08)", border: "1.5px solid rgba(139,92,246,0.2)", borderRadius: "10px", padding: "12px 14px", marginBottom: "20px" }}>
        <Info size={15} style={{ color: "#8B5CF6", flexShrink: 0 }} />
        <span style={{ fontSize: "13px", color: "#A3A3C2", lineHeight: 1.5 }}>
          Payouts are sent every Monday directly to your Nigerian bank account.
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

        <div>
          <label style={labelStyle}>Legal Full Name</label>
          <input
            type="text"
            value={form.legal_name}
            onChange={(e) => set("legal_name", e.target.value)}
            placeholder="Full name exactly as on your bank account"
            style={inputBase}
          />
        </div>

        <div>
          <label style={labelStyle}>Bank Name</label>
          <div style={{ position: "relative" }}>
            <div
              onClick={() => setBankOpen((p) => !p)}
              style={{ ...inputBase, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", border: `1.5px solid ${bankOpen ? "#8B5CF6" : "#2A2A3D"}`, userSelect: "none" }}
            >
              <span style={{ color: form.bank_name ? "#F1F5F9" : "#6B6B8A", fontSize: "14px" }}>
                {form.bank_name || "Select your bank"}
              </span>
              <ChevronDown size={14} style={{ color: "#6B6B8A", transform: bankOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }} />
            </div>
            {bankOpen && (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, backgroundColor: "#1C1C2E", border: "1.5px solid #2A2A3D", borderRadius: "10px", zIndex: 50, maxHeight: "200px", overflowY: "auto", scrollbarWidth: "none" }}>
                {NIGERIAN_BANKS.map((bank) => (
                  <div
                    key={bank}
                    onClick={() => { set("bank_name", bank); setBankOpen(false); if (form.account_number.length === 10) resolveAccount(form.account_number); }}
                    style={{ padding: "10px 14px", fontSize: "13px", color: form.bank_name === bank ? "#8B5CF6" : "#F1F5F9", backgroundColor: form.bank_name === bank ? "rgba(139,92,246,0.08)" : "transparent", cursor: "pointer", transition: "background-color 0.15s" }}
                    onMouseEnter={(e) => { if (form.bank_name !== bank) (e.currentTarget as HTMLDivElement).style.backgroundColor = "rgba(255,255,255,0.04)"; }}
                    onMouseLeave={(e) => { if (form.bank_name !== bank) (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent"; }}
                  >
                    {bank}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Account Number</label>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              inputMode="numeric"
              value={form.account_number}
              onChange={(e) => handleAccountNumberChange(e.target.value)}
              placeholder="Enter 10-digit account number"
              maxLength={10}
              style={{ ...inputBase, paddingRight: "40px", letterSpacing: "0.5px" }}
            />
            {resolving && (
              <div style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)" }}>
                <Loader2 size={14} style={{ color: "#8B5CF6", animation: "spin 0.9s linear infinite" }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}
          </div>
        </div>

        {/* Resolved Account Name */}
        <div style={{ borderRadius: "10px", padding: "12px 14px", backgroundColor: "#141420", border: `1.5px solid ${form.resolved_account_name ? "rgba(52,211,153,0.3)" : resolveError ? "rgba(239,68,68,0.3)" : "#2A2A3D"}`, display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: "46px", transition: "border-color 0.2s" }}>
          <span style={{ fontSize: "13px", color: "#6B6B8A" }}>Account Name</span>
          {form.resolved_account_name ? (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#34D399", letterSpacing: "0.3px" }}>{form.resolved_account_name}</span>
              <Check size={13} style={{ color: "#34D399" }} />
            </div>
          ) : resolveError ? (
            <span style={{ fontSize: "12px", color: "#EF4444" }}>{resolveError}</span>
          ) : resolving ? (
            <span style={{ fontSize: "12px", color: "#6B6B8A" }}>Verifying…</span>
          ) : null}
        </div>

      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "28px" }}>
        <button
          type="button"
          onClick={onBack}
          style={{ padding: "10px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: 500, border: "1.5px solid #2A2A3D", cursor: "pointer", backgroundColor: "transparent", color: "#A3A3C2", fontFamily: "'Inter', sans-serif" }}
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={() => onContinue(form)}
          style={{ padding: "11px 24px", borderRadius: "8px", fontSize: "14px", fontWeight: 600, border: "none", cursor: "pointer", backgroundColor: "#8B5CF6", color: "#FFFFFF", boxShadow: "0 4px 20px rgba(139,92,246,0.3)", fontFamily: "'Inter', sans-serif" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#7C3AED"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#8B5CF6"; }}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}