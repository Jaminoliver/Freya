export type NotificationFilterTab =
  | "all"
  | "messages"
  | "subscriptions"
  | "likes"
  | "comments"
  | "earnings"
  | "payments";

export type NotificationType =
  // creator only
  | "like"
  | "comment"
  | "subscription"
  | "resubscription"
  | "tip_received"
  | "ppv_unlocked"
  | "ppv_purchased"
  | "payout_completed"
  | "payout_failed"
  // fan only
  | "renewal_failed"
  | "renewal_success"
  | "subscription_charged"
  | "subscription_activated"
  | "subscription_cancelled"
  | "tip_sent"
  | "wallet_topup"
  // both
  | "message";

export type NotificationRole = "creator" | "fan";

export interface NotificationItem {
  id:          string;
  type:        NotificationType;
  role:        NotificationRole;
  actorName:   string;
  actorAvatar: string | null;
  actorHandle: string;
  bodyText:    string;
  subText:     string;
  createdAt:   string;
  isUnread:    boolean;
  referenceId: string | null; // post_id | conversation_id | payout_id
}

export interface NotificationGroup {
  label: string;
  items: NotificationItem[];
}

export interface NotificationPreferences {
  userId:              string;
  like:                boolean;
  comment:             boolean;
  subscription:        boolean;
  resubscription:      boolean;
  tip_received:        boolean;
  ppv_unlocked:        boolean;
  ppv_purchased:       boolean;
  payout_completed:    boolean;
  payout_failed:       boolean;
  renewal_failed:      boolean;
  renewal_success:     boolean;
  subscription_charged:  boolean;
  subscription_activated:boolean;
  subscription_cancelled:boolean;
  tip_sent:              boolean;
  wallet_topup:        boolean;
  message:             boolean;
}