export type MessageType = "text" | "media" | "ppv";

export type FilterTab = "all" | "priority" | "unread";

export interface ConversationParticipant {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  isVerified: boolean;
  isOnline: boolean;
}

export interface Conversation {
  id: number;
  participant: ConversationParticipant;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  hasMedia: boolean;
}

export interface Message {
  id: number;
  conversationId: number;
  senderId: string;
  type: MessageType;
  text?: string;
  mediaUrls?: string[];
  thumbnailUrl?: string | null;
  ppv?: {
    price: number;
    isUnlocked: boolean;
    unlockedCount: number;
  };
  isRead?:     boolean;
  createdAt:   string;
  replyToId?:  number | null; // ✅ added
}