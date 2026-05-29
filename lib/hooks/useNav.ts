"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";

export function useNav() {
  const router   = useRouter();
  const pathname = usePathname();

  const navigate = useCallback(
    (href: string) => {
      if (href === pathname) return;
      router.push(href);
    },
    [router, pathname]
  );

  return { navigate };
}