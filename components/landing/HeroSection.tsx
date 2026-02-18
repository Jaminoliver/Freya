import Link from "next/link";

export function HeroSection() {
  return (
    <section style={{ width: "100%", padding: "64px 24px", minHeight: "calc(100vh - 57px)", display: "flex", alignItems: "center" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", textAlign: "center", width: "100%" }}>
        <h1
          className="text-4xl md:text-6xl"
          style={{
            fontWeight: 700,
            marginBottom: "24px",
            backgroundImage: "linear-gradient(to right, #8B5CF6, #EC4899)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Where African Creators Earn Without Limits
        </h1>
        <p className="text-base md:text-xl" style={{ color: "#A3A3C2", maxWidth: "768px", margin: "0 auto 48px" }}>
          The lowest commission in the game. Just 18%. Your content. Your money.
        </p>
        <div className="flex flex-col sm:flex-row" style={{ alignItems: "center", justifyContent: "center", gap: "16px" }}>
          <Link href="/signup" style={{ padding: "16px 32px", fontSize: "16px", fontWeight: 600, color: "#FFFFFF", backgroundColor: "#FF6B6B", borderRadius: "8px", textDecoration: "none", width: "100%", maxWidth: "280px", textAlign: "center", boxSizing: "border-box" }}>
            Start Earning
          </Link>
          <Link href="#creators" style={{ padding: "16px 32px", fontSize: "16px", fontWeight: 600, color: "#FFFFFF", backgroundColor: "#8B5CF6", borderRadius: "8px", textDecoration: "none", width: "100%", maxWidth: "280px", textAlign: "center", boxSizing: "border-box" }}>
            Explore Creators
          </Link>
        </div>
      </div>
    </section>
  );
}