import * as React from "react";
import { formatCount } from "@/lib/utils/profile";

export interface StatsItem {
  label: string;
  value: number;
}

export interface StatsSectionProps {
  stats: StatsItem[];
  className?: string;
}

export default function StatsSection({ stats, className }: StatsSectionProps) {
  return (
    <div className={`bg-surface rounded-card px-6 py-4 ${className ?? ""}`}>
      <div className="flex items-center divide-x divide-border">
        {stats.map((stat) => (
          <div key={stat.label} className="flex-1 flex flex-col items-center py-2 px-4">
            <span className="text-lg font-bold text-text-primary leading-tight">
              {formatCount(stat.value)}
            </span>
            <span className="text-xs text-text-secondary mt-0.5">
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}