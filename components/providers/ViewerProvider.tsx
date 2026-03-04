"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore, isStale } from "@/lib/store/appStore";

export function ViewerProvider({ children }: { children: React.ReactNode }) {
  const { viewer, viewerFetchedAt, setViewer } = useAppStore();

  useEffect(() => {
    // Already fresh in store — skip fetch entirely
    if (viewer && !isStale(viewerFetchedAt)) return;

    const fetchViewer = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setViewer(null); return; }

        const { data } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, role")
          .eq("id", user.id)
          .single();

        if (data) setViewer(data as any);
      } catch (err) {
        console.error("[ViewerProvider]", err);
      }
    };

    fetchViewer();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
}