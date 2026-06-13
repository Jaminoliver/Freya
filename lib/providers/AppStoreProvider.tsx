"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/store/appStore";
import { getQueryClient } from "@/lib/providers/QueryProvider";

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

      const currentViewer = useAppStore.getState().viewer;
      const isUserSwitch  = !currentViewer || currentViewer.id !== userId;

      if (isUserSwitch) {
        // Clear all stale caches immediately before fetching new profile
        clearAll();
      }

      // Defer to next tick to break out of Supabase auth lock chain
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

          // After setting viewer, invalidate all queries so pages
          // immediately refetch with the authenticated user's data.
          // This fixes: guest feed persisting after login, locked posts
          // still showing after login on profile pages.
          const qc = getQueryClient();
          qc.invalidateQueries({ queryKey: ["feed"] });
          qc.invalidateQueries({ queryKey: ["profile"] });
          qc.invalidateQueries({ queryKey: ["subscriptions"] });
          qc.invalidateQueries({ queryKey: ["stories"] });
        }
      } catch (err: unknown) {
        console.error("[AppStoreProvider] profile fetch failed:", err);
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
          // Clear ALL caches on logout
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