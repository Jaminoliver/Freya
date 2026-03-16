"use client";

import { ConversationRow } from "@/components/messages/ConversationRow";
import type { Conversation } from "@/lib/types/messages";

interface Props {
  conversations:        Conversation[];
  activeId:             string | null;
  onSelect:             (id: string) => void;
  typingConversations?: Set<number>;
}

export function ConversationList({ conversations, activeId, onSelect, typingConversations = new Set() }: Props) {
  if (conversations.length === 0) {
    return (
      <div
        style={{
          flex:           1,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          color:          "#4A4A6A",
          fontSize:       "14px",
          fontFamily:     "'Inter', sans-serif",
          padding:        "40px 16px",
        }}
      >
        No conversations
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}>
      {conversations.map((conversation) => (
        <ConversationRow
          key={conversation.id}
          conversation={conversation}
          isActive={String(conversation.id) === activeId}
          isTyping={typingConversations.has(conversation.id)}
          onSelect={() => onSelect(String(conversation.id))}
        />
      ))}
    </div>
  );
}