export function CommentSkeleton() {
  return (
    <div style={{ display: "flex", gap: "10px", padding: "12px 0", borderBottom: "1px solid #13131F" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "#1C1C2E", flexShrink: 0, animation: "pulse 1.5s ease-in-out infinite" }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px", paddingTop: "4px" }}>
        <div style={{ width: "30%", height: "10px", borderRadius: "6px", backgroundColor: "#1C1C2E", animation: "pulse 1.5s ease-in-out infinite" }} />
        <div style={{ width: "80%", height: "10px", borderRadius: "6px", backgroundColor: "#1C1C2E", animation: "pulse 1.5s ease-in-out infinite" }} />
        <div style={{ width: "50%", height: "10px", borderRadius: "6px", backgroundColor: "#1C1C2E", animation: "pulse 1.5s ease-in-out infinite" }} />
      </div>
    </div>
  );
}