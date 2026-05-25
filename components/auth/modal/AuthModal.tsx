"use client";

import { useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store/appStore";
import { useAuthModal } from "@/lib/hooks/useAuthModal";
import { AuthModalEntry }      from "./AuthModalEntry";
import { AuthModalLogin }      from "./AuthModalLogin";
import { AuthModalReset }      from "./AuthModalReset";
import { AuthModalSignUp }     from "./AuthModalSignUp";
import { AuthModalSignUpForm } from "./AuthModalSignUpForm";

export function AuthModal() {
  const isOpen   = useAppStore((s) => s.authModalOpen);
  const close    = useAppStore((s) => s.closeAuthModal);
  const { screen, navigate, reset } = useAuthModal();

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleClose = useCallback(() => {
    close();
    reset();
  }, [close, reset]);

  const handleSuccess = useCallback(() => {
    handleClose();
    // Refresh viewer in store
    window.location.reload();
  }, [handleClose]);

  if (!isOpen) return null;

  const screenProps = { onNavigate: navigate, onClose: handleClose };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: "fixed", inset: 0, zIndex: 9998,
          background: "rgba(0,0,0,0.82)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          animation: "fadeIn 0.15s ease",
        }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "1rem",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: "100%", maxWidth: "400px",
            background: "#0A0A0F",
            border: "1px solid #1F1F2A",
            borderRadius: "16px",
            overflow: "hidden",
            pointerEvents: "auto",
            fontFamily: "'Inter', sans-serif",
            animation: "slideUp 0.2s ease",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {screen === 0 && <AuthModalEntry {...screenProps} />}
          {screen === 1 && <AuthModalLogin  {...screenProps} onSuccess={handleSuccess} />}
          {screen === 2 && <AuthModalReset  {...screenProps} />}
          {screen === 3 && <AuthModalSignUp {...screenProps} />}
          {screen === 4 && <AuthModalSignUpForm {...screenProps} onSuccess={handleSuccess} />}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </>
  );
}