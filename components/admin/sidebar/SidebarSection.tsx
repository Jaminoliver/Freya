"use client";

interface Props {
  label: string;
  collapsed: boolean;
}

export default function SidebarSection({ label, collapsed }: Props) {
  if (collapsed) {
    return (
      <div className="divider">
        <style jsx>{`
          .divider {
            height: 1px;
            background: rgba(255, 255, 255, 0.06);
            margin: 8px 12px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="section-label">
      {label}
      <style jsx>{`
        .section-label {
          padding: 16px 18px 6px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: rgba(255, 255, 255, 0.25);
          text-transform: uppercase;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}