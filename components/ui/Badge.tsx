import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "brand" | "gold" | "coral" | "success" | "error" | "muted";
}

export function Badge({ className, variant = "brand", children, ...props }: BadgeProps) {
  const variants = {
    brand: "bg-brand/10 text-brand",
    gold: "bg-gold/10 text-gold",
    coral: "bg-coral/10 text-coral",
    success: "bg-success/10 text-success",
    error: "bg-error/10 text-error",
    muted: "bg-border text-text-muted",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-4 px-8 py-4 rounded-full text-caption font-medium",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}