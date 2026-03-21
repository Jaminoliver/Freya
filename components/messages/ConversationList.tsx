"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ConversationRow } from "@/components/messages/ConversationRow";
import type { Conversation } from "@/lib/types/messages";

interface Props {
  conversations:        Conversation[];
  activeId:             string | null;
  onSelect:             (id: string) => void;
  typingConversations?: Set<number>;
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  typingConversations = new Set(),
}: Props) {
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
    <div style={{
      flex:                1,
      overflowY:           "auto",
      scrollbarWidth:      "none",
      // Prevent text/highlight selection when touching between rows
      userSelect:          "none",
      WebkitUserSelect:    "none",
    }}>
      <AnimatePresence mode="popLayout">
        {conversations.map((conversation) => (
          <motion.div
            key={conversation.id}
            layoutId={`conv-${conversation.id}`}
            layout="position"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
            transition={{
              layout:  { type: "spring", stiffness: 400, damping: 38 },
              opacity: { duration: 0.18 },
              y:       { type: "spring", stiffness: 400, damping: 38 },
            }}
            style={{
              willChange:       "transform, opacity",
              userSelect:       "none",
              WebkitUserSelect: "none",
            }}
          >
            <ConversationRow
              conversation={conversation}
              isActive={String(conversation.id) === activeId}
              isTyping={typingConversations.has(conversation.id)}
              onSelect={() => onSelect(String(conversation.id))}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}