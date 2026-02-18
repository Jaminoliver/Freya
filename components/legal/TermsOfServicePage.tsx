"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const sections = [
  { id: "acceptance", label: "Acceptance", fullLabel: "1. Acceptance of Terms" },
  { id: "eligibility", label: "Eligibility", fullLabel: "2. Eligibility" },
  { id: "registration", label: "Registration", fullLabel: "3. Account Registration" },
  { id: "creator-obligations", label: "Creator", fullLabel: "4. Creator Obligations" },
  { id: "fan-obligations", label: "Fan", fullLabel: "5. Fan Obligations" },
  { id: "content-guidelines", label: "Content", fullLabel: "6. Content Guidelines" },
  { id: "payments", label: "Payments", fullLabel: "7. Payments & Commission" },
  { id: "intellectual-property", label: "IP", fullLabel: "8. Intellectual Property" },
  { id: "termination", label: "Termination", fullLabel: "9. Termination" },
  { id: "disclaimers", label: "Disclaimers", fullLabel: "10. Disclaimers" },
  { id: "contact", label: "Contact", fullLabel: "11. Contact Us" },
];

export function TermsOfServicePage() {
  const [activeSection, setActiveSection] = useState("acceptance");
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

    const mainPanel = document.getElementById("terms-main");
    mainPanel?.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      mainPanel?.removeEventListener("scroll", handleScroll);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Auto-scroll active pill into view
  useEffect(() => {
    if (tabsRef.current) {
      const activeBtn = tabsRef.current.querySelector(`[data-id="${activeSection}"]`) as HTMLElement;
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [activeSection]);

  const handlePillClick = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      window.scrollTo({ top: el.offsetTop - 160, behavior: "smooth" });
    } else {
      const mainPanel = document.getElementById("terms-main");
      if (mainPanel) {
        mainPanel.scrollTo({ top: el.offsetTop - 100, behavior: "smooth" });
      }
    }
  };

  const sectionStyle = { marginBottom: "40px" };
  const headingStyle: React.CSSProperties = { color: "#F1F5F9", fontSize: "17px", fontWeight: 600, margin: "0 0 12px" };
  const bodyStyle: React.CSSProperties = { color: "#A3A3C2", fontSize: "14px", lineHeight: 1.8, margin: "0 0 12px" };
  const linkStyle: React.CSSProperties = { color: "#8B5CF6", textDecoration: "none" };

  return (
    <div style={{
      width: "100%",
      backgroundColor: "#0A0A0F",
      fontFamily: "'Inter', sans-serif",
      minHeight: "100vh",
    }}>
      <style>{`
        .terms-wrapper { display: flex; height: calc(100vh - 73px); overflow: hidden; }
        .terms-sidebar {
          width: 260px;
          flex-shrink: 0;
          overflow-y: auto;
          padding: 24px 16px;
          background-color: #141420;
          border-right: 1px solid #1F1F2A;
        }
        .terms-sidebar::-webkit-scrollbar { width: 4px; }
        .terms-sidebar::-webkit-scrollbar-track { background: transparent; }
        .terms-sidebar::-webkit-scrollbar-thumb { background: #2A2A3D; border-radius: 4px; }
        .terms-main {
          flex: 1;
          overflow-y: auto;
          padding: 48px 64px 80px;
        }
        .terms-main::-webkit-scrollbar { width: 4px; }
        .terms-main::-webkit-scrollbar-track { background: transparent; }
        .terms-main::-webkit-scrollbar-thumb { background: #2A2A3D; border-radius: 4px; }
        .terms-sidebar-title { color: #F1F5F9; font-size: 15px; font-weight: 700; margin: 0 0 16px; }
        .terms-mobile-header { display: none; }
        .terms-desktop-header { margin-bottom: 40px; }
        @media (max-width: 768px) {
          .terms-wrapper { height: auto; overflow: visible; flex-direction: column; }
          .terms-sidebar { display: none; }
          .terms-main { padding: 24px 20px 60px; overflow-y: visible; }
          .terms-mobile-header { display: block; position: sticky; top: 0; z-index: 20; background: #0A0A0F; padding: 16px 16px 0; }
          .terms-desktop-header { display: none; }
        }
      `}</style>

      {/* Mobile sticky header with pills */}
      <div className="terms-mobile-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <span style={{ color: "#8B5CF6", fontSize: "22px", fontWeight: 800, letterSpacing: "-0.5px" }}>Freya</span>
          <Link href="/" style={{ color: "#A3A3C2", display: "flex", alignItems: "center" }}>
            <ArrowLeft size={20} />
          </Link>
        </div>
        <h1 style={{ color: "#F1F5F9", fontSize: "22px", fontWeight: 700, margin: "0 0 2px" }}>Terms of Service</h1>
        <p style={{ color: "#6B6B8A", fontSize: "12px", margin: "0 0 12px" }}>Last updated: February 2026</p>
        <div ref={tabsRef} style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "12px", scrollbarWidth: "none" }}>
          {sections.map((s) => (
            <button key={s.id} data-id={s.id} onClick={() => handlePillClick(s.id)} style={{
              flexShrink: 0, borderRadius: "50px", padding: "7px 14px", fontSize: "13px", fontWeight: 500,
              border: "none", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s ease",
              backgroundColor: activeSection === s.id ? "#8B5CF6" : "#1C1C2E",
              color: activeSection === s.id ? "#F1F5F9" : "#A3A3C2",
            }}>{s.label}</button>
          ))}
        </div>
        <div style={{ height: "1px", backgroundColor: "#1F1F2A" }} />
      </div>

      <div className="terms-wrapper">
        {/* Desktop sidebar TOC */}
        <aside className="terms-sidebar">
          <p className="terms-sidebar-title">Table of Contents</p>
          <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {sections.map((s) => (
              <button key={s.id} onClick={() => handlePillClick(s.id)} style={{
                textAlign: "left", padding: "8px 12px", borderRadius: "8px", border: "none",
                cursor: "pointer", fontSize: "14px", transition: "all 0.2s ease",
                backgroundColor: activeSection === s.id ? "rgba(139,92,246,0.12)" : "transparent",
                color: activeSection === s.id ? "#8B5CF6" : "#A3A3C2",
              }}>{s.fullLabel}</button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="terms-main" id="terms-main">
          {/* Desktop header */}
          <div className="terms-desktop-header">
            <h1 style={{ color: "#F1F5F9", fontSize: "36px", fontWeight: 700, margin: "0 0 8px" }}>Terms of Service</h1>
            <p style={{ color: "#6B6B8A", fontSize: "14px", margin: 0 }}>Last updated: February 2026</p>
          </div>

        <section id="acceptance" style={sectionStyle}>
          <h2 style={headingStyle}>1. Acceptance of Terms</h2>
          <p style={bodyStyle}>Welcome to Freya. By accessing or using our platform, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any part of these terms, you may not use our services.</p>
          <p style={bodyStyle}>These terms constitute a legally binding agreement between you and Freya. We reserve the right to modify these terms at any time, and your continued use of the platform constitutes acceptance of any changes.</p>
          <p style={bodyStyle}>Please read these terms carefully before using the platform. Your use of Freya signifies your acceptance of these terms and your agreement to comply with all applicable laws and regulations.</p>
        </section>

        <section id="eligibility" style={sectionStyle}>
          <h2 style={headingStyle}>2. Eligibility</h2>
          <p style={bodyStyle}>You must be at least 18 years of age to use Freya. By using this platform, you represent and warrant that you are of legal age to form a binding contract and meet all of the foregoing eligibility requirements.</p>
          <p style={bodyStyle}>If you are accessing the platform on behalf of a business or entity, you represent that you have the authority to bind that business or entity to these terms. The platform is not available to users who have been previously removed or banned from the service.</p>
          <p style={bodyStyle}>Freya reserves the right to verify your age and identity at any time. Failure to provide accurate information or verification may result in immediate suspension or termination of your account.</p>
        </section>

        <section id="registration" style={sectionStyle}>
          <h2 style={headingStyle}>3. Account Registration</h2>
          <p style={bodyStyle}>To access certain features of Freya, you must create an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete.</p>
          <p style={bodyStyle}>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. Notify us immediately of any unauthorized use at <a href="mailto:support@freya.com" style={linkStyle}>support@freya.com</a>.</p>
          <p style={bodyStyle}>Freya will not be liable for any loss or damage arising from your failure to comply with these security obligations. You may not transfer your account without our prior written consent.</p>
        </section>

        <section id="creator-obligations" style={sectionStyle}>
          <h2 style={headingStyle}>4. Creator Obligations</h2>
          <p style={bodyStyle}>As a content creator on Freya, you are responsible for all content you upload, publish, or share on the platform. You represent and warrant that you own or have the necessary rights to all content you post.</p>
          <p style={bodyStyle}>Creators must comply with all applicable laws and regulations, including age verification requirements, tax obligations, and content regulations. You are solely responsible for complying with all legal requirements in your jurisdiction.</p>
          <p style={bodyStyle}>Creators agree to maintain professional conduct and to respond to fan inquiries in a timely and respectful manner. Any violation of our <a href="#" style={linkStyle}>Community Guidelines</a> may result in content removal, account suspension, or termination.</p>
        </section>

        <section id="fan-obligations" style={sectionStyle}>
          <h2 style={headingStyle}>5. Fan Obligations</h2>
          <p style={bodyStyle}>As a fan or subscriber on Freya, you agree to respect the rights and boundaries of content creators. You may not copy, distribute, or create derivative works from content without explicit permission from the content owner.</p>
          <p style={bodyStyle}>Fans agree to interact with creators in a respectful and appropriate manner. Harassment, threatening behavior, or any form of abuse will not be tolerated and may result in immediate account termination.</p>
          <p style={bodyStyle}>You acknowledge that all payments made on the platform are final and non-refundable, except as required by law or as explicitly stated in our <a href="#" style={linkStyle}>Refund Policy</a>.</p>
        </section>

        <section id="content-guidelines" style={sectionStyle}>
          <h2 style={headingStyle}>6. Content Guidelines</h2>
          <p style={bodyStyle}>Freya maintains strict content guidelines to ensure a safe and legal platform for all users. The following content is strictly prohibited:</p>
          <ul style={{ color: "#A3A3C2", fontSize: "14px", lineHeight: 2, paddingLeft: "20px", margin: "0 0 12px" }}>
            <li>Content involving minors or individuals who appear to be minors</li>
            <li>Non-consensual content or deepfakes</li>
            <li>Content that promotes violence, illegal activities, or hate speech</li>
            <li>Content that violates intellectual property rights</li>
            <li>Misleading or fraudulent content</li>
          </ul>
          <p style={bodyStyle}>Freya reserves the right to remove any content that violates these guidelines. Repeated violations may result in account suspension or permanent termination without refund.</p>
        </section>

        <section id="payments" style={sectionStyle}>
          <h2 style={headingStyle}>7. Payments & Commission</h2>
          <p style={bodyStyle}>Freya operates on a commission-based model. The platform retains a percentage of all transactions as a service fee. Current commission rates are detailed in your creator dashboard and may be subject to change with 30 days' notice.</p>
          <p style={bodyStyle}>Creators are responsible for all applicable taxes on their earnings. Freya may provide tax documentation as required by law, but creators should consult with tax professionals regarding their specific obligations.</p>
          <p style={bodyStyle}>Payments to creators are processed according to the schedule outlined in the creator agreement. Minimum withdrawal thresholds may apply. Freya reserves the right to withhold payments in cases of suspected fraud or terms violations.</p>
        </section>

        <section id="intellectual-property" style={sectionStyle}>
          <h2 style={headingStyle}>8. Intellectual Property</h2>
          <p style={bodyStyle}>Creators retain ownership of their content uploaded to Freya. However, by posting content on the platform, you grant Freya a non-exclusive, worldwide, royalty-free license to host, store, distribute, and display your content as necessary to operate the platform.</p>
          <p style={bodyStyle}>The Freya name, logo, and platform design are protected by copyright, trademark, and other intellectual property laws. You may not use any Freya branding without our prior written consent.</p>
          <p style={bodyStyle}>If you believe your intellectual property rights have been violated, please contact us at <a href="mailto:legal@freya.com" style={linkStyle}>legal@freya.com</a>.</p>
        </section>

        <section id="termination" style={sectionStyle}>
          <h2 style={headingStyle}>9. Termination</h2>
          <p style={bodyStyle}>You may terminate your account at any time by following the account closure process in your settings. Upon termination, your access to the platform will be immediately revoked, though certain provisions of these terms will survive termination.</p>
          <p style={bodyStyle}>Freya reserves the right to suspend or terminate your account at any time, with or without notice, for any reason, including violation of these terms, fraudulent activity, or behavior harmful to the platform or its users.</p>
          <p style={bodyStyle}>Upon termination, any outstanding payments owed to creators may be subject to processing delays. Data retention and deletion policies are outlined in our <a href="/privacy" style={linkStyle}>Privacy Policy</a>.</p>
        </section>

        <section id="disclaimers" style={sectionStyle}>
          <h2 style={headingStyle}>10. Disclaimers</h2>
          <p style={bodyStyle}>FREYA IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND. TO THE FULLEST EXTENT PERMITTED BY LAW, FREYA DISCLAIMS ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.</p>
          <p style={bodyStyle}>Freya does not warrant that the platform will be uninterrupted, secure, or error-free. We are not responsible for user-generated content and do not endorse any opinions expressed by users.</p>
          <p style={bodyStyle}>TO THE MAXIMUM EXTENT PERMITTED BY LAW, FREYA SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE PLATFORM.</p>
        </section>

        <section id="contact" style={sectionStyle}>
          <h2 style={headingStyle}>11. Contact Us</h2>
          <p style={bodyStyle}>If you have any questions or concerns about these Terms of Service, please contact us:</p>
          <p style={bodyStyle}><strong style={{ color: "#F1F5F9" }}>Email:</strong> <a href="mailto:support@freya.com" style={linkStyle}>support@freya.com</a></p>
          <p style={bodyStyle}><strong style={{ color: "#F1F5F9" }}>Legal Inquiries:</strong> <a href="mailto:legal@freya.com" style={linkStyle}>legal@freya.com</a></p>
          <p style={bodyStyle}><strong style={{ color: "#F1F5F9" }}>Creator Support:</strong> <a href="mailto:creators@freya.com" style={linkStyle}>creators@freya.com</a></p>
          <p style={bodyStyle}>Our support team typically responds within 24–48 hours. For urgent matters, mark your email as "Urgent" in the subject line.</p>
        </section>
      </div>
      </div>
    </div>
  );
}