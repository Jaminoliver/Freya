import { NextRequest, NextResponse } from "next/server";
import {
  processAutoRenewals,
  retryFailedRenewals,
  expireLapsedSubscriptions,
} from "@/lib/utils/subscriptions";

// ─── GET /api/cron/subscriptions ──────────────────────────────────────────────
// Daily cron job — runs at midnight UTC
// 1. Process all subscriptions due today
// 2. Retry failed renewals from the past 3 days
// 3. Expire subscriptions that have lapsed beyond 3 days
//
// Configure in vercel.json:
// {
//   "crons": [{ "path": "/api/cron/subscriptions", "schedule": "0 0 * * *" }]
// }

export async function GET(req: NextRequest) {
  try {
    // Verify request is from Vercel Cron or your own scheduler
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    console.log("[Cron] Starting subscription renewal job...");

    // Step 1 — Process today's renewals
    const renewalResults = await processAutoRenewals();
    const renewed = renewalResults.filter((r) => r.success).length;
    const failed = renewalResults.filter((r) => !r.success).length;
    console.log(`[Cron] Renewals — Success: ${renewed}, Failed: ${failed}`);

    // Step 2 — Retry previously failed renewals
    const retryResults = await retryFailedRenewals();
    const retried = retryResults.filter((r) => r.success).length;
    console.log(`[Cron] Retries — Recovered: ${retried}`);

    // Step 3 — Expire lapsed subscriptions
    await expireLapsedSubscriptions();
    console.log("[Cron] Expired lapsed subscriptions.");

    return NextResponse.json({
      message: "Cron job completed",
      renewals: { renewed, failed },
      retries: { recovered: retried },
    });

  } catch (error) {
    console.error("[Cron Error]", error);
    return NextResponse.json({ message: "Cron job failed" }, { status: 500 });
  }
}