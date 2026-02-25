import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  LedgerEntryType,
  LedgerCategory,
  KyshiProvider,
  SavedCard,
} from "@/lib/types/checkout";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LedgerEntry {
  id: number;
  user_id: string;
  type: LedgerEntryType;
  amount: number;
  balance_after: number;
  category: LedgerCategory;
  provider: KyshiProvider;
  provider_reference?: string;
  reference_id?: string;
  description?: string;
  created_at: string;
}

export interface WalletTransaction {
  id: number;
  type: LedgerEntryType;
  amount: number;
  balance_after: number;
  category: LedgerCategory;
  provider: KyshiProvider;
  description?: string;
  created_at: string;
}

// ─── Account ID Map ───────────────────────────────────────────────────────────

const ACCOUNT_ID: Record<LedgerCategory, number> = {
  WALLET_TOPUP:         1,
  SUBSCRIPTION_PAYMENT: 1,
  CREATOR_EARNING:      3,
  PLATFORM_FEE:         2,
  PAYOUT:               3,
  AUTO_SUBSCRIPTION:    1,
};

// ─── Category → transaction_type map ─────────────────────────────────────────

const CATEGORY_TO_TX_TYPE: Record<LedgerCategory, string> = {
  WALLET_TOPUP:         "wallet_topup",
  SUBSCRIPTION_PAYMENT: "subscription_payment",
  AUTO_SUBSCRIPTION:    "subscription_payment",
  CREATOR_EARNING:      "subscription_payment",
  PLATFORM_FEE:         "platform_commission",
  PAYOUT:               "payout_request",
};

// ─── Balance ──────────────────────────────────────────────────────────────────

export async function getWalletBalance(userId: string): Promise<number> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("ledger_entries")
    .select("type, amount")
    .eq("user_id", userId);

  if (error) throw new Error(`Failed to fetch wallet balance: ${error.message}`);
  if (!data || data.length === 0) return 0;

  const balance = data.reduce((acc, entry) => {
    return entry.type === "CREDIT" ? acc + entry.amount : acc - entry.amount;
  }, 0);

  return Math.max(balance, 0);
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function resolveTransactionId(
  supabase: SupabaseClient,
  providerReference: string
): Promise<number | null> {
  const { data } = await supabase
    .from("transactions")
    .select("id")
    .eq("provider_txn_id", providerReference)
    .maybeSingle();

  return data?.id ?? null;
}

async function getBalanceWithClient(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("ledger_entries")
    .select("type, amount")
    .eq("user_id", userId);

  if (error) throw new Error(`Failed to fetch wallet balance: ${error.message}`);
  if (!data || data.length === 0) return 0;

  return Math.max(
    data.reduce((acc, entry) =>
      entry.type === "CREDIT" ? acc + entry.amount : acc - entry.amount, 0),
    0
  );
}

/**
 * Creates an internal transactions row for wallet-based payments.
 * Required because ledger_entries.transaction_id is NOT NULL and FKs to transactions.
 */
async function createInternalTransaction(
  supabase: SupabaseClient,
  {
    userId,
    fanId,
    amount,
    category,
    description,
    subscriptionId,
  }: {
    userId: string;
    fanId?: string;
    amount: number;
    category: LedgerCategory;
    description?: string;
    subscriptionId?: string;
  }
): Promise<number> {
  const txType = CATEGORY_TO_TX_TYPE[category];

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id:          userId,
      fan_id:           fanId ?? null,
      transaction_type: txType,
      amount,
      status:           "completed",
      description:      description ?? null,
      subscription_id:  subscriptionId ? Number(subscriptionId) : null,
      posted_at:        new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create internal transaction: ${error?.message}`);
  }

  return data.id;
}

// ─── Credit Wallet ────────────────────────────────────────────────────────────

export async function creditWallet({
  userId,
  fanId,
  amount,
  category,
  provider,
  providerReference,
  referenceId,
  description,
  useServiceRole = false,
}: {
  userId: string;
  fanId?: string;
  amount: number;
  category: LedgerCategory;
  provider: KyshiProvider;
  providerReference?: string;
  referenceId?: string;
  description?: string;
  useServiceRole?: boolean;
}): Promise<void> {
  const supabase = useServiceRole
    ? createServiceSupabaseClient()
    : await createServerSupabaseClient();

  const currentBalance = await getBalanceWithClient(supabase, userId);
  const balanceAfter = currentBalance + amount;

  let transactionId: number | null = null;

  if (providerReference) {
    transactionId = await resolveTransactionId(supabase, providerReference);
  }

  if (!transactionId) {
    transactionId = await createInternalTransaction(supabase, {
      userId,
      fanId,
      amount,
      category,
      description,
      subscriptionId: referenceId,
    });
  }

  const { error } = await supabase.from("ledger_entries").insert({
    user_id:            userId,
    type:               "CREDIT" as LedgerEntryType,
    amount,
    balance_after:      balanceAfter,
    category,
    provider,
    provider_reference: providerReference ?? null,
    transaction_id:     transactionId,
    account_id:         ACCOUNT_ID[category],
    posted_at:          new Date().toISOString(),
    description:        description ?? null,
  });

  if (error) throw new Error(`Failed to credit wallet: ${error.message}`);
}

// ─── Debit Wallet ─────────────────────────────────────────────────────────────

export async function debitWallet({
  userId,
  fanId,
  amount,
  category,
  provider,
  providerReference,
  referenceId,
  description,
  useServiceRole = false,
}: {
  userId: string;
  fanId?: string;
  amount: number;
  category: LedgerCategory;
  provider: KyshiProvider;
  providerReference?: string;
  referenceId?: string;
  description?: string;
  useServiceRole?: boolean;
}): Promise<void> {
  const supabase = useServiceRole
    ? createServiceSupabaseClient()
    : await createServerSupabaseClient();

  const currentBalance = await getBalanceWithClient(supabase, userId);

  if (currentBalance < amount) {
    throw new Error("Insufficient wallet balance");
  }

  const balanceAfter = currentBalance - amount;

  let transactionId: number | null = null;

  if (providerReference) {
    transactionId = await resolveTransactionId(supabase, providerReference);
  }

  if (!transactionId) {
    transactionId = await createInternalTransaction(supabase, {
      userId,
      fanId,
      amount,
      category,
      description,
      subscriptionId: referenceId,
    });
  }

  const { error } = await supabase.from("ledger_entries").insert({
    user_id:            userId,
    type:               "DEBIT" as LedgerEntryType,
    amount,
    balance_after:      balanceAfter,
    category,
    provider,
    provider_reference: providerReference ?? null,
    transaction_id:     transactionId,
    account_id:         ACCOUNT_ID[category],
    posted_at:          new Date().toISOString(),
    description:        description ?? null,
  });

  if (error) throw new Error(`Failed to debit wallet: ${error.message}`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export async function hasSufficientBalance(userId: string, amount: number): Promise<boolean> {
  const balance = await getWalletBalance(userId);
  return balance >= amount;
}

// ─── Transaction History ──────────────────────────────────────────────────────

export async function getTransactionHistory({
  userId,
  page = 1,
  limit = 20,
  category,
}: {
  userId: string;
  page?: number;
  limit?: number;
  category?: LedgerCategory;
}): Promise<{ transactions: WalletTransaction[]; total: number }> {
  const supabase = await createServerSupabaseClient();
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("ledger_entries")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (category) query = query.eq("category", category);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to fetch transactions: ${error.message}`);

  return { transactions: (data ?? []) as WalletTransaction[], total: count ?? 0 };
}

// ─── Saved Cards ──────────────────────────────────────────────────────────────

export async function getSavedCards(fanId: string): Promise<SavedCard[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("fan_payment_methods")
    .select("id, authorization_code, card_type, last_four, is_default")
    .eq("fan_id", fanId)
    .order("is_default", { ascending: false });

  if (error) throw new Error(`Failed to fetch saved cards: ${error.message}`);

  return (data ?? []).map((card) => ({
    id: card.id,
    authorizationCode: card.authorization_code,
    cardType: card.card_type,
    lastFour: card.last_four,
    isDefault: card.is_default,
  }));
}

export async function saveCard({
  fanId, authorizationCode, cardType, lastFour, makeDefault = false,
}: {
  fanId: string;
  authorizationCode: string;
  cardType: string;
  lastFour: string;
  makeDefault?: boolean;
}): Promise<void> {
  const supabase = await createServerSupabaseClient();

  const { data: existing } = await supabase
    .from("fan_payment_methods")
    .select("id")
    .eq("fan_id", fanId)
    .eq("authorization_code", authorizationCode)
    .maybeSingle();

  if (existing) return;

  if (makeDefault) {
    await supabase.from("fan_payment_methods").update({ is_default: false }).eq("fan_id", fanId);
  }

  const { error } = await supabase.from("fan_payment_methods").insert({
    fan_id: fanId, provider: "KYSHI", authorization_code: authorizationCode,
    card_type: cardType, last_four: lastFour, is_default: makeDefault,
  });

  if (error) throw new Error(`Failed to save card: ${error.message}`);
}

export async function setDefaultCard(fanId: string, cardId: number): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.from("fan_payment_methods").update({ is_default: false }).eq("fan_id", fanId);
  const { error } = await supabase.from("fan_payment_methods")
    .update({ is_default: true }).eq("id", cardId).eq("fan_id", fanId);
  if (error) throw new Error(`Failed to set default card: ${error.message}`);
}

export async function removeCard(fanId: string, cardId: number): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("fan_payment_methods")
    .delete().eq("id", cardId).eq("fan_id", fanId);
  if (error) throw new Error(`Failed to remove card: ${error.message}`);
}