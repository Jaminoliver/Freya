// lib/types/messages.ts
export type MessageType   = "text" | "media" | "ppv" | "tip";
export type MessageStatus = "sending" | "sent" | "failed";

export type FilterTab = "all" | "priority" | "unread" | "favourites";

export interface ConversationParticipant {
  id:         string;
  name:       string;
  username:   string;
  avatarUrl:  string | null;
  isVerified: boolean;
  isOnline:   boolean;
}

export interface Conversation {
  id:            number;
  participant:   ConversationParticipant;
  lastMessage:   string;
  lastMessageAt: string;
  unreadCount:   number;
  hasMedia:      boolean;
  isBlocked?:    boolean;
  isRestricted?: boolean;
  isPinned?:     boolean;
  isArchived?:   boolean;
  isMuted?:      boolean;
}

export interface Message {
  id:             number;
  conversationId: number;
  senderId:       string;
  type:           MessageType;
  text?:          string;
  mediaUrls?:     string[];
  thumbnailUrl?:  string | null;
  ppv?: {
    price:         number; // in kobo
    isUnlocked:    boolean;
    unlockedCount: number;
  };
  tip?: {
    amount: number; // in kobo
    tipId:  number;
  };
  isRead?:         boolean;
  isDelivered?:    boolean;
  createdAt:       string;
  replyToId?:      number | null;
  // Optimistic upload state — only set on sender's side during upload
  status?:         MessageStatus;
  uploadProgress?: number; // 0–100
  // Temp ID for pending messages before server assigns real ID
  tempId?:         string;
  isDeleted?:      boolean;
}