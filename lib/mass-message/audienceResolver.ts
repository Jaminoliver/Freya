// lib/mass-message/audienceResolver.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export type AudienceSegment =
  | "all_subscribers"
  | "active_subscribers"
  | "expired_subscribers"
  | "online_now"
  | "top_spenders"
  | "new_this_week"
  | "followers"
  | "custom"
  | `fan_list:${number}`;

export type CustomAudienceStatus =
  | "active"
  | "expired"
  | "cancelled"
  | "grace_period"
  | "renewal_failed"
  | "never_subscribed";

export interface CustomAudienceFilter {
  statuses?:       CustomAudienceStatus[];
  member_since?:   "week" | "month" | "3months";
  min_spend_kobo?: number;
  online_only?:    boolean;
  has_bought_ppv?: boolean;
}

export interface ResolveOptions {
  topSpenderThresholdKobo?: number;  // default 500_000 (₦5,000)
  onlineWindowMin?: number;          // default 5
  newWindowDays?: number;            // default 7
  customFilter?:  CustomAudienceFilter;
}

export interface ResolveResult {
  fan_ids:  string[];
  count:    number;
  matched:  number;
  excluded: number;
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
          .from("messages")
          .select("ppv_message_unlocks!inner(fan_id, amount_paid)")
          .eq("sender_id", creator_id),
      ]);

      const totals = new Map<string, number>();
      for (const t of (tipsRes.data ?? []) as { tipper_id: string; amount: number }[]) {
        totals.set(t.tipper_id, (totals.get(t.tipper_id) ?? 0) + (t.amount ?? 0));
      }
      for (const p of (ppvPostRes.data ?? []) as { fan_id: string; amount_paid: number }[]) {
        totals.set(p.fan_id, (totals.get(p.fan_id) ?? 0) + (p.amount_paid ?? 0));
      }
      for (const m of (ppvMsgRes.data ?? []) as { ppv_message_unlocks: { fan_id: string; amount_paid: number }[] }[]) {
        for (const p of (m.ppv_message_unlocks ?? [])) {
          totals.set(p.fan_id, (totals.get(p.fan_id) ?? 0) + (p.amount_paid ?? 0));
        }
      }

      fanIds = Array.from(totals.entries())
        .filter(([, sum]) => sum >= topSpenderThresholdKobo)
        .map(([id]) => id);
      break;
    }

    case "followers": {
      const { data } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("followed_id", creator_id);
      fanIds = uniq((data ?? []).map((r: any) => r.follower_id));
      break;
    }

    case "custom": {
      const f = options.customFilter ?? {};

      // ── Step 1: build the base pool ──────────────────────────────────────
      // All fans who ever subscribed to this creator
      const { data: subData } = await supabase
        .from("subscriptions")
        .select("fan_id, status, created_at, auto_renew")
        .eq("creator_id", creator_id);

      // All fans who ever spent money with this creator
      const [tipsPool, ppvPostPool, ppvMsgPool] = await Promise.all([
        supabase.from("tips").select("tipper_id").eq("recipient_id", creator_id),
        supabase.from("ppv_unlocks").select("fan_id").eq("creator_id", creator_id),
        supabase
          .from("messages")
          .select("ppv_message_unlocks!inner(fan_id)")
          .eq("sender_id", creator_id),
      ]);

      // Build spend fan set
      const spendFanSet = new Set<string>();
      for (const r of (tipsPool.data ?? [])) spendFanSet.add(r.tipper_id);
      for (const r of (ppvPostPool.data ?? [])) spendFanSet.add(r.fan_id);
      for (const m of (ppvMsgPool.data ?? []) as { ppv_message_unlocks: { fan_id: string }[] }[]) {
        for (const r of (m.ppv_message_unlocks ?? [])) spendFanSet.add(r.fan_id);
      }

      // Build subscription map: fan_id → subscription row
      const subMap = new Map<string, { status: string; created_at: string }>();
      for (const r of (subData ?? [])) {
        subMap.set(r.fan_id, { status: r.status, created_at: r.created_at });
      }

      // Union of all known fans
      const allFanIds = uniq([...subMap.keys(), ...spendFanSet]);

      // ── Step 2: status filter ─────────────────────────────────────────────
      let filtered = allFanIds;
      if (f.statuses && f.statuses.length > 0) {
        filtered = allFanIds.filter((id) => {
          const sub = subMap.get(id);
          if (!sub) return f.statuses!.includes("never_subscribed");
          return f.statuses!.includes(sub.status as CustomAudienceStatus);
        });
      }

      // ── Step 3: member_since filter (active subs only) ────────────────────
      if (f.member_since && filtered.length > 0) {
        const windowMs =
          f.member_since === "week"    ? 7  * 86_400_000 :
          f.member_since === "month"   ? 30 * 86_400_000 :
                                         90 * 86_400_000;
        const since = new Date(Date.now() - windowMs).toISOString();
        filtered = filtered.filter((id) => {
          const sub = subMap.get(id);
          if (!sub) return false;
          return sub.created_at >= since;
        });
      }

      // ── Step 4: spend filter ──────────────────────────────────────────────
      if (f.min_spend_kobo != null && filtered.length > 0) {
        const filteredSet = new Set(filtered);
        const [tipsRes, ppvPostRes, ppvMsgRes] = await Promise.all([
          supabase.from("tips").select("tipper_id, amount").eq("recipient_id", creator_id),
          supabase.from("ppv_unlocks").select("fan_id, amount_paid").eq("creator_id", creator_id),
          supabase.from("messages").select("ppv_message_unlocks!inner(fan_id, amount_paid)").eq("sender_id", creator_id),
        ]);

        const totals = new Map<string, number>();
        for (const t of (tipsRes.data ?? []) as { tipper_id: string; amount: number }[]) {
          if (filteredSet.has(t.tipper_id)) totals.set(t.tipper_id, (totals.get(t.tipper_id) ?? 0) + t.amount);
        }
        for (const p of (ppvPostRes.data ?? []) as { fan_id: string; amount_paid: number }[]) {
          if (filteredSet.has(p.fan_id)) totals.set(p.fan_id, (totals.get(p.fan_id) ?? 0) + p.amount_paid);
        }
        for (const m of (ppvMsgRes.data ?? []) as { ppv_message_unlocks: { fan_id: string; amount_paid: number }[] }[]) {
          for (const p of (m.ppv_message_unlocks ?? [])) {
            if (filteredSet.has(p.fan_id)) totals.set(p.fan_id, (totals.get(p.fan_id) ?? 0) + p.amount_paid);
          }
        }

        filtered = filtered.filter((id) => (totals.get(id) ?? 0) >= f.min_spend_kobo!);
      }

      // ── Step 5: online filter ─────────────────────────────────────────────
      if (f.online_only && filtered.length > 0) {
        const since = new Date(Date.now() - onlineWindowMin * 60_000).toISOString();
        const { data: onlineData } = await supabase
          .from("profiles")
          .select("id")
          .in("id", filtered)
          .gte("last_seen_at", since);
        const onlineSet = new Set((onlineData ?? []).map((r: any) => r.id));
        filtered = filtered.filter((id) => onlineSet.has(id));
      }

      // ── Step 6: has bought PPV filter ─────────────────────────────────────
      if (f.has_bought_ppv && filtered.length > 0) {
        const filteredSet = new Set(filtered);
        const [ppvPostBuyers, ppvMsgBuyers] = await Promise.all([
          supabase.from("ppv_unlocks").select("fan_id").eq("creator_id", creator_id).in("fan_id", filtered),
          supabase.from("messages").select("ppv_message_unlocks!inner(fan_id)").eq("sender_id", creator_id),
        ]);

        const buyerSet = new Set<string>();
        for (const r of (ppvPostBuyers.data ?? [])) buyerSet.add(r.fan_id);
        for (const m of (ppvMsgBuyers.data ?? []) as { ppv_message_unlocks: { fan_id: string }[] }[]) {
          for (const r of (m.ppv_message_unlocks ?? [])) {
            if (filteredSet.has(r.fan_id)) buyerSet.add(r.fan_id);
          }
        }

        filtered = filtered.filter((id) => buyerSet.has(id));
      }

      fanIds = filtered;
      break;
    }

    default:
      fanIds = [];
  }

  // ── Fan list segment ──────────────────────────────────────────────────────
  if (fanIds.length === 0 && typeof segment === "string" && segment.startsWith("fan_list:")) {
    const listId = parseInt(segment.replace("fan_list:", ""), 10);
    if (!isNaN(listId)) {
      const { data } = await supabase
        .from("fan_list_members")
        .select("fan_id")
        .eq("list_id", listId);
      fanIds = (data ?? []).map((r: any) => r.fan_id);
    }
  }

  return { fan_ids: fanIds, count: fanIds.length, matched: fanIds.length, excluded: 0 };
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}