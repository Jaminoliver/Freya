export type SubscriptionStatus = "active" | "expired" | "attention";

export type CardView = "compact" | "detailed";

export interface Subscription {
  id:               number;
  creatorId:        string;
  creatorName:      string;
  username:         string;
  avatar_url:       string | null;
  banner_url:       string | null;
  isVerified:       boolean;
  status:           SubscriptionStatus;
  newPosts:         number;
  expiresAt:        string;
  price:            number;
  autoRenew:        boolean;
  isFavourite:      boolean;
  isFreeCreator:    boolean;
  monthlyPrice:     number;
  threeMonthPrice:  number | null;
  sixMonthPrice:    number | null;
}

export const STATUS_COLOR: Record<SubscriptionStatus, string> = {
  active:    "#10B981",
  expired:   "#EF4444",
  attention: "#F59E0B",
};

export const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  active:    "Active",
  expired:   "Expired",
  attention: "Attention",
};