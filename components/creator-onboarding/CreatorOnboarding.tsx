"use client";

import { useState, useEffect, useRef } from "react";
import React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CreatorOnboardingStep1 } from "./CreatorOnboardingStep1";
import { CreatorOnboardingStep2 } from "./CreatorOnboardingStep2";
import { CreatorOnboardingStep3 } from "./CreatorOnboardingStep3";

const STEPS = [
  { number: 1, label: "Profile Info" },
  { number: 2, label: "Payout Details" },
  { number: 3, label: "Launch Setup" },
];

interface Step1Data {
  username: string;
  display_name: string;
  email: string;
  date_of_birth: string;
  country: string;
  state: string;
}

interface Step2Data {
  bank_name: string;
  bank_code: string;
  account_number: string;
  resolved_account_name: string;
}

interface Step3Data {
  monthly_price: number;
  three_month_price: number;
  six_month_price: number;
  bio: string;
  confirmed_18: boolean;
  agreed_terms: boolean;
}

interface CreatorOnboardingProps {
  onBack: () => void;
}

// ─── Success Toast ─────────────────────────────────────────────────────────────
function SuccessToast({ visible }: { visible: boolean }) {
  return (
    <div style={{
      position: "fixed",
      bottom: "32px",
      left: "50%",
      transform: `translateX(-50%) translateY(${visible ? "0" : "20px"})`,
      opacity: visible ? 1 : 0,
      transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
      zIndex: 9999,
      pointerEvents: "none",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "12px",
        backgroundColor: "#1C1C2E", border: "1.5px solid rgba(139,92,246,0.4)",
        borderRadius: "14px", padding: "14px 20px",
        boxShadow: "0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(139,92,246,0.1)",
        whiteSpace: "nowrap",
      }}>
        <span style={{ fontSize: "22px" }}>🎉</span>
        <div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#F1F5F9", fontFamily: "'Inter', sans-serif" }}>
            You are now a creator!
          </div>
          <div style={{ fontSize: "12px", color: "#A3A3C2", marginTop: "2px", fontFamily: "'Inter', sans-serif" }}>
            Your page is live — welcome to Freya ✨
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function CreatorOnboarding({ onBack }: CreatorOnboardingProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [step1Data,   setStep1Data]   = useState<Partial<Step1Data>>({});
  const [step2Data,   setStep2Data]   = useState<Partial<Step2Data>>({});
  const [launching,   setLaunching]   = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [showToast,   setShowToast]   = useState(false);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };
  const [userEmail,   setUserEmail]   = useState("");

  React.useEffect(() => {
    const fetchEmail = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setUserEmail(user.email);
    };
    fetchEmail();
  }, []);

  const handleLaunch = async (step3Data: Step3Data) => {
    setLaunching(true);
    setLaunchError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLaunchError("Session expired. Please log in again."); setLaunching(false); return; }

      const { error: profileError } = await supabase.from("profiles").update({
        username:              (step1Data as Step1Data).username,
        display_name:          (step1Data as Step1Data).display_name,
        date_of_birth:         (step1Data as Step1Data).date_of_birth,
        country:               (step1Data as Step1Data).country,
        state:                 (step1Data as Step1Data).state,
        bio:                   step3Data.bio,
        subscription_price:    step3Data.monthly_price,
        bundle_price_3_months: step3Data.three_month_price,
        bundle_price_6_months: step3Data.six_month_price,
        role:                  "creator",
        onboarding_completed:  true,
        onboarding_step:       3,
        terms_agreed_at:       new Date().toISOString(),
      }).eq("id", user.id);
      if (profileError) throw new Error(profileError.message);

      const { error: bankError } = await supabase.from("creator_payout_accounts").insert({
        creator_id:     user.id,
        bank_name:      (step2Data as Step2Data).bank_name,
        bank_code:      (step2Data as Step2Data).bank_code,
        account_number: (step2Data as Step2Data).account_number,
        account_name:   (step2Data as Step2Data).resolved_account_name,
        is_active:      true,
        is_verified:    true,
      });
      if (bankError) throw new Error(bankError.message);

      if (step3Data.monthly_price > 0) {
        const { error: tierError } = await supabase.from("subscription_tiers").upsert({
          creator_id:        user.id,
          tier_name:         "Basic",
          price_monthly:     step3Data.monthly_price,
          three_month_price: step3Data.three_month_price || null,
          six_month_price:   step3Data.six_month_price   || null,
          is_active:         true,
        }, { onConflict: "creator_id" });
        if (tierError) console.error("[Onboarding] Tier upsert error:", tierError.message);
      }

      setShowToast(true);
      setTimeout(() => { router.push(`/${(step1Data as Step1Data).username}`); }, 2500);
    } catch (err: unknown) {
      setLaunchError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setLaunching(false);
    }
  };

  return (
    <>
      <style>{`
        @media (max-width: 480px) {
          .ob-step-labels { font-size: 10px !important; }
          .ob-content-pad { padding: 20px 16px 60px !important; }
        }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif" }}>

        {/* ── Header ── */}
        <div style={{ padding: "28px 32px 0" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.22)",
            borderRadius: "20px", padding: "4px 12px", marginBottom: "12px",
            fontSize: "11px", fontWeight: 600, color: "#A78BFA",
            letterSpacing: "0.05em", textTransform: "uppercase",
          }}>
            <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#8B5CF6" }} />
            Step {currentStep} of 3
          </div>

          <div style={{ margin: "0 0 20px" }} />

          {/* Progress bar */}
          <div style={{ display: "flex", gap: "5px", marginBottom: "7px" }}>
            {STEPS.map((s) => (
              <div
                key={s.number}
                onClick={() => s.number < currentStep && setCurrentStep(s.number)}
                style={{
                  flex: 1, position: "relative",
                  padding: "10px 0",
                  cursor: s.number < currentStep ? "pointer" : "default",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <div style={{
                  height: "3px", borderRadius: "2px",
                  background: currentStep > s.number ? "#22C55E" : currentStep === s.number ? "#8B5CF6" : "#222235",
                  transition: "background 0.3s",
                }} />
              </div>
            ))}
          </div>

          {/* Step labels */}
          <div className="ob-step-labels" style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            {STEPS.map((s) => (
              <span key={s.number} style={{
                fontSize: "11px",
                color: currentStep === s.number ? "#8B5CF6" : currentStep > s.number ? "#22C55E" : "#3A3A5A",
                fontWeight: currentStep === s.number ? 600 : 400,
                transition: "color 0.3s",
              }}>
                {currentStep > s.number ? "✓ " : ""}{s.label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="ob-content-pad" style={{ display: "flex", justifyContent: "center", padding: "28px 32px 60px" }}>
          <div style={{ width: "100%", maxWidth: "600px" }}>

            {launchError && (
              <div style={{
                backgroundColor: "rgba(239,68,68,0.1)", border: "1.5px solid rgba(239,68,68,0.3)",
                borderRadius: "10px", padding: "12px 16px", marginBottom: "20px",
              }}>
                <span style={{ fontSize: "13px", color: "#EF4444" }}>{launchError}</span>
              </div>
            )}

            {currentStep === 1 && (
              <CreatorOnboardingStep1
                onContinue={(data) => { setStep1Data(data); setCurrentStep(2); scrollToTop(); }}
                defaultValues={{ ...step1Data, email: userEmail }}
              />
            )}
            {currentStep === 2 && (
              <CreatorOnboardingStep2
                onContinue={(data) => { setStep2Data(data); setCurrentStep(3); scrollToTop(); }}
                onBack={() => { setCurrentStep(1); scrollToTop(); }}
                defaultValues={step2Data}
              />
            )}
            {currentStep === 3 && (
              <CreatorOnboardingStep3
                onLaunch={handleLaunch}
                onBack={() => { setCurrentStep(2); scrollToTop(); }}
                launching={launching}
              />
            )}

          </div>
        </div>

      </div>

      <SuccessToast visible={showToast} />
    </>
  );
}