"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/store/appStore";

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const { viewer, viewerFetchedAt, setViewer } = useAppStore();

  useEffect(() => {
    // Already have viewer, skip
    if (viewer && viewerFetchedAt) return;

    const bootstrap = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setViewer(null); return; }

      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, role")
        .eq("id", user.id)
        .single();

      if (data) {
        setViewer({
          id:           user.id,
          username:     data.username,
          display_name: data.display_name || data.username,
          avatar_url:   data.avatar_url || "",
          role:         data.role || "fan",
        });
      }
    };

    bootstrap();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
}