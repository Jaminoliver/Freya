import { Suspense } from "react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsLayout />
    </Suspense>
  );
}