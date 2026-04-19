"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTransition, useCallback } from "react";
import { useAppStore } from "@/lib/store/appStore";

export function useNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const setNavigating = useAppStore((s) => s.setNavigating);

  const navigate = useCallback(
    (href: string) => {
      if (href === pathname) return;

     if (href === "/create") {
        router.push(href);
      } else {
        setNavigating(true);
        startTransition(() => {
          router.push(href);
        });
      }
    },
    [router, pathname, setNavigating, startTransition]
  );

  return { navigate };
}