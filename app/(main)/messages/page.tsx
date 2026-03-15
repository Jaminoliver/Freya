"use client";

import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/messages/EmptyState";
import type { Conversation, Message } from "@/lib/types/messages";

export const DUMMY_CONVERSATIONS: Conversation[] = [
  {
    id: "1",
    participant: {
      id: "u1",
      name: "Silly Sandra",
      username: "sillysandra",
      avatarUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&q=80",
      isVerified: true,
      isOnline: true,
    },
    lastMessage: "That sounds amazing! Can't wait to...",
    lastMessageAt: "2m",
    unreadCount: 3,
    hasMedia: false,
  },
  {
    id: "2",
    participant: {
      id: "u2",
      name: "lily",
      username: "lilyrose",
      avatarUrl: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=100&q=80",
      isVerified: true,
      isOnline: true,
    },
    lastMessage: "Thank you so much! 💕",
    lastMessageAt: "15m",
    unreadCount: 1,
    hasMedia: false,
  },
  {
    id: "3",
    participant: {
      id: "u3",
      name: "Karina",
      username: "karina_official",
      avatarUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&q=80",
      isVerified: true,
      isOnline: false,
    },
    lastMessage: "Check this out!",
    lastMessageAt: "1h",
    unreadCount: 2,
    hasMedia: true,
  },
  {
    id: "4",
    participant: {
      id: "u4",
      name: "Sasha",
      username: "sasha_v",
      avatarUrl: "https://images.unsplash.com/photo-1488716820095-cbe80883c496?w=100&q=80",
      isVerified: false,
      isOnline: true,
    },
    lastMessage: "See you tomorrow!",
    lastMessageAt: "3h",
    unreadCount: 0,
    hasMedia: false,
  },
  {
    id: "5",
    participant: {
      id: "u5",
      name: "Wren",
      username: "chemwithwren",
      avatarUrl: "https://images.unsplash.com/photo-1499952127939-9bbf5af6c51c?w=100&q=80",
      isVerified: true,
      isOnline: false,
    },
    lastMessage: "I think I spread it wide too o...",
    lastMessageAt: "Yesterday",
    unreadCount: 0,
    hasMedia: true,
  },
];

export const DUMMY_MESSAGES: Record<string, Message[]> = {
  "2": [
    {
      id: "m1",
      conversationId: "2",
      senderId: "u2",
      type: "text",
      text: "Hey! I just wanted to say thank you for all the amazing content you've been creating lately. It's really inspiring!",
      createdAt: "Yesterday at 3:45 PM",
    },
    {
      id: "m2",
      conversationId: "2",
      senderId: "u2",
      type: "text",
      text: "I especially loved your recent post about creativity and motivation. Really resonated with me.",
      createdAt: "Yesterday at 3:46 PM",
    },
    {
      id: "m3",
      conversationId: "2",
      senderId: "u2",
      type: "media",
      text: "Check this out 🔥",
      mediaUrls: ["https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80"],
      createdAt: "Yesterday at 3:50 PM",
    },
    {
      id: "m4",
      conversationId: "2",
      senderId: "u2",
      type: "text",
      text: "Thank you so much! 💕",
      createdAt: "15m",
    },
  ],
};

export default function MessagesPage() {
  return <EmptyState />;
}