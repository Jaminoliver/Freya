"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore, isStale } from "@/lib/store/appStore";

export function ViewerProvider({ children }: { children: React.ReactNode }) {
  const { viewer, viewerFetchedAt, setViewer, setViewerReady } = useAppStore();

  useEffect(() => {
    // Already fresh in store — mark ready immediately, skip fetch
    if (viewer && !isStale(viewerFetchedAt)) {
      setViewerReady(true);
      return;
    }

    const fetchViewer = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setViewer(null); setViewerReady(true); return; }

        const { data } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, role")
          .eq("id", user.id)
          .single();

        if (data) setViewer(data as any);
      } catch (err) {
        console.error("[ViewerProvider]", err);
      } finally {
        setViewerReady(true);
      }
    };

    fetchViewer();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
}