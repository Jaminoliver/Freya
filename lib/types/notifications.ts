export type NotificationFilterTab =
  | "all"
  | "messages"
  | "tips"
  | "subscriptions"
  | "likes"
  | "comments";

export type NotificationType =
  | "tip"
  | "subscription"
  | "message"
  | "like"
  | "comment"
  | "ppv_unlock";

export interface NotificationItem {
  id:          string;
  type:        NotificationType;
  actorName:   string;
  actorAvatar: string | null;
  actorHandle: string;
  bodyText:    string;
  subText:     string;
  createdAt:   string;
  isUnread:    boolean;
}

export interface NotificationGroup {
  label: string;
  items: NotificationItem[];
}