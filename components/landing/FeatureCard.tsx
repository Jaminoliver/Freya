import * as React from "react";

export interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="p-8 rounded-lg border" style={{ backgroundColor: '#1C1C2E', borderColor: '#2A2A3D' }}>
      <div className="w-12 h-12 mb-4" style={{ color: '#8B5CF6' }}>
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-3" style={{ color: '#F1F5F9' }}>
        {title}
      </h3>
      <p className="text-base" style={{ color: '#A3A3C2' }}>
        {description}
      </p>
    </div>
  );
}