"use client";

import { useState, useEffect, useRef } from "react";
import { Info, ChevronDown, Search } from "lucide-react";

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
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/banks")
      .then((r) => r.json())
      .then((data) => setBanks(data.banks ?? []))
      .catch(() => setBanks([]))
      .finally(() => setBanksLoading(false));
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
      if (!res.ok) { setVerifyError(data.error || "Could not verify account"); return; }
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
    width: "100%",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #1E1E2E",
    background: "#0C0C1A",
    color: "#E8E8F8",
    fontSize: "14px",
    fontFamily: "'Inter', sans-serif",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "12px",
    fontWeight: 600,
    color: "#A3A3C2",
    marginBottom: "6px",
    display: "block",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
  };

  const errMsg = (key: keyof Step2Data) =>
    errors[key] ? (
      <span style={{ fontSize: "11px", color: "#EF4444", marginTop: "4px", display: "block" }}>
        {errors[key]}
      </span>
    ) : null;

  return (
    <>
      <style>{`
        .step2-input::placeholder { color: #303048; }
        .bank-option:hover { background: rgba(139,92,246,0.08) !important; }
        .step2-search::placeholder { color: #303048; }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column" }}>

        {/* ── Section heading ── */}
        <div style={{ marginBottom: "22px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#F0F0FF", margin: "0 0 4px" }}>
            Payout Details
          </h2>
          <p style={{ fontSize: "13px", color: "#A3A3C2", margin: 0 }}>
            Set up how you&apos;ll receive your earnings
          </p>
        </div>

        {/* ── Info banner ── */}
        <div style={{
          display: "flex", alignItems: "flex-start", gap: "10px",
          background: "rgba(139,92,246,0.07)",
          border: "1px solid rgba(139,92,246,0.2)",
          borderRadius: "10px", padding: "12px 14px", marginBottom: "22px",
        }}>
          <Info size={14} style={{ color: "#8B5CF6", flexShrink: 0, marginTop: "1px" }} />
          <span style={{ fontSize: "13px", color: "#A3A3C2", lineHeight: 1.6 }}>
            Payouts are sent directly to your Nigerian bank account. Your account name will be verified automatically.
          </span>
        </div>

        {/* ── Fields ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Bank Name — searchable dropdown */}
          <div ref={dropdownRef}>
            <label style={labelStyle}>Bank Name</label>
            <div style={{ position: "relative" }}>
              <div
                onClick={() => !banksLoading && setDropdownOpen((p) => !p)}
                style={{
                  ...inputBase,
                  cursor: banksLoading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderColor: errors.bank_name ? "#EF4444" : dropdownOpen ? "#8B5CF6" : "#1E1E2E",
                  opacity: banksLoading ? 0.5 : 1,
                  userSelect: "none",
                }}
              >
                <span style={{ color: form.bank_name ? "#E8E8F8" : "#303048", fontSize: "14px" }}>
                  {banksLoading ? "Loading banks..." : form.bank_name || "Select your bank"}
                </span>
                <ChevronDown size={14} style={{
                  color: "#4A4A6A",
                  transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                  flexShrink: 0,
                }} />
              </div>

              {dropdownOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                  background: "#0F0F1E", border: "1px solid #1E1E2E",
                  borderRadius: "10px", zIndex: 50,
                  overflow: "hidden",
                }}>
                  {/* Search inside dropdown */}
                  <div style={{
                    padding: "10px 12px",
                    borderBottom: "1px solid #1E1E2E",
                    position: "relative",
                  }}>
                    <Search size={13} style={{
                      position: "absolute", left: "22px", top: "50%",
                      transform: "translateY(-50%)", color: "#4A4A6A", pointerEvents: "none",
                    }} />
                    <input
                      className="step2-search"
                      type="text"
                      value={bankSearch}
                      onChange={(e) => setBankSearch(e.target.value)}
                      placeholder="Search bank..."
                      autoFocus
                      style={{
                        ...inputBase,
                        padding: "8px 10px 8px 30px",
                        fontSize: "13px",
                        borderColor: "#1E1E2E",
                      }}
                    />
                  </div>
                  <div style={{ maxHeight: "180px", overflowY: "auto", scrollbarWidth: "none" }}>
                    {filteredBanks.length === 0 ? (
                      <div style={{ padding: "14px", fontSize: "13px", color: "#4A4A6A", textAlign: "center" }}>
                        No banks found
                      </div>
                    ) : (
                      filteredBanks.map((bank) => (
                        <div
                          key={bank.code}
                          className="bank-option"
                          onClick={() => handleBankSelect(bank)}
                          style={{
                            padding: "10px 14px", fontSize: "13px",
                            color: form.bank_code === bank.code ? "#8B5CF6" : "#E8E8F8",
                            background: form.bank_code === bank.code ? "rgba(139,92,246,0.1)" : "transparent",
                            cursor: "pointer",
                            borderBottom: "1px solid rgba(255,255,255,0.03)",
                          }}
                        >
                          {bank.name}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            {errMsg("bank_name")}
          </div>

          {/* Account Number */}
          <div>
            <label style={labelStyle}>Account Number</label>
            <input
              className="step2-input"
              type="text"
              inputMode="numeric"
              value={form.account_number}
              onChange={(e) => handleAccountNumberChange(e.target.value)}
              placeholder="Enter 10-digit account number"
              maxLength={10}
              style={{
                ...inputBase,
                letterSpacing: form.account_number ? "0.15em" : "normal",
                borderColor: errors.account_number ? "#EF4444" : "#1E1E2E",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")}
              onBlur={(e) => (e.currentTarget.style.borderColor = errors.account_number ? "#EF4444" : "#1E1E2E")}
            />
            {/* digit progress */}
            {form.account_number.length > 0 && form.account_number.length < 10 && (
              <span style={{ fontSize: "11px", color: "#4A4A6A", marginTop: "4px", display: "block" }}>
                {form.account_number.length}/10 digits
              </span>
            )}
            {errMsg("account_number")}
          </div>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "2px 0" }}>
            <div style={{ flex: 1, height: "1px", background: "#1C1C2E" }} />
            <span style={{ fontSize: "11px", color: "#6B6B8A", whiteSpace: "nowrap", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Verification
            </span>
            <div style={{ flex: 1, height: "1px", background: "#1C1C2E" }} />
          </div>

          {/* Account Name — auto-filled */}
          <div>
            <label style={labelStyle}>Account Name</label>
            {verifying ? (
              <div style={{
                ...inputBase,
                display: "flex", alignItems: "center", gap: "10px",
                color: "#6B6B8A", borderColor: "#8B5CF6",
              }}>
                <style>{`@keyframes spin2 { to { transform: rotate(360deg); } }`}</style>
                <div style={{
                  width: "14px", height: "14px",
                  border: "2px solid #1E1E2E",
                  borderTop: "2px solid #8B5CF6",
                  borderRadius: "50%",
                  animation: "spin2 0.8s linear infinite",
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: "13px", color: "#A3A3C2" }}>Verifying account…</span>
              </div>
            ) : form.resolved_account_name ? (
              <div style={{
                ...inputBase,
                background: "rgba(16,185,129,0.05)",
                border: "1px solid rgba(16,185,129,0.25)",
                color: "#10B981",
                fontWeight: 600,
                display: "flex", alignItems: "center", gap: "8px",
              }}>
                <span style={{ fontSize: "15px" }}>✓</span>
                {form.resolved_account_name}
              </div>
            ) : (
              <div style={{
                ...inputBase,
                color: verifyError ? "#EF4444" : "#4A4A6A",
                fontSize: "13px",
                borderColor: verifyError ? "rgba(239,68,68,0.3)" : "#1E1E2E",
              }}>
                {verifyError ? verifyError : "Select bank and enter account number to verify"}
              </div>
            )}
            {errMsg("resolved_account_name")}
          </div>

        </div>

        {/* ── Footer ── */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginTop: "28px", paddingTop: "20px",
          borderTop: "1px solid #1C1C2E",
        }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              padding: "11px 20px", borderRadius: "10px",
              fontSize: "14px", fontWeight: 600,
              border: "1px solid #1E1E2E", cursor: "pointer",
              background: "transparent", color: "#A3A3C2",
              fontFamily: "'Inter', sans-serif", transition: "all 0.2s",
            }}
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={() => { if (validate()) onContinue(form); }}
            disabled={!isFormValid}
            style={{
              padding: "11px 26px", borderRadius: "10px",
              fontSize: "14px", fontWeight: 600,
              border: "none", cursor: isFormValid ? "pointer" : "not-allowed",
              background: isFormValid ? "#8B5CF6" : "#2A2040",
              color: isFormValid ? "#FFFFFF" : "#4A3A70",
              boxShadow: isFormValid ? "0 4px 24px rgba(139,92,246,0.28)" : "none",
              fontFamily: "'Inter', sans-serif",
              transition: "all 0.2s",
            }}
          >
            Continue →
          </button>
        </div>

      </div>
    </>
  );
}