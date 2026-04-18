"use client";

import { useState, useEffect } from "react";
import type { Subscription } from "@/lib/types/subscription";

export function useSubscriptionActions(s: Subscription, onRefresh?: () => void) {
  const [isFavourite,   setIsFavourite]   = useState(s.isFavourite);
  const [autoRenew,     setAutoRenew]     = useState(s.autoRenew);
  const [starBusy,      setStarBusy]      = useState(false);
  const [autoBusy,      setAutoBusy]      = useState(false);
  const [cancelBusy,    setCancelBusy]    = useState(false);
  const [freeResubBusy, setFreeResubBusy] = useState(false);

  // Keep local state in sync when parent re-fetches
  useEffect(() => { setIsFavourite(s.isFavourite); }, [s.isFavourite]);
  useEffect(() => { setAutoRenew(s.autoRenew);     }, [s.autoRenew]);

  // ── Favourite toggle (optimistic) ──────────────────────────────
  const toggleFavourite = async () => {
    if (starBusy) return;
    const next = !isFavourite;
    setIsFavourite(next);
    setStarBusy(true);
    try {
      const res  = await fetch(`/api/subscriptions/${s.id}/favourite`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || typeof data.is_favourite !== "boolean") {
        setIsFavourite(!next);
      } else {
        setIsFavourite(data.is_favourite);
      }
    } catch {
      setIsFavourite(!next);
    } finally {
      setStarBusy(false);
      onRefresh?.();
    }
  };

  // ── Auto-renew toggle (optimistic) ─────────────────────────────
  const toggleAutoRenew = async () => {
    if (autoBusy) return;
    const next = !autoRenew;
    setAutoRenew(next);
    setAutoBusy(true);
    try {
      const res  = await fetch(`/api/subscriptions/${s.id}/auto-renew`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ auto_renew: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAutoRenew(!next);
        alert(data.error ?? "Failed to update auto-renew");
      }
    } catch {
      setAutoRenew(!next);
    } finally {
      setAutoBusy(false);
    }
  };

  // ── Free resubscribe (1 tap) ───────────────────────────────────
  const freeResubscribe = async () => {
    if (freeResubBusy) return;
    setFreeResubBusy(true);
    try {
      const res  = await fetch("/api/checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          type:         "subscription",
          amount:       0,
          creatorId:    s.creatorId,
          selectedTier: "monthly",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message ?? "Could not resubscribe");
      } else {
        onRefresh?.();
      }
    } catch {
      alert("Something went wrong");
    } finally {
      setFreeResubBusy(false);
    }
  };

  // ── Cancel subscription ────────────────────────────────────────
  const cancelSubscription = async (): Promise<boolean> => {
    if (cancelBusy) return false;
    setCancelBusy(true);
    try {
      const res  = await fetch(`/api/subscriptions/${s.id}/cancel`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        onRefresh?.();
        return true;
      }
      alert(data.error ?? "Failed to cancel");
      return false;
    } catch {
      alert("Something went wrong");
      return false;
    } finally {
      setCancelBusy(false);
    }
  };

  return {
    isFavourite,
    autoRenew,
    starBusy,
    autoBusy,
    cancelBusy,
    freeResubBusy,
    toggleFavourite,
    toggleAutoRenew,
    freeResubscribe,
    cancelSubscription,
  };
}