// app/api/earnings/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";

// Derive earning type from prefixed reference_id (wallet payments)
function categoryFromPrefix(refId: string | null): string | null {
  if (!refId) return null;
  if (refId.startsWith("sub_")) return "SUBSCRIPTION_PAYMENT";
  if (refId.startsWith("autosub_")) return "AUTO_SUBSCRIPTION";
  if (refId.startsWith("tip_")) return "TIP";
  if (refId.startsWith("ppv_")) return "PPV_PURCHASE";
  if (refId.startsWith("msg_")) return "PPV_MESSAGE";
  return null;
}

// Extract numeric ID from prefixed reference_id
function parseRefId(refId: string): { prefix: string | null; numericId: string } {
  const match = refId.match(/^(sub_|autosub_|tip_|ppv_|msg_)(.+)$/);
  if (match) return { prefix: match[1], numericId: match[2] };
  return { prefix: null, numericId: refId };
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("type") ?? "all";
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = 20;
    const offset = (page - 1) * limit;

    const { data: entries, error } = await supabase
      .from("ledger")
      .select("id, amount, reference_id, created_at")
      .eq("user_id", user.id)
      .eq("category", "CREATOR_EARNING")
      .eq("type", "CREDIT")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    if (!entries || entries.length === 0) {
      return NextResponse.json({ history: [] });
    }

    const serviceSupabase = createServiceSupabaseClient();

    // Separate prefixed vs non-prefixed reference_ids
    const prefixedEntries: { refId: string; category: string; prefix: string; numericId: string }[] = [];
    const fallbackRefIds: string[] = [];

    entries.forEach((e) => {
      if (!e.reference_id) return;
      const cat = categoryFromPrefix(e.reference_id);
      if (cat) {
        const parsed = parseRefId(e.reference_id);
        prefixedEntries.push({ refId: e.reference_id, category: cat, prefix: parsed.prefix!, numericId: parsed.numericId });
      } else {
        fallbackRefIds.push(e.reference_id);
      }
    });

    // --- Fan lookup for prefixed entries: query the source table directly ---
    let fanIdMap: Record<string, string> = {}; // reference_id → fan user_id
    let txCategoryMap: Record<string, string> = {}; // reference_id → category

    // Subscriptions
    const subIds = prefixedEntries.filter((p) => p.prefix === "sub_" || p.prefix === "autosub_").map((p) => p.numericId);
    if (subIds.length > 0) {
      const { data: subs } = await serviceSupabase
        .from("subscriptions")
        .select("id, fan_id")
        .in("id", subIds);
      if (subs) {
        subs.forEach((s) => {
          const subRefId = prefixedEntries.find((p) => p.numericId === String(s.id) && (p.prefix === "sub_" || p.prefix === "autosub_"));
          if (subRefId) fanIdMap[subRefId.refId] = s.fan_id;
        });
      }
    }

    // Tips
    const tipIds = prefixedEntries.filter((p) => p.prefix === "tip_").map((p) => p.numericId);
    if (tipIds.length > 0) {
      const { data: tips } = await serviceSupabase
        .from("tips")
        .select("id, tipper_id")
        .in("id", tipIds);
      if (tips) {
        tips.forEach((t) => {
          const tipRefId = prefixedEntries.find((p) => p.numericId === String(t.id) && p.prefix === "tip_");
          if (tipRefId) fanIdMap[tipRefId.refId] = t.tipper_id;
        });
      }
    }

    // PPV unlocks
    const ppvIds = prefixedEntries.filter((p) => p.prefix === "ppv_").map((p) => p.numericId);
    if (ppvIds.length > 0) {
      const { data: unlocks } = await serviceSupabase
        .from("ppv_unlocks")
        .select("id, fan_id")
        .in("id", ppvIds);
      if (unlocks) {
        unlocks.forEach((u) => {
          const ppvRefId = prefixedEntries.find((p) => p.numericId === String(u.id) && p.prefix === "ppv_");
          if (ppvRefId) fanIdMap[ppvRefId.refId] = u.fan_id;
        });
      }
    }

    // Set category map for prefixed entries
    prefixedEntries.forEach((p) => {
      txCategoryMap[p.refId] = p.category;
    });

    // --- Fallback for Monnify / legacy entries (no prefix) ---
    let fallbackFanMap: Record<string, { category: string; userId: string }> = {};

    if (fallbackRefIds.length > 0) {
      const { data: fanDebits } = await serviceSupabase
        .from("ledger")
        .select("reference_id, category, user_id")
        .in("reference_id", fallbackRefIds)
        .eq("type", "DEBIT")
        .in("category", ["SUBSCRIPTION_PAYMENT", "AUTO_SUBSCRIPTION", "TIP", "PPV_PURCHASE", "PPV_MESSAGE"]);

      if (fanDebits) {
        fanDebits.forEach((fd) => {
          if (fd.reference_id) {
            fallbackFanMap[fd.reference_id] = { category: fd.category, userId: fd.user_id };
            txCategoryMap[fd.reference_id] = fd.category;
            fanIdMap[fd.reference_id] = fd.user_id;
          }
        });
      }

      // Fallback: transactions table for bank transfer payments
      const stillMissing = fallbackRefIds.filter((r) => !fallbackFanMap[r]);
      if (stillMissing.length > 0) {
        const { data: txRows } = await serviceSupabase
          .from("transactions")
          .select("provider_txn_id, fan_id, purpose")
          .in("provider_txn_id", stillMissing);

        const PURPOSE_TO_CATEGORY: Record<string, string> = {
          SUBSCRIPTION: "SUBSCRIPTION_PAYMENT",
          TIP: "TIP",
          PPV: "PPV_PURCHASE",
          WALLET_TOPUP: "WALLET_TOPUP",
        };

        if (txRows) {
          txRows.forEach((tx) => {
            if (tx.provider_txn_id && tx.fan_id && !fallbackFanMap[tx.provider_txn_id]) {
              txCategoryMap[tx.provider_txn_id] = PURPOSE_TO_CATEGORY[tx.purpose] ?? "SUBSCRIPTION_PAYMENT";
              fanIdMap[tx.provider_txn_id] = tx.fan_id;
            }
          });
        }
      }
    }

    // Fetch fan profiles
    const allFanIds = [...new Set(Object.values(fanIdMap).filter(Boolean))];
    let fanProfileMap: Record<string, { display_name: string; username: string }> = {};

    if (allFanIds.length > 0) {
      const { data: fans } = await serviceSupabase
        .from("profiles")
        .select("id, display_name, username")
        .in("id", allFanIds);

      fanProfileMap = Object.fromEntries(
        (fans ?? []).map((f) => [f.id, { display_name: f.display_name, username: f.username }])
      );
    }

    const CATEGORY_LABEL: Record<string, string> = {
      SUBSCRIPTION_PAYMENT: "Subscription",
      AUTO_SUBSCRIPTION: "Subscription",
      TIP: "Tip",
      PPV_PURCHASE: "PPV",
      PPV_MESSAGE: "Message",
    };

    const history = entries
      .map((entry) => {
        const cat = entry.reference_id ? txCategoryMap[entry.reference_id] : null;
        const typeLabel = cat ? (CATEGORY_LABEL[cat] ?? "Other") : "Other";

        if (filter !== "all" && typeLabel.toLowerCase() !== filter.toLowerCase()) return null;

        const fanUserId = entry.reference_id ? fanIdMap[entry.reference_id] : null;
        const fan = fanUserId ? fanProfileMap[fanUserId] : null;

        return {
          id: entry.id,
          amount: entry.amount / 100,
          type: typeLabel,
          date: new Date(entry.created_at).toLocaleDateString("en-NG", {
            day: "numeric", month: "short", year: "numeric",
          }),
          fan: fan?.display_name ?? "Anonymous",
          username: fan?.username ? `@${fan.username}` : "",
          status: "completed",
        };
      })
      .filter(Boolean);

    return NextResponse.json({ history });
  } catch (err) {
    console.error("[Earnings History Error]", err);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}