"use client";

import { X, GripVertical, Plus } from "lucide-react";

interface PollBuilderProps {
  type: "poll" | "quiz";
  options: string[];
  onChange: (options: string[]) => void;
}

export function PollBuilder({ type, options, onChange }: PollBuilderProps) {
  const isQuiz = type === "quiz";

  const updateOption = (index: number, value: string) => {
    const next = [...options];
    next[index] = value;
    onChange(next);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    onChange(options.filter((_, i) => i !== index));
  };

  const addOption = () => {
    if (options.length >= 6) return;
    onChange([...options, ""]);
  };

  const getPlaceholder = (index: number) => {
    if (index === 0) return isQuiz ? "Correct answer..." : "Enter first option...";
    if (index === 1) return isQuiz ? "Wrong answer..." : "Enter second option...";
    return `Option ${index + 1}...`;
  };

  return (
    <div style={{
      backgroundColor: "#0D0D18",
      border: "1.5px solid #2A2A3D",
      borderRadius: "14px",
      overflow: "hidden",
    }}>
      {/* Options list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
        {options.map((opt, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 14px",
              borderBottom: i < options.length - 1 ? "1px solid #1A1A2E" : "none",
              transition: "background 0.15s",
            }}
          >
            {/* Radio / checkbox indicator */}
            <div style={{
              width: "18px",
              height: "18px",
              borderRadius: isQuiz ? "50%" : "5px",
              border: `1.5px solid ${i === 0 && isQuiz ? "#8B5CF6" : "#4A4A6A"}`,
              backgroundColor: i === 0 && isQuiz ? "rgba(139,92,246,0.15)" : "transparent",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              {i === 0 && isQuiz && (
                <div style={{
                  width: "8px", height: "8px",
                  borderRadius: "50%",
                  backgroundColor: "#8B5CF6",
                }} />
              )}
            </div>

            {/* Input */}
            <input
              type="text"
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
              placeholder={getPlaceholder(i)}
              style={{
                flex: 1,
                backgroundColor: "transparent",
                border: "none",
                outline: "none",
                color: "#E2E8F0",
                fontSize: "14px",
                fontFamily: "'Inter', sans-serif",
                caretColor: "#8B5CF6",
              }}
            />

            {/* Drag handle */}
            <div style={{ color: "#6B6B8A", cursor: "grab", display: "flex", flexShrink: 0 }}>
              <GripVertical size={16} />
            </div>

            {/* Remove button */}
            <button
              onClick={() => removeOption(i)}
              disabled={options.length <= 2}
              style={{
                background: "none",
                border: "none",
                cursor: options.length <= 2 ? "default" : "pointer",
                color: options.length <= 2 ? "#2A2A3D" : "#6B6B8A",
                display: "flex",
                padding: "2px",
                borderRadius: "4px",
                flexShrink: 0,
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => {
                if (options.length > 2)
                  (e.currentTarget as HTMLButtonElement).style.color = "#F87171";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color =
                  options.length <= 2 ? "#2A2A3D" : "#6B6B8A";
              }}
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>

      {/* Add option */}
      {options.length < 6 && (
        <button
          onClick={addOption}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 14px",
            backgroundColor: "transparent",
            border: "none",
            borderTop: "1px solid #1A1A2E",
            color: "#8B5CF6",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(139,92,246,0.06)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
          }}
        >
          <Plus size={15} />
          Add another option
        </button>
      )}
    </div>
  );
}