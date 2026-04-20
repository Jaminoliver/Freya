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

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  completed: { color: "#10B981", bg: "rgba(16,185,129,0.1)" },
  pending:   { color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
  processing:{ color: "#3B82F6", bg: "rgba(59,130,246,0.1)" },
  failed:    { color: "#EF4444", bg: "rgba(239,68,68,0.1)"  },
};

interface Bank { name: string; code: string; }

interface BankAccount {
  id: number; bank_name: string; bank_code: string;
  account_number: string; account_name: string; is_primary: boolean;
}

interface PayoutRow {
  id: string; amount: number; status: string; bank: string; date: string;
}

// ─── Skeleton ─────────────────────────────────

const SHIMMER_KEYFRAMES = `
@keyframes shimmer {
  0%   { background-position: -600px 0; }
  100% { background-position:  600px 0; }
}
`;

const shimmerStyle: React.CSSProperties = {
  backgroundImage: "linear-gradient(90deg, #0F0F1A 0px, #1A1A2E 80px, #0F0F1A 160px)",
  backgroundSize: "600px 100%",
  animation: "shimmer 1.6s infinite linear",
  borderRadius: "6px",
};

function SkeletonBlock({ width, height, style }: { width?: string | number; height?: string | number; style?: React.CSSProperties; }) {
  return <div style={{ ...shimmerStyle, width: width ?? "100%", height: height ?? "14px", borderRadius: "6px", ...style }} />;
}

function RequestSkeleton() {
  return (
    <>
      <style>{SHIMMER_KEYFRAMES}</style>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "14px", borderBottom: "1px solid #1E1E2E" }}>
          <SkeletonBlock width="40%" height={12} />
          <SkeletonBlock width="25%" height={18} />
        </div>
        <div>
          <SkeletonBlock width="20%" height={11} style={{ marginBottom: "8px" }} />
          <SkeletonBlock width="100%" height={46} style={{ borderRadius: "10px" }} />
          <SkeletonBlock width="45%" height={10} style={{ marginTop: "6px" }} />
        </div>
        <div>
          <SkeletonBlock width="20%" height={11} style={{ marginBottom: "8px" }} />
          <SkeletonBlock width="100%" height={58} style={{ borderRadius: "10px" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <SkeletonBlock width="25%" height={11} /><SkeletonBlock width="15%" height={11} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <SkeletonBlock width="20%" height={13} /><SkeletonBlock width="18%" height={13} />
          </div>
        </div>
        <SkeletonBlock width="100%" height={46} style={{ borderRadius: "10px" }} />
      </div>
    </>
  );
}

function HistorySkeleton() {
  return (
    <>
      <style>{SHIMMER_KEYFRAMES}</style>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", padding: "12px 0", borderBottom: "1px solid #1E1E2E" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <SkeletonBlock width="80px" height={13} />
              <SkeletonBlock width="120px" height={10} />
            </div>
            <SkeletonBlock width="60px" height={22} style={{ borderRadius: "5px" }} />
          </div>
        ))}
      </div>
    </>
  );
}

function SettingsSkeleton() {
  return (
    <>
      <style>{SHIMMER_KEYFRAMES}</style>
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <SkeletonBlock width="25%" height={11} />
          <SkeletonBlock width="80px" height={32} style={{ borderRadius: "8px" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {Array.from({ length: 2 }).map((_, i) => (
            <SkeletonBlock key={i} width="100%" height={64} style={{ borderRadius: "10px" }} />
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Main ─────────────────────────────────────

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

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const goToSettingsAndOpenForm = () => { setActiveTab("settings"); setFormOpen(true); };

  return (
    <div>
      <style>{SHIMMER_KEYFRAMES}</style>

      <div style={{ display: "flex", borderBottom: "1px solid #1E1E2E", marginBottom: "20px", overflowX: "auto", scrollbarWidth: "none" }}>
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: "8px 14px", fontSize: "13px", fontWeight: 500,
            fontFamily: "'Inter', sans-serif", background: "none", border: "none",
            cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
            color: activeTab === tab.key ? "#8B5CF6" : "#64748B",
            borderBottom: activeTab === tab.key ? "2px solid #8B5CF6" : "2px solid transparent",
            marginBottom: "-1px", transition: "color 0.15s ease",
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "request" && <RequestTab savedBanks={savedBanks} onAddBank={goToSettingsAndOpenForm} loading={loadingAccounts} />}
      {activeTab === "history" && <HistoryTab />}
      {activeTab === "settings" && <SettingsTab savedBanks={savedBanks} setSavedBanks={setSavedBanks} formOpen={formOpen} setFormOpen={setFormOpen} onRefresh={fetchAccounts} />}
    </div>
  );
}

// ── Request Payout ──────────────────────────────────────────────────────────
function RequestTab({ savedBanks, onAddBank, loading }: { savedBanks: BankAccount[]; onAddBank: () => void; loading: boolean; }) {
  const [amount, setAmount] = useState("");
  const [available, setAvailable] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch("/api/earnings/summary")
      .then((r) => r.json())
      .then((data) => setAvailable(data.available ?? 0))
      .catch(() => setAvailable(0))
      .finally(() => setLoadingBalance(false));
  }, []);

  if (loading || loadingBalance) return <RequestSkeleton />;

  const hasBankAccount = savedBanks.length > 0;
  const defaultBank = savedBanks.find((b) => b.is_primary) ?? savedBanks[0];
  const fee = 10;
  const numAmount = parseFloat(amount) || 0;
  const youReceive = numAmount > fee ? numAmount - fee : 0;
  const canSubmit = hasBankAccount && numAmount >= 5000 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true); setSubmitError("");
    try {
      const res = await fetch("/api/payout/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: numAmount }) });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error ?? "Request failed. Please try again."); return; }
      setSubmitted(true); setAmount("");
    } catch { setSubmitError("Network error — try again."); }
    finally { setSubmitting(false); }
  };

  if (submitted) {
    return (
      <div style={{ textAlign: "center", padding: "32px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
        <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
        </div>
        <p style={{ fontSize: "15px", fontWeight: 700, color: "#F1F5F9", margin: 0, fontFamily: "'Inter', sans-serif" }}>Payout Requested</p>
        <p style={{ fontSize: "13px", color: "#6B6B8A", margin: 0, fontFamily: "'Inter', sans-serif" }}>Your withdrawal is being processed. It will arrive within 1-3 business days.</p>
        <button onClick={() => setSubmitted(false)} style={{ marginTop: "8px", padding: "10px 24px", borderRadius: "8px", border: "1px solid #2A2A3D", backgroundColor: "transparent", color: "#94A3B8", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>Request Another</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "14px", borderBottom: "1px solid #1E1E2E" }}>
        <span style={{ fontSize: "13px", color: "#94A3B8", fontFamily: "'Inter', sans-serif" }}>Available for Withdrawal</span>
        <span style={{ fontSize: "16px", fontWeight: 700, color: "#10B981", fontFamily: "'Inter', sans-serif" }}>{fmt(available ?? 0)}</span>
      </div>
      <div>
        <p style={{ fontSize: "12px", fontWeight: 600, color: "#94A3B8", margin: "0 0 8px", fontFamily: "'Inter', sans-serif" }}>Amount</p>
        <input type="number" placeholder="Enter amount (min ₦5,000)" value={amount} onChange={(e) => { setAmount(e.target.value); setSubmitError(""); }}
          style={{ width: "100%", borderRadius: "10px", padding: "12px 14px", fontSize: "14px", outline: "none", backgroundColor: "#141420", border: "1.5px solid #2A2A3D", color: "#F1F5F9", boxSizing: "border-box", fontFamily: "'Inter', sans-serif" }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")} onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")} />
        <p style={{ fontSize: "11px", color: "#6B6B8A", margin: "6px 0 0", fontFamily: "'Inter', sans-serif" }}>Minimum withdrawal: ₦5,000</p>
      </div>
      <div>
        <p style={{ fontSize: "12px", fontWeight: 600, color: "#94A3B8", margin: "0 0 8px", fontFamily: "'Inter', sans-serif" }}>Payout to</p>
        {hasBankAccount ? (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", backgroundColor: "#1C1C2E", border: "1.5px solid #2A2A3D", borderRadius: "10px", padding: "12px 14px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "#8B5CF620", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#8B5CF6" }}>{defaultBank.bank_name.slice(0, 2).toUpperCase()}</span>
            </div>
            <div>
              <p style={{ margin: "0 0 1px", fontSize: "13px", fontWeight: 600, color: "#F1F5F9", fontFamily: "'Inter', sans-serif" }}>{defaultBank.bank_name}</p>
              <p style={{ margin: 0, fontSize: "11px", color: "#6B6B8A", fontFamily: "'Inter', sans-serif" }}>.... {defaultBank.account_number.slice(-4)} — {defaultBank.account_name}</p>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", backgroundColor: "rgba(245,158,11,0.06)", border: "1.5px solid rgba(245,158,11,0.25)", borderRadius: "10px", padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span style={{ fontSize: "12px", color: "#F59E0B", fontFamily: "'Inter', sans-serif" }}>No bank account added</span>
            </div>
            <button onClick={onAddBank} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: "#8B5CF6", fontWeight: 600, fontFamily: "'Inter', sans-serif", padding: 0, whiteSpace: "nowrap" }}>Add bank account</button>
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
          <span style={{ fontSize: "13px", fontWeight: 700, color: youReceive > 0 ? "#10B981" : "#6B6B8A", fontFamily: "'Inter', sans-serif" }}>{youReceive > 0 ? fmt(youReceive) : "₦-"}</span>
        </div>
      </div>
      {submitError && <p style={{ fontSize: "12px", color: "#EF4444", margin: 0, fontFamily: "'Inter', sans-serif" }}>{submitError}</p>}
      <button onClick={handleSubmit} disabled={!canSubmit} style={{ width: "100%", padding: "13px", borderRadius: "10px", border: "none", backgroundColor: canSubmit ? "#8B5CF6" : "#1C1C2E", color: canSubmit ? "#fff" : "#6B6B8A", fontSize: "14px", fontWeight: 600, cursor: canSubmit ? "pointer" : "not-allowed", fontFamily: "'Inter', sans-serif" }}>
        {submitting ? "Submitting..." : !hasBankAccount ? "Add bank account to enable" : numAmount < 5000 ? "Minimum ₦5,000" : "Request Payout"}
      </button>
      <p style={{ fontSize: "11px", color: "#6B6B8A", textAlign: "center", margin: 0, fontFamily: "'Inter', sans-serif" }}>Payouts are processed within 1-3 business days via Monnify.</p>
    </div>
  );
}

// ── Payout History ──────────────────────────────────────────────────────────
function HistoryTab() {
  const [history, setHistory] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/payout/history").then((r) => r.json()).then((data) => setHistory(data.history ?? [])).catch(() => setHistory([])).finally(() => setLoading(false));
  }, []);

  if (loading) return <HistorySkeleton />;

  if (history.length === 0) {
    return (
      <div style={{ backgroundColor: "#1C1C2E", border: "1.5px dashed #2A2A3D", borderRadius: "10px", padding: "32px 16px", textAlign: "center" }}>
        <p style={{ fontSize: "13px", color: "#6B6B8A", margin: 0, fontFamily: "'Inter', sans-serif" }}>No payouts yet</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {history.map((item) => {
        const ss = STATUS_STYLE[item.status] ?? STATUS_STYLE["pending"];
        return (
          <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", padding: "12px 0", borderBottom: "1px solid #1E1E2E" }}>
            <div>
              <p style={{ margin: "0 0 2px", fontSize: "13px", fontWeight: 600, color: "#F1F5F9", fontFamily: "'Inter', sans-serif" }}>{fmt(item.amount)}</p>
              <p style={{ margin: 0, fontSize: "11px", color: "#6B6B8A", fontFamily: "'Inter', sans-serif" }}>{item.bank} — {item.date}</p>
            </div>
            <span style={{ fontSize: "11px", fontWeight: 600, color: ss.color, backgroundColor: ss.bg, borderRadius: "5px", padding: "2px 8px", fontFamily: "'Inter', sans-serif", textTransform: "capitalize", flexShrink: 0 }}>{item.status}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Payout Settings ─────────────────────────────────────────────────────────
function SettingsTab({ savedBanks, setSavedBanks, formOpen, setFormOpen, onRefresh }: {
  savedBanks: BankAccount[]; setSavedBanks: React.Dispatch<React.SetStateAction<BankAccount[]>>;
  formOpen: boolean; setFormOpen: (v: boolean) => void; onRefresh: () => Promise<void>;
}) {
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankSearch, setBankSearch] = useState("");
  const [accountName, setAccountName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [focused, setFocused] = useState<string | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  useEffect(() => { setLoadingAccounts(false); }, [savedBanks]);

  useEffect(() => {
    if (formOpen && banks.length === 0) {
      setBanksLoading(true);
      fetch("/api/banks").then((r) => r.json()).then((data) => setBanks(data.banks ?? [])).catch(() => setBanks([])).finally(() => setBanksLoading(false));
    }
  }, [formOpen, banks.length]);

  useEffect(() => {
    if (accountNumber.length === 10 && bankCode) { verifyAccount(accountNumber, bankCode); }
    else { setAccountName(""); setVerifyError(""); }
  }, [accountNumber, bankCode]);

  const verifyAccount = async (accNum: string, bCode: string) => {
    setVerifying(true); setVerifyError(""); setAccountName("");
    try {
      const res = await fetch("/api/banks/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountNumber: accNum, bankCode: bCode }) });
      const data = await res.json();
      if (!res.ok) { setVerifyError(data.error || "Could not verify account"); return; }
      setAccountName(data.accountName);
    } catch { setVerifyError("Network error. Please try again."); }
    finally { setVerifying(false); }
  };

  const handleBankSelect = (bank: Bank) => { setBankName(bank.name); setBankCode(bank.code); setBankSearch(bank.name); setDropdownOpen(false); };
  const filteredBanks = banks.filter((b) => b.name.toLowerCase().includes(bankSearch.toLowerCase()));
  const canSave = accountNumber.length === 10 && bankCode && accountName && !saving && !verifying;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true); setSaveError("");
    try {
      const res = await fetch("/api/payout/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bankName, bankCode, accountNumber, accountName }) });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.error || "Failed to save account"); return; }
      await onRefresh(); setFormOpen(false);
      setAccountNumber(""); setBankName(""); setBankCode(""); setBankSearch(""); setAccountName("");
    } catch { setSaveError("Network error — try again"); }
    finally { setSaving(false); }
  };

  const handleSetDefault = async (accountId: number) => {
    setMenuOpen(null);
    try {
      const res = await fetch("/api/payout/set-default", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId }) });
      if (res.ok) setSavedBanks((prev) => prev.map((b) => ({ ...b, is_primary: b.id === accountId })));
    } catch (err) { console.error("Set default failed", err); }
  };

  const handleRemove = async (accountId: number) => {
    setMenuOpen(null);
    try {
      const res = await fetch("/api/payout/remove", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId }) });
      if (res.ok) await onRefresh();
    } catch (err) { console.error("Remove failed", err); }
  };

  const inputStyle = (field: string): React.CSSProperties => ({
    width: "100%", backgroundColor: "transparent", border: "none",
    borderBottom: `1px solid ${focused === field ? "#8B5CF6" : "#2A2A3D"}`,
    borderRadius: 0, padding: "8px 0", fontSize: "13px", color: "#F1F5F9",
    outline: "none", boxSizing: "border-box", fontFamily: "'Inter', sans-serif", transition: "border-color 0.2s",
  });

  if (loadingAccounts) return <SettingsSkeleton />;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <p style={{ fontSize: "10px", fontWeight: 600, color: "#6B6B8A", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0, fontFamily: "'Inter', sans-serif" }}>Bank Accounts</p>
        <button onClick={() => { setFormOpen(!formOpen); setSaveError(""); setVerifyError(""); }}
          style={{ display: "flex", alignItems: "center", gap: "5px", padding: "7px 14px", borderRadius: "8px", backgroundColor: formOpen ? "transparent" : "#8B5CF6", color: formOpen ? "#6B6B8A" : "#fff", border: formOpen ? "1px solid #2A2A3D" : "none", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "all 0.2s" }}>
          {formOpen ? "Cancel" : savedBanks.length > 0 ? "Edit" : <><Plus size={13} /> Add Account</>}
        </button>
      </div>

      {formOpen && (
        <div style={{ backgroundColor: "#0D0D18", border: "1.5px solid #2A2A3D", borderRadius: "10px", padding: "20px 16px", marginBottom: "14px" }}>
          <p style={{ fontSize: "11px", fontWeight: 500, color: "#6B6B8A", margin: "0 0 16px", letterSpacing: "0.04em", fontFamily: "'Inter', sans-serif" }}>Bank account details</p>
          <div style={{ marginBottom: "16px", position: "relative" }}>
            <label style={{ fontSize: "11px", color: "#6B6B8A", display: "block", marginBottom: "4px", fontFamily: "'Inter', sans-serif" }}>Bank name</label>
            <input type="text" placeholder={banksLoading ? "Loading banks..." : "Search and select bank"} value={bankSearch}
              onChange={(e) => { setBankSearch(e.target.value); setDropdownOpen(true); if (!e.target.value) { setBankName(""); setBankCode(""); } }}
              onFocus={() => setDropdownOpen(true)} disabled={banksLoading} style={inputStyle("bank")} />
            {dropdownOpen && filteredBanks.length > 0 && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setDropdownOpen(false)} />
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, backgroundColor: "#141420", border: "1.5px solid #2A2A3D", borderRadius: "8px", maxHeight: "180px", overflowY: "auto", marginTop: "4px", scrollbarWidth: "thin", scrollbarColor: "#2A2A3D #141420" }}>
                  {filteredBanks.map((bank) => (
                    <button key={bank.code} onClick={() => handleBankSelect(bank)}
                      style={{ width: "100%", padding: "9px 12px", border: "none", cursor: "pointer", backgroundColor: bankCode === bank.code ? "rgba(139,92,246,0.1)" : "transparent", color: bankCode === bank.code ? "#A78BFA" : "#F1F5F9", fontSize: "12px", fontFamily: "'Inter', sans-serif", textAlign: "left", borderBottom: "1px solid #1E1E2E" }}>
                      {bank.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "11px", color: "#6B6B8A", display: "block", marginBottom: "4px", fontFamily: "'Inter', sans-serif" }}>Account number</label>
            <input type="text" inputMode="numeric" placeholder="Enter 10-digit account number" value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
              onFocus={() => setFocused("account")} onBlur={() => setFocused(null)} style={inputStyle("account")} />
          </div>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ fontSize: "11px", color: "#6B6B8A", display: "block", marginBottom: "4px", fontFamily: "'Inter', sans-serif" }}>Account name</label>
            {verifying ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 0" }}>
                <div style={{ width: "14px", height: "14px", border: "2px solid #2A2A3D", borderTop: "2px solid #8B5CF6", borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <span style={{ fontSize: "12px", color: "#6B6B8A", fontFamily: "'Inter', sans-serif" }}>Verifying...</span>
              </div>
            ) : accountName ? (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 0" }}>
                <span style={{ color: "#10B981", fontSize: "14px" }}>✓</span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#10B981", fontFamily: "'Inter', sans-serif" }}>{accountName}</span>
              </div>
            ) : (
              <p style={{ fontSize: "12px", color: verifyError ? "#EF4444" : "#6B6B8A", margin: 0, padding: "8px 0", fontFamily: "'Inter', sans-serif" }}>{verifyError || "Select bank and enter account number"}</p>
            )}
          </div>
          {saveError && <p style={{ fontSize: "12px", color: "#EF4444", margin: "0 0 10px", fontFamily: "'Inter', sans-serif" }}>{saveError}</p>}
          <button onClick={handleSave} disabled={!canSave} style={{ width: "100%", padding: "11px", borderRadius: "8px", border: "none", backgroundColor: canSave ? "#8B5CF6" : "#1E1E2E", color: canSave ? "#fff" : "#6B6B8A", fontSize: "13px", fontWeight: 600, cursor: canSave ? "pointer" : "not-allowed", fontFamily: "'Inter', sans-serif", marginBottom: "10px" }}>
            {saving ? "Saving..." : "Save Account"}
          </button>
        </div>
      )}

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
                <p style={{ margin: 0, fontSize: "11px", color: "#6B6B8A", fontFamily: "'Inter', sans-serif" }}>.... {b.account_number.slice(-4)} — {b.account_name}</p>
              </div>
              {b.is_primary && <span style={{ fontSize: "10px", fontWeight: 600, color: "#8B5CF6", border: "1.5px solid #8B5CF6", borderRadius: "5px", padding: "2px 8px", fontFamily: "'Inter', sans-serif", flexShrink: 0 }}>Default</span>}
              <div style={{ position: "relative" }}>
                <button onClick={() => setMenuOpen(menuOpen === b.id ? null : b.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B6B8A", display: "flex", padding: "2px 4px" }}>
                  <MoreVertical size={16} />
                </button>
                {menuOpen === b.id && (
                  <div style={{ position: "absolute", right: 0, top: "100%", backgroundColor: "#1C1C2E", border: "1.5px solid #2A2A3D", borderRadius: "8px", minWidth: "140px", zIndex: 10, overflow: "hidden" }}>
                    {!b.is_primary && <button onClick={() => handleSetDefault(b.id)} style={{ width: "100%", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "#F1F5F9", fontFamily: "'Inter', sans-serif", textAlign: "left" }}>Set as Default</button>}
                    <button onClick={() => handleRemove(b.id)} style={{ width: "100%", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "#EF4444", fontFamily: "'Inter', sans-serif", textAlign: "left" }}>Remove</button>
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