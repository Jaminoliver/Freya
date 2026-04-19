// lib/hooks/useViewer.ts
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export interface Viewer {
  id:           string;
  username:     string;
  display_name: string;
  avatar_url:   string;
}

// ── Module-level viewer cache with auth invalidation ──────────────────────
let cachedViewer: Viewer | null = null;
let viewerPromise: Promise<Viewer | null> | null = null;
let authListenerSet = false;

function setupAuthListener() {
  if (authListenerSet) return;
  authListenerSet = true;
  try {
    const supabase = createClient();
    supabase.auth.onAuthStateChange((event: string) => {
      if (event === "SIGNED_OUT") {
        cachedViewer  = null;
        viewerPromise = null;
      }
    });
  } catch {}
}

export function fetchViewer(): Promise<Viewer | null> {
  setupAuthListener();
  if (cachedViewer)  return Promise.resolve(cachedViewer);
  if (viewerPromise) return viewerPromise;

  viewerPromise = (async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { cachedViewer = null; return null; }

      const { data } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url")
        .eq("id", user.id)
        .single();

      if (data) {
        cachedViewer = {
          id:           user.id,
          username:     data.username,
          display_name: data.display_name || data.username,
          avatar_url:   data.avatar_url || "",
        };
        return cachedViewer;
      }
      return null;
    } catch {
      return null;
    } finally {
      viewerPromise = null;
    }
  })();

  return viewerPromise;
}

export function useViewer() {
  const [viewer, setViewer] = useState<Viewer | null>(cachedViewer);

  useEffect(() => {
    if (cachedViewer) { setViewer(cachedViewer); return; }
    fetchViewer().then((v) => { if (v) setViewer(v); });
  }, []);

  return viewer;
}