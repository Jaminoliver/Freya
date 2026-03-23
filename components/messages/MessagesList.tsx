"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageBubble } from "@/components/messages/MessageBubble";
import { MediaBubble } from "@/components/messages/MediaBubble";
import { MediaGrid } from "@/components/messages/MediaGrid";
import { MediaLightbox } from "@/components/messages/MediaLightbox";
import { TypingBubble } from "@/components/messages/TypingBubble";
import { ReadTick } from "@/components/messages/ReadTick";
import type { Message, Conversation } from "@/lib/types/messages";

interface Props {
  messages:          Message[];
  conversation:      Conversation;
  currentUserId?:    string;
  isTyping?:         boolean;
  onReply?:          (message: Message) => void;
  onDelete?:         (message: Message, deleteFor: "me" | "everyone") => void;
  onLoadMore?:       () => void;
  hasMore?:          boolean;
  loadingMore?:      boolean;
  loadingMessages?:  boolean;
  onMessagesUpdate?: (updater: (msgs: Message[]) => Message[]) => void;
}

interface LightboxState {
  items: { url: string; type: "image" | "video"; messageId: number }[];
  initialIndex: number;
}

function InlineAvatar({ src, name }: { src: string | null; name: string }) {
  return (
    <div style={{ width: "36px", height: "36px", borderRadius: "50%", overflow: "hidden", flexShrink: 0, backgroundColor: "#2A2A3D" }}>
      {src
        ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <div style={{ width: "100%", height: "100%", backgroundColor: "#8B5CF6", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFF", fontSize: "14px", fontWeight: 700 }}>{name[0].toUpperCase()}</div>
      }
    </div>
  );
}

function formatMessageTime(raw: string): string {
  if (!raw) return "";
  const date = new Date(raw);
  if (isNaN(date.getTime())) return raw;
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
}

function getMediaItems(msg: Message, isOwn: boolean): { url: string; type: "image" | "video" }[] {
  const urls = msg.mediaUrls ?? [];
  if (msg.type === "ppv" && !isOwn && !msg.ppv?.isUnlocked) {
    const count = urls.length > 0 ? urls.length : 1;
    return Array.from({ length: count }, () => ({ url: "", type: "image" as const }));
  }
  return urls.filter(Boolean).map((url) => ({
    url,
    type: url.match(/\.(mp4|mov|webm|avi|mkv)(\?|$)/i) || url.includes('#video') ? "video" : "image",
  }));
}

function MediaSwipeWrapper({ isOwn, onReply, children }: { isOwn: boolean; onReply: () => void; children: React.ReactNode }) {
  const [swipeX,        setSwipeX]        = useState(0);
  const [swiping,       setSwiping]       = useState(false);
  const touchStartX    = useRef(0);
  const touchStartY    = useRef(0);
  const swipeTriggered = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current    = e.touches[0].clientX;
    touchStartY.current    = e.touches[0].clientY;
    swipeTriggered.current = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const dx  = e.touches[0].clientX - touchStartX.current;
    const dy  = e.touches[0].clientY - touchStartY.current;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    if (ady > adx * 1.8 && ady > 5) return;
    const swipeDir = isOwn ? dx < 0 : dx > 0;
    if (swipeDir && adx > 5) {
      e.preventDefault();
      const clamped = isOwn ? Math.max(dx, -55) : Math.min(dx, 55);
      setSwiping(true);
      setSwipeX(clamped);
      if (!swipeTriggered.current && adx > 30) {
        swipeTriggered.current = true;
        onReply();
      }
    }
  };

  const onTouchEnd = () => { setSwiping(false); setSwipeX(0); };

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      style={{
        transform:      `translateX(${swipeX}px)`,
        transition:     swiping ? "none" : "transform 0.25s ease",
        touchAction:    "pan-y",
        display:        "flex",
        width:          "100%",
        justifyContent: isOwn ? "flex-end" : "flex-start",
      }}
    >
      {children}
    </div>
  );
}

export function MessagesList({
  messages,
  conversation,
  currentUserId = "me",
  isTyping = false,
  onReply,
  onDelete,
  onLoadMore,
  hasMore = false,
  loadingMore = false,
  loadingMessages = false,
  onMessagesUpdate,
}: Props) {
  const scrollRef         = useRef<HTMLDivElement>(null);
  const prevMessageIdsRef = useRef<Set<string>>(new Set(messages.map((m) => String(m.tempId ?? m.id))));
  const prevCountRef      = useRef(messages.length);
  const isNearBottomRef   = useRef(true);

  const [olderAnimIds, setOlderAnimIds] = useState<Set<string>>(new Set());
  const [newerAnimIds, setNewerAnimIds] = useState<Set<string>>(new Set());
  const [lightbox,     setLightbox]     = useState<LightboxState | null>(null);
  const [unlocking,    setUnlocking]    = useState<Set<number>>(new Set());

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = 0;
  }, []);

  const updateNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    isNearBottomRef.current = Math.abs(el.scrollTop) < 150;
  }, []);

  useEffect(() => {
    const prevCount = prevCountRef.current;
    prevCountRef.current = messages.length;
    if (messages.length <= prevCount) return;
    const lastMsg      = messages[messages.length - 1];
    const isOwnMessage = lastMsg && lastMsg.senderId === currentUserId;
    if (isOwnMessage || isNearBottomRef.current) {
      requestAnimationFrame(() => scrollToBottom());
    }
  }, [messages.length, messages, currentUserId, scrollToBottom]);

  useEffect(() => {
    if (isTyping && isNearBottomRef.current) {
      requestAnimationFrame(() => scrollToBottom());
    }
  }, [isTyping, scrollToBottom]);

  useEffect(() => {
    const prevIds = prevMessageIdsRef.current;
    const newIds  = new Set(messages.map((m) => String(m.tempId ?? m.id)));
    const added   = new Set<string>();
    for (const id of newIds) { if (!prevIds.has(id)) added.add(id); }
    prevMessageIdsRef.current = newIds;
    if (added.size === 0) return;

    const firstAddedIdx  = messages.findIndex((m) => added.has(String(m.tempId ?? m.id)));
    const lastAddedIdx   = messages.length - 1 - [...messages].reverse().findIndex((m) => added.has(String(m.tempId ?? m.id)));
    const totalExisting  = messages.length - added.size;
    const addedAtStart   = firstAddedIdx === 0 && lastAddedIdx < messages.length - 1 && totalExisting > 0;
    const addedAtEnd     = lastAddedIdx === messages.length - 1 && firstAddedIdx > 0;

    if (addedAtStart && added.size >= 1) {
      setOlderAnimIds(added);
      setTimeout(() => setOlderAnimIds(new Set()), 500);
    } else if (addedAtEnd && added.size >= 1) {
      setNewerAnimIds(added);
      setTimeout(() => setNewerAnimIds(new Set()), 400);
    }
  }, [messages]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateNearBottom();
    if (!onLoadMore || !hasMore || loadingMore) return;
    const distanceFromTop = el.scrollHeight + el.scrollTop - el.clientHeight;
    if (distanceFromTop < 200) onLoadMore();
  }, [onLoadMore, hasMore, loadingMore, updateNearBottom]);

  const handleUnlock = useCallback(async (msg: Message) => {
    if (unlocking.has(msg.id)) return;
    setUnlocking((s) => new Set(s).add(msg.id));
    try {
      const res  = await fetch(`/api/conversations/${msg.conversationId}/messages/${msg.id}/unlock`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error === "Insufficient balance" ? "Not enough balance to unlock. Please top up your wallet." : data.error ?? "Unlock failed");
        return;
      }
      onMessagesUpdate?.((prev) =>
        prev.map((m) =>
          m.id === msg.id
            ? { ...m, mediaUrls: data.mediaUrls, ppv: m.ppv ? { ...m.ppv, isUnlocked: true } : m.ppv }
            : m
        )
      );
    } catch {
      alert("Unlock failed. Please try again.");
    } finally {
      setUnlocking((s) => { const n = new Set(s); n.delete(msg.id); return n; });
    }
  }, [unlocking, onMessagesUpdate]);

  const openLightbox = useCallback((msg: Message, clickedIndex: number) => {
    const allMedia = messages.flatMap((m) => {
      if (!m.mediaUrls?.length) return [];
      if (m.type === "ppv" && !m.ppv?.isUnlocked && m.senderId !== currentUserId) return [];
      const isOwn = m.senderId === currentUserId;
      return getMediaItems(m, isOwn).map((item) => ({ ...item, messageId: m.id }));
    });
    const isOwn       = msg.senderId === currentUserId;
    const clickedUrl  = getMediaItems(msg, isOwn)[clickedIndex]?.url;
    const globalIndex = allMedia.findIndex((item) => item.url === clickedUrl && item.messageId === msg.id);
    setLightbox({ items: allMedia, initialIndex: Math.max(0, globalIndex) });
  }, [messages, currentUserId]);

  return (
    <>
      {lightbox && (
        <MediaLightbox
          items={lightbox.items}
          initialIndex={lightbox.initialIndex}
          onClose={() => setLightbox(null)}
        />
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          flex:                    1,
          minHeight:               0,
          overflowY:               "auto",
          overflowX:               "hidden",
          padding:                 "16px 16px",
          display:                 "flex",
          flexDirection:           "column-reverse",
          gap:                     "4px",
          scrollbarWidth:          "none",
          overscrollBehavior:      "contain",
          touchAction:             "pan-y",
          WebkitOverflowScrolling: "touch" as any,
          fontFamily:              "'Inter',sans-serif",
        }}
      >
        <style>{`
          @keyframes msgSlideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes msgSlideUp   { from { opacity: 0; transform: translateY(10px);  } to { opacity: 1; transform: translateY(0); } }
          .msg-older { animation: msgSlideDown 0.35s ease-out both; }
          .msg-newer { animation: msgSlideUp   0.25s ease-out both; }
          @keyframes spinLoader    { to { transform: rotate(360deg); } }
          @keyframes skeletonPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        `}</style>

        {isTyping && <TypingBubble />}

        {loadingMessages && messages.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", padding: "8px 0" }}>
            {[180, 120, 220, 90, 160].map((width, i) => (
              <div key={i} style={{ display: "flex", justifyContent: i % 2 === 0 ? "flex-end" : "flex-start", alignItems: "flex-end", gap: "8px" }}>
                {i % 2 !== 0 && (
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "#1E1E2E", flexShrink: 0, animation: "skeletonPulse 1.4s ease-in-out infinite", animationDelay: `${i * 0.1}s` }} />
                )}
                <div style={{ width: `${width}px`, height: "38px", borderRadius: i % 2 === 0 ? "18px 18px 4px 18px" : "18px 18px 18px 4px", backgroundColor: "#1E1E2E", animation: "skeletonPulse 1.4s ease-in-out infinite", animationDelay: `${i * 0.12}s` }} />
              </div>
            ))}
          </div>
        )}

        {(() => {
          type RenderItem =
            | { kind: "single"; msg: Message; originalIndex: number }
            | { kind: "group";  msgs: Message[]; originalIndices: number[] };

          const items: RenderItem[] = [];
          let i = 0;
          while (i < messages.length) {
            const msg        = messages[i];
            const isOwn      = msg.senderId === currentUserId;
            const mediaItems = getMediaItems(msg, isOwn);
            const isMedia    = (msg.type === "media" || msg.type === "ppv") && mediaItems.length > 0;
            const canGroup   = isMedia && msg.type !== "ppv" && !msg.text && msg.status !== "sending" && msg.status !== "failed";

            if (canGroup) {
              const run: { msg: Message; idx: number }[] = [{ msg, idx: i }];
              let j = i + 1;
              while (j < messages.length) {
                const next      = messages[j];
                const nextIsOwn = next.senderId === currentUserId;
                const nextMedia = getMediaItems(next, nextIsOwn);
                const nextIsGroupable = (next.type === "media" || next.type === "ppv") && nextMedia.length > 0
                  && next.type !== "ppv" && !next.text && next.status !== "sending" && next.status !== "failed"
                  && next.senderId === msg.senderId;
                if (!nextIsGroupable) break;
                run.push({ msg: next, idx: j });
                j++;
              }
              if (run.length >= 4) {
                items.push({ kind: "group", msgs: run.map((r) => r.msg), originalIndices: run.map((r) => r.idx) });
              } else {
                for (const r of run) items.push({ kind: "single", msg: r.msg, originalIndex: r.idx });
              }
              i = j;
            } else {
              items.push({ kind: "single", msg, originalIndex: i });
              i++;
            }
          }

          return [...items].reverse().map((item, ri) => {
            if (item.kind === "single") {
              const msg           = item.msg;
              const originalIndex = item.originalIndex;
              const isOwn         = msg.senderId === currentUserId;
              const prevMsg       = originalIndex > 0 ? messages[originalIndex - 1] : undefined;
              const isSameGroup   = prevMsg && prevMsg.senderId === msg.senderId;
              const showTime      = !prevMsg || (
                new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() > 5 * 60 * 1000
              );
              const mediaItems = getMediaItems(msg, isOwn);
              const msgKey     = String(msg.tempId ?? msg.id);
              const animClass  = olderAnimIds.has(msgKey) ? "msg-older" : newerAnimIds.has(msgKey) ? "msg-newer" : "";

              return (
                <div
                  key={`${ri}-${msgKey}`}
                  className={animClass}
                  style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: isSameGroup ? "2px" : "10px" }}
                >
                  {showTime && (
                    <div style={{ textAlign: "center", margin: "6px 0" }}>
                      <span style={{ fontSize: "11px", color: "#4A4A6A" }}>{formatMessageTime(msg.createdAt)}</span>
                    </div>
                  )}

                  {msg.type === "text" && (
                    <MessageBubble
                      message={msg}
                      conversation={conversation}
                      isOwn={isOwn}
                      isRead={msg.isRead ?? false}
                      isDelivered={msg.isDelivered ?? false}
                      time={formatMessageTime(msg.createdAt)}
                      onReply={onReply}
                      onDelete={onDelete}
                      replyToMessage={msg.replyToId ? messages.find((m) => m.id === msg.replyToId) ?? null : null}
                    />
                  )}

                  {(msg.type === "media" || msg.type === "ppv") && mediaItems.length > 0 && (
                    <MediaSwipeWrapper isOwn={isOwn} onReply={() => onReply?.(msg)}>
                      <MediaBubble
                        msg={msg}
                        isOwn={isOwn}
                        isSameGroup={!!isSameGroup}
                        conversation={conversation}
                        mediaItems={mediaItems}
                        unlocking={unlocking}
                        onReply={onReply}
                        onDelete={onDelete}
                        onUnlock={handleUnlock}
                        onOpenLightbox={openLightbox}
                        currentUserId={currentUserId}
                      />
                    </MediaSwipeWrapper>
                  )}
                </div>
              );
            }

            const groupMsgs   = item.msgs;
            const firstMsg    = groupMsgs[0];
            const lastMsg     = groupMsgs[groupMsgs.length - 1];
            const firstIdx    = item.originalIndices[0];
            const isOwn       = firstMsg.senderId === currentUserId;
            const prevMsg     = firstIdx > 0 ? messages[firstIdx - 1] : undefined;
            const isSameGroup = prevMsg && prevMsg.senderId === firstMsg.senderId;
            const showTime    = !prevMsg || (
              new Date(firstMsg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() > 5 * 60 * 1000
            );
            const allGroupMedia = groupMsgs.flatMap((m) =>
              getMediaItems(m, isOwn).map((mi) => ({ ...mi, messageId: m.id }))
            );
            const gridItems  = allGroupMedia.map((mi) => ({ url: mi.url, type: mi.type }));
            const groupKey   = groupMsgs.map((m) => m.tempId ?? m.id).join("-");
            const firstKey   = String(groupMsgs[0].tempId ?? groupMsgs[0].id);
            const groupAnim  = olderAnimIds.has(firstKey) ? "msg-older" : newerAnimIds.has(firstKey) ? "msg-newer" : "";

            const handleGroupClick = (clickedIndex: number) => {
              const allConvoMedia = messages.flatMap((m) => {
                if (!m.mediaUrls?.length) return [];
                if (m.type === "ppv" && !m.ppv?.isUnlocked && m.senderId !== currentUserId) return [];
                const mIsOwn = m.senderId === currentUserId;
                return getMediaItems(m, mIsOwn).map((mi) => ({ ...mi, messageId: m.id }));
              });
              const clickedUrl   = allGroupMedia[clickedIndex]?.url;
              const clickedMsgId = allGroupMedia[clickedIndex]?.messageId;
              const globalIndex  = allConvoMedia.findIndex((mi) => mi.url === clickedUrl && mi.messageId === clickedMsgId);
              setLightbox({ items: allConvoMedia, initialIndex: Math.max(0, globalIndex) });
            };

            return (
              <div key={groupKey} className={groupAnim} style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: isSameGroup ? "2px" : "10px" }}>
                {showTime && (
                  <div style={{ textAlign: "center", margin: "6px 0" }}>
                    <span style={{ fontSize: "11px", color: "#4A4A6A" }}>{formatMessageTime(firstMsg.createdAt)}</span>
                  </div>
                )}
                <div style={{ display: "flex", width: "100%", justifyContent: isOwn ? "flex-end" : "flex-start" }}>
                  <div style={{ display: "flex", flexDirection: isOwn ? "row-reverse" : "row", alignItems: "flex-end", gap: "8px", maxWidth: "75%" }}>
                    {!isOwn && !isSameGroup && <InlineAvatar src={conversation.participant.avatarUrl} name={conversation.participant.name} />}
                    {!isOwn && isSameGroup  && <div style={{ width: "36px", flexShrink: 0 }} />}
                    <div style={{ backgroundColor: "#1E1E2E", borderRadius: "12px", overflow: "hidden", width: "280px" }}>
                      <MediaGrid mediaItems={gridItems} onClickItem={handleGroupClick} />
                      <div style={{ padding: "2px 8px 6px", display: "flex", justifyContent: isOwn ? "flex-end" : "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "11px", color: "#4A4A6A" }}>{allGroupMedia.length} media</span>
                        {isOwn && <ReadTick status={lastMsg.status} isDelivered={lastMsg.isDelivered} isRead={lastMsg.isRead ?? false} />}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          });
        })()}

        {loadingMore && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "16px 0" }}>
            <div style={{ width: "18px", height: "18px", borderRadius: "50%", border: "2px solid #2A2A3D", borderTopColor: "#8B5CF6", animation: "spinLoader 0.7s linear infinite" }} />
            <span style={{ fontSize: "12px", color: "#4A4A6A" }}>Loading older messages...</span>
          </div>
        )}
      </div>
    </>
  );
}