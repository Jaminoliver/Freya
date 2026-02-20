"use client";

import { useState } from "react";
import { Info } from "lucide-react";

interface Step2Data {
  bank_name: string;
  bank_code: string;
  account_number: string;
  resolved_account_name: string;
}

interface CreatorOnboardingStep2Props {
  onContinue: (data: Step2Data) => void;
  onBack: () => void;
  defaultValues?: Partial<Step2Data>;
}

export function CreatorOnboardingStep2({ onContinue, onBack, defaultValues = {} }: CreatorOnboardingStep2Props) {
  const [form, setForm] = useState<Step2Data>({
    bank_name: defaultValues.bank_name ?? "",
    bank_code: defaultValues.bank_code ?? "",
    account_number: defaultValues.account_number ?? "",
    resolved_account_name: defaultValues.resolved_account_name ?? "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof Step2Data, string>>>({});

  const set = (key: keyof Step2Data, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleAccountNumberChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    setForm((prev) => ({ ...prev, account_number: digits }));
    setErrors((prev) => ({ ...prev, account_number: undefined }));
  };

  const isFormValid =
    form.bank_name.trim().length > 0 &&
    form.account_number.length === 10 &&
    form.resolved_account_name.length > 0;

  const validate = (): boolean => {
    const e: Partial<Record<keyof Step2Data, string>> = {};
    if (!form.bank_name) e.bank_name = "Please select a bank";
    if (form.account_number.length !== 10) e.account_number = "Account number must be 10 digits";
    if (!form.resolved_account_name) e.resolved_account_name = "Account must be verified before continuing";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const inputBase: React.CSSProperties = {
    width: "100%", borderRadius: "10px", padding: "12px 14px", fontSize: "14px",
    outline: "none", backgroundColor: "#141420", border: "1.5px solid #2A2A3D",
    color: "#F1F5F9", boxSizing: "border-box", fontFamily: "'Inter', sans-serif", transition: "border-color 0.2s",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "13px", fontWeight: 500, color: "#8B5CF6", marginBottom: "6px", display: "block",
  };

  const errMsg = (key: keyof Step2Data) =>
    errors[key] ? <span style={{ fontSize: "11px", color: "#EF4444", marginTop: "4px", display: "block" }}>{errors[key]}</span> : null;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#F1F5F9", margin: "0 0 3px" }}>Payout Details</h2>
        <p style={{ fontSize: "13px", color: "#A3A3C2", margin: 0 }}>Set up how you'll receive your earnings</p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", backgroundColor: "rgba(139,92,246,0.08)", border: "1.5px solid rgba(139,92,246,0.2)", borderRadius: "10px", padding: "12px 14px", marginBottom: "20px" }}>
        <Info size={15} style={{ color: "#8B5CF6", flexShrink: 0 }} />
        <span style={{ fontSize: "13px", color: "#A3A3C2", lineHeight: 1.5 }}>Payouts are sent every Monday directly to your Nigerian bank account.</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div>
          <label style={labelStyle}>Bank Name</label>
          <input
            type="text"
            value={form.bank_name}
            onChange={(e) => { set("bank_name", e.target.value); }}
            placeholder="e.g. Zenith Bank, GTBank, Access Bank"
            style={{ ...inputBase, border: `1.5px solid ${errors.bank_name ? "#EF4444" : "#2A2A3D"}` }}
          />
          {errMsg("bank_name")}
        </div>

        <div>
          <label style={labelStyle}>Account Number</label>
          <input type="text" inputMode="numeric" value={form.account_number}
            onChange={(e) => handleAccountNumberChange(e.target.value)}
            placeholder="Enter 10-digit account number" maxLength={10}
            style={{ ...inputBase, border: `1.5px solid ${errors.account_number ? "#EF4444" : "#2A2A3D"}`, letterSpacing: "0.5px" }}
          />
          {errMsg("account_number")}
        </div>

        <div>
          <label style={labelStyle}>Account Name</label>
          <input
            type="text"
            value={form.resolved_account_name}
            onChange={(e) => set("resolved_account_name", e.target.value)}
            placeholder="Full name on your bank account"
            style={{ ...inputBase, border: `1.5px solid ${errors.resolved_account_name ? "#EF4444" : "#2A2A3D"}` }}
          />
          {errMsg("resolved_account_name")}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "28px" }}>
        <button type="button" onClick={onBack}
          style={{ padding: "10px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: 500, border: "1.5px solid #2A2A3D", cursor: "pointer", backgroundColor: "transparent", color: "#A3A3C2", fontFamily: "'Inter', sans-serif" }}>
          ← Back
        </button>
        <button type="button" onClick={() => { if (validate()) onContinue(form); }}
          disabled={!isFormValid}
          style={{ padding: "11px 24px", borderRadius: "8px", fontSize: "14px", fontWeight: 600, border: "none", cursor: isFormValid ? "pointer" : "not-allowed", backgroundColor: isFormValid ? "#8B5CF6" : "#3A2F6B", color: "#FFFFFF", boxShadow: isFormValid ? "0 4px 20px rgba(139,92,246,0.3)" : "none", fontFamily: "'Inter', sans-serif", opacity: isFormValid ? 1 : 0.5 }}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}