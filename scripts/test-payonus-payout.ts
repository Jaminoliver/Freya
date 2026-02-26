// ─── PayOnUs Payout Webhook Simulator ────────────────────────────────────────
// Run with: npx tsx scripts/test-payonus-payout.ts <email>
// Example:  npx tsx scripts/test-payonus-payout.ts you@example.com
// Looks up creator by email, finds their latest PENDING payout, fires webhook

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL     = "https://fgeedvumuwbtuydosogb.supabase.co";
const SUPABASE_SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnZWVkdnVtdXdidHV5ZG9zb2diIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIzNDM4OSwiZXhwIjoyMDg2ODEwMzg5fQ.-xkN02Fg680p5zNGAiYfSWj9a3knXAPu1caItxyh2Lw";
const WEBHOOK_URL      = "https://cinnamyl-discrepantly-donnell.ngrok-free.dev/api/webhooks/payonus";
const VERIFICATION_KEY = "freya_payonus_webhook_2026";

const ONUS_REFERENCE   = "ONUS-PAYOUT-TEST-" + Date.now();

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error("❌ Missing email");
    console.error("Usage: npx tsx scripts/test-payonus-payout.ts <email>");
    process.exit(1);
  }

  console.log("─── PayOnUs Payout Webhook Simulator ────────────────────");
  console.log(`Email:     ${email}`);

  // 1. Look up creator by email
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();

  if (userError) {
    console.error("❌ Failed to fetch users:", userError.message);
    process.exit(1);
  }

  const user = users.find((u) => u.email === email);

  if (!user) {
    console.error(`❌ No user found with email: ${email}`);
    process.exit(1);
  }

  console.log(`Creator ID: ${user.id}`);

  // 2. Fetch latest PENDING payout request for this creator
  const { data: payout, error: payoutError } = await supabase
    .from("payout_requests")
    .select("id, amount, kyshi_transfer_code, bank_account_number")
    .eq("creator_id", user.id)
    .eq("status", "PENDING")
    .order("requested_at", { ascending: false })
    .limit(1)
    .single();

  if (payoutError || !payout) {
    console.error("❌ No pending payout request found for this creator");
    console.error("→ Make sure you've submitted a payout request in the app first");
    process.exit(1);
  }

  const AMOUNT             = payout.amount;
  const MERCHANT_REFERENCE = payout.kyshi_transfer_code;

  console.log(`Payout ID:  ${payout.id}`);
  console.log(`Reference:  ${MERCHANT_REFERENCE}`);
  console.log(`Amount:     ₦${Number(AMOUNT).toLocaleString()}`);

  // 3. Build webhook payload
  const payload = {
    id:                "test-payout-webhook-" + Date.now(),
    type:              "PAYOUT",
    currency:          "NGN",
    sessionId:         null,
    businessId:        "cb1a5916-db68-4886-9961-d86edc38c707",
    merchantFee:       0,
    accountNumber:     payout.bank_account_number,
    onusReference:     ONUS_REFERENCE,
    paymentStatus:     "SUCCESSFUL",
    paymentChannel:    "BANK_TRANSFER",
    merchantReference: MERCHANT_REFERENCE,
    providerReference: null,
    transactionAmount: AMOUNT,
    merchantCheckoutReference: null,
  };

  // 4. Build hash
  const verificationString =
    payload.accountNumber +
    payload.onusReference +
    payload.paymentStatus +
    VERIFICATION_KEY;

  const hash = crypto.createHash("sha256").update(verificationString).digest("hex");

  console.log(`Hash:       ${hash}`);
  console.log("─────────────────────────────────────────────────────────\n");
  console.log("Sending simulated payout webhook...\n");

  // 5. Send webhook
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "hash": hash,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  console.log(`Response status: ${res.status}`);
  console.log("Response body:", JSON.stringify(data, null, 2));

  if (res.status === 200) {
    console.log("\n✅ Webhook accepted by your server");
    console.log("→ payout_requests status should now be COMPLETED");
    console.log("→ Creator ledger should show PAYOUT DEBIT of ₦" + Number(AMOUNT).toLocaleString());
    console.log("→ Check payout history tab — should show completed");
  } else {
    console.log("\n❌ Webhook rejected — check your server logs");
  }
}

main().catch(console.error);