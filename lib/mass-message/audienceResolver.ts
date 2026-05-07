// lib/mass-message/audienceResolver.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export type AudienceSegment =
  | "all_subscribers"
  | "active_subscribers"
  | "expired_subscribers"
  | "online_now"
  | "top_spenders"
  | "new_this_week"
  | "followers";

export interface ResolveOptions {
  excludeActiveChatters?: boolean;   // default true
  activeChatterWindowHr?: number;    // default 2
  topSpenderThresholdKobo?: number;  // default 500_000 (₦5,000)
  onlineWindowMin?: number;          // default 5
  newWindowDays?: number;            // default 7
}

export interface ResolveResult {
  fan_ids: string[];
  count:   number;
}

/**
 * Resolves an audience segment to a list of fan IDs for a creator.
 * Caller should pass a service-role Supabase client (RLS-bypassing).
 */
export async function resolveAudience(
  supabase: SupabaseClient,
  creator_id: string,
  segment: AudienceSegment,
  options: ResolveOptions = {}
): Promise<ResolveResult> {
  const {
    excludeActiveChatters   = true,
    activeChatterWindowHr   = 2,
    topSpenderThresholdKobo = 500_000,
    onlineWindowMin         = 5,
    newWindowDays           = 7,
  } = options;

  let fanIds: string[] = [];

  switch (segment) {
    case "all_subscribers": {
      const { data } = await supabase
        .from("subscriptions")
        .select("fan_id")
        .eq("creator_id", creator_id)
        .in("status", ["active", "grace_period"]);
      fanIds = uniq((data ?? []).map((r: any) => r.fan_id));
      break;
    }

    case "active_subscribers": {
      const { data } = await supabase
        .from("subscriptions")
        .select("fan_id")
        .eq("creator_id", creator_id)
        .eq("status", "active");
      fanIds = uniq((data ?? []).map((r: any) => r.fan_id));
      break;
    }

    case "expired_subscribers": {
      const { data } = await supabase
        .from("subscriptions")
        .select("fan_id")
        .eq("creator_id", creator_id)
        .in("status", ["expired", "cancelled", "renewal_failed"]);
      fanIds = uniq((data ?? []).map((r: any) => r.fan_id));
      break;
    }

    case "online_now": {
      const since = new Date(Date.now() - onlineWindowMin * 60_000).toISOString();
      // Active subscribers seen within the window
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("fan_id, profiles!subscriptions_fan_id_fkey(last_seen_at)")
        .eq("creator_id", creator_id)
        .eq("status", "active");
      fanIds = uniq(
        (subs ?? [])
          .filter((r: any) => r.profiles?.last_seen_at && r.profiles.last_seen_at >= since)
          .map((r: any) => r.fan_id)
      );
      break;
    }

    case "new_this_week": {
      const since = new Date(Date.now() - newWindowDays * 86_400_000).toISOString();
      const { data } = await supabase
        .from("subscriptions")
        .select("fan_id")
        .eq("creator_id", creator_id)
        .eq("status", "active")
        .gte("created_at", since);
      fanIds = uniq((data ?? []).map((r: any) => r.fan_id));
      break;
    }

    case "top_spenders": {
      // Sum tips + PPV unlocks (post + message) per fan for this creator
      const [tipsRes, ppvPostRes, ppvMsgRes] = await Promise.all([
        supabase
          .from("tips")
          .select("tipper_id, amount")
          .eq("recipient_id", creator_id),
        supabase
          .from("ppv_unlocks")
          .select("fan_id, amount_paid")
          .eq("creator_id", creator_id),
        supabase
          .from("ppv_message_unlocks")
          .select("fan_id, amount_paid, messages!inner(sender_id)")
          .eq("messages.sender_id", creator_id),
      ]);

      const totals = new Map<string, number>();
      for (const t of (tipsRes.data ?? []) as { tipper_id: string; amount: number }[]) {
        totals.set(t.tipper_id, (totals.get(t.tipper_id) ?? 0) + (t.amount ?? 0));
      }
      for (const p of (ppvPostRes.data ?? []) as { fan_id: string; amount_paid: number }[]) {
        totals.set(p.fan_id, (totals.get(p.fan_id) ?? 0) + (p.amount_paid ?? 0));
      }
      for (const p of (ppvMsgRes.data ?? []) as { fan_id: string; amount_paid: number }[]) {
        totals.set(p.fan_id, (totals.get(p.fan_id) ?? 0) + (p.amount_paid ?? 0));
      }

      fanIds = Array.from(totals.entries())
        .filter(([, sum]) => sum >= topSpenderThresholdKobo)
        .map(([id]) => id);
      break;
    }

    case "followers": {
      // Free followers — placeholder until follows table is wired
      // For now return empty; safe no-op so UI can still list the segment
      fanIds = [];
      break;
    }

    default:
      fanIds = [];
  }

  // Exclude active chatters (fans who messaged the creator recently)
  if (excludeActiveChatters && fanIds.length > 0) {
    const since = new Date(Date.now() - activeChatterWindowHr * 3_600_000).toISOString();
    const { data: recentMsgs } = await supabase
      .from("messages")
      .select("sender_id")
      .eq("receiver_id", creator_id)
      .gte("created_at", since)
      .in("sender_id", fanIds);

    const activeSet = new Set((recentMsgs ?? []).map((m: any) => m.sender_id));
    if (activeSet.size > 0) {
      fanIds = fanIds.filter((id) => !activeSet.has(id));
    }
  }

  return { fan_ids: fanIds, count: fanIds.length };
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}