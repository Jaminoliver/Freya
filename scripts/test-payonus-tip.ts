// ─── PayOnUs Tip Webhook Simulator ───────────────────────────────────────────
// Run with: npx tsx scripts/test-payonus-tip.ts <email>
// Example:  npx tsx scripts/test-payonus-tip.ts you@example.com

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL     = "https://fgeedvumuwbtuydosogb.supabase.co";
const SUPABASE_SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnZWVkdnVtdXdidHV5ZG9zb2diIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIzNDM4OSwiZXhwIjoyMDg2ODEwMzg5fQ.-xkN02Fg680p5zNGAiYfSWj9a3knXAPu1caItxyh2Lw";
const WEBHOOK_URL      = "https://cinnamyl-discrepantly-donnell.ngrok-free.dev/api/webhooks/payonus";
const VERIFICATION_KEY = "freya_payonus_webhook_2026";

const ONUS_REFERENCE = "ONUS-TIP-TEST-" + Date.now();
const ACCOUNT_NUMBER = "ON43650244";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error("❌ Missing email");
    console.error("Usage: npx tsx scripts/test-payonus-tip.ts <email>");
    process.exit(1);
  }

  console.log("─── PayOnUs Tip Webhook Simulator ───────────────────────");
  console.log(`Email:     ${email}`);

  // 1. Look up user by email
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

  const fanId = user.id;
  console.log(`Fan ID:    ${fanId}`);

  // 2. Fetch latest pending tip transaction for this user
  const { data: transaction, error: fetchError } = await supabase
    .from("transactions")
    .select("id, amount, provider_txn_id, metadata")
    .eq("fan_id", fanId)
    .eq("purpose", "TIP")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (fetchError || !transaction) {
    console.error("❌ No pending tip transaction found for this user");
    console.error("→ Make sure you've clicked 'Send Tip via Bank Transfer' in the app first");
    process.exit(1);
  }

  const AMOUNT             = transaction.amount;
  const MERCHANT_REFERENCE = transaction.provider_txn_id;
  const creatorId          = transaction.metadata?.creator_id ?? "unknown";

  console.log(`Reference:  ${MERCHANT_REFERENCE}`);
  console.log(`Amount:     ₦${AMOUNT.toLocaleString()}`);
  console.log(`Creator ID: ${creatorId}`);

  // 3. Build webhook payload
  const payload = {
    id:                        "test-webhook-" + Date.now(),
    type:                      "COLLECTION",
    currency:                  "NGN",
    sessionId:                 null,
    businessId:                "cb1a5916-db68-4886-9961-d86edc38c707",
    merchantFee:               0,
    accountNumber:             ACCOUNT_NUMBER,
    onusReference:             ONUS_REFERENCE,
    paymentStatus:             "SUCCESSFUL",
    paymentChannel:            "BANK_TRANSFER",
    merchantReference:         MERCHANT_REFERENCE,
    providerReference:         null,
    transactionAmount:         AMOUNT,
    merchantCheckoutReference: null,
  };

  // 4. Build hash
  const verificationString =
    payload.accountNumber +
    payload.onusReference +
    payload.paymentStatus +
    VERIFICATION_KEY;

  const hash = crypto.createHash("sha256").update(verificationString).digest("hex");

  console.log(`Hash:      ${hash}`);
  console.log("─────────────────────────────────────────────────────────\n");
  console.log("Sending simulated tip webhook...\n");

  // 5. Send webhook
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "hash":         hash,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  console.log(`Response status: ${res.status}`);
  console.log("Response body:", JSON.stringify(data, null, 2));

  if (res.status === 200) {
    const platformFee    = Math.floor(AMOUNT * 0.18);
    const creatorEarning = AMOUNT - platformFee;

    console.log("\n✅ Webhook accepted by your server");
    console.log("→ Check your dev server logs for [PayOnUs Webhook]");
    console.log(`→ Tip should now be recorded in the 'tips' table`);
    console.log(`→ Creator credited ₦${creatorEarning.toLocaleString()} (82%)`);
    console.log(`→ Platform fee: ₦${platformFee.toLocaleString()} (18%)`);
  } else {
    console.log("\n❌ Webhook rejected — check your server logs");
  }
}

main().catch(console.error);