import type { User } from "@/lib/types/profile";

export type CheckoutType = "subscription" | "ppv" | "locked_post" | "tips";
export type CheckoutScreen = "plan" | "tip_input" | "payment" | "success";
export type Currency = "NGN" | "GHS" | "KES" | "XOF";
export type PaymentMethodId = "freya_wallet" | "kyshi_card" | "kyshi_virtual_account";
export type SubscriptionTier = "monthly" | "three_month" | "six_month";

// ─── Kyshi ───────────────────────────────────────────────────────────────────

export type KyshiPaymentMethod = "card" | "virtual_account";
export type KyshiTransactionPurpose = "WALLET_TOPUP" | "SUBSCRIPTION";
export type KyshiTransactionStatus = "PENDING" | "CONFIRMED" | "FAILED";
export type KyshiProvider = "KYSHI" | "PAYONUS" | "INTERNAL";

export type LedgerEntryType = "CREDIT" | "DEBIT";
export type LedgerCategory =
  | "WALLET_TOPUP"
  | "SUBSCRIPTION_PAYMENT"
  | "CREATOR_EARNING"
  | "PLATFORM_FEE"
  | "PAYOUT"
  | "AUTO_SUBSCRIPTION";

export type PayoutStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
export type SubscriptionStatus = "ACTIVE" | "RENEWAL_FAILED" | "EXPIRED" | "CANCELLED";
export type LastPaymentMethod = "CARD" | "VIRTUAL_ACCOUNT" | "WALLET";

// Kyshi Initialize Transaction
export interface KyshiInitializeRequest {
  amount: number;
  currency: Currency;
  email: string;
  reference?: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface KyshiInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorizationUrl: string;
    reference: string;
  };
}

// Kyshi Charge (saved card)
export interface KyshiChargeRequest {
  amount: number;
  currency: Currency;
  email: string;
  authorizationCode: string;
  reference?: string;
  metadata?: Record<string, unknown>;
}

export interface KyshiChargeResponse {
  status: boolean;
  message: string;
  data: {
    reference: string;
    amount: number;
    currency: Currency;
    status: KyshiTransactionStatus;
    authorizationCode?: string;
    card?: {
      cardType: string;
      last4: string;
    };
  };
}

// Kyshi Verify Transaction
export interface KyshiVerifyResponse {
  status: boolean;
  message: string;
  data: {
    reference: string;
    amount: number;
    currency: Currency;
    status: KyshiTransactionStatus;
    authorizationCode?: string;
    card?: {
      cardType: string;
      last4: string;
    };
  };
}

// Kyshi Virtual Account
export interface KyshiVirtualAccountRequest {
  amount?: number;
  currency: Currency;
  email: string;
  reference?: string;
}

export interface KyshiVirtualAccountResponse {
  status: boolean;
  message: string;
  data: {
    accountNumber: string;
    bankName: string;
    accountName: string;
    expiresAt: string;
    reference: string;
    amount?: number;
  };
}

// Kyshi Webhook Payload
export interface KyshiWebhookPayload {
  event: "payment.success" | "payment.failed" | "transfer.success" | "transfer.failed";
  data: {
    reference: string;
    amount: number;
    currency: Currency;
    status: KyshiTransactionStatus;
    authorizationCode?: string;
    transferCode?: string;
    card?: {
      cardType: string;
      last4: string;
    };
    metadata?: Record<string, unknown>;
  };
}

// Kyshi Banks
export interface KyshiBank {
  name: string;
  code: string;
}

export interface KyshiBanksResponse {
  status: boolean;
  message: string;
  data: KyshiBank[];
}

// Kyshi Name Enquiry
export interface KyshiNameEnquiryRequest {
  accountNumber: string;
  bankCode: string;
}

export interface KyshiNameEnquiryResponse {
  status: boolean;
  message: string;
  data: {
    accountName: string;
    accountNumber: string;
    bankCode: string;
  };
}

// Kyshi Beneficiary
export interface KyshiCreateBeneficiaryRequest {
  accountNumber: string;
  accountName: string;
  bankCode: string;
  bankName: string;
}

export interface KyshiCreateBeneficiaryResponse {
  status: boolean;
  message: string;
  data: {
    id: string;
    accountNumber: string;
    accountName: string;
    bankCode: string;
    bankName: string;
  };
}

// Kyshi Transfer
export interface KyshiTransferRequest {
  beneficiary: {
    accountNumber: string;
    accountName: string;
    bankCode: string;
    bankName: string;
  };
  amount: number;
  currency: "NGN";
  narration: string;
}

export interface KyshiTransferResponse {
  status: boolean;
  message: string;
  data: {
    transferCode: string;
    amount: number;
    status: PayoutStatus;
  };
}

// ─── UI Types ─────────────────────────────────────────────────────────────────

export interface PaymentMethod {
  id: PaymentMethodId;
  name: string;
  subtitle: string;
  balance?: number;
  color: string;
  letter: string;
}

export interface CurrencyOption {
  code: Currency;
  flag: string;
  symbol: string;
  label: string;
}

export interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: CheckoutType;
  creator: User;
  monthlyPrice?: number;
  threeMonthPrice?: number;
  sixMonthPrice?: number;
  selectedTier?: SubscriptionTier;
  postPrice?: number;
  postTitle?: string;
}

export interface OrderSummary {
  label: string;
  price: number;
  currency: Currency;
  tier?: SubscriptionTier;
  tipAmount?: number;
}

// Saved card for display
export interface SavedCard {
  id: number;
  authorizationCode: string;
  cardType: string;
  lastFour: string;
  isDefault: boolean;
}

// Virtual account display
export interface VirtualAccountDisplay {
  accountNumber: string;
  bankName: string;
  accountName: string;
  expiresAt: string;
  reference: string;
  amount?: number;
}