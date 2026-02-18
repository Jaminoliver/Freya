const stats = [
  { value: "10K+", label: "Creators" },
  { value: "₦500M+", label: "Earned" },
  { value: "1M+", label: "Fans" },
  { value: "18%", label: "Commission" },
];

export function StatsSection() {
  return (
    <section style={{ width: "100%", padding: "64px 24px", backgroundColor: "#141420" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: "32px" }}>
          {stats.map((stat) => (
            <div key={stat.label} style={{ textAlign: "center" }}>
              <div className="text-3xl md:text-4xl" style={{ fontWeight: 700, color: "#F5A623", marginBottom: "8px" }}>
                {stat.value}
              </div>
              <div style={{ fontSize: "16px", color: "#A3A3C2" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}