"use client";

import { useCallback } from "react";
import { useAppStore } from "@/lib/store/appStore";

/**
 * Returns a guard function that wraps any protected action.
 * If the user is not logged in, the auth modal opens instead.
 *
 * Usage:
 *   const guard = useGuestGuard();
 *   <button onClick={guard(handleLike)}>Like</button>
 *   <button onClick={guard(() => router.push("/messages"))}>Message</button>
 */
export function useGuestGuard() {
  const viewer        = useAppStore((s) => s.viewer);
  const openAuthModal = useAppStore((s) => s.openAuthModal);

  const guard = useCallback(
    <T extends (...args: any[]) => any>(action: T): ((...args: Parameters<T>) => void) => {
      return (...args: Parameters<T>) => {
        if (!viewer) {
          openAuthModal();
          return;
        }
        action(...args);
      };
    },
    [viewer, openAuthModal]
  );

  return guard;
}