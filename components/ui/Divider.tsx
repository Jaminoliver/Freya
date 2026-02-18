import * as React from "react";
import { cn } from "@/lib/utils";

export interface DividerProps {
  label?: string;
  className?: string;
}

export function Divider({ label = "or", className }: DividerProps) {
  return (
    <div className={cn("flex items-center gap-16", className)}>
      <div className="flex-1 h-px bg-border" />
      {label && (
        <span className="text-small text-text-muted">{label}</span>
      )}
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}