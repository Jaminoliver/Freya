"use client";

import { useEffect, useCallback, useState } from "react";
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
  const [closing, setClosing] = useState(false);

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

  // Animated close — fade out then actually close
  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      close();
      reset();
    }, 180);
  }, [close, reset]);

  // Success: fire reload at 500ms while overlay still visible, close modal at 1000ms
  const handleSuccess = useCallback(() => {
    setTimeout(() => window.location.reload(), 500);
    setTimeout(() => {
      close();
      reset();
    }, 1000);
  }, [close, reset]);

  if (!isOpen) return null;

  const screenProps = { onNavigate: navigate, onClose: handleClose };

  const isMobile = typeof window !== "undefined" && window.innerWidth < 600;

  return (
    <>
      <style>{`
        @keyframes backdropIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes backdropOut { from { opacity: 1 } to { opacity: 0 } }
        @keyframes modalInDesktop  { from { opacity: 0; transform: scale(0.95) translateY(-8px) } to { opacity: 1; transform: scale(1) translateY(0) } }
        @keyframes modalOutDesktop { from { opacity: 1; transform: scale(1) translateY(0) } to { opacity: 0; transform: scale(0.95) translateY(-8px) } }
        @keyframes modalInMobile   { from { opacity: 0; transform: translateY(32px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes modalOutMobile  { from { opacity: 1; transform: translateY(0) } to { opacity: 0; transform: translateY(32px) } }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: "fixed", inset: 0, zIndex: 9998,
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          animation: `${closing ? "backdropOut" : "backdropIn"} 0.18s ease forwards`,
        }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          display: "flex",
          alignItems: isMobile ? "flex-end" : "center",
          justifyContent: "center",
          padding: isMobile ? "0" : "1rem",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: isMobile ? "100%" : "360px",
            background: "#0D0D14",
            border: isMobile ? "none" : "1px solid #1F1F2A",
            borderRadius: isMobile ? "20px 20px 0 0" : "18px",
            overflow: "hidden",
            pointerEvents: "auto",
            position: "relative",
            fontFamily: "'Inter', sans-serif",
            boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
            animation: closing
              ? `${isMobile ? "modalOutMobile" : "modalOutDesktop"} 0.18s ease forwards`
              : `${isMobile ? "modalInMobile" : "modalInDesktop"} 0.2s ease forwards`,
            // Safe area on iPhone
            paddingBottom: isMobile ? "env(safe-area-inset-bottom)" : undefined,
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
    </>
  );
}