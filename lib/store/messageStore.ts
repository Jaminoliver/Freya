import { create } from "zustand";
import type { Message } from "@/lib/types/messages";

interface MessageStore {
  messages:        Message[];
  conversationId:  number | null;

  setConversationId: (id: number | null) => void;
  setMessages:       (msgs: Message[] | ((prev: Message[]) => Message[])) => void;
  appendMessage:     (msg: Message) => void;
  patchMessage:      (id: number, patch: Partial<Message>) => void;
  clearMessages:     () => void;
}

// Holds patches that arrived before the real message ID was in the store
const pendingPatches = new Map<number, Partial<Message>>();

export const useMessageStore = create<MessageStore>((set, get) => ({
  messages:       [],
  conversationId: null,

  setConversationId: (id) => set({ conversationId: id }),

  setMessages: (msgs) =>
    set((state) => {
      const resolved = typeof msgs === "function" ? msgs(state.messages) : msgs;
      if (pendingPatches.size === 0) return { messages: resolved };
      const patched = resolved.map((m) => {
        const p = pendingPatches.get(m.id);
        if (p) {
          console.log("[setMessages] applying queued patch to msg:", m.id, p);
          pendingPatches.delete(m.id);
          return { ...m, ...p };
        }
        return m;
      });
      return { messages: patched };
    }),

  appendMessage: (msg) =>
    set((state) => {
      if (state.messages.some((m) => m.id === msg.id)) return state;

      // Apply any patch that arrived before this message's real ID was in the store
      const pending = pendingPatches.get(msg.id);
      if (pending) {
        console.log("[appendMessage] applying queued patch to msg:", msg.id, pending);
        pendingPatches.delete(msg.id);
        return { messages: [...state.messages, { ...msg, ...pending }] };
      }

      return { messages: [...state.messages, msg] };
    }),

  patchMessage: (id, patch) =>
    set((state) => {
      const idx = state.messages.findIndex((m) => m.id === id);
      if (idx === -1) {
        // Message not in store yet — save patch for when it arrives
        console.log("[patchMessage] msg", id, "not in store yet — queuing patch", patch);
        pendingPatches.set(id, { ...(pendingPatches.get(id) ?? {}), ...patch });
        return state;
      }
      return {
        messages: state.messages.map((m) =>
          m.id === id ? { ...m, ...patch } : m
        ),
      };
    }),

  clearMessages: () => {
    pendingPatches.clear();
    set({ messages: [] });
  },
}));