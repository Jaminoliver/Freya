"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const sections = [
  { id: "collect", label: "We Collect", fullLabel: "1. Information We Collect" },
  { id: "use", label: "Use Your Data", fullLabel: "2. How We Use Your Data" },
  { id: "sharing", label: "Sharing", fullLabel: "3. Data Sharing & Disclosure" },
  { id: "cookies", label: "Cookies", fullLabel: "4. Cookies & Tracking" },
  { id: "retention", label: "Retention", fullLabel: "5. Data Retention" },
  { id: "rights", label: "Your Rights", fullLabel: "6. Your Rights" },
  { id: "security", label: "Security", fullLabel: "7. Security Measures" },
  { id: "third-party", label: "Third-Party", fullLabel: "8. Third-Party Services" },
  { id: "children", label: "Children", fullLabel: "9. Children's Privacy" },
  { id: "updates", label: "Updates", fullLabel: "10. Policy Updates" },
  { id: "contact", label: "Contact", fullLabel: "11. Contact Us" },
];

export function PrivacyPolicyPage() {
  const [activeSection, setActiveSection] = useState("collect");
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isMobile = () => window.innerWidth <= 768;

    const handleScroll = (e: Event) => {
      const container = e.target as HTMLElement;
      const scrollTop = isMobile() ? window.scrollY : container.scrollTop;
      const offset = isMobile() ? 160 : 100;
      const scrollPosition = scrollTop + offset;
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i].id);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSection(sections[i].id);
          break;
        }
      }
    };

    const mainPanel = document.getElementById("privacy-main");
    mainPanel?.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      mainPanel?.removeEventListener("scroll", handleScroll);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (tabsRef.current) {
      const activeBtn = tabsRef.current.querySelector(`[data-id="${activeSection}"]`) as HTMLElement;
      if (activeBtn) activeBtn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [activeSection]);

  const handleSectionClick = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (window.innerWidth <= 768) {
      window.scrollTo({ top: el.offsetTop - 160, behavior: "smooth" });
    } else {
      document.getElementById("privacy-main")?.scrollTo({ top: el.offsetTop - 100, behavior: "smooth" });
    }
  };

  const sectionStyle = { marginBottom: "40px" };
  const headingStyle: React.CSSProperties = { color: "#F1F5F9", fontSize: "17px", fontWeight: 600, margin: "0 0 12px" };
  const bodyStyle: React.CSSProperties = { color: "#A3A3C2", fontSize: "14px", lineHeight: 1.8, margin: "0 0 12px" };
  const boldStyle: React.CSSProperties = { color: "#F1F5F9", fontWeight: 600 };
  const linkStyle: React.CSSProperties = { color: "#8B5CF6", textDecoration: "none" };

  return (
    <div style={{ width: "100%", backgroundColor: "#0A0A0F", fontFamily: "'Inter', sans-serif", minHeight: "100vh" }}>
      <style>{`
        .privacy-wrapper { display: flex; height: calc(100vh - 73px); overflow: hidden; }
        .privacy-sidebar {
          width: 260px; flex-shrink: 0; overflow-y: auto;
          padding: 24px 16px; background-color: #141420; border-right: 1px solid #1F1F2A;
        }
        .privacy-sidebar::-webkit-scrollbar { width: 4px; }
        .privacy-sidebar::-webkit-scrollbar-track { background: transparent; }
        .privacy-sidebar::-webkit-scrollbar-thumb { background: #2A2A3D; border-radius: 4px; }
        .privacy-main { flex: 1; overflow-y: auto; padding: 48px 64px 80px; }
        .privacy-main::-webkit-scrollbar { width: 4px; }
        .privacy-main::-webkit-scrollbar-track { background: transparent; }
        .privacy-main::-webkit-scrollbar-thumb { background: #2A2A3D; border-radius: 4px; }
        .privacy-sidebar-title { color: #F1F5F9; font-size: 15px; font-weight: 700; margin: 0 0 16px; }
        .privacy-mobile-header { display: none; }
        .privacy-desktop-header { margin-bottom: 40px; }
        @media (max-width: 768px) {
          .privacy-wrapper { height: auto; overflow: visible; flex-direction: column; }
          .privacy-sidebar { display: none; }
          .privacy-main { padding: 24px 20px 60px; overflow-y: visible; }
          .privacy-mobile-header { display: block; position: sticky; top: 0; z-index: 20; background: #0A0A0F; padding: 16px 16px 0; }
          .privacy-desktop-header { display: none; }
        }
      `}</style>

      {/* Mobile header */}
      <div className="privacy-mobile-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <span style={{ color: "#8B5CF6", fontSize: "22px", fontWeight: 800, letterSpacing: "-0.5px" }}>Freya</span>
          <Link href="/" style={{ color: "#A3A3C2", display: "flex", alignItems: "center" }}><ArrowLeft size={20} /></Link>
        </div>
        <h1 style={{ color: "#F1F5F9", fontSize: "22px", fontWeight: 700, margin: "0 0 2px" }}>Privacy Policy</h1>
        <p style={{ color: "#6B6B8A", fontSize: "12px", margin: "0 0 12px" }}>Last updated: February 2026</p>
        <div ref={tabsRef} style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "12px", scrollbarWidth: "none" }}>
          {sections.map((s) => (
            <button key={s.id} data-id={s.id} onClick={() => handleSectionClick(s.id)} style={{
              flexShrink: 0, borderRadius: "50px", padding: "7px 14px", fontSize: "13px", fontWeight: 500,
              border: "none", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s ease",
              backgroundColor: activeSection === s.id ? "#8B5CF6" : "#1C1C2E",
              color: activeSection === s.id ? "#F1F5F9" : "#A3A3C2",
            }}>{s.label}</button>
          ))}
        </div>
        <div style={{ height: "1px", backgroundColor: "#1F1F2A" }} />
      </div>

      <div className="privacy-wrapper">
        {/* Desktop sidebar */}
        <aside className="privacy-sidebar">
          <p className="privacy-sidebar-title">Table of Contents</p>
          <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {sections.map((s) => (
              <button key={s.id} onClick={() => handleSectionClick(s.id)} style={{
                textAlign: "left", padding: "8px 12px", borderRadius: "8px", border: "none",
                cursor: "pointer", fontSize: "14px", transition: "all 0.2s ease",
                backgroundColor: activeSection === s.id ? "rgba(139,92,246,0.12)" : "transparent",
                color: activeSection === s.id ? "#8B5CF6" : "#A3A3C2",
              }}>{s.fullLabel}</button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="privacy-main" id="privacy-main">
          <div className="privacy-desktop-header">
            <h1 style={{ color: "#F1F5F9", fontSize: "36px", fontWeight: 700, margin: "0 0 8px" }}>Privacy Policy</h1>
            <p style={{ color: "#6B6B8A", fontSize: "14px", margin: 0 }}>Last updated: February 2026</p>
          </div>

          <section id="collect" style={sectionStyle}>
            <h2 style={headingStyle}>1. Information We Collect</h2>
            <p style={bodyStyle}>At Freya, we collect various types of information to provide and improve our services. This includes information you provide directly, information we collect automatically, and information from third-party sources.</p>
            <p style={bodyStyle}><span style={boldStyle}>Account Information:</span> When you create an account, we collect your username, email address, date of birth, and payment information. For creators, we also collect additional verification information including government-issued ID and tax documentation.</p>
            <p style={bodyStyle}><span style={boldStyle}>Content:</span> Any photos, videos, messages, or other content you upload, post, or share on the platform.</p>
            <p style={bodyStyle}><span style={boldStyle}>Usage Data:</span> We automatically collect information about how you interact with our services, including IP address, device type, browser type, pages visited, and time spent on pages.</p>
            <p style={bodyStyle}><span style={boldStyle}>Payment Information:</span> When you make purchases or receive payments, we collect transaction details through our secure payment processors.</p>
          </section>

          <section id="use" style={sectionStyle}>
            <h2 style={headingStyle}>2. How We Use Your Data</h2>
            <p style={bodyStyle}>We use the information we collect to operate, maintain, and improve our services, process transactions, and communicate with you about your account and our services.</p>
            <p style={bodyStyle}><span style={boldStyle}>Service Delivery:</span> To provide, maintain, and improve the Freya platform, including processing payments and facilitating creator-fan interactions.</p>
            <p style={bodyStyle}><span style={boldStyle}>Safety & Security:</span> To verify identities, prevent fraud, and ensure the platform remains safe and compliant with applicable laws.</p>
            <p style={bodyStyle}><span style={boldStyle}>Communications:</span> To send you service updates, security alerts, and promotional messages (where you have opted in).</p>
            <p style={bodyStyle}><span style={boldStyle}>Analytics:</span> To understand how users interact with our platform and improve the user experience.</p>
          </section>

          <section id="sharing" style={sectionStyle}>
            <h2 style={headingStyle}>3. Data Sharing & Disclosure</h2>
            <p style={bodyStyle}>We do not sell your personal information. We may share your information in the following circumstances:</p>
            <p style={bodyStyle}><span style={boldStyle}>Service Providers:</span> We share data with trusted third-party vendors who assist in operating our platform, including payment processors, cloud storage providers, and analytics services.</p>
            <p style={bodyStyle}><span style={boldStyle}>Legal Requirements:</span> We may disclose your information when required by law, court order, or governmental authority, or to protect the rights and safety of Freya and its users.</p>
            <p style={bodyStyle}><span style={boldStyle}>Business Transfers:</span> In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</p>
          </section>

          <section id="cookies" style={sectionStyle}>
            <h2 style={headingStyle}>4. Cookies & Tracking</h2>
            <p style={bodyStyle}>We use cookies and similar tracking technologies to enhance your experience on the platform, analyze usage, and deliver personalized content.</p>
            <p style={bodyStyle}><span style={boldStyle}>Essential Cookies:</span> Required for the platform to function properly, including authentication and security features.</p>
            <p style={bodyStyle}><span style={boldStyle}>Analytics Cookies:</span> Help us understand how visitors interact with our platform so we can improve it.</p>
            <p style={bodyStyle}><span style={boldStyle}>Preference Cookies:</span> Remember your settings and preferences to provide a more personalized experience.</p>
            <p style={bodyStyle}>You can control cookie settings through your browser preferences. Note that disabling certain cookies may affect platform functionality.</p>
          </section>

          <section id="retention" style={sectionStyle}>
            <h2 style={headingStyle}>5. Data Retention</h2>
            <p style={bodyStyle}>We retain your personal information for as long as your account is active or as needed to provide you services. We will retain and use your information as necessary to comply with our legal obligations, resolve disputes, and enforce our agreements.</p>
            <p style={bodyStyle}>Upon account deletion, we will delete or anonymize your personal data within 30 days, except where retention is required by law. Content you have shared may remain visible until fully removed from our systems.</p>
            <p style={bodyStyle}>Transaction records and financial data may be retained for up to 7 years to comply with tax and financial regulations.</p>
          </section>

          <section id="rights" style={sectionStyle}>
            <h2 style={headingStyle}>6. Your Rights</h2>
            <p style={bodyStyle}>You have important rights regarding your personal information. We provide tools and processes to help you exercise these rights.</p>
            <p style={bodyStyle}><span style={boldStyle}>Access and Portability:</span> You have the right to access the personal information we hold about you and receive a copy in a commonly used format. You can download your data through your account settings.</p>
            <p style={bodyStyle}><span style={boldStyle}>Correction:</span> You can update or correct your personal information at any time through your account settings. If you need assistance, contact our <a href="mailto:support@freya.com" style={linkStyle}>support team</a>.</p>
            <p style={bodyStyle}><span style={boldStyle}>Deletion:</span> You can request deletion of your account and personal information. Note that some information may be retained as described in our data retention policy.</p>
            <p style={bodyStyle}><span style={boldStyle}>Marketing Opt-Out:</span> You can unsubscribe from promotional emails by clicking the unsubscribe link in any marketing email or updating your communication preferences in account settings.</p>
            <p style={bodyStyle}><span style={boldStyle}>Restriction and Objection:</span> In certain circumstances, you have the right to restrict or object to how we process your data. Contact us to exercise these rights.</p>
          </section>

          <section id="security" style={sectionStyle}>
            <h2 style={headingStyle}>7. Security Measures</h2>
            <p style={bodyStyle}>We take the security of your personal information seriously and implement industry-standard measures to protect it from unauthorized access, disclosure, alteration, or destruction.</p>
            <p style={bodyStyle}><span style={boldStyle}>Encryption:</span> All data transmitted between your device and our servers is encrypted using TLS. Sensitive data is encrypted at rest.</p>
            <p style={bodyStyle}><span style={boldStyle}>Access Controls:</span> We limit access to your personal information to employees and contractors who need it to provide our services.</p>
            <p style={bodyStyle}><span style={boldStyle}>Security Audits:</span> We regularly review and update our security practices to address new threats and vulnerabilities.</p>
            <p style={bodyStyle}>While we strive to protect your information, no security system is impenetrable. If you believe your account has been compromised, contact us immediately at <a href="mailto:security@freya.com" style={linkStyle}>security@freya.com</a>.</p>
          </section>

          <section id="third-party" style={sectionStyle}>
            <h2 style={headingStyle}>8. Third-Party Services</h2>
            <p style={bodyStyle}>Our platform integrates with third-party services to provide payment processing, analytics, and other functionality. These services have their own privacy policies governing their use of your data.</p>
            <p style={bodyStyle}><span style={boldStyle}>Payment Processors:</span> We use industry-leading payment processors to handle transactions. Your financial information is processed directly by these services and is subject to their security standards.</p>
            <p style={bodyStyle}><span style={boldStyle}>Analytics Providers:</span> We use analytics services to understand platform usage. These services may collect anonymized usage data.</p>
            <p style={bodyStyle}>We encourage you to review the privacy policies of any third-party services you interact with through our platform.</p>
          </section>

          <section id="children" style={sectionStyle}>
            <h2 style={headingStyle}>9. Children's Privacy</h2>
            <p style={bodyStyle}>Freya is strictly an adult platform. We do not knowingly collect or solicit personal information from anyone under the age of 18. If we learn that we have collected personal information from a minor, we will delete that information immediately.</p>
            <p style={bodyStyle}>We implement age verification measures during registration to prevent minors from accessing our platform. If you believe a minor has created an account, please contact us immediately at <a href="mailto:safety@freya.com" style={linkStyle}>safety@freya.com</a>.</p>
          </section>

          <section id="updates" style={sectionStyle}>
            <h2 style={headingStyle}>10. Policy Updates</h2>
            <p style={bodyStyle}>We may update this Privacy Policy from time to time to reflect changes in our practices or for legal, operational, or regulatory reasons. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date.</p>
            <p style={bodyStyle}>For significant changes, we will provide additional notice such as an in-app notification or email. Your continued use of Freya after changes become effective constitutes your acceptance of the revised policy.</p>
            <p style={bodyStyle}>We encourage you to review this policy periodically to stay informed about how we protect your information.</p>
          </section>

          <section id="contact" style={sectionStyle}>
            <h2 style={headingStyle}>11. Contact Us</h2>
            <p style={bodyStyle}>If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:</p>
            <p style={bodyStyle}><span style={boldStyle}>Email:</span> <a href="mailto:privacy@freya.com" style={linkStyle}>privacy@freya.com</a></p>
            <p style={bodyStyle}><span style={boldStyle}>Data Protection:</span> <a href="mailto:dpo@freya.com" style={linkStyle}>dpo@freya.com</a></p>
            <p style={bodyStyle}><span style={boldStyle}>Support:</span> <a href="mailto:support@freya.com" style={linkStyle}>support@freya.com</a></p>
            <p style={bodyStyle}>Our team typically responds within 24–48 hours. For urgent data protection matters, please mark your email as "Urgent."</p>
          </section>
        </div>
      </div>
    </div>
  );
}