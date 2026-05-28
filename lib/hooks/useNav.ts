"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTransition, useCallback } from "react";

export function useNav() {
  const router   = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const navigate = useCallback(
    (href: string) => {
      if (href === pathname) return;
      startTransition(() => {
        router.push(href);
      });
    },
    [router, pathname, startTransition]
  );

  return { navigate };
}