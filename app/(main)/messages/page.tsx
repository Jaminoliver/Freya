// app/(main)/messages/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { EmptyState } from "@/components/messages/EmptyState";
import { getAuthenticatedBrowserClient } from "@/lib/supabase/browserClient";
import { useMessageStore } from "@/lib/store/messageStore";
import type { Conversation, Message } from "@/lib/types/messages";

// ─── Module-level singletons ──────────────────────────────────────────────────
let cachedConversations: Conversation[] | null = null;
let isFetching            = false;
let realtimeChannel: any  = null;
let channelStarting       = false;
let currentUserId: string | null = null;
let activeConversationId: number | null = null;
let isOnMessagesPage = false;

export function setOnMessagesPage(value: boolean) {
  console.log("[MessagesPage] setOnMessagesPage:", value);
  isOnMessagesPage = value;
}

const listeners       = new Set<(convs: Conversation[]) => void>();
const typingListeners = new Set<(typers: Set<number>) => void>();
const typingTimers    = new Map<number, ReturnType<typeof setTimeout>>();
const typingChannels  = new Map<number, any>();

let typingConvIds = new Set<number>();

const recordingListeners = new Set<(set: Set<number>) => void>();
const recordingTimers    = new Map<number, ReturnType<typeof setTimeout>>();
let   recordingConvIds   = new Set<number>();

const blockedConversationIds  = new Set<number>();
const archivedConversationIds = new Set<number>();
const pendingHydrationIds     = new Set<number>();

export function addArchivedId(id: number) {
  archivedConversationIds.add(id);
}

export function removeArchivedId(id: number) {
  archivedConversationIds.delete(id);
}



// ─── Conversation sorting ─────────────────────────────────────────────────────
function sortKey(c: Conversation): number {
  const raw = c.lastMessageAt || (c as any).createdAt || "";
  if (!raw) return 0;
  const t = new Date(raw).getTime();
  return isNaN(t) ? 0 : t;
}

function sortConversations(convs: Conversation[]): Conversation[] {
  return [...convs].sort((a, b) => {
    const aPinned = a.isPinned ? 1 : 0;
    const bPinned = b.isPinned ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;
    return sortKey(b) - sortKey(a);
  });
}

// ─── Core update function ─────────────────────────────────────────────────────
export function updateConversations(
  updater: Conversation[] | ((prev: Conversation[]) => Conversation[])
) {
  const next =
    typeof updater === "function"
      ? updater(cachedConversations ?? [])
      : updater;
  cachedConversations = sortConversations(next);
  listeners.forEach((fn) => fn(cachedConversations!));
}

// ─── Active conversation ──────────────────────────────────────────────────────
export function setActiveConversation(id: number | null) {
  if (activeConversationId !== null && id === null) {
    updateConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId ? { ...c, unreadCount: 0 } : c
      )
    );
  }
  activeConversationId = id;
}

export function blockConversation(id: number) {
  blockedConversationIds.add(id);
}

// ─── Start conversation (shared helper) ───────────────────────────────────────
export async function startConversation(targetUserId: string): Promise<number | null> {
  try {
    const res  = await fetch("/api/conversations", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ targetUserId }),
    });
    const data = await res.json();
    if (!res.ok || !data.conversationId) {
      console.error("[startConversation] POST failed:", data);
      return null;
    }
    const conversationId = data.conversationId as number;
    pendingHydrationIds.add(conversationId);
    blockedConversationIds.delete(conversationId);
    archivedConversationIds.delete(conversationId);
    fetch(`/api/conversations/${conversationId}`)
      .then((r) => r.json())
      .then((convData) => {
        if (!convData.conversation) return;
        updateConversations((prev) => {
          const filtered = prev.filter((c) => c.id !== conversationId);
          return [convData.conversation, ...filtered];
        });
        getAuthenticatedBrowserClient().then((sb) =>
          subscribeTyping(sb, conversationId)
        );
      })
      .catch((err) => console.error("[startConversation] hydrate fetch error:", err))
      .finally(() => {
        pendingHydrationIds.delete(conversationId);
      });
    return conversationId;
  } catch (err) {
    console.error("[startConversation] error:", err);
    return null;
  }
}

// ─── Typing ───────────────────────────────────────────────────────────────────
function setTyping(conversationId: number, isTyping: boolean) {
  const updated = new Set(typingConvIds);
  if (isTyping) updated.add(conversationId);
  else updated.delete(conversationId);
  typingConvIds = updated;
  typingListeners.forEach((fn) => fn(updated));
}

function setRecording(conversationId: number, isRecording: boolean) {
  const updated = new Set(recordingConvIds);
  if (isRecording) updated.add(conversationId);
  else updated.delete(conversationId);
  recordingConvIds = updated;
  recordingListeners.forEach((fn) => fn(updated));
}

export function unsubscribeTypingForConversation(conversationId: number) {
  const ch = typingChannels.get(conversationId);
  if (!ch) return;
  ch.unsubscribe();
  typingChannels.delete(conversationId);
}

export async function subscribeTypingForConversation(conversationId: number) {
  const supabase = await getAuthenticatedBrowserClient();
  subscribeTyping(supabase, conversationId);
}

function subscribeTyping(supabase: any, conversationId: number) {
  if (typingChannels.has(conversationId)) return;
  const channel = supabase.channel(`typing:${conversationId}`);
  channel
    .on("broadcast", { event: "typing" }, (payload: any) => {
      if (payload.payload?.userId === currentUserId) return;
      setTyping(conversationId, true);
      if (typingTimers.has(conversationId))
        clearTimeout(typingTimers.get(conversationId)!);
      typingTimers.set(
        conversationId,
        setTimeout(() => {
          setTyping(conversationId, false);
          typingTimers.delete(conversationId);
        }, 2000)
      );
    })
    .on("broadcast", { event: "recording" }, (payload: any) => {
      if (payload.payload?.userId === currentUserId) return;
      const isRecording = !!payload.payload?.isRecording;
      setRecording(conversationId, isRecording);
      if (recordingTimers.has(conversationId)) {
        clearTimeout(recordingTimers.get(conversationId)!);
        recordingTimers.delete(conversationId);
      }
      if (isRecording) {
        // Safety: auto-clear after 3 minutes if no explicit stop arrives
        recordingTimers.set(
          conversationId,
          setTimeout(() => {
            setRecording(conversationId, false);
            recordingTimers.delete(conversationId);
          }, 180000)
        );
      }
    })
    .subscribe();
  typingChannels.set(conversationId, channel);
}

export function sendTypingEvent(conversationId: number, userId: string) {
  const channel = typingChannels.get(conversationId);
  if (!channel) return;
  channel.send({ type: "broadcast", event: "typing", payload: { userId } });
}

export function sendRecordingEvent(conversationId: number, userId: string, isRecording: boolean) {
  const channel = typingChannels.get(conversationId);
  if (!channel) return;
  channel.send({ type: "broadcast", event: "recording", payload: { userId, isRecording } });
}

// ─── Fetch conversations ──────────────────────────────────────────────────────
function ensureConversationsFetched() {
  if (cachedConversations !== null) return;
  if (isFetching) return;
  isFetching = true;

  fetch("/api/conversations")
    .then((res) => {
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return res.json();
    })
    .then((data) => {
      const convs = data.conversations ?? [];
      if (data.archivedIds) {
        data.archivedIds.forEach((id: number) => archivedConversationIds.add(id));
      }
      cachedConversations = sortConversations(convs);
      listeners.forEach((fn) => fn(cachedConversations!));
      getAuthenticatedBrowserClient().then((supabase) => {
        convs.forEach((c: Conversation) => subscribeTyping(supabase, c.id));
      });
    })
    .catch(() => {})
    .finally(() => { isFetching = false; });
}

// ─── Global realtime ──────────────────────────────────────────────────────────
function startGlobalRealtime() {
  if (realtimeChannel || channelStarting) return;
  channelStarting = true;

  getAuthenticatedBrowserClient().then(async (supabase) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    currentUserId  = session.user.id;
    channelStarting = false;
    cachedConversations?.forEach((c) => subscribeTyping(supabase, c.id));

    realtimeChannel = supabase
      .channel("global-messages-changes")

      // ── conversations INSERT ───────────────────────────────────────────────
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversations" },
        (payload: any) => {
          const row = payload.new as any;
          console.log("[CONV INSERT] fired — row:", JSON.stringify(row));
          console.log("[CONV INSERT] currentUserId:", currentUserId);
          console.log("[CONV INSERT] creator_id:", row.creator_id, "fan_id:", row.fan_id);

          

          const alreadyExists = cachedConversations?.some((c) => c.id === row.id) ?? false;
          console.log("[CONV INSERT] alreadyExists in cache:", alreadyExists);
          if (alreadyExists) return;

          // Never re-add an archived conversation
          if (archivedConversationIds.has(row.id)) return;

          // startConversation is hydrating this — don't race it
          if (pendingHydrationIds.has(row.id)) {
            console.log("[CONV INSERT] pending hydration — skipping");
            return;
          }

          console.log("[CONV INSERT] fetching /api/conversations/" + row.id);
          fetch(`/api/conversations/${row.id}`)
            .then((r) => {
              console.log("[CONV INSERT] fetch status:", r.status);
              return r.json();
            })
            .then((data) => {
              console.log("[CONV INSERT] fetch response:", JSON.stringify(data));
              if (data.conversation && !archivedConversationIds.has(row.id)) {
                blockedConversationIds.delete(row.id);
                updateConversations((prev) => {
                  if (prev.some((c) => c.id === row.id)) {
                    console.log("[CONV INSERT] duplicate guard hit — not adding");
                    return prev;
                  }
                  console.log("[CONV INSERT] adding to list:", row.id);
                  return [data.conversation, ...prev];
                });
                getAuthenticatedBrowserClient().then((sb) =>
                  subscribeTyping(sb, row.id)
                );
              } else {
                console.warn("[CONV INSERT] no conversation in response — check /api/conversations/:id");
              }
            })
            .catch((err) => console.error("[CONV INSERT] fetch error:", err));
        }
      )

      // ── messages INSERT ────────────────────────────────────────────────────
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload: any) => {
          const row   = payload.new as any;
          const isOwn = row.sender_id === currentUserId;

          setTyping(row.conversation_id, false);
          setRecording(row.conversation_id, false);
          console.log("[MSG INSERT] receiver_id:", row.receiver_id, "currentUserId:", currentUserId, "isOnMessagesPage:", isOnMessagesPage);

          if (isOwn) {
            updateConversations((prev) =>
              prev.map((c) =>
                c.id !== row.conversation_id ? c : {
                  ...c,
                  lastMessageId:       row.id,
                  lastMessageSenderId: row.sender_id,
                } as any
              )
            );
            return;
          }

          const convoExists = cachedConversations?.some((c) => c.id === row.conversation_id) ?? false;
          console.log("[MSG INSERT] convoExists:", convoExists, "conv_id:", row.conversation_id);
          if (!convoExists) {
            if (archivedConversationIds.has(row.conversation_id)) return;
            if (pendingHydrationIds.has(row.conversation_id)) return;
            fetch(`/api/conversations/${row.conversation_id}`)
              .then((r) => r.json())
              .then((data) => {
                if (data.conversation && !archivedConversationIds.has(row.conversation_id)) {
                  blockedConversationIds.delete(row.conversation_id);
                  updateConversations((prev) => {
                    if (prev.some((c) => c.id === row.conversation_id)) return prev;
                    return [data.conversation, ...prev];
                  });
                  getAuthenticatedBrowserClient().then((sb) =>
                    subscribeTyping(sb, row.conversation_id)
                  );
                }
              })
              .catch(() => {});
            return;
          }

          if (row.receiver_id === currentUserId && isOnMessagesPage) {
            console.log("[MSG INSERT] firing deliver PATCH for msg:", row.id);
            fetch(
              `/api/conversations/${row.conversation_id}/messages/${row.id}/deliver`,
              { method: "PATCH" }
            ).catch(() => {});
          }

          // ── GIF message ──
          if (row.gif_url) {
            const gifMessage: Message = {
              id:             row.id,
              conversationId: row.conversation_id,
              senderId:       row.sender_id,
              type:           "gif",
              gifUrl:         row.gif_url,
              isRead:         row.is_read ?? false,
              isDelivered:    true,
              createdAt:      row.created_at,
              replyToId:         row.reply_to_id          ?? null,
              replyToMediaIndex: row.reply_to_media_index ?? 0,
            };

            const store = useMessageStore.getState();
            if (row.conversation_id === store.conversationId) {
              store.appendMessage(gifMessage);
              fetch(`/api/conversations/${row.conversation_id}/read`, { method: "PATCH" }).catch(() => {});
            }

            updateConversations((prev) =>
              prev.map((c) =>
                c.id !== row.conversation_id ? c : {
                  ...c,
                  lastMessage:         "🎬 GIF",
                  lastMessageAt:       row.created_at,
                  lastMessageId:       row.id,
                  lastMessageSenderId: row.sender_id,
                  unreadCount:         c.id === activeConversationId ? c.unreadCount : c.unreadCount + 1,
                  hasMedia:            true,
                }
              )
            );
            return;
          }

          // ── Voice message ──
          if (row.audio_url) {
            const voiceMessage: Message = {
              id:             row.id,
              conversationId: row.conversation_id,
              senderId:       row.sender_id,
              type:           "voice",
              audioUrl:       row.audio_url,
              audioDuration:  row.audio_duration ?? 0,
              audioPeaks:     row.audio_peaks    ?? [],
              isRead:         row.is_read ?? false,
              isDelivered:    true,
              createdAt:      row.created_at,
              replyToId:      row.reply_to_id ?? null,
            };

            const store = useMessageStore.getState();
            if (row.conversation_id === store.conversationId) {
              store.appendMessage(voiceMessage);
              fetch(`/api/conversations/${row.conversation_id}/read`, { method: "PATCH" }).catch(() => {});
            }

            updateConversations((prev) =>
              prev.map((c) =>
                c.id !== row.conversation_id ? c : {
                  ...c,
                  lastMessage:         "🎙️ Voice message",
                  lastMessageAt:       row.created_at,
                  lastMessageId:       row.id,
                  lastMessageSenderId: row.sender_id,
                  unreadCount:         c.id === activeConversationId ? c.unreadCount : c.unreadCount + 1,
                  hasMedia:            true,
                }
              )
            );
            return;
          }

          // ── Tip message ──
          if (row.is_tip) {
            updateConversations((prev) =>
              prev.map((c) =>
                c.id !== row.conversation_id ? c : {
                  ...c,
                  lastMessage:   "💰 Tip",
                  lastMessageAt: row.created_at,
                  unreadCount:   c.id === activeConversationId ? c.unreadCount : c.unreadCount + 1,
                  hasMedia:      false,
                }
              )
            );
            return;
          }

          if (row.media_type && !row.is_ppv) {
            updateConversations((prev) =>
              prev.map((c) =>
                c.id !== row.conversation_id ? c : {
                  ...c,
                  lastMessage:   row.content ?? "📎 Media",
                  lastMessageAt: row.created_at,
                  unreadCount:   c.id === activeConversationId ? c.unreadCount : c.unreadCount + 1,
                  hasMedia:      true,
                }
              )
            );
            return;
          }

          if (row.is_ppv) {
            updateConversations((prev) =>
              prev.map((c) =>
                c.id !== row.conversation_id ? c : {
                  ...c,
                  lastMessage:   "🔒 PPV message",
                  lastMessageAt: row.created_at,
                  unreadCount:   c.id === activeConversationId ? c.unreadCount : c.unreadCount + 1,
                  hasMedia:      true,
                }
              )
            );
            return;
          }

          const newMessage: Message = {
            id:             row.id,
            conversationId: row.conversation_id,
            senderId:       row.sender_id,
            type:           "text",
            text:           row.content ?? "",
            isRead:         row.is_read ?? false,
            isDelivered:    true,
            createdAt:      row.created_at,
            replyToId:         row.reply_to_id          ?? null,
            replyToMediaIndex: row.reply_to_media_index ?? 0,
          };

          const store = useMessageStore.getState();
          if (row.conversation_id === store.conversationId) {
            store.appendMessage(newMessage);
            fetch(`/api/conversations/${row.conversation_id}/read`, { method: "PATCH" }).catch(() => {});
          }

          updateConversations((prev) =>
            prev.map((c) =>
              c.id !== row.conversation_id ? c : {
                ...c,
                lastMessage:         row.content ?? "",
                lastMessageAt:       row.created_at,
                lastMessageId:       row.id,
                lastMessageSenderId: row.sender_id,
                unreadCount:         c.id === activeConversationId ? c.unreadCount : c.unreadCount + 1,
                hasMedia:            false,
              }
            )
          );
        }
      )

      // ── messages UPDATE ────────────────────────────────────────────────────
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload: any) => {
          const row = payload.new as any;
          const old = payload.old as any;

          console.log("[MSG UPDATE] patching msg:", row.id, "is_delivered:", row.is_delivered, "is_read:", row.is_read);

          if (row.is_deleted_for_everyone) {
            useMessageStore.getState().patchMessage(row.id, {
              text:      "This message was deleted",
              type:      "text",
              mediaUrls: [],
              isDeleted: true,
            } as any);
            return;
          }

          const isInvolved = row.sender_id === currentUserId || row.receiver_id === currentUserId;
          if (isInvolved && (row.deleted_for_creator || row.deleted_for_fan)) return;

          if (row.is_ppv && row.thumbnail_url) {
            const isReceiver = row.receiver_id === currentUserId;
            const isSender   = row.sender_id   === currentUserId;
            if (isSender || isReceiver) {
              const ppvMessage: Message = {
                id:             row.id,
                conversationId: row.conversation_id,
                senderId:       row.sender_id,
                type:           "ppv",
                text:           row.content ?? undefined,
                mediaUrls:      isSender ? (row.media_url ? [row.media_url] : []) : [],
                thumbnailUrl:   row.thumbnail_url,
                isRead:         row.is_read ?? false,
                isDelivered:    true,
                createdAt:      row.created_at,
                replyToId:      row.reply_to_id ?? null,
                ppv: {
                  price:         row.ppv_price ?? 0,
                  isUnlocked:    isSender,
                  unlockedCount: 0,
                },
              };

              const store = useMessageStore.getState();
              if (row.conversation_id === store.conversationId) {
                store.appendMessage(ppvMessage);
              }
            }
            return;
          }

          if (row.sender_id === currentUserId) {
            useMessageStore.getState().patchMessage(row.id, {
              isDelivered: row.is_delivered ?? false,
              isRead:      row.is_read      ?? false,
              status:      "sent",
            });
            return;
          }

          if (row.receiver_id !== currentUserId) return;
          if (!row.media_type || !row.media_url) return;
          if (old.media_url) return;

          const mediaMessage: Message = {
            id:             row.id,
            conversationId: row.conversation_id,
            senderId:       row.sender_id,
            type:           "media",
            text:           row.content ?? undefined,
            mediaUrls:      row.media_url ? [row.media_url] : [],
            thumbnailUrl:   row.thumbnail_url ?? null,
            isRead:         row.is_read ?? false,
            isDelivered:    true,
            createdAt:      row.created_at,
            replyToId:      row.reply_to_id ?? null,
          };

          const store = useMessageStore.getState();
          if (row.conversation_id === store.conversationId) {
            store.appendMessage(mediaMessage);
          }
        }
      )

      // ── conversations UPDATE ───────────────────────────────────────────────
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversations" },
        (payload: any) => {
          const row       = payload.new as any;
          const isCreator = row.creator_id === currentUserId;
          const isFan     = row.fan_id     === currentUserId;

          if (!isCreator && !isFan) return;

          const deletedForMe = isCreator ? row.deleted_for_creator : row.deleted_for_fan;

          // ── Blocked, restricted, or deleted — remove immediately, never re-add ──
          if (row.is_blocked || row.is_restricted || deletedForMe) {
            blockedConversationIds.add(row.id);
            updateConversations((prev) => prev.filter((c) => c.id !== row.id));
            return;
          }

          updateConversations((prev) => {
            const exists = prev.some((c) => c.id === row.id);

            if (!exists) {
              if (archivedConversationIds.has(row.id)) return prev;
              fetch(`/api/conversations/${row.id}`)
                .then((r) => r.json())
                .then((data) => {
                  if (data.conversation && !archivedConversationIds.has(row.id)) {
                    blockedConversationIds.delete(row.id);
                    updateConversations((p) => {
                      if (p.some((c) => c.id === row.id)) return p;
                      return [data.conversation, ...p];
                    });
                    getAuthenticatedBrowserClient().then((sb) =>
                      subscribeTyping(sb, row.id)
                    );
                  }
                })
                .catch(() => {});
              return prev;
            }

            const deletedBefore = isCreator ? row.deleted_before_creator : row.deleted_before_fan;
            const incomingAt    = row.last_message_at ?? null;
            const clearedAfter  = deletedBefore && (!incomingAt || new Date(deletedBefore) >= new Date(incomingAt));
            const viewLastMessage   = clearedAfter ? "" : (row.last_message_preview ?? "");
            const viewLastMessageAt = clearedAfter ? deletedBefore : incomingAt;

            return prev.map((c) => {
              if (c.id !== row.id) return c;

              const incomingUnread = isCreator
                ? (row.unread_count_creator ?? c.unreadCount)
                : (row.unread_count_fan     ?? c.unreadCount);

              const cachedAt = c.lastMessageAt;

              const alreadySorted =
                cachedAt &&
                viewLastMessageAt &&
                new Date(cachedAt).getTime() >= new Date(viewLastMessageAt).getTime();

              if (alreadySorted) {
                return {
                  ...c,
                  lastMessage: viewLastMessage,
                  unreadCount: c.id === activeConversationId
                    ? c.unreadCount
                    : Math.max(c.unreadCount, incomingUnread),
                };
              }

              return {
                ...c,
                lastMessage:   viewLastMessage,
                lastMessageAt: viewLastMessageAt ?? c.lastMessageAt,
                unreadCount:   c.id === activeConversationId
                  ? c.unreadCount
                  : Math.max(c.unreadCount, incomingUnread),
              };
            });
          });
        }
      )

      // ── message_reactions INSERT ───────────────────────────────────────────
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "message_reactions" },
        (payload: any) => {
          const row = payload.new as any;
          console.log("[REACTION INSERT] fired — row:", JSON.stringify(row));

          // Update message in active conversation store
          // Skip own reactions — already handled by optimistic update in handleReact
          if (row.user_id === currentUserId) return;

          const store = useMessageStore.getState();
          store.setMessages((prev: Message[]) => prev.map((m) => {
            if (m.id !== row.message_id) return m;
            // Remove any previous reaction from this other user (we don't track per-user so reduce all by 1 if switching)
            let reactions = [...(m.reactions ?? [])];
            // Add or increment new emoji
            const hit = reactions.find((r) => r.emoji === row.emoji);
            reactions = hit
              ? reactions.map((r) => r.emoji === row.emoji ? { ...r, count: r.count + 1 } : r)
              : [...reactions, { emoji: row.emoji, count: 1, reactedByMe: false }];
            return { ...m, reactions };
          }));
          console.log("[REACTION INSERT] cached convs:", cachedConversations?.map((c) => ({
            id: c.id,
            lastMessageId: (c as any).lastMessageId,
          })));
          updateConversations((prev) =>
            prev.map((c) => {
              const lastMsgId = (c as any).lastMessageId;
              console.log("[REACTION INSERT] conv", c.id, "lastMessageId:", lastMsgId, "reaction message_id:", row.message_id, "match:", lastMsgId === row.message_id);
              if (!lastMsgId) return c;
              if (lastMsgId !== row.message_id) return c;
              console.log("[REACTION INSERT] updating conv", c.id, "with emoji:", row.emoji);
              return { ...c, lastMessageReaction: row.emoji } as any;
            })
          );
        }
      )

      // ── message_reactions DELETE ───────────────────────────────────────────
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "message_reactions" },
        (payload: any) => {
          const row = payload.old as any;

          // Update message in active conversation store
          if (row.user_id === currentUserId) return;

          const store = useMessageStore.getState();
          store.setMessages((prev: Message[]) => prev.map((m) => {
            if (m.id !== row.message_id) return m;
            const reactions = (m.reactions ?? [])
              .map((r) => r.emoji === row.emoji ? { ...r, count: r.count - 1 } : r)
              .filter((r) => r.count > 0);
            return { ...m, reactions };
          }));

          updateConversations((prev) =>
            prev.map((c) => {
              const lastMsg = c as any;
              if (!lastMsg.lastMessageId) return c;
              if (lastMsg.lastMessageId !== row.message_id) return c;
              return { ...c, lastMessageReaction: null } as any;
            })
          );
        }
      )

      .subscribe((status: string) => {
        console.log("[Realtime] channel status:", status);
        if (status === "CHANNEL_ERROR" || status === "CLOSED") {
          const deadChannel = realtimeChannel;
          realtimeChannel = null;
          if (deadChannel) supabase.removeChannel(deadChannel).catch(() => {});
          if (status === "CHANNEL_ERROR")
            setTimeout(() => startGlobalRealtime(), 2000);
        }
      });
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MessagesPage() {
  useEffect(() => {
    console.log("[MessagesPage] mounted — setting isOnMessagesPage true");
    setOnMessagesPage(true);
    fetch("/api/conversations/deliver-all", { method: "PATCH" }).catch(() => {});
    return () => {
      console.log("[MessagesPage] unmounted — setting isOnMessagesPage false");
      setOnMessagesPage(false);
    };
  }, []);

  return <div style={{ width: "100%", height: "100%", display: "flex" }}><EmptyState /></div>;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────
export function useConversations() {
  const [conversations, setConversationsState] = useState<Conversation[]>(
    cachedConversations ?? []
  );
  const [loading, setLoading] = useState(cachedConversations === null);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    const handler = (convs: Conversation[]) => {
      setConversationsState(convs);
      setLoading(false);
    };
    listeners.add(handler);
    startGlobalRealtime();
    ensureConversationsFetched();
    if (cachedConversations !== null) setLoading(false);
    return () => { listeners.delete(handler); };
  }, []);

  const setConversations = useCallback(updateConversations, []);
  return { conversations, setConversations, loading, error };
}

export function useTypingConversations() {
  const [typers, setTypers] = useState<Set<number>>(new Set(typingConvIds));
  useEffect(() => {
    typingListeners.add(setTypers);
    return () => { typingListeners.delete(setTypers); };
  }, []);
  return typers;
}

export function useRecordingConversations() {
  const [recorders, setRecorders] = useState<Set<number>>(new Set(recordingConvIds));
  useEffect(() => {
    recordingListeners.add(setRecorders);
    return () => { recordingListeners.delete(setRecorders); };
  }, []);
  return recorders;
}

export function useUnreadConversationCount() {
  const [count, setCount] = useState(() =>
    (cachedConversations ?? []).filter((c) => c.unreadCount > 0).length
  );

  useEffect(() => {
    startGlobalRealtime();
    ensureConversationsFetched();

    const handler = (convs: Conversation[]) => {
      setCount(convs.filter((c) => c.unreadCount > 0).length);
    };
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  return count;
}