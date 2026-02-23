import type { User } from "@/lib/types/profile";

export type CheckoutType = "subscription" | "ppv" | "locked_post" | "tips";
export type CheckoutScreen = "plan" | "tip_input" | "payment" | "success";
export type Currency = "NGN" | "GHS" | "KES";
export type PaymentMethodId = "freya_wallet" | "payonus" | "kyshi";
export type SubscriptionTier = "monthly" | "three_month" | "six_month";

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
  // For subscription
  monthlyPrice?: number;
  threeMonthPrice?: number;
  sixMonthPrice?: number;
  selectedTier?: SubscriptionTier;
  // For PPV / locked post
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