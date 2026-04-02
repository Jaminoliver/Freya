// lib/payments/wallet.ts
// Shared wallet helpers for internal transactions (subscriptions, tips, PPV)
// All amounts in kobo. Operates on ledger + wallets tables.
// Uses service role client to bypass RLS for cross-user operations.

import { createServiceSupabaseClient } from "@/lib/supabase/server";

type LedgerCategory =
  | "WALLET_TOPUP"
  | "SUBSCRIPTION_PAYMENT"
  | "CREATOR_EARNING"
  | "PLATFORM_FEE"
  | "PAYOUT"
  | "TIP"
  | "PPV_PURCHASE"
  | "AUTO_SUBSCRIPTION"
  | "PPV_MESSAGE"
  | "REFUND";

// ─── Check balance ────────────────────────────────────────────────────────────

/**
 * Check if a user has enough wallet balance for a transaction
 * Reads from the wallets table (cached balance)
 */
export async function hasSufficientBalance(
  userId: string,
  amountKobo: number
): Promise<boolean> {
  const supabase = createServiceSupabaseClient();

  const { data: wallet } = await supabase
    .from("wallets")
    .select("balance")
    .eq("user_id", userId)
    .single();

  return (wallet?.balance ?? 0) >= amountKobo;
}

/**
 * Get a user's current wallet balance in kobo
 */
export async function getWalletBalance(userId: string): Promise<number> {
  const supabase = createServiceSupabaseClient();

  const { data: wallet } = await supabase
    .from("wallets")
    .select("balance")
    .eq("user_id", userId)
    .single();

  return wallet?.balance ?? 0;
}

// ─── Core debit/credit ────────────────────────────────────────────────────────

/**
 * Debit a user's wallet — inserts ledger DEBIT row and updates wallets table
 */
export async function debitWallet(params: {
  userId: string;
  amountKobo: number;
  category: LedgerCategory;
  referenceId?: string;
  providerReference?: string;
  provider?: "MONNIFY" | "INTERNAL";
}): Promise<{ newBalance: number }> {
  const {
    userId,
    amountKobo,
    category,
    referenceId,
    providerReference,
    provider = "INTERNAL",
  } = params;

  const supabase = createServiceSupabaseClient();

  // Get current balance
  const { data: wallet } = await supabase
    .from("wallets")
    .select("balance, total_spent")
    .eq("user_id", userId)
    .single();

  const currentBalance = wallet?.balance ?? 0;

  if (currentBalance < amountKobo) {
    throw new Error("Insufficient wallet balance");
  }

  const newBalance = currentBalance - amountKobo;

  // Insert ledger entry
  const { error: ledgerError } = await supabase.from("ledger").insert({
    user_id: userId,
    type: "DEBIT",
    amount: amountKobo,
    balance_after: newBalance,
    category,
    reference_id: referenceId ?? null,
    provider,
    provider_reference: providerReference ?? null,
  });

  if (ledgerError) {
    throw new Error(`Failed to insert ledger debit: ${ledgerError.message}`);
  }

  // Update wallet
  const { error: walletError } = await supabase
    .from("wallets")
    .update({
      balance: newBalance,
      total_spent: (wallet?.total_spent ?? 0) + amountKobo,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (walletError) {
    throw new Error(`Failed to update wallet: ${walletError.message}`);
  }

  return { newBalance };
}

/**
 * Credit a user's wallet — inserts ledger CREDIT row and updates wallets table
 */
export async function creditWallet(params: {
  userId: string;
  amountKobo: number;
  category: LedgerCategory;
  referenceId?: string;
  providerReference?: string;
  provider?: "MONNIFY" | "INTERNAL";
}): Promise<{ newBalance: number }> {
  const {
    userId,
    amountKobo,
    category,
    referenceId,
    providerReference,
    provider = "INTERNAL",
  } = params;

  const supabase = createServiceSupabaseClient();

  // Get current balance
  const { data: wallet } = await supabase
    .from("wallets")
    .select("balance, total_earned")
    .eq("user_id", userId)
    .single();

  const currentBalance = wallet?.balance ?? 0;
  const newBalance = currentBalance + amountKobo;

  // Insert ledger entry
  const { error: ledgerError } = await supabase.from("ledger").insert({
    user_id: userId,
    type: "CREDIT",
    amount: amountKobo,
    balance_after: newBalance,
    category,
    reference_id: referenceId ?? null,
    provider,
    provider_reference: providerReference ?? null,
  });

  if (ledgerError) {
    throw new Error(`Failed to insert ledger credit: ${ledgerError.message}`);
  }

  // Update wallet
  const { error: walletError } = await supabase
    .from("wallets")
    .update({
      balance: newBalance,
      total_earned: (wallet?.total_earned ?? 0) + amountKobo,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (walletError) {
    throw new Error(`Failed to update wallet: ${walletError.message}`);
  }

  return { newBalance };
}

// ─── Compound operations ──────────────────────────────────────────────────────

/**
 * Debit fan wallet and credit creator wallet in one operation
 * Applies platform commission (reads from platform_settings)
 * Returns the breakdown: fanDebited, creatorEarning, platformFee
 */
export async function debitFanCreditCreator(params: {
  fanId: string;
  creatorId: string;
  amountKobo: number;
  fanCategory: LedgerCategory;
  creatorCategory?: LedgerCategory;
  referenceId?: string;
}): Promise<{
  fanDebited: number;
  creatorEarning: number;
  platformFee: number;
}> {
  const {
    fanId,
    creatorId,
    amountKobo,
    fanCategory,
    creatorCategory = "CREATOR_EARNING",
    referenceId,
  } = params;

  const supabase = createServiceSupabaseClient();

  // Get commission rate from platform_settings
  const { data: settings } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "commission_rate")
    .single();

  const commissionRate = parseInt(settings?.value || "18") / 100;
  const platformFee = Math.round(amountKobo * commissionRate);
  const creatorEarning = amountKobo - platformFee;

  // 1. Debit fan wallet (updates wallets.balance)
  await debitWallet({
    userId: fanId,
    amountKobo,
    category: fanCategory,
    referenceId,
  });

  // 2. Credit creator earnings — ledger ONLY, NOT wallets.balance
  // Creator earnings are separate from fan wallet. Earnings are calculated
  // from the ledger table by the earnings API routes.
  const { error: earningError } = await supabase.from("ledger").insert({
    user_id: creatorId,
    type: "CREDIT",
    amount: creatorEarning,
    balance_after: 0, // Not tracked in wallets table — earnings page reads from ledger
    category: creatorCategory,
    reference_id: referenceId ?? null,
    provider: "INTERNAL",
  });

  if (earningError) {
    console.error("[debitFanCreditCreator] Failed to record creator earning:", earningError.message);
  }

  // 3. Record platform fee in ledger (under creator's user_id for tracking)
  const { error: feeError } = await supabase.from("ledger").insert({
    user_id: creatorId,
    type: "CREDIT",
    amount: platformFee,
    balance_after: 0,
    category: "PLATFORM_FEE",
    reference_id: referenceId ?? null,
    provider: "INTERNAL",
  });

  if (feeError) {
    console.error("[debitFanCreditCreator] Failed to record platform fee:", feeError.message);
  }

  return { fanDebited: amountKobo, creatorEarning, platformFee };
}

/**
 * Ensure a wallet row exists for a user (call on signup or first transaction)
 */
export async function ensureWalletExists(userId: string): Promise<void> {
  const supabase = createServiceSupabaseClient();

  const { data: existing } = await supabase
    .from("wallets")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (!existing) {
    await supabase.from("wallets").insert({
      user_id: userId,
      balance: 0,
      pending_balance: 0,
      total_earned: 0,
      total_spent: 0,
    });
  }
}