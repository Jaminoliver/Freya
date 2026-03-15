export type MessageType = "text" | "media" | "ppv";

export interface Conversation {
  id: string;
  participant: {
    id: string;
    name: string;
    username: string;
    avatarUrl: string | null;
    isVerified: boolean;
    isOnline: boolean;
  };
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  hasMedia: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  text?: string;
  mediaUrls?: string[];
  ppv?: {
    price: number;
    isUnlocked: boolean;
    unlockedCount: number;
  };
  createdAt: string;
}

export type FilterTab = "all" | "priority" | "unread";