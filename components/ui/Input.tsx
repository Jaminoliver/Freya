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
            "w-full rounded-input text-base text-text-primary",
            "bg-sidebar placeholder:text-text-muted",
            "focus:outline-none",                          // ✅ no focus border change
            "transition-colors duration-200",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            error && "border-error",
            isPassword && "pr-12",
            className
          )}
          style={{
            padding: "15px 16px",                         // ✅ matches login form
            border: "1.5px solid #1F1F2A",               // ✅ matches login form
            boxSizing: "border-box",
            paddingRight: isPassword ? "48px" : "16px",
          }}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1 text-caption text-error">{error}</p>
      )}
    </div>
  );
}