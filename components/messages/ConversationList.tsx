"use client";

import { ConversationRow } from "@/components/messages/ConversationRow";
import type { Conversation } from "@/lib/types/messages";

interface Props {
  conversations: Conversation[];
  activeId:      string | null;
  onSelect:      (id: string) => void;
}

export function ConversationList({ conversations, activeId, onSelect }: Props) {
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
        }}
      >
        No conversations
      </div>
    );
  }

  return (
    <div
      style={{
        flex:           1,
        overflowY:      "auto",
        scrollbarWidth: "none",
      }}
    >
      {conversations.map((conversation) => (
        <ConversationRow
          key={conversation.id}
          conversation={conversation}
          isActive={conversation.id === activeId}
          onSelect={() => onSelect(conversation.id)}
        />
      ))}
    </div>
  );
}