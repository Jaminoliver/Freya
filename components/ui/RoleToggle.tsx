"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type Role = "fan" | "creator";

export interface RoleToggleProps {
  value: Role;
  onChange: (role: Role) => void;
  className?: string;
}

export function RoleToggle({ value, onChange, className }: RoleToggleProps) {
  return (
    <div
      className={cn(
        "flex gap-8 p-4 rounded-btn",
        "bg-background",
        className
      )}
    >
      {(["fan", "creator"] as Role[]).map((role) => (
        <button
          key={role}
          type="button"
          onClick={() => onChange(role)}
          className={cn(
            "flex-1 py-8 px-16 rounded-btn text-small font-semibold capitalize transition-colors duration-200",
            value === role
              ? "bg-brand text-white"
              : "bg-border text-text-secondary hover:text-text-primary"
          )}
        >
          {role}
        </button>
      ))}
    </div>
  );
}