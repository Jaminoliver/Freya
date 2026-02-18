import * as React from "react";
import { cn } from "@/lib/utils";

export type OAuthProvider = "google" | "twitter";

export interface OAuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  provider: OAuthProvider;
  action?: "signin" | "signup";
}

const providers = {
  google: {
    label: "Google",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M19.8055 10.2292C19.8055 9.52422 19.7493 8.81576 19.6299 8.12109H10.2002V12.0879H15.6014C15.3768 13.3266 14.6508 14.4057 13.6106 15.0873V17.5865H16.8251C18.7173 15.8445 19.8055 13.2723 19.8055 10.2292Z" fill="#4285F4"/>
        <path d="M10.2002 20.0006C12.9516 20.0006 15.2719 19.1048 16.8286 17.5865L13.6141 15.0873C12.7322 15.6977 11.5719 16.0427 10.2037 16.0427C7.5479 16.0427 5.29461 14.2831 4.52135 11.9092H1.2207V14.4833C2.81587 17.6535 6.34655 20.0006 10.2002 20.0006Z" fill="#34A853"/>
        <path d="M4.51789 11.909C4.06107 10.6703 4.06107 9.33348 4.51789 8.09473V5.52063H1.22067C-0.192965 8.33598 -0.192965 11.6677 1.22067 14.483L4.51789 11.909Z" fill="#FBBC04"/>
        <path d="M10.2002 3.95817C11.6465 3.93567 13.0404 4.47379 14.0876 5.46098L16.9373 2.61129C15.1859 0.990234 12.7358 0.0979004 10.2002 0.124651C6.34655 0.124651 2.81587 2.47176 1.2207 5.64536L4.51792 8.21946C5.28771 5.84207 7.54447 3.95817 10.2002 3.95817Z" fill="#EA4335"/>
      </svg>
    ),
  },
  twitter: {
    label: "X",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path d="M11.8992 8.40503L19.3934 0H17.6094L11.1172 7.29695L5.95699 0H0L7.84458 11.1196L0 20H1.78407L8.62637 12.3216L14.043 20H20L11.8988 8.40503H11.8992ZM9.5241 11.2817L8.74638 10.1456L2.40243 1.34219H5.10938L10.2752 8.5118L11.0529 9.6479L17.6103 18.7284H14.9033L9.5241 11.2821V11.2817Z"/>
      </svg>
    ),
  },
};

export function OAuthButton({ provider, action = "signup", className, ...props }: OAuthButtonProps) {
  const { label, icon } = providers[provider];
  const actionLabel = action === "signup" ? "Sign up" : "Sign in";

  return (
    <button
      type="button"
      className={cn(
        "w-full flex items-center justify-center gap-12 px-16 py-12 rounded-btn",
        "bg-sidebar border border-border text-text-primary text-small font-medium",
        "hover:opacity-80 transition-opacity duration-200",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    >
      {icon}
      {actionLabel} with {label}
    </button>
  );
}