"use client";

import { useState } from "react";
import { CreatorOnboardingStep1 } from "./CreatorOnboardingStep1";
import { CreatorOnboardingStep2 } from "./CreatorOnboardingStep2";
import { CreatorOnboardingStep3 } from "./CreatorOnboardingStep3";

const STEPS = [
  { number: 1, label: "Profile Info" },
  { number: 2, label: "Payout Details" },
  { number: 3, label: "Launch Setup" },
];

interface CreatorOnboardingProps {
  onBack: () => void;
}

export function CreatorOnboarding({ onBack }: CreatorOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [step1Data, setStep1Data] = useState({});
  const [step2Data, setStep2Data] = useState({});
  const [step3Data, setStep3Data] = useState({});

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>

      {/* Stepper */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "28px 32px 0" }}>
        {STEPS.map((step, index) => (
          <div key={step.number} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: 700,
                  backgroundColor: currentStep >= step.number ? "#8B5CF6" : "#1C1C2E",
                  color: currentStep >= step.number ? "#FFFFFF" : "#6B6B8A",
                  border: `2px solid ${currentStep >= step.number ? "#8B5CF6" : "#2A2A3D"}`,
                  transition: "all 0.3s",
                }}
              >
                {currentStep > step.number ? "✓" : step.number}
              </div>
              <span
                style={{
                  fontSize: "11px",
                  color: currentStep >= step.number ? "#F1F5F9" : "#6B6B8A",
                  whiteSpace: "nowrap",
                  fontWeight: currentStep === step.number ? 600 : 400,
                }}
              >
                {step.label}
              </span>
            </div>

            {index < STEPS.length - 1 && (
              <div
                style={{
                  width: "120px",
                  height: "1.5px",
                  backgroundColor: currentStep > step.number ? "#8B5CF6" : "#2A2A3D",
                  margin: "0 6px",
                  marginBottom: "18px",
                  transition: "background-color 0.3s",
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div style={{ display: "flex", justifyContent: "center", padding: "32px 32px 60px" }}>
        <div style={{ width: "100%", maxWidth: "600px" }}>

          {currentStep === 1 && (
            <CreatorOnboardingStep1
              onContinue={(data) => { setStep1Data(data); setCurrentStep(2); }}
              defaultValues={step1Data}
            />
          )}

          {currentStep === 2 && (
            <CreatorOnboardingStep2
              onContinue={(data) => { setStep2Data(data); setCurrentStep(3); }}
              onBack={() => setCurrentStep(1)}
              defaultValues={step2Data}
            />
          )}

          {currentStep === 3 && (
            <CreatorOnboardingStep3
              onLaunch={(data) => {
                setStep3Data(data);
                console.log("Launch:", { step1Data, step2Data, data });
              }}
              onBack={() => setCurrentStep(2)}
              defaultValues={step3Data}
            />
          )}

        </div>
      </div>
    </div>
  );
}