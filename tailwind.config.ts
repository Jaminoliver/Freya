import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        sidebar: "var(--sidebar)",
        border: "var(--border)",
        brand: {
          DEFAULT: "var(--brand)",
          hover: "var(--brand-hover)",
        },
        coral: {
          DEFAULT: "var(--coral)",
          hover: "var(--coral-hover)",
        },
        gold: "var(--gold)",
        success: "var(--success)",
        error: "var(--error)",
        pink: "var(--pink)",
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      fontSize: {
        "display": ["40px", { lineHeight: "1.2", fontWeight: "700" }],
        "h2": ["32px", { lineHeight: "1.3", fontWeight: "700" }],
        "h3": ["24px", { lineHeight: "1.4", fontWeight: "600" }],
        "h4": ["18px", { lineHeight: "1.5", fontWeight: "600" }],
        "body": ["16px", { lineHeight: "1.6" }],
        "small": ["14px", { lineHeight: "1.5" }],
        "caption": ["12px", { lineHeight: "1.4" }],
        "label": ["11px", { lineHeight: "1.4", fontWeight: "500" }],
      },
      borderRadius: {
        btn: "var(--radius-btn)",
        card: "var(--radius-card)",
        input: "var(--radius-input)",
      },

      backgroundImage: {
        "gradient-brand": "var(--gradient-brand)",
        "gradient-banner": "var(--gradient-banner)",
      },
    },
  },
  plugins: [],
};

export default config;