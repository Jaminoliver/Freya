"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageBubble } from "@/components/messages/MessageBubble";
import { MediaGrid } from "@/components/messages/MediaGrid";
import { MediaLightbox } from "@/components/messages/MediaLightbox";
import { TypingBubble } from "@/components/messages/TypingBubble";
import type { Message, Conversation } from "@/lib/types/messages";

interface Props {
  messages:       Message[];
  conversation:   Conversation;
  currentUserId?: string;
  isTyping?:      boolean;
  onReply?:       (message: Message) => void;
  onLoadMore?:    () => void;
  hasMore?:       boolean;
  loadingMore?:   boolean;
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

// 3-state tick:
// sending   → clock icon (grey)
// sent      → single grey tick
// delivered → double grey tick
// read      → double purple tick
function ReadTick({ status, isDelivered, isRead }: { status?: string; isDelivered?: boolean; isRead: boolean }) {
  if (status === "sending") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="5" stroke="rgba(255,255,255,0.4)" strokeWidth="1.4"/>
          <path d="M6 3.5V6L7.5 7.5" stroke="rgba(255,255,255,0.4)" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      </span>
    );
  }
  if (isRead) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
        <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
          <path d="M1 5L4.5 8.5L10 2" stroke="#A78BFA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6 5L9.5 8.5L15 2" stroke="#A78BFA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    );
  }
  if (isDelivered) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
        <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
          <path d="M1 5L4.5 8.5L10 2" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6 5L9.5 8.5L15 2" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    );
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M1 5L4 8L9 2" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  );
}

function getMediaItems(msg: Message): { url: string; type: "image" | "video" }[] {
  return (msg.mediaUrls ?? []).filter(Boolean).map((url) => ({
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
        transform:   `translateX(${swipeX}px)`,
        transition:  swiping ? "none" : "transform 0.25s ease",
        touchAction: "pan-y",
        display:     "flex",
        width:       "100%",
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
  onLoadMore,
  hasMore = false,
  loadingMore = false,
  onMessagesUpdate,
}: Props) {
  const scrollRef         = useRef<HTMLDivElement>(null);
  const prevMessageIdsRef = useRef<Set<number>>(new Set(messages.map((m) => m.id)));
  const [animatingIds,  setAnimatingIds]  = useState<Set<number>>(new Set());
  const [lightbox,      setLightbox]      = useState<LightboxState | null>(null);
  const [unlocking,     setUnlocking]     = useState<Set<number>>(new Set());

  useEffect(() => {
    const prevIds = prevMessageIdsRef.current;
    const newIds  = new Set(messages.map((m) => m.id));
    const added   = new Set<number>();
    for (const id of newIds) { if (!prevIds.has(id)) added.add(id); }
    prevMessageIdsRef.current = newIds;
    if (added.size > 0) {
      const lastAddedIdx = messages.length - 1 - [...messages].reverse().findIndex((m) => added.has(m.id));
      const allAtStart   = lastAddedIdx < messages.length - 1;
      if (allAtStart && added.size > 1) {
        setAnimatingIds(added);
        setTimeout(() => setAnimatingIds(new Set()), 450);
      }
    }
  }, [messages]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !onLoadMore || !hasMore || loadingMore) return;
    const distanceFromTop = el.scrollHeight + el.scrollTop - el.clientHeight;
    if (distanceFromTop < 200) onLoadMore();
  }, [onLoadMore, hasMore, loadingMore]);

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
      return getMediaItems(m).map((item) => ({ ...item, messageId: m.id }));
    });
    const clickedUrl  = getMediaItems(msg)[clickedIndex]?.url;
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
          @keyframes msgFadeIn { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
          .msg-fade-in { animation: msgFadeIn 0.4s ease-out both; }
          @keyframes spinLoader { to { transform: rotate(360deg); } }
        `}</style>

        {isTyping && <TypingBubble />}

        {(() => {
          type RenderItem =
            | { kind: "single"; msg: Message; originalIndex: number }
            | { kind: "group";  msgs: Message[]; originalIndices: number[] };

          const items: RenderItem[] = [];
          let i = 0;
          while (i < messages.length) {
            const msg        = messages[i];
            const mediaItems = getMediaItems(msg);
            const isMedia    = (msg.type === "media" || msg.type === "ppv") && mediaItems.length > 0;
            const canGroup   = isMedia && msg.type !== "ppv" && !msg.text && msg.status !== "sending" && msg.status !== "failed";

            if (canGroup) {
              const run: { msg: Message; idx: number }[] = [{ msg, idx: i }];
              let j = i + 1;
              while (j < messages.length) {
                const next            = messages[j];
                const nextMedia       = getMediaItems(next);
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
              const mediaItems = getMediaItems(msg);

              return (
                <div key={`${ri}-${msg.tempId ?? msg.id}`} className={animatingIds.has(msg.id) ? "msg-fade-in" : ""} style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: isSameGroup ? "2px" : "10px" }}>
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
                      replyToMessage={msg.replyToId ? messages.find((m) => m.id === msg.replyToId) ?? null : null}
                    />
                  )}

                  {(msg.type === "media" || msg.type === "ppv") && mediaItems.length > 0 && (
                    <MediaSwipeWrapper isOwn={isOwn} onReply={() => onReply?.(msg)}>
                    <div style={{ display: "flex", flexDirection: isOwn ? "row-reverse" : "row", alignItems: "flex-end", gap: "8px", maxWidth: "75%" }}>
                      {!isOwn && !isSameGroup && <InlineAvatar src={conversation.participant.avatarUrl} name={conversation.participant.name} />}
                      {!isOwn && isSameGroup  && <div style={{ width: "36px", flexShrink: 0 }} />}

                      <div style={{ backgroundColor: "#1E1E2E", borderRadius: "12px", overflow: "hidden", width: "280px" }}>
                        <MediaGrid
                          mediaItems={mediaItems}
                          isPPV={msg.type === "ppv"}
                          price={msg.ppv?.price}
                          isUnlocked={isOwn || msg.ppv?.isUnlocked}
                          onClickItem={(i) => openLightbox(msg, i)}
                          isSending={msg.status === "sending"}
                          uploadProgress={msg.uploadProgress}
                          isFailed={msg.status === "failed"}
                        />

                        {msg.text && (
                          <div style={{ padding: "8px 12px 4px" }}>
                            <p style={{ margin: 0, fontSize: "13px", color: "#A3A3C2", lineHeight: 1.4 }}>{msg.text}</p>
                          </div>
                        )}

                        {msg.type === "ppv" && msg.ppv && !msg.ppv.isUnlocked && !isOwn && (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderTop: "1px solid #2A2A3D" }}>
                            <span style={{ fontSize: "13px", fontWeight: 600, color: "#F5A623" }}>₦{(msg.ppv.price / 100).toLocaleString()} to unlock</span>
                            <button onClick={() => handleUnlock(msg)} disabled={unlocking.has(msg.id)}
                              style={{ padding: "6px 14px", borderRadius: "20px", border: "none", cursor: unlocking.has(msg.id) ? "default" : "pointer", backgroundColor: unlocking.has(msg.id) ? "#4A4A6A" : "#8B5CF6", color: "#FFFFFF", fontSize: "13px", fontWeight: 600, fontFamily: "'Inter',sans-serif", transition: "background-color 0.15s" }}>
                              {unlocking.has(msg.id) ? "Unlocking..." : "Unlock"}
                            </button>
                          </div>
                        )}

                        {msg.type === "ppv" && msg.ppv && isOwn && (
                          <div style={{ padding: "4px 12px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: "11px", color: "#4A4A6A" }}>₦{(msg.ppv.price / 100).toLocaleString()} · {msg.ppv.unlockedCount} unlocked</span>
                            <ReadTick status={msg.status} isDelivered={msg.isDelivered} isRead={msg.isRead ?? false} />
                          </div>
                        )}

                        {msg.type === "ppv" && msg.ppv?.isUnlocked && !isOwn && (
                          <div style={{ padding: "6px 12px 8px", display: "flex", alignItems: "center", gap: "6px" }}>
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path d="M2 7L5.5 10.5L12 3" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span style={{ fontSize: "12px", color: "#10B981", fontWeight: 600 }}>Unlocked</span>
                            <span style={{ fontSize: "12px", color: "#4A4A6A" }}>· ₦{(msg.ppv.price / 100).toLocaleString()} paid</span>
                          </div>
                        )}

                        {isOwn && msg.type !== "ppv" && (
                          <div style={{ padding: "2px 8px 6px", display: "flex", justifyContent: "flex-end" }}>
                            <ReadTick status={msg.status} isDelivered={msg.isDelivered} isRead={msg.isRead ?? false} />
                          </div>
                        )}
                      </div>
                    </div>
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
              getMediaItems(m).map((mi) => ({ ...mi, messageId: m.id }))
            );
            const gridItems = allGroupMedia.map((mi) => ({ url: mi.url, type: mi.type }));
            const groupKey  = groupMsgs.map((m) => m.tempId ?? m.id).join("-");

            const handleGroupClick = (clickedIndex: number) => {
              const allConvoMedia = messages.flatMap((m) => {
                if (!m.mediaUrls?.length) return [];
                if (m.type === "ppv" && !m.ppv?.isUnlocked && m.senderId !== currentUserId) return [];
                return getMediaItems(m).map((mi) => ({ ...mi, messageId: m.id }));
              });
              const clickedUrl   = allGroupMedia[clickedIndex]?.url;
              const clickedMsgId = allGroupMedia[clickedIndex]?.messageId;
              const globalIndex  = allConvoMedia.findIndex((mi) => mi.url === clickedUrl && mi.messageId === clickedMsgId);
              setLightbox({ items: allConvoMedia, initialIndex: Math.max(0, globalIndex) });
            };

            return (
              <div key={groupKey} style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: isSameGroup ? "2px" : "10px" }}>
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