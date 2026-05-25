"use client";

import { AppStoreProvider } from "@/lib/providers/AppStoreProvider";
import { AuthModal } from "@/components/auth/modal/AuthModal";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppStoreProvider>
      {children}
      <AuthModal />
    </AppStoreProvider>
  );
}