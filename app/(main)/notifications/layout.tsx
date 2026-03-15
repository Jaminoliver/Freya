"use client";

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display:         "flex",
        flexDirection:   "column",
        height:          "100vh",
        overflow:        "hidden",
        width:           "100%",
        backgroundColor: "#0A0A0F",
        fontFamily:      "'Inter', sans-serif",
      }}
    >
      {children}
    </div>
  );
}