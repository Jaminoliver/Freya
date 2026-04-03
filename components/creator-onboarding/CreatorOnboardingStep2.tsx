"use client";

import { useState, useEffect } from "react";
import { Info } from "lucide-react";

interface Step2Data {
  bank_name: string;
  bank_code: string;
  account_number: string;
  resolved_account_name: string;
}

interface Bank {
  name: string;
  code: string;
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
  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksLoading, setBanksLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [bankSearch, setBankSearch] = useState(defaultValues.bank_name ?? "");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Fetch banks on mount
  useEffect(() => {
    fetch("/api/banks")
      .then((r) => r.json())
      .then((data) => setBanks(data.banks ?? []))
      .catch(() => setBanks([]))
      .finally(() => setBanksLoading(false));
  }, []);

  // Auto-verify when account number is 10 digits and bank is selected
  useEffect(() => {
    if (form.account_number.length === 10 && form.bank_code) {
      verifyAccount(form.account_number, form.bank_code);
    } else {
      setForm((prev) => ({ ...prev, resolved_account_name: "" }));
      setVerifyError("");
    }
  }, [form.account_number, form.bank_code]);

  const verifyAccount = async (accountNumber: string, bankCode: string) => {
    setVerifying(true);
    setVerifyError("");
    setForm((prev) => ({ ...prev, resolved_account_name: "" }));

    try {
      const res = await fetch("/api/banks/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountNumber, bankCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setVerifyError(data.error || "Could not verify account");
        return;
      }

      setForm((prev) => ({ ...prev, resolved_account_name: data.accountName }));
    } catch {
      setVerifyError("Network error. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const handleBankSelect = (bank: Bank) => {
    setForm((prev) => ({ ...prev, bank_name: bank.name, bank_code: bank.code }));
    setBankSearch(bank.name);
    setDropdownOpen(false);
    setErrors((prev) => ({ ...prev, bank_name: undefined }));
  };

  const handleAccountNumberChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    setForm((prev) => ({ ...prev, account_number: digits }));
    setErrors((prev) => ({ ...prev, account_number: undefined }));
  };

  const filteredBanks = banks.filter((b) =>
    b.name.toLowerCase().includes(bankSearch.toLowerCase())
  );

  const isFormValid =
    form.bank_name.trim().length > 0 &&
    form.bank_code.length > 0 &&
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
        <span style={{ fontSize: "13px", color: "#A3A3C2", lineHeight: 1.5 }}>Payouts are sent directly to your Nigerian bank account. Your account name will be verified automatically.</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {/* Bank Name — searchable dropdown */}
        <div style={{ position: "relative" }}>
          <label style={labelStyle}>Bank Name</label>
          <input
            type="text"
            value={bankSearch}
            onChange={(e) => {
              setBankSearch(e.target.value);
              setDropdownOpen(true);
              if (!e.target.value) {
                setForm((prev) => ({ ...prev, bank_name: "", bank_code: "" }));
              }
            }}
            onFocus={() => setDropdownOpen(true)}
            placeholder={banksLoading ? "Loading banks..." : "Search and select your bank"}
            style={{ ...inputBase, border: `1.5px solid ${errors.bank_name ? "#EF4444" : dropdownOpen ? "#8B5CF6" : "#2A2A3D"}` }}
            disabled={banksLoading}
          />
          {errMsg("bank_name")}

          {dropdownOpen && filteredBanks.length > 0 && (
            <>
              <div
                style={{ position: "fixed", inset: 0, zIndex: 99 }}
                onClick={() => setDropdownOpen(false)}
              />
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
                backgroundColor: "#141420", border: "1.5px solid #2A2A3D", borderRadius: "10px",
                maxHeight: "200px", overflowY: "auto", marginTop: "4px",
                scrollbarWidth: "thin", scrollbarColor: "#2A2A3D #141420",
              }}>
                {filteredBanks.map((bank) => (
                  <button
                    key={bank.code}
                    onClick={() => handleBankSelect(bank)}
                    style={{
                      width: "100%", padding: "10px 14px", border: "none", cursor: "pointer",
                      backgroundColor: form.bank_code === bank.code ? "rgba(139,92,246,0.1)" : "transparent",
                      color: form.bank_code === bank.code ? "#A78BFA" : "#F1F5F9",
                      fontSize: "13px", fontFamily: "'Inter', sans-serif", textAlign: "left",
                      borderBottom: "1px solid #1E1E2E",
                    }}
                  >
                    {bank.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Account Number */}
        <div>
          <label style={labelStyle}>Account Number</label>
          <input type="text" inputMode="numeric" value={form.account_number}
            onChange={(e) => handleAccountNumberChange(e.target.value)}
            placeholder="Enter 10-digit account number" maxLength={10}
            style={{ ...inputBase, border: `1.5px solid ${errors.account_number ? "#EF4444" : "#2A2A3D"}`, letterSpacing: "0.5px" }}
          />
          {errMsg("account_number")}
        </div>

        {/* Account Name — auto-filled, read-only */}
        <div>
          <label style={labelStyle}>Account Name</label>
          {verifying ? (
            <div style={{ ...inputBase, display: "flex", alignItems: "center", gap: "8px", color: "#6B6B8A" }}>
              <div style={{
                width: "14px", height: "14px", border: "2px solid #2A2A3D",
                borderTop: "2px solid #8B5CF6", borderRadius: "50%",
                animation: "spin 0.8s linear infinite", flexShrink: 0,
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <span style={{ fontSize: "13px" }}>Verifying account...</span>
            </div>
          ) : form.resolved_account_name ? (
            <div style={{
              ...inputBase,
              backgroundColor: "rgba(16,185,129,0.06)",
              border: "1.5px solid rgba(16,185,129,0.3)",
              color: "#10B981",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}>
              <span style={{ fontSize: "14px" }}>✓</span>
              {form.resolved_account_name}
            </div>
          ) : (
            <div style={{ ...inputBase, color: "#6B6B8A", fontSize: "13px" }}>
              {verifyError ? verifyError : "Select bank and enter account number to verify"}
            </div>
          )}
          {verifyError && (
            <span style={{ fontSize: "11px", color: "#EF4444", marginTop: "4px", display: "block" }}>{verifyError}</span>
          )}
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