import Link from "next/link";

const links = {
  Platform: [
    { label: "Features", href: "#features" },
    { label: "Creators", href: "#creators" },
    { label: "Pricing", href: "#pricing" },
    { label: "API", href: "/api" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Careers", href: "/careers" },
    { label: "Press", href: "/press" },
  ],
  Legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "Cookie Policy", href: "/cookies" },
    { label: "Licenses", href: "/licenses" },
  ],
  Social: [
    { label: "Twitter", href: "https://twitter.com" },
    { label: "Instagram", href: "https://instagram.com" },
    { label: "Facebook", href: "https://facebook.com" },
    { label: "LinkedIn", href: "https://linkedin.com" },
  ],
};

export function LandingFooter() {
  return (
    <footer style={{ width: "100%", padding: "64px 24px", backgroundColor: "#141420" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: "32px", marginBottom: "48px" }}>
          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h4 style={{ fontWeight: 600, color: "#F1F5F9", marginBottom: "16px", fontSize: "15px" }}>
                {category}
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {items.map((item) => (
                  <Link key={item.label} href={item.href} style={{ color: "#6B6B8A", textDecoration: "none", fontSize: "14px" }}>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid #2A2A3D", paddingTop: "32px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
          <span style={{ fontSize: "24px", fontWeight: 700, color: "#8B5CF6" }}>Freya</span>
          <span style={{ fontSize: "14px", color: "#6B6B8A" }}>© 2026 Freya. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}