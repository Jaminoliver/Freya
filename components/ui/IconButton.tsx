import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const iconButtonVariants = cva(
  "inline-flex items-center justify-center transition-opacity duration-200 disabled:pointer-events-none disabled:opacity-40 cursor-pointer",
  {
    variants: {
      variant: {
        brand: "bg-brand hover:bg-brand-hover text-white",
        coral: "bg-coral hover:bg-coral-hover text-white",
        ghost: "bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface",
        outline: "bg-transparent border border-border text-text-primary hover:border-brand hover:text-brand",
        danger: "bg-error hover:opacity-90 text-white",
      },
      size: {
        sm: "h-32 w-32 rounded-btn",
        md: "h-40 w-40 rounded-btn",
        lg: "h-48 w-48 rounded-btn",
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "md",
    },
  }
);

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  icon: React.ReactNode;
  "aria-label": string; // Required for accessibility
}

export function IconButton({
  className,
  variant,
  size,
  icon,
  "aria-label": ariaLabel,
  ...props
}: IconButtonProps) {
  return (
    <button
      className={cn(iconButtonVariants({ variant, size, className }))}
      aria-label={ariaLabel}
      {...props}
    >
      {icon}
    </button>
  );
}