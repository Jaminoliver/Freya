// @/components/messages/ReadTick.tsx

interface ReadTickProps {
  status?:     string;
  isDelivered?: boolean;
  isRead:      boolean;
}

export function ReadTick({ status, isDelivered, isRead }: ReadTickProps) {
  // Clock — still sending
  if (status === "sending") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="5" stroke="rgba(255,255,255,0.4)" strokeWidth="1.4" />
          <path d="M6 3.5V6L7.5 7.5" stroke="rgba(255,255,255,0.4)" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </span>
    );
  }

  // 2 green ticks — receiver opened the conversation
  if (isRead) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
        <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
          <path d="M1 5L4.5 8.5L10 2"  stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6 5L9.5 8.5L15 2" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }

  // 2 white ticks — receiver opened the messages page
  if (isDelivered) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
        <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
          <path d="M1 5L4.5 8.5L10 2"  stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6 5L9.5 8.5L15 2" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }

  // 1 white tick — sent, not yet delivered
  return (
    <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M1 5L4 8L9 2" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}