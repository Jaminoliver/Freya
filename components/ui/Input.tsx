"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export function Input({ className, type, error, ...props }: InputProps) {
  const [showPassword, setShowPassword] = React.useState(false);
  const isPassword = type === "password";

  return (
    <div className="w-full">
      <div className="relative">
        <input
          type={isPassword && showPassword ? "text" : type}
          className={cn(
            "w-full px-16 py-12 rounded-input text-base text-text-primary",
            "bg-sidebar border border-border",
            "placeholder:text-text-muted",
            "focus:outline-none focus:border-brand",
            "transition-colors duration-200",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            error && "border-error focus:border-error",
            isPassword && "pr-40",
            className
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-16 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>
      {error && (
        <p className="mt-4 text-caption text-error">{error}</p>
      )}
    </div>
  );
}