"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff, Loader2, Check, AlertCircle, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type SaveState = "idle" | "saving" | "saved" | "error";

export default function AccountSettings() {
  const [userId, setUserId] = useState<string | null>(null);
  const [currentEmail, setCurrentEmail] = useState("");
  const [currentUsername, setCurrentUsername] = useState("");
  const [currentPhone, setCurrentPhone] = useState("");

  // Username
  const [newUsername, setNewUsername] = useState("");
  const [usernameSave, setUsernameSave] = useState<SaveState>("idle");
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Email
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [emailSave, setEmailSave] = useState<SaveState>("idle");
  const [emailError, setEmailError] = useState<string | null>(null);

  // Phone
  const [newPhone, setNewPhone] = useState("");
  const [phoneSave, setPhoneSave] = useState<SaveState>("idle");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordSave, setPasswordSave] = useState<SaveState>("idle");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Danger zone
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      setCurrentEmail(user.email ?? "");
      const { data } = await supabase
        .from("profiles")
        .select("username, phone")
        .eq("id", user.id)
        .single();
      if (data) {
        setCurrentUsername(data.username ?? "");
        setCurrentPhone(data.phone ?? "");
      }
    };
    load();
  }, []);

  // ── Styles ──
  const inputBase: React.CSSProperties = {
    width: "100%", borderRadius: "10px", padding: "12px 14px",
    fontSize: "14px", outline: "none", backgroundColor: "#141420",
    border: "1.5px solid #2A2A3D", color: "#F1F5F9",
    boxSizing: "border-box", fontFamily: "'Inter', sans-serif",
    transition: "border-color 0.2s",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "13px", fontWeight: 500, color: "#8B5CF6",
    marginBottom: "6px", display: "block",
  };

  const readOnlyStyle: React.CSSProperties = {
    ...inputBase, color: "#6B6B8A", cursor: "not-allowed",
    backgroundColor: "#0F0F1A",
  };

  const sectionBox: React.CSSProperties = {
    backgroundColor: "#141420", border: "1.5px solid #2A2A3D",
    borderRadius: "12px", padding: "20px",
  };

  const divider = (
    <div style={{ height: "1px", backgroundColor: "#1F1F2A", margin: "24px 0" }} />
  );

  const SaveButton = ({
    onSave, state, label = "Save",
  }: { onSave: () => void; state: SaveState; label?: string }) => (
    <button
      type="button"
      onClick={onSave}
      disabled={state === "saving"}
      style={{
        display: "flex", alignItems: "center", gap: "8px",
        padding: "9px 20px", borderRadius: "8px", fontSize: "13px",
        fontWeight: 600, border: "none",
        cursor: state === "saving" ? "not-allowed" : "pointer",
        backgroundColor: state === "saved" ? "#059669" : "#8B5CF6",
        color: "#fff", fontFamily: "'Inter', sans-serif",
        transition: "background-color 0.2s",
        opacity: state === "saving" ? 0.7 : 1,
      }}
      onMouseEnter={(e) => { if (state === "idle") (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#7C3AED"; }}
      onMouseLeave={(e) => { if (state === "idle") (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#8B5CF6"; }}
    >
      {state === "saving" && <Loader2 size={13} style={{ animation: "spin 0.9s linear infinite" }} />}
      {state === "saved" && <Check size={13} />}
      {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : label}
    </button>
  );

  const ErrorNote = ({ msg }: { msg: string | null }) =>
    msg ? (
      <div style={{
        display: "flex", alignItems: "center", gap: "8px",
        backgroundColor: "rgba(239,68,68,0.08)", border: "1.5px solid rgba(239,68,68,0.2)",
        borderRadius: "8px", padding: "10px 12px", marginTop: "12px",
      }}>
        <AlertCircle size={13} color="#EF4444" />
        <span style={{ fontSize: "12px", color: "#EF4444" }}>{msg}</span>
      </div>
    ) : null;

  const PasswordInput = ({
    value, onChange, placeholder, show, onToggle,
  }: {
    value: string; onChange: (v: string) => void;
    placeholder: string; show: boolean; onToggle: () => void;
  }) => (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...inputBase, paddingRight: "44px" }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")}
      />
      <button
        type="button"
        onClick={onToggle}
        style={{
          position: "absolute", right: "14px", top: "50%",
          transform: "translateY(-50%)", background: "none",
          border: "none", cursor: "pointer", padding: 0,
          color: "#6B6B8A", display: "flex", alignItems: "center",
        }}
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );

  // ── Handlers ──
  const handleUsernameSave = async () => {
    if (!userId || !newUsername.trim()) return;
    setUsernameSave("saving");
    setUsernameError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ username: newUsername.trim(), updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) {
      setUsernameSave("error");
      setUsernameError(error.message.includes("unique") ? "That username is already taken." : error.message);
    } else {
      setCurrentUsername(newUsername.trim());
      setNewUsername("");
      setUsernameSave("saved");
      setTimeout(() => setUsernameSave("idle"), 3000);
    }
  };

  const handleEmailSave = async () => {
    if (!newEmail || newEmail !== confirmEmail) {
      setEmailError("Emails do not match."); return;
    }
    setEmailSave("saving");
    setEmailError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) {
      setEmailSave("error");
      setEmailError(error.message);
    } else {
      setEmailSave("saved");
      setNewEmail("");
      setConfirmEmail("");
      setTimeout(() => setEmailSave("idle"), 3000);
    }
  };

  const handlePhoneSave = async () => {
    if (!userId || !newPhone.trim()) return;
    setPhoneSave("saving");
    setPhoneError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ phone: newPhone.trim(), updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) {
      setPhoneSave("error");
      setPhoneError(error.message);
    } else {
      setCurrentPhone(newPhone.trim());
      setNewPhone("");
      setPhoneSave("saved");
      setTimeout(() => setPhoneSave("idle"), 3000);
    }
  };

  const handlePasswordSave = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match."); return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters."); return;
    }
    setPasswordSave("saving");
    setPasswordError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordSave("error");
      setPasswordError(error.message);
    } else {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSave("saved");
      setTimeout(() => setPasswordSave("idle"), 3000);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== currentUsername) return;
    setDeleting(true);
    // TODO: call a server action / API route to delete auth user
    // The client SDK cannot delete the current user — needs a service role call
    // await fetch("/api/account/delete", { method: "DELETE" });
    alert("Connect /api/account/delete server route to complete deletion.");
    setDeleting(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#F1F5F9", margin: "0 0 3px" }}>Account</h2>
        <p style={{ fontSize: "13px", color: "#A3A3C2", margin: 0 }}>Manage your login credentials and identity</p>
      </div>

      {/* ── IDENTITY ── */}
      <p style={{ fontSize: "11px", fontWeight: 600, color: "#6B6B8A", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 14px" }}>Identity</p>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* Username */}
        <div style={sectionBox}>
          <label style={labelStyle}>Username</label>
          <input type="text" readOnly value={`@${currentUsername}`} style={readOnlyStyle} />
          <div style={{ height: "12px" }} />
          <input
            type="text"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="New username"
            style={inputBase}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")}
          />
          <span style={{ fontSize: "11px", color: "#6B6B8A", marginTop: "6px", display: "block", fontStyle: "italic" }}>
            Choose carefully — you can change this anytime but your old URL will stop working
          </span>
          <ErrorNote msg={usernameError} />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "14px" }}>
            <SaveButton onSave={handleUsernameSave} state={usernameSave} label="Update Username" />
          </div>
        </div>

        {/* Email */}
        <div style={sectionBox}>
          <label style={labelStyle}>Email</label>
          <input type="email" readOnly value={currentEmail} style={readOnlyStyle} />
          <div style={{ height: "12px" }} />
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="New email address"
            style={inputBase}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")}
          />
          <div style={{ height: "10px" }} />
          <input
            type="email"
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            placeholder="Confirm new email"
            style={inputBase}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")}
          />
          <span style={{ fontSize: "11px", color: "#6B6B8A", marginTop: "6px", display: "block", fontStyle: "italic" }}>
            A confirmation link will be sent to your new email
          </span>
          <ErrorNote msg={emailError} />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "14px" }}>
            <SaveButton onSave={handleEmailSave} state={emailSave} label="Update Email" />
          </div>
        </div>

        {/* Phone */}
        <div style={sectionBox}>
          <label style={labelStyle}>Phone Number</label>
          {currentPhone && (
            <input type="text" readOnly value={currentPhone} style={{ ...readOnlyStyle, marginBottom: "12px" }} />
          )}
          <input
            type="tel"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder={currentPhone ? "Change phone number" : "Add phone number"}
            style={inputBase}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#8B5CF6")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#2A2A3D")}
          />
          <ErrorNote msg={phoneError} />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "14px" }}>
            <SaveButton onSave={handlePhoneSave} state={phoneSave} label={currentPhone ? "Update Phone" : "Add Phone"} />
          </div>
        </div>
      </div>

      {divider}

      {/* ── SECURITY ── */}
      <p style={{ fontSize: "11px", fontWeight: 600, color: "#6B6B8A", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 14px" }}>Security</p>

      <div style={sectionBox}>
        <label style={labelStyle}>Change Password</label>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <PasswordInput
            value={currentPassword} onChange={setCurrentPassword}
            placeholder="Current password" show={showCurrent} onToggle={() => setShowCurrent((p) => !p)}
          />
          <PasswordInput
            value={newPassword} onChange={setNewPassword}
            placeholder="New password" show={showNew} onToggle={() => setShowNew((p) => !p)}
          />
          <PasswordInput
            value={confirmPassword} onChange={setConfirmPassword}
            placeholder="Confirm new password" show={showConfirm} onToggle={() => setShowConfirm((p) => !p)}
          />
        </div>
        <ErrorNote msg={passwordError} />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "14px" }}>
          <SaveButton onSave={handlePasswordSave} state={passwordSave} label="Update Password" />
        </div>
      </div>

      {divider}

      {/* ── DANGER ZONE ── */}
      <p style={{ fontSize: "11px", fontWeight: 600, color: "#EF4444", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 14px" }}>Danger Zone</p>

      <div style={{
        backgroundColor: "rgba(239,68,68,0.04)", border: "1.5px solid rgba(239,68,68,0.2)",
        borderRadius: "12px", padding: "20px",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
          <div>
            <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 600, color: "#F1F5F9" }}>Delete Account</p>
            <p style={{ margin: 0, fontSize: "12px", color: "#6B6B8A", lineHeight: 1.5 }}>
              Permanently delete your account and all your data. This cannot be undone.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDeleteOpen((p) => !p)}
            style={{
              flexShrink: 0, display: "flex", alignItems: "center", gap: "6px",
              padding: "9px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
              border: "1.5px solid rgba(239,68,68,0.4)", backgroundColor: "transparent",
              color: "#EF4444", cursor: "pointer", fontFamily: "'Inter', sans-serif",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(239,68,68,0.1)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
            }}
          >
            <Trash2 size={13} />
            Delete
          </button>
        </div>

        {/* Inline confirm */}
        {deleteOpen && (
          <div style={{
            marginTop: "16px", paddingTop: "16px",
            borderTop: "1px solid rgba(239,68,68,0.15)",
          }}>
            <p style={{ margin: "0 0 10px", fontSize: "13px", color: "#A3A3C2" }}>
              Type <strong style={{ color: "#F1F5F9" }}>@{currentUsername}</strong> to confirm deletion:
            </p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={`@${currentUsername}`}
              style={{
                ...inputBase,
                border: "1.5px solid rgba(239,68,68,0.3)",
                marginBottom: "12px",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#EF4444")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)")}
            />
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => { setDeleteOpen(false); setDeleteConfirm(""); }}
                style={{
                  padding: "9px 18px", borderRadius: "8px", fontSize: "13px",
                  fontWeight: 500, border: "1.5px solid #2A2A3D",
                  backgroundColor: "transparent", color: "#A3A3C2",
                  cursor: "pointer", fontFamily: "'Inter', sans-serif",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== currentUsername || deleting}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "9px 18px", borderRadius: "8px", fontSize: "13px",
                  fontWeight: 600, border: "none",
                  backgroundColor: deleteConfirm === currentUsername ? "#EF4444" : "rgba(239,68,68,0.2)",
                  color: deleteConfirm === currentUsername ? "#fff" : "#6B6B8A",
                  cursor: deleteConfirm === currentUsername ? "pointer" : "not-allowed",
                  fontFamily: "'Inter', sans-serif", transition: "all 0.2s",
                }}
              >
                {deleting && <Loader2 size={13} style={{ animation: "spin 0.9s linear infinite" }} />}
                {deleting ? "Deleting…" : "Permanently Delete"}
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}