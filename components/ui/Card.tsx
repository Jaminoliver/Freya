import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

export function Card({ className, padded = true, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-surface rounded-card border border-border",
        padded && "p-24",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}