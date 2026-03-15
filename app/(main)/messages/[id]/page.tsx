"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ChatPanel } from "@/components/messages/ChatPanel";
import { DUMMY_CONVERSATIONS, DUMMY_MESSAGES } from "@/app/(main)/messages/page";

export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }       = use(params);
  const router       = useRouter();
  const conversation = DUMMY_CONVERSATIONS.find((c) => c.id === id) ?? null;
  const messages     = DUMMY_MESSAGES[id] ?? [];

  if (!conversation) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", color:"#4A4A6A", fontFamily:"'Inter',sans-serif" }}>
        Conversation not found
      </div>
    );
  }

  return (
    <ChatPanel
      conversation={conversation}
      messages={messages}
      onBack={() => router.push("/messages")}
    />
  );
}