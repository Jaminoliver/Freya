"use client";

import { useState, useEffect, useCallback } from "react";
import { MoreVertical, Plus } from "lucide-react";

type PayoutsTab = "request" | "history" | "settings";

const fmt = (n: number) =>
  "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TABS: { key: PayoutsTab; label: string }[] = [
  { key: "request",  label: "Request Payout"  },
  { key: "history",  label: "Payout History"  },
  { key: "settings", label: "Payout Settings" },
];

const SAMPLE_HISTORY = [
  { id: "1", amount: 15000, date: "Feb 18, 2026", bank: "GTBank •••• 4521", status: "completed" },
  { id: "2", amount: 8000,  date: "Feb 10, 2026", bank: "GTBank •••• 4521", status: "completed" },
  { id: "3", amount: 5000,  date: "Jan 28, 2026", bank: "GTBank •••• 4521", status: "failed"    },
];

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  completed: { color: "#10B981", bg: "rgba(16,185,129,0.1)" },
  pending:   { color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
  failed:    { color: "#EF4444", bg: "rgba(239,68,68,0.1)"  },
};

interface BankOption {
  name: string;
  code: string;
}

interface BankAccount {
  id: number;
  bank_name: string;
  bank_code: string;
  account_number: string;
  account_name: string;
  is_primary: boolean;
}

export default function PayoutsSettings({ onBack }: { onBack?: () => void }) {
  const [activeTab, setActiveTab] = useState<PayoutsTab>("request");
  const [formOpen, setFormOpen] = useState(false);
  const [savedBanks, setSavedBanks] = useState<BankAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/payout/accounts");
      const data = await res.json();
      if (data.accounts) setSavedBanks(data.accounts);
    } catch (err) {
      console.error("Failed to fetch accounts", err);
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const goToSettingsAndOpenForm = () => {
    setActiveTab("settings");
    setFormOpen(true);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "0 0 16px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6B8A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#F1F5F9", margin: 0, fontFamily: "'Inter', sans-serif" }}>
          Payouts
        </h2>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid #1E1E2E", marginBottom: "20px", overflowX: "auto", scrollbarWidth: "none" }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "8px 14px", fontSize: "13px", fontWeight: 500,
              fontFamily: "'Inter', sans-serif", background: "none", border: "none",
              cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
              color: activeTab === tab.key ? "#8B5CF6" : "#64748B",
              borderBottom: activeTab === tab.key ? "2px solid #8B5CF6" : "2px solid transparent",
              marginBottom: "-1px", transition: "color 0.15s ease",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "request" && (
        <RequestTab savedBanks={savedBanks} onAddBank={goToSettingsAndOpenForm} loading={loadingAccounts} />
      )}
      {activeTab === "history" && <HistoryTab />}
      {activeTab === "settings" && (
        <SettingsTab
          savedBanks={savedBanks}
          setSavedBanks={setSavedBanks}
          formOpen={formOpen}
          setFormOpen={setFormOpen}
          onRefresh={fetchAccounts}
        />
      )}
    </div>
  );
}

// ── Request Payout ─────────────────────────────────────────────────────────
function RequestTab({
  savedBanks,
  onAddBank,
  loading,
}: {
  savedBanks: BankAccount[];
  onAddBank: () => void;
  loading: boolean;
}) {
  const [amount, setAmount] = useState("");
  const hasBankAccount = savedBanks.length > 0;
  const defaultBank = savedBanks.find((b) => b.is_primary) ?? savedBanks[0];
  const fee = 10;
  const numAmount = parseFloat(amount) || 0;
  const youReceive = numAmount > fee ? numAmount - fee : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "14px", borderBottom: "1px solid #1E1E2E" }}>
        <span style={{ fontSize: "13px", color: "#94A3B8", fontFamily: "'Inter', sans-serif" }}>Available for Withdrawal</span>
        <span style={{ fontSize: "16px", fontWeight: 700, color: "#10B981", fontFamily: "'Inter', sans-serif" }}>{fmt(0)}</span>
      </div>

      <div>
        <p style={{ fontSize: "12px", fontWeight: 600, color: "#94A3B8", margin: "0 0 8px", fontFamily: "'Inter', sans-serif" }}>Amount</p>
        <input
          type="number" placeholder="Enter amount (min ₦5,000)" value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{ width: "100%", borderRadius: "10px", padding: "12px 14px", fontSize: "14px", outline: "none", backgroundColor: "#141420", border: "1.5px solid #2A2A3D", color: "#F1F5F9", boxSizing: "border-box", fontFamily: "'Inter', sans-serif" }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")}
        />
        <p style={{ fontSize: "11px", color: "#6B6B8A", margin: "6px 0 0", fontFamily: "'Inter', sans-serif" }}>Minimum withdrawal: ₦5,000</p>
      </div>

      <div>
        <p style={{ fontSize: "12px", fontWeight: 600, color: "#94A3B8", margin: "0 0 8px", fontFamily: "'Inter', sans-serif" }}>Payout to</p>
        {loading ? (
          <div style={{ backgroundColor: "#1C1C2E", borderRadius: "10px", padding: "16px 14px", textAlign: "center" }}>
            <span style={{ fontSize: "12px", color: "#6B6B8A", fontFamily: "'Inter', sans-serif" }}>Loading...</span>
          </div>
        ) : hasBankAccount ? (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", backgroundColor: "#1C1C2E", border: "1.5px solid #2A2A3D", borderRadius: "10px", padding: "12px 14px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "#8B5CF620", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#8B5CF6" }}>{defaultBank.bank_name.slice(0, 2).toUpperCase()}</span>
            </div>
            <div>
              <p style={{ margin: "0 0 1px", fontSize: "13px", fontWeight: 600, color: "#F1F5F9", fontFamily: "'Inter', sans-serif" }}>{defaultBank.bank_name}</p>
              <p style={{ margin: 0, fontSize: "11px", color: "#6B6B8A", fontFamily: "'Inter', sans-serif" }}>•••• {defaultBank.account_number.slice(-4)} · {defaultBank.account_name}</p>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", backgroundColor: "rgba(245,158,11,0.06)", border: "1.5px solid rgba(245,158,11,0.25)", borderRadius: "10px", padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span style={{ fontSize: "12px", color: "#F59E0B", fontFamily: "'Inter', sans-serif" }}>No bank account added</span>
            </div>
            <button onClick={onAddBank} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: "#8B5CF6", fontWeight: 600, fontFamily: "'Inter', sans-serif", padding: 0, whiteSpace: "nowrap" }}>
              Add bank account
            </button>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: "12px", color: "#6B6B8A", fontFamily: "'Inter', sans-serif" }}>Transfer fee:</span>
          <span style={{ fontSize: "12px", color: "#6B6B8A", fontFamily: "'Inter', sans-serif" }}>₦10 flat</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#F1F5F9", fontFamily: "'Inter', sans-serif" }}>You receive:</span>
          <span style={{ fontSize: "13px", fontWeight: 700, color: youReceive > 0 ? "#10B981" : "#6B6B8A", fontFamily: "'Inter', sans-serif" }}>
            {youReceive > 0 ? fmt(youReceive) : "₦—"}
          </span>
        </div>
      </div>

      <button
        disabled={!hasBankAccount || numAmount < 5000}
        style={{
          width: "100%", padding: "13px", borderRadius: "10px", border: "none",
          backgroundColor: hasBankAccount && numAmount >= 5000 ? "#8B5CF6" : "#1C1C2E",
          color: hasBankAccount && numAmount >= 5000 ? "#fff" : "#6B6B8A",
          fontSize: "14px", fontWeight: 600,
          cursor: hasBankAccount && numAmount >= 5000 ? "pointer" : "not-allowed",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {!hasBankAccount ? "Add bank account to enable" : numAmount < 5000 ? "Minimum ₦5,000" : "Request Payout"}
      </button>

      <p style={{ fontSize: "11px", color: "#6B6B8A", textAlign: "center", margin: 0, fontFamily: "'Inter', sans-serif" }}>
        Payouts are processed within 1–3 business days.
      </p>
    </div>
  );
}

// ── Payout History ─────────────────────────────────────────────────────────
function HistoryTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {SAMPLE_HISTORY.map((item) => {
        const ss = STATUS_STYLE[item.status];
        return (
          <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", padding: "12px 0", borderBottom: "1px solid #1E1E2E" }}>
            <div>
              <p style={{ margin: "0 0 2px", fontSize: "13px", fontWeight: 600, color: "#F1F5F9", fontFamily: "'Inter', sans-serif" }}>{fmt(item.amount)}</p>
              <p style={{ margin: 0, fontSize: "11px", color: "#6B6B8A", fontFamily: "'Inter', sans-serif" }}>{item.bank} · {item.date}</p>
            </div>
            <span style={{ fontSize: "11px", fontWeight: 600, color: ss.color, backgroundColor: ss.bg, borderRadius: "5px", padding: "2px 8px", fontFamily: "'Inter', sans-serif", textTransform: "capitalize", flexShrink: 0 }}>
              {item.status}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Payout Settings ────────────────────────────────────────────────────────
function SettingsTab({
  savedBanks,
  setSavedBanks,
  formOpen,
  setFormOpen,
  onRefresh,
}: {
  savedBanks: BankAccount[];
  setSavedBanks: React.Dispatch<React.SetStateAction<BankAccount[]>>;
  formOpen: boolean;
  setFormOpen: (v: boolean) => void;
  onRefresh: () => Promise<void>;
}) {
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);

  const existingAccount = savedBanks[0] ?? null;

  const [accountNumber, setAccountNumber] = useState(existingAccount?.account_number ?? "");
  const [bankCode, setBankCode] = useState(existingAccount?.bank_code ?? "");
  const [bankName, setBankName] = useState(existingAccount?.bank_name ?? "");
  const [accountName, setAccountName] = useState(existingAccount?.account_name ?? "");
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [focused, setFocused] = useState<string | null>(null);

  // Fetch bank list when form opens
  useEffect(() => {
    if (!formOpen || banks.length > 0) return;
    setLoadingBanks(true);
    fetch("/api/banks")
      .then((r) => r.json())
      .then((d) => { if (d.banks) setBanks(d.banks); })
      .catch(() => {})
      .finally(() => setLoadingBanks(false));
  }, [formOpen, banks.length]);

  const resolveAccount = useCallback(async (accNum: string, code: string) => {
    if (accNum.length !== 10 || !code) return;
    setResolving(true);
    setResolveError("");
    setAccountName("");
    try {
      const res = await fetch("/api/payout/name-enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountNumber: accNum, bankCode: code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResolveError(data.error || "Could not resolve account");
      } else {
        setAccountName(data.accountName);
      }
    } catch {
      setResolveError("Network error — try again");
    } finally {
      setResolving(false);
    }
  }, []);

  const handleAccountNumber = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 10);
    setAccountNumber(digits);
    setAccountName("");
    setResolveError("");
    if (digits.length === 10 && bankCode) resolveAccount(digits, bankCode);
  };

  const handleBankChange = (code: string, name: string) => {
    setBankCode(code);
    setBankName(name);
    setAccountName("");
    setResolveError("");
    if (accountNumber.length === 10 && code) resolveAccount(accountNumber, code);
  };

  const canSave = accountNumber.length === 10 && bankCode && accountName && !resolving && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/payout/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankName, bankCode, accountNumber, accountName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || "Failed to save account");
        return;
      }
      await onRefresh();
      setFormOpen(false);
      setAccountNumber("");
      setBankCode("");
      setBankName("");
      setAccountName("");
    } catch {
      setSaveError("Network error — try again");
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (accountId: number) => {
    setMenuOpen(null);
    try {
      const res = await fetch("/api/payout/set-default", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      if (res.ok) {
        setSavedBanks((prev) => prev.map((b) => ({ ...b, is_primary: b.id === accountId })));
      }
    } catch (err) {
      console.error("Set default failed", err);
    }
  };

  const handleRemove = async (accountId: number) => {
    setMenuOpen(null);
    try {
      const res = await fetch("/api/payout/remove", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      if (res.ok) await onRefresh();
    } catch (err) {
      console.error("Remove failed", err);
    }
  };

  const inputStyle = (field: string): React.CSSProperties => ({
    width: "100%", backgroundColor: "transparent", border: "none",
    borderBottom: `1px solid ${focused === field ? "#8B5CF6" : "#2A2A3D"}`,
    borderRadius: 0, padding: "8px 0", fontSize: "13px", color: "#F1F5F9",
    outline: "none", boxSizing: "border-box", fontFamily: "'Inter', sans-serif",
    transition: "border-color 0.2s",
  });

  return (
    <div>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <p style={{ fontSize: "10px", fontWeight: 600, color: "#6B6B8A", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0, fontFamily: "'Inter', sans-serif" }}>
          Bank Accounts
        </p>
        <button
          onClick={() => { setFormOpen(!formOpen); setSaveError(""); setResolveError(""); }}
          style={{
            display: "flex", alignItems: "center", gap: "5px",
            padding: "7px 14px", borderRadius: "8px",
            backgroundColor: formOpen ? "transparent" : "#8B5CF6",
            color: formOpen ? "#6B6B8A" : "#fff",
            border: formOpen ? "1px solid #2A2A3D" : "none",
            fontSize: "13px", fontWeight: 600, cursor: "pointer",
            fontFamily: "'Inter', sans-serif", transition: "all 0.2s",
          }}
        >
          {formOpen ? "Cancel" : savedBanks.length > 0 ? "Edit" : <><Plus size={13} /> Add Account</>}
        </button>
      </div>

      {/* Add account form */}
      {formOpen && (
        <div style={{ backgroundColor: "#0D0D18", border: "1.5px solid #2A2A3D", borderRadius: "10px", padding: "20px 16px", marginBottom: "14px" }}>
          <p style={{ fontSize: "11px", fontWeight: 500, color: "#6B6B8A", margin: "0 0 16px", letterSpacing: "0.04em", fontFamily: "'Inter', sans-serif" }}>
            Bank account details
          </p>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "11px", color: "#6B6B8A", display: "block", marginBottom: "4px", fontFamily: "'Inter', sans-serif" }}>Account number</label>
            <input
              type="text" inputMode="numeric" placeholder="10-digit account number"
              value={accountNumber} onChange={(e) => handleAccountNumber(e.target.value)}
              onFocus={() => setFocused("account")} onBlur={() => setFocused(null)}
              style={inputStyle("account")}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "11px", color: "#6B6B8A", display: "block", marginBottom: "4px", fontFamily: "'Inter', sans-serif" }}>Bank</label>
            {loadingBanks ? (
              <p style={{ fontSize: "13px", color: "#6B6B8A", margin: 0, fontFamily: "'Inter', sans-serif" }}>Loading banks...</p>
            ) : (
              <select
                value={bankCode}
                onChange={(e) => {
                  const selected = banks.find((b) => b.code === e.target.value);
                  if (selected) handleBankChange(selected.code, selected.name);
                }}
                onFocus={() => setFocused("bank")} onBlur={() => setFocused(null)}
                style={{ ...inputStyle("bank"), cursor: "pointer", appearance: "none" as const }}
              >
                <option value="" style={{ backgroundColor: "#0D0D18" }}>Select bank...</option>
                {banks.map((b, i) => (
                  <option key={b.code + "-" + i} value={b.code} style={{ backgroundColor: "#0D0D18" }}>{b.name}</option>
                ))}
              </select>
            )}
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ fontSize: "11px", color: "#6B6B8A", display: "block", marginBottom: "4px", fontFamily: "'Inter', sans-serif" }}>Account name</label>
            <div style={{ borderBottom: `1px solid ${resolveError ? "#EF4444" : "#2A2A3D"}`, padding: "8px 0", minHeight: "34px", display: "flex", alignItems: "center" }}>
              {resolving ? (
                <span style={{ fontSize: "12px", color: "#6B6B8A", fontStyle: "italic", fontFamily: "'Inter', sans-serif" }}>Resolving...</span>
              ) : resolveError ? (
                <span style={{ fontSize: "12px", color: "#EF4444", fontFamily: "'Inter', sans-serif" }}>{resolveError}</span>
              ) : accountName ? (
                <span style={{ fontSize: "13px", color: "#10B981", fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>{accountName}</span>
              ) : (
                <span style={{ fontSize: "13px", color: "#4A4A6A", fontFamily: "'Inter', sans-serif" }}>Auto-filled after account lookup</span>
              )}
            </div>
          </div>

          {saveError && (
            <p style={{ fontSize: "12px", color: "#EF4444", margin: "0 0 10px", fontFamily: "'Inter', sans-serif" }}>{saveError}</p>
          )}

          <button
            onClick={handleSave} disabled={!canSave}
            style={{
              width: "100%", padding: "11px", borderRadius: "8px", border: "none",
              backgroundColor: canSave ? "#8B5CF6" : "#1E1E2E",
              color: canSave ? "#fff" : "#6B6B8A",
              fontSize: "13px", fontWeight: 600,
              cursor: canSave ? "pointer" : "not-allowed",
              fontFamily: "'Inter', sans-serif", marginBottom: "10px",
            }}
          >
            {saving ? "Saving..." : "Save Account"}
          </button>

          <p style={{ fontSize: "11px", color: "#6B6B8A", textAlign: "center", margin: 0, fontFamily: "'Inter', sans-serif" }}>
            Verified by Paystack
          </p>
        </div>
      )}

      {/* Saved bank list */}
      {savedBanks.length === 0 && !formOpen ? (
        <div style={{ backgroundColor: "#1C1C2E", border: "1.5px dashed #2A2A3D", borderRadius: "10px", padding: "32px 16px", textAlign: "center" }}>
          <p style={{ fontSize: "13px", color: "#6B6B8A", margin: 0, fontFamily: "'Inter', sans-serif" }}>No bank accounts added yet</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {savedBanks.map((b) => (
            <div key={b.id} style={{ display: "flex", alignItems: "center", gap: "12px", backgroundColor: "#1C1C2E", border: "1.5px solid #2A2A3D", borderRadius: "10px", padding: "12px 14px", position: "relative" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "rgba(139,92,246,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#8B5CF6", fontFamily: "'Inter', sans-serif" }}>{b.bank_name.slice(0, 2).toUpperCase()}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: "0 0 1px", fontSize: "13px", fontWeight: 600, color: "#F1F5F9", fontFamily: "'Inter', sans-serif" }}>{b.bank_name}</p>
                <p style={{ margin: 0, fontSize: "11px", color: "#6B6B8A", fontFamily: "'Inter', sans-serif" }}>•••• {b.account_number.slice(-4)} · {b.account_name}</p>
              </div>
              {b.is_primary && (
                <span style={{ fontSize: "10px", fontWeight: 600, color: "#8B5CF6", border: "1.5px solid #8B5CF6", borderRadius: "5px", padding: "2px 8px", fontFamily: "'Inter', sans-serif", flexShrink: 0 }}>
                  Default
                </span>
              )}
              <div style={{ position: "relative" }}>
                <button onClick={() => setMenuOpen(menuOpen === b.id ? null : b.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B6B8A", display: "flex", padding: "2px 4px" }}>
                  <MoreVertical size={16} />
                </button>
                {menuOpen === b.id && (
                  <div style={{ position: "absolute", right: 0, top: "100%", backgroundColor: "#1C1C2E", border: "1.5px solid #2A2A3D", borderRadius: "8px", minWidth: "140px", zIndex: 10, overflow: "hidden" }}>
                    {!b.is_primary && (
                      <button
                        onClick={() => handleSetDefault(b.id)}
                        style={{ width: "100%", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "#F1F5F9", fontFamily: "'Inter', sans-serif", textAlign: "left" }}
                      >
                        Set as Default
                      </button>
                    )}
                    <button
                      onClick={() => handleRemove(b.id)}
                      style={{ width: "100%", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "#EF4444", fontFamily: "'Inter', sans-serif", textAlign: "left" }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}