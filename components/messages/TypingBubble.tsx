"use client";

export function TypingBubble() {
  return (
    <>
      <style>{`
        @keyframes typingBounce {
          0%, 80%, 100% { transform: translateY(0px); opacity: 0.4; }
          40%            { transform: translateY(-6px); opacity: 1; }
        }
        .typing-dot {
          width: 7px; height: 7px;
          background-color: #A3A3C2;
          border-radius: 50%;
          display: inline-block;
          animation: typingBounce 1.4s ease-in-out infinite both;
        }
        .typing-dot:nth-child(1) { animation-delay: 0s; }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
      `}</style>

      <div style={{
        display:       "flex",
        flexDirection: "row",
        alignItems:    "flex-end",
        gap:           "8px",
        alignSelf:     "flex-start",
        maxWidth:      "75%",
        marginTop:     "10px",
      }}>
        <div style={{
          backgroundColor: "#1E1E2E",
          borderRadius:    "18px 18px 18px 4px",
          padding:         "12px 16px",
          display:         "flex",
          alignItems:      "center",
          gap:             "5px",
        }}>
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      </div>
    </>
  );
}