"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/store/appStore";

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Plain fetch avoids Supabase client deadlock inside onAuthStateChange
async function fetchProfileById(userId: string, accessToken: string) {
  const url = `${SUPABASE_URL}/rest/v1/profiles?select=id,username,display_name,avatar_url,role&id=eq.${userId}&limit=1`;
  const res = await fetch(url, {
    headers: {
      "apikey":        SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type":  "application/json",
    },
  });
  if (!res.ok) throw new Error(`Profile fetch failed: ${res.status}`);
  const rows = await res.json();
  return rows[0] ?? null;
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const { setViewer, clearAll, setViewerReady } = useAppStore();
  const fetchingRef = useRef<string | null>(null);

  // Hydrate viewer from sessionStorage synchronously before first paint.
  // useLayoutEffect runs after DOM mutations but before the browser paints,
  // so the component renders with the real viewer on the very first frame —
  // no flicker, and no SSR mismatch (useLayoutEffect is skipped on the server).
  useLayoutEffect(() => {
    const stored = sessionStorage.getItem("freya_viewer_cache");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?.id) setViewer(parsed);
      } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const fetchAndSetViewer = async (userId: string, accessToken: string) => {
      if (fetchingRef.current === userId) return;
      fetchingRef.current = userId;

      // ── Detect user switch: if a different user is logging in, clear all caches ──
      const currentViewer = useAppStore.getState().viewer;
      if (!currentViewer || currentViewer.id !== userId) {
        console.log("[AppStoreProvider] User switch or guest login detected, clearing all caches");
        clearAll();
      }

      // Defer to next event loop tick to break out of Supabase auth lock chain
      await new Promise<void>((resolve) => setTimeout(resolve, 0));

      try {
        const data = await fetchProfileById(userId, accessToken);
        if (data) {
          setViewer({
            id:           userId,
            username:     data.username,
            display_name: data.display_name || data.username,
            avatar_url:   data.avatar_url || null,
            role:         data.role || "fan",
          });
        }
        // If data is null, keep existing cached viewer — don't wipe it
      } catch (err: unknown) {
        console.error("[AppStoreProvider] profile fetch failed:", err);
        // Keep existing cached viewer on error — don't wipe it
      } finally {
        setViewerReady(true);
        fetchingRef.current = null;
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (session?.user && session.access_token) {
          await fetchAndSetViewer(session.user.id, session.access_token);
        } else {
          // ── FIXED: clear ALL caches on logout, not just viewer ──────────
          // Previously only called setViewer(null) which left freya_feed_cache,
          // freya_profiles_cache, freya_content_feeds_cache in sessionStorage.
          // Next login on the same tab would show the old user's feed.
          const hadViewer = !!useAppStore.getState().viewer;
          clearAll();
          setViewerReady(true);

          if (event === "SIGNED_OUT" && hadViewer) {
            window.location.href = "/login";
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}