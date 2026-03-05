"use client";

import { useEffect, useRef } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/store/appStore";

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const { setViewer } = useAppStore();
  const fetchingRef = useRef<string | null>(null);

  useEffect(() => {
    // Single client with noOpLock — used for both auth and profile queries
    const supabase = createClient();

    const fetchAndSetViewer = async (userId: string) => {
      if (fetchingRef.current === userId) {
        console.log("[AppStoreProvider] skipped — already in flight for:", userId);
        return;
      }
      fetchingRef.current = userId;
      console.log("[AppStoreProvider] fetchAndSetViewer started, userId:", userId);

      try {
        console.log("[AppStoreProvider] querying profiles table...");
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, role")
          .eq("id", userId)
          .single();

        console.log("[AppStoreProvider] profile query result — data:", data, "error:", error);

        if (error) throw error;

        if (data) {
          setViewer({
            id:           userId,
            username:     data.username,
            display_name: data.display_name || data.username,
            avatar_url:   data.avatar_url || null,
            role:         data.role || "fan",
          });
          console.log("[AppStoreProvider] viewer set successfully:", data.username);
        } else {
          console.warn("[AppStoreProvider] no profile data for userId:", userId);
        }
      } catch (err: unknown) {
        console.error("[AppStoreProvider] profile fetch failed:", err);
        setTimeout(async () => {
          try {
            console.log("[AppStoreProvider] retrying profile query...");
            const { data, error } = await supabase
              .from("profiles")
              .select("id, username, display_name, avatar_url, role")
              .eq("id", userId)
              .single();
            console.log("[AppStoreProvider] retry result — data:", data, "error:", error);
            if (data) {
              setViewer({
                id:           userId,
                username:     data.username,
                display_name: data.display_name || data.username,
                avatar_url:   data.avatar_url || null,
                role:         data.role || "fan",
              });
              console.log("[AppStoreProvider] viewer set on retry:", data.username);
            }
          } catch (retryErr: unknown) {
            console.error("[AppStoreProvider] retry also failed:", retryErr);
          }
        }, 2000);
      } finally {
        fetchingRef.current = null;
        console.log("[AppStoreProvider] fetchAndSetViewer finished for:", userId);
      }
    };

    console.log("[AppStoreProvider] mounted — subscribing to onAuthStateChange");

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log("[AppStoreProvider] onAuthStateChange:", event, session?.user?.id ?? "no session");
        if (session?.user) {
          await fetchAndSetViewer(session.user.id);
        } else {
          setViewer(null);
          if (event === "SIGNED_OUT") {
            window.location.href = "/login";
          }
        }
      }
    );

    return () => {
      console.log("[AppStoreProvider] unmounting — unsubscribing");
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}