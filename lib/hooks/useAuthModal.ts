"use client";

import { useState, useCallback } from "react";

export type AuthScreen = 0 | 1 | 2 | 3 | 4;

// Screen map:
// 0 → Entry
// 1 → Login
// 2 → Reset password
// 3 → Sign up entry
// 4 → Sign up form

export function useAuthModal(initialScreen: AuthScreen = 0) {
  const [screen, setScreen] = useState<AuthScreen>(initialScreen);

  const navigate = useCallback((s: number) => {
    setScreen(s as AuthScreen);
  }, []);

  const reset = useCallback(() => {
    setScreen(0);
  }, []);

  return { screen, navigate, reset };
}