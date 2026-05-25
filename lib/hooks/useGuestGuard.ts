"use client";

import { useCallback } from "react";
import { useAppStore } from "@/lib/store/appStore";

export function useGuestGuard() {
  const viewer        = useAppStore((s) => s.viewer);
  const openAuthModal = useAppStore((s) => s.openAuthModal);

  const guard = useCallback(
    <T extends (...args: any[]) => any>(action: T): ((...args: Parameters<T>) => ReturnType<T> | undefined) => {
      return (...args: Parameters<T>): ReturnType<T> | undefined => {
        if (!viewer) {
          openAuthModal();
          return undefined;
        }
        return action(...args);
      };
    },
    [viewer, openAuthModal]
  );

  return guard;
}