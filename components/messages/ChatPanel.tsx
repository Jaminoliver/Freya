// components/messages/ChatPanel.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, X, MoreVertical, Images, Trash2 } from "lucide-react";
import { Sparkles } from "lucide-react";
import { useMessagesContext } from "@/lib/context/MessagesContext";
import { useTypingIndicator } from "@/lib/hooks/useTypingIndicator";
import { useBlockRestrict } from "@/lib/hooks/useBlockRestrict";
import { updateConversations, clearCachedMessages, subscribeTypingForConversation, blockConversation } from "@/app/(main)/messages/page";
import { useMessageStore } from "@/lib/store/messageStore";
import { useUpload } from "@/lib/context/UploadContext";
import { ChatHeader } from "@/components/messages/ChatHeader";
import { ChatActionModal } from "@/components/messages/ChatActionModal";
import { MessagesList } from "@/components/messages/MessagesList";
import { MessageInput } from "@/components/messages/MessageInput";
import { ReportModal } from "@/components/messages/ReportModal";
import BlockConfirmModal from "@/components/ui/BlockConfirmModal";
import StoryViewer from "@/components/story/StoryViewer";
import { ChatSkeleton } from "@/components/loadscreen/ChatSkeleton";
import CheckoutModal from "@/components/checkout/CheckoutModal";
import type { CreatorStoryGroup } from "@/components/story/StoryBar";
import type { Conversation, Message } from "@/lib/types/messages";
import type { User } from "@/lib/types/profile";
import type { GifItem } from "@/components/gif/GifComponents";

interface Props {
  conversation:           Conversation;
  currentUserId:          string;
  onBack:                 () => void;
  onClearMessages?:       () => void;
  onLoadMore?:            () => void;
  hasMore?:               boolean;
  loadingMore?:           boolean;
  loadingMessages?:       boolean;
  realConversationIdRef:  React.MutableRefObject<number | null>;
  onConversationCreated?: (realId: number) => void;
}

const DOTS_PATTERN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect width='200' height='200' fill='%230D0D18'/%3E%3Cg opacity='0.07' fill='none' stroke='%238B5CF6' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3C!-- heart --%3E%3Cpath d='M20 35 C20 32 16 28 12 31 C8 34 12 40 20 46 C28 40 32 34 28 31 C24 28 20 32 20 35Z' /%3E%3C!-- star --%3E%3Cpolygon points='80,10 83,20 93,20 85,26 88,36 80,30 72,36 75,26 67,20 77,20' /%3E%3C!-- music note --%3E%3Cpath d='M150 20 L150 35 M150 35 C150 38 146 40 144 38 C142 36 144 32 148 33' /%3E%3Cpath d='M157 18 L157 32 M157 32 C157 35 153 37 151 35 C149 33 151 29 155 30' /%3E%3Cline x1='150' y1='20' x2='157' y2='18' /%3E%3C!-- flower --%3E%3Ccircle cx='30' cy='100' r='3' /%3E%3Ccircle cx='30' cy='93' r='4' /%3E%3Ccircle cx='30' cy='107' r='4' /%3E%3Ccircle cx='23' cy='100' r='4' /%3E%3Ccircle cx='37' cy='100' r='4' /%3E%3C!-- diamond --%3E%3Cpolygon points='100,60 110,75 100,90 90,75' /%3E%3C!-- smile --%3E%3Ccircle cx='170' cy='80' r='12' /%3E%3Ccircle cx='166' cy='77' r='1.5' fill='%238B5CF6' /%3E%3Ccircle cx='174' cy='77' r='1.5' fill='%238B5CF6' /%3E%3Cpath d='M165 83 Q170 88 175 83' /%3E%3C!-- lightning --%3E%3Cpolyline points='55,55 50,68 56,68 51,82' /%3E%3C!-- crown --%3E%3Cpolyline points='120,130 120,120 127,126 133,115 139,126 146,120 146,130 120,130' /%3E%3C!-- sparkle --%3E%3Cline x1='180' y1='140' x2='180' y2='155' /%3E%3Cline x1='172' y1='147' x2='188' y2='147' /%3E%3Cline x1='174' y1='142' x2='186' y2='152' /%3E%3Cline x1='174' y1='152' x2='186' y2='142' /%3E%3C!-- butterfly --%3E%3Cpath d='M40 160 C30 150 20 155 25 163 C30 171 40 165 40 160Z' /%3E%3Cpath d='M40 160 C50 150 60 155 55 163 C50 171 40 165 40 160Z' /%3E%3Cpath d='M40 160 C33 167 30 175 38 173 C43 172 40 165 40 160Z' /%3E%3Cpath d='M40 160 C47 167 50 175 42 173 C37 172 40 165 40 160Z' /%3E%3C!-- small hearts scattered --%3E%3Cpath d='M100 170 C100 168 97 166 95 168 C93 170 95 173 100 176 C105 173 107 170 105 168 C103 166 100 168 100 170Z' /%3E%3Cpath d='M160 30 C160 28 157 26 155 28 C153 30 155 33 160 36 C165 33 167 30 165 28 C163 26 160 28 160 30Z' /%3E%3C/g%3E%3C/svg%3E")`;
export function ChatPanel({
  conversation,
  currentUserId,
  onBack,
  onClearMessages,
  onLoadMore,
  hasMore,
  loadingMore,
  loadingMessages = false,
  realConversationIdRef,
  onConversationCreated,
}: Props) {
  const { participant } = conversation;
  const router          = useRouter();
  const searchParams    = useSearchParams();
  const fromArchived    = searchParams.get("from") === "archived";
  const handleBack      = () => router.push(fromArchived ? "/messages/archived" : "/messages");

  const { messages, setMessages, appendMessage, patchMessage } = useMessageStore();

  const [desktopModalOpen,  setDesktopModalOpen]  = useState(false);
  const [desktopModalPos,   setDesktopModalPos]   = useState({ x: 0, y: 0 });
  const [reportOpen,        setReportOpen]        = useState(false);
  const [avatarOpen,        setAvatarOpen]        = useState(false);
  const [blockConfirm,      setBlockConfirm]      = useState(false);
  const [unblockConfirm,    setUnblockConfirm]    = useState(false);
  const [restrictConfirm,   setRestrictConfirm]   = useState(false);
  const [unrestrictConfirm, setUnrestrictConfirm] = useState(false);
  const [sending,           setSending]           = useState(false);
  const [replyTo,           setReplyTo]           = useState<Message | null>(null);

  // ── Tip + PPV unlock modals ─────────────────────────────────────────────
  const [tipModalOpen,     setTipModalOpen]     = useState(false);
  const [ppvUnlockTarget,  setPpvUnlockTarget]  = useState<Message | null>(null);

  const [storyViewerGroups,     setStoryViewerGroups]     = useState<CreatorStoryGroup[]>([]);
  const [storyViewerStartIndex, setStoryViewerStartIndex] = useState(0);
  const [storyViewerStoryId,    setStoryViewerStoryId]    = useState<number | undefined>(undefined);
  const [storyViewerOpen,       setStoryViewerOpen]       = useState(false);

  const [selectMode,  setSelectMode]  = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const {
    isBlocked, isRestricted,
    block, unblock, restrict, unrestrict,
    fetchStatus,
  } = useBlockRestrict({ userId: participant.id });

  const { startMessageUpload, uploads } = useUpload();
  const desktopMenuBtnRef = useRef<HTMLButtonElement>(null);

  // Build User-shaped object for CheckoutModal from conversation participant
  const participantAsUser: User = {
    id:           participant.id,
    username:     participant.username,
    display_name: participant.name,
    avatar_url:   participant.avatarUrl,
  } as User;

  const handleOpenDesktopModal = () => {
    fetchStatus();
    if (desktopMenuBtnRef.current) {
      const rect = desktopMenuBtnRef.current.getBoundingClientRect();
      setDesktopModalPos({ x: rect.right, y: rect.bottom + 6 });
    }
    setDesktopModalOpen(true);
  };

  const handleEnterSelectMode = useCallback(() => { setSelectMode(true); setSelectedIds(new Set()); }, []);
  const handleExitSelectMode  = () => { setSelectMode(false); setSelectedIds(new Set()); };

  const handleToggleSelect = useCallback((messageId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId); else next.add(messageId);
      return next;
    });
  }, []);

  const handleSelectMessage = useCallback((messageId: number) => {
    setSelectMode(true);
    setSelectedIds(new Set([messageId]));
  }, []);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const convId = conversation.id;
    if (convId === 0) return;
    const idsToDelete = Array.from(selectedIds);
    setMessages((prev) => prev.filter((m) => !selectedIds.has(m.id)));
    setSelectMode(false);
    setSelectedIds(new Set());
    try {
      await Promise.all(idsToDelete.map((msgId) =>
        fetch(`/api/conversations/${convId}/messages/${msgId}`, {
          method: "DELETE", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deleteFor: "me" }),
        })
      ));
    } catch {}
  }, [selectedIds, conversation.id, setMessages]);

  const handleStoryReplyClick = useCallback(async (storyId: number) => {
    try {
      const res  = await fetch("/api/stories");
      const data = await res.json();
      const allGroups: CreatorStoryGroup[] = data.groups ?? [];
      const groupIdx = allGroups.findIndex((g) => g.items.some((s) => s.id === storyId));
      if (groupIdx === -1) return;
      setStoryViewerGroups(allGroups);
      setStoryViewerStartIndex(groupIdx);
      setStoryViewerStoryId(storyId);
      setStoryViewerOpen(true);
    } catch {}
  }, []);

  useEffect(() => {
    const inProgress = uploads.filter(
      (u) => u._isMessage && u._conversationId === conversation.id &&
        (u.phase === "uploading" || u.phase === "processing")
    );
    if (inProgress.length === 0) return;
    setMessages((prev) => {
      let updated = [...prev];
      for (const u of inProgress) {
        if (updated.some((m) => m.tempId === u._tempId)) continue;
        updated.push({
          id: Date.now() + Math.random(), conversationId: conversation.id,
          senderId: currentUserId, type: u._isPPV ? "ppv" : "media",
          text: u._content || undefined, mediaUrls: [],
          createdAt: new Date().toISOString(), isRead: false,
          status: "sending", uploadProgress: u.progress, tempId: u._tempId,
          ...(u._isPPV && u._ppvPrice ? { ppv: { price: u._ppvPrice, isUnlocked: true, unlockedCount: 0 } } : {}),
        } as Message);
      }
      return updated;
    });
  }, [uploads, conversation.id, currentUserId]);

  const { setTypingConversationId } = useMessagesContext();
  const { sendTyping, isTyping }    = useTypingIndicator({ conversationId: conversation.id, currentUserId, realConversationIdRef });

  useEffect(() => {
    if (isTyping) setTypingConversationId(conversation.id);
    else setTypingConversationId(null);
  }, [isTyping, conversation.id, setTypingConversationId]);

  useEffect(() => {
    if (!avatarOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setAvatarOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [avatarOpen]);

  useEffect(() => {
    if (conversation.id === 0) return;
    updateConversations((prev) => prev.map((c) => c.id === conversation.id ? { ...c, unreadCount: 0 } : c));
    fetch(`/api/conversations/${conversation.id}/read`, { method: "PATCH" }).catch(() => {});
  }, [conversation.id]);

  useEffect(() => { setSelectMode(false); setSelectedIds(new Set()); }, [conversation.id]);

  const handleTyping = useCallback(() => sendTyping(), [sendTyping]);

  const handleClearChat = useCallback(async () => {
    updateConversations((prev) => prev.map((c) => c.id === conversation.id ? { ...c, lastMessage: "" } : c));
    clearCachedMessages(conversation.id);
    setMessages([]);
    onClearMessages?.();
    try { await fetch(`/api/conversations/${conversation.id}/clear`, { method: "PATCH" }); } catch (err) { console.error("[ChatPanel] clear chat error:", err); }
  }, [conversation.id, onClearMessages, setMessages]);

  const handleDeleteChat = useCallback(async () => {
    blockConversation(conversation.id);
    updateConversations((prev) => prev.filter((c) => c.id !== conversation.id));
    clearCachedMessages(conversation.id);
    setMessages([]);
    onClearMessages?.();
    onBack();
    try {
      await Promise.all([
        fetch(`/api/conversations/${conversation.id}`, { method: "DELETE" }),
        fetch(`/api/favourites/chatlists/by-conversation/${conversation.id}`, { method: "DELETE" }),
      ]);
      window.dispatchEvent(new Event("favourites-updated"));
    } catch (err) { console.error("[ChatPanel] delete chat error:", err); }
  }, [conversation.id, onBack, onClearMessages, setMessages]);

  const handleDelete = useCallback(async (message: Message, deleteFor: "me" | "everyone") => {
    const convId = conversation.id;
    if (convId === 0) return;
    if (deleteFor === "me") {
      setMessages((prev) => prev.filter((m) => m.id !== message.id));
    } else {
      setMessages((prev) => prev.map((m) => m.id === message.id ? { ...m, text: "This message was deleted", type: "text" as const, mediaUrls: [], isDeleted: true } : m));
    }
    try {
      const res = await fetch(`/api/conversations/${convId}/messages/${message.id}`, {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteFor }),
      });
      if (!res.ok) {
        setMessages((prev) => {
          if (deleteFor === "me") return [...prev, message].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          return prev.map((m) => m.id === message.id ? message : m);
        });
      }
    } catch {
      setMessages((prev) => {
        if (deleteFor === "me") return [...prev, message].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        return prev.map((m) => m.id === message.id ? message : m);
      });
    }
  }, [conversation.id, setMessages]);

  const handleSend = useCallback(async (text: string, mediaFiles?: File[], ppvPrice?: number) => {
    if (sending) return;

    if (mediaFiles && mediaFiles.length > 0) {
      const tempId    = `temp_${Date.now()}_${Math.random()}`;
      const blobItems = mediaFiles.map((file) => ({ url: URL.createObjectURL(file), type: file.type.startsWith("video/") ? "video" as const : "image" as const }));
      const optimistic: Message = {
        id: Date.now(), conversationId: conversation.id, senderId: currentUserId,
        type: ppvPrice ? "ppv" : "media", text: text.trim() || undefined,
        mediaUrls: blobItems.map((b) => b.type === "video" ? `${b.url}#video` : b.url),
        createdAt: new Date().toISOString(), isRead: false, status: "sending", uploadProgress: 0, tempId,
        ...(ppvPrice ? { ppv: { price: ppvPrice * 100, isUnlocked: true, unlockedCount: 0 } } : {}),
      };
      appendMessage(optimistic);
      startMessageUpload({
        files: mediaFiles, conversationId: conversation.id, content: text.trim() || undefined,
        isPPV: !!ppvPrice, ppvPrice: ppvPrice ? ppvPrice * 100 : undefined, tempId,
        onProgress: (progress) => { setMessages((prev) => prev.map((m) => m.tempId === tempId ? { ...m, uploadProgress: progress } : m)); },
        onSent: (serverMessage) => {
          blobItems.forEach((b) => URL.revokeObjectURL(b.url));
          setMessages((prev) => prev.map((m) => m.tempId === tempId ? { ...serverMessage, status: "sent" as const } : m));
          updateConversations((prev) => prev.map((c) => c.id === conversation.id ? { ...c, lastMessage: text || "📷 Media", lastMessageAt: new Date().toISOString() } : c));
        },
        onError: () => { setMessages((prev) => prev.map((m) => m.tempId === tempId ? { ...m, status: "failed" as const } : m)); },
      });

    } else if (text.trim()) {
      const tempId         = `temp_text_${Date.now()}_${Math.random()}`;
      const savedReplyToId = replyTo?.id ?? null;
      setReplyTo(null);

      const optimistic: Message = {
        id: Date.now(), conversationId: conversation.id, senderId: currentUserId,
        type: "text", text: text.trim(), createdAt: new Date().toISOString(),
        isRead: false, status: "sending", tempId, replyToId: savedReplyToId,
      };
      appendMessage(optimistic);

      try {
        let convId = realConversationIdRef.current ?? conversation.id;
        if (convId === 0) {
          const createRes  = await fetch("/api/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetUserId: conversation.participant.id }) });
          const createData = await createRes.json();
          convId                        = createData.conversationId;
          realConversationIdRef.current = convId;
          useMessageStore.getState().setConversationId(convId);
          subscribeTypingForConversation(convId);
          onConversationCreated?.(convId);
          updateConversations((prev) => {
            if (prev.some((c) => c.id === convId)) return prev;
            return [{ ...conversation, id: convId, lastMessage: text.trim(), lastMessageAt: new Date().toISOString(), unreadCount: 0 }, ...prev];
          });
        }
        const res  = await fetch(`/api/conversations/${convId}/messages`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text.trim(), reply_to_id: savedReplyToId }),
        });
        const data = await res.json();
        if (data.message) {
          setMessages((prev) => prev.map((m) => m.tempId === tempId ? { ...data.message, status: "sent" as const, tempId } : m));
          updateConversations((prev) => prev.map((c) => c.id === convId ? { ...c, lastMessage: text.trim(), lastMessageAt: new Date().toISOString() } : c));
        } else {
          setMessages((prev) => prev.map((m) => m.tempId === tempId ? { ...m, status: "failed" as const } : m));
        }
      } catch {
        setMessages((prev) => prev.map((m) => m.tempId === tempId ? { ...m, status: "failed" as const } : m));
      } finally {
        setSending(false);
      }
    }
  }, [sending, conversation, currentUserId, replyTo, startMessageUpload, appendMessage, setMessages, realConversationIdRef]);

  // ── Tip success: append tip message to chat ─────────────────────────────
  const handleTipSuccess = useCallback((data: any) => {
    if (!data?.message) return;
    appendMessage(data.message as Message);
    updateConversations((prev) => prev.map((c) =>
      c.id === conversation.id
        ? { ...c, lastMessage: `💰 Tipped ₦${(data.message.tip?.amount / 100).toLocaleString("en-NG")}`, lastMessageAt: data.message.createdAt }
        : c
    ));
  }, [appendMessage, conversation.id]);

  // ── Send GIF ─────────────────────────────────────────────────────────────
  const handleSendGif = useCallback(async (gif: GifItem) => {
    const tempId = `temp_gif_${Date.now()}_${Math.random()}`;
    const createdAt = new Date().toISOString();

    const optimistic: Message = {
      id:             Date.now(),
      conversationId: conversation.id,
      senderId:       currentUserId,
      type:           "gif",
      gifUrl:         gif.url,
      createdAt,
      isRead:         false,
      status:         "sending",
      tempId,
    };
    appendMessage(optimistic);

    try {
      let convId = realConversationIdRef.current ?? conversation.id;
      if (convId === 0) {
        const createRes  = await fetch("/api/conversations", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ targetUserId: conversation.participant.id }),
        });
        const createData = await createRes.json();
        convId = createData.conversationId;
        realConversationIdRef.current = convId;
        useMessageStore.getState().setConversationId(convId);
        subscribeTypingForConversation(convId);
        onConversationCreated?.(convId);
        updateConversations((prev) => {
          if (prev.some((c) => c.id === convId)) return prev;
          return [{ ...conversation, id: convId, lastMessage: "🎞️ GIF", lastMessageAt: createdAt, unreadCount: 0 }, ...prev];
        });
      }

      const res  = await fetch(`/api/conversations/${convId}/messages`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ gif_url: gif.url }),
      });
      const data = await res.json();

      if (data.message) {
        setMessages((prev) => prev.map((m) => m.tempId === tempId ? { ...data.message, status: "sent" as const, tempId } : m));
        updateConversations((prev) => prev.map((c) =>
          c.id === convId ? { ...c, lastMessage: "🎞️ GIF", lastMessageAt: createdAt } : c
        ));
      } else {
        setMessages((prev) => prev.map((m) => m.tempId === tempId ? { ...m, status: "failed" as const } : m));
      }
    } catch {
      setMessages((prev) => prev.map((m) => m.tempId === tempId ? { ...m, status: "failed" as const } : m));
    }
  }, [conversation, currentUserId, appendMessage, setMessages, realConversationIdRef, onConversationCreated]);

  // ── PPV unlock success: patch message to unlocked with media ────────────
  const handlePPVUnlockSuccess = useCallback((data: any) => {
    if (!ppvUnlockTarget) return;
    patchMessage(ppvUnlockTarget.id, {
      mediaUrls: data.mediaUrls ?? [],
      ppv: ppvUnlockTarget.ppv
        ? { ...ppvUnlockTarget.ppv, isUnlocked: true }
        : undefined,
    } as any);
  }, [ppvUnlockTarget, patchMessage]);

  const handleMessagesUpdate  = useCallback((updater: (msgs: Message[]) => Message[]) => { setMessages((prev) => updater(prev)); }, [setMessages]);
  const handleBlockConfirm    = useCallback(async () => { await block();    handleBack(); }, [block]);
  const handleRestrictConfirm = useCallback(async () => { await restrict(); handleBack(); }, [restrict]);

  const showStatus   = isTyping || participant.isOnline;
  const showSkeleton = loadingMessages && messages.length === 0;

  return (
    <>
      <style>{`
        .chat-desktop-header { display: flex; }
        @media (max-width: 767px) { .chat-desktop-header { display: none !important; } }
        .chat-panel-root {
          display: flex; flex-direction: column; height: 100%; max-height: 100%;
          background-color: #0A0A0F; font-family: 'Inter', sans-serif;
          position: relative; overflow: hidden;
        }
        @media (max-width: 767px) {
          .chat-panel-root {
            position: fixed !important; top: 0 !important; left: 0 !important;
            right: 0 !important; height: 100dvh !important; max-height: 100dvh !important;
            z-index: 100; padding-top: env(safe-area-inset-top, 0px);
            padding-bottom: env(safe-area-inset-bottom, 0px); box-sizing: border-box;
          }
        }
        .chat-messages-wall {
          flex: 1; min-height: 0; display: flex; flex-direction: column;
          overflow: hidden; background-color: #0D0D18;
background-image: ${DOTS_PATTERN}; background-size: 200px 200px;
        }
        .desktop-header-name { transition: transform 0.2s ease; }
        .desktop-header-name--up { transform: translateY(-2px); }
        @keyframes typing-bounce { 0%, 80%, 100% { transform: translateY(0); opacity: 0.4; } 40% { transform: translateY(-4px); opacity: 1; } }
        .typing-dot { width: 4px; height: 4px; border-radius: 50%; background-color: #8B5CF6; display: inline-block; animation: typing-bounce 1.2s infinite ease-in-out; }
        .typing-dot:nth-child(2) { animation-delay: 0.15s; }
        .typing-dot:nth-child(3) { animation-delay: 0.3s; }
        @keyframes avatarFadeIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
        .avatar-lightbox-inner { animation: avatarFadeIn 0.2s ease forwards; }
        .desktop-icon-btn { background: none; border: none; cursor: pointer; display: flex; align-items: center; padding: 8px; border-radius: 8px; transition: all 0.15s ease; color: #A3A3C2; }
        .desktop-icon-btn:hover { color: #FFFFFF; background-color: #1C1C2E; }
        @keyframes selectBarSlideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .select-bar { animation: selectBarSlideUp 0.25s ease-out forwards; }
        .select-bar-btn { background: none; border: none; cursor: pointer; display: flex; align-items: center; padding: 10px; border-radius: 8px; transition: all 0.15s ease; color: #A3A3C2; }
        .select-bar-btn:hover { color: #FFFFFF; background-color: rgba(255,255,255,0.06); }
        .select-bar-btn--danger { color: #EF4444; }
        .select-bar-btn--danger:hover { color: #EF4444; background-color: rgba(239,68,68,0.1); }
      `}</style>

      {storyViewerOpen && storyViewerGroups.length > 0 && (
        <StoryViewer
          groups={storyViewerGroups}
          startGroupIndex={storyViewerStartIndex}
          startStoryId={storyViewerStoryId}
          onClose={() => setStoryViewerOpen(false)}
        />
      )}

      {/* Chat tip modal */}
      <CheckoutModal
        isOpen={tipModalOpen}
        onClose={() => setTipModalOpen(false)}
        type="tips"
        creator={participantAsUser}
        conversationId={conversation.id}
        onChatPaymentSuccess={handleTipSuccess}
      />

      {/* Chat PPV unlock modal */}
      <CheckoutModal
        isOpen={!!ppvUnlockTarget}
        onClose={() => setPpvUnlockTarget(null)}
        type="ppv"
        creator={participantAsUser}
        postPrice={ppvUnlockTarget?.ppv ? ppvUnlockTarget.ppv.price / 100 : 0}
        postTitle="PPV message"
        conversationId={conversation.id}
        messageId={ppvUnlockTarget?.id}
        onChatPaymentSuccess={handlePPVUnlockSuccess}
        autoCloseOnSuccess
      />

      {avatarOpen && (
        <div onClick={() => setAvatarOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 999, backgroundColor: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="avatar-lightbox-inner" onClick={(e) => e.stopPropagation()} style={{ position: "relative" }}>
            {participant.avatarUrl
              ? <img src={participant.avatarUrl} alt={participant.name} style={{ width: "280px", height: "280px", borderRadius: "50%", objectFit: "cover", border: "3px solid #2A2A3D" }} />
              : <div style={{ width: "280px", height: "280px", borderRadius: "50%", backgroundColor: "#8B5CF6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "80px", fontWeight: 700, color: "#FFFFFF" }}>{participant.name[0].toUpperCase()}</div>
            }
            <button onClick={() => setAvatarOpen(false)} style={{ position: "absolute", top: "-12px", right: "-12px", width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <X size={16} color="#A3A3C2" strokeWidth={1.8} />
            </button>
          </div>
        </div>
      )}

      {desktopModalOpen && (
        <ChatActionModal
          conversationId={conversation.id}
          participant={participant}
          isBlocked={isBlocked}
          isRestricted={isRestricted}
          isMuted={conversation.isMuted}
          onClose={() => setDesktopModalOpen(false)}
          onClearChat={handleClearChat}
          onDeleteChat={handleDeleteChat}
          onBlock={() => setBlockConfirm(true)}
          onUnblock={() => setUnblockConfirm(true)}
          onRestrict={() => setRestrictConfirm(true)}
          onUnrestrict={() => setUnrestrictConfirm(true)}
          onReport={() => setReportOpen(true)}
          x={desktopModalPos.x}
          y={desktopModalPos.y}
        />
      )}

      {reportOpen && <ReportModal context="message" username={participant.username} reportedUserId={participant.id} onClose={() => setReportOpen(false)} />}
      <BlockConfirmModal isOpen={blockConfirm}      onClose={() => setBlockConfirm(false)}      onConfirm={handleBlockConfirm}    type="block"    username={participant.username} />
      <BlockConfirmModal isOpen={unblockConfirm}    onClose={() => setUnblockConfirm(false)}    onConfirm={unblock}               type="block"    username={participant.username} />
      <BlockConfirmModal isOpen={restrictConfirm}   onClose={() => setRestrictConfirm(false)}   onConfirm={handleRestrictConfirm} type="restrict" username={participant.username} />
      <BlockConfirmModal isOpen={unrestrictConfirm} onClose={() => setUnrestrictConfirm(false)} onConfirm={unrestrict}            type="restrict" username={participant.username} />

      <div className="chat-panel-root">
        {/* ── Headers always visible ── */}
        <ChatHeader
          conversation={conversation}
          onBack={onBack}
          isTyping={isTyping}
          onSelectMode={handleEnterSelectMode}
          onMessagesCleared={() => { clearCachedMessages(conversation.id); onClearMessages?.(); setMessages([]); }}
        />

        <div
          className="chat-desktop-header"
          style={{ alignItems: "center", justifyContent: "space-between", padding: "0 16px", height: "56px", flexShrink: 0, backgroundColor: "#0D0D1A", borderBottom: "1px solid #1E1E2E", fontFamily: "'Inter', sans-serif", touchAction: "none", userSelect: "none" }}
          onTouchStart={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: 1, overflow: "hidden" }}>
            <button onClick={handleBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", display: "flex", alignItems: "center", padding: "4px", borderRadius: "6px", transition: "color 0.15s ease", flexShrink: 0 }} onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")} onMouseLeave={(e) => (e.currentTarget.style.color = "#A3A3C2")}>
              <ArrowLeft size={20} strokeWidth={1.8} />
            </button>
            <div style={{ position: "relative", flexShrink: 0, cursor: "pointer" }} onClick={() => setAvatarOpen(true)}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", overflow: "hidden", backgroundColor: "#2A2A3D" }}>
                {participant.avatarUrl
                  ? <img src={participant.avatarUrl} alt={participant.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <div style={{ width: "100%", height: "100%", backgroundColor: "#8B5CF6", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFFFF", fontSize: "16px", fontWeight: 700 }}>{participant.name[0].toUpperCase()}</div>
                }
              </div>
              {participant.isOnline && <div style={{ position: "absolute", bottom: "1px", right: "1px", width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#10B981", border: "2px solid #0D0D1A" }} />}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1px", minWidth: 0, overflow: "hidden" }}>
              <div className={`desktop-header-name${showStatus ? " desktop-header-name--up" : ""}`} style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", minWidth: 0 }} onClick={() => router.push(`/${participant.username}`)}>
                <span style={{ fontSize: "16px", fontWeight: 700, color: "#FFFFFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{participant.name}</span>
                {participant.isVerified && <Sparkles size={14} color="#8B5CF6" strokeWidth={1.8} style={{ flexShrink: 0 }} />}
              </div>
              {isTyping ? (
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <div style={{ display: "flex", gap: "3px", alignItems: "center" }}><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div>
                  <span style={{ fontSize: "12px", color: "#8B5CF6", whiteSpace: "nowrap" }}>typing...</span>
                </div>
              ) : participant.isOnline ? (
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <div style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#10B981", flexShrink: 0 }} />
                  <span style={{ fontSize: "12px", color: "#10B981", whiteSpace: "nowrap" }}>Available now</span>
                </div>
              ) : null}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "2px", flexShrink: 0 }}>
            <button className="desktop-icon-btn" onClick={() => router.push(`/messages/${conversation.id}/gallery`)}><Images size={20} strokeWidth={1.8} /></button>
            <button ref={desktopMenuBtnRef} className="desktop-icon-btn" onClick={handleOpenDesktopModal} style={{ color: desktopModalOpen ? "#8B5CF6" : undefined, backgroundColor: desktopModalOpen ? "rgba(139,92,246,0.1)" : undefined }}>
              <MoreVertical size={20} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {/* ── Skeleton replaces only the messages wall + input ── */}
        {showSkeleton ? (
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <ChatSkeleton />
          </div>
        ) : (
          <>
            <div className="chat-messages-wall">
              <MessagesList
                messages={messages}
                conversation={conversation}
                currentUserId={currentUserId}
                isTyping={isTyping}
                onReply={(msg) => setReplyTo(msg)}
                onDelete={handleDelete}
                onLoadMore={onLoadMore}
                hasMore={hasMore}
                loadingMore={loadingMore}
                loadingMessages={loadingMessages}
                onMessagesUpdate={handleMessagesUpdate}
                selectMode={selectMode}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onSelectMessage={handleSelectMessage}
                onStoryReplyClick={handleStoryReplyClick}
                onRequestPPVUnlock={(msg) => setPpvUnlockTarget(msg)}
              />
            </div>

            {selectMode ? (
              <div className="select-bar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", backgroundColor: "#0D0D1A", borderTop: "1px solid #1E1E2E", flexShrink: 0, fontFamily: "'Inter', sans-serif", minHeight: "56px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <button className="select-bar-btn" onClick={handleExitSelectMode}><X size={20} strokeWidth={1.8} /></button>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "#FFFFFF" }}>{selectedIds.size} selected</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <button className="select-bar-btn select-bar-btn--danger" onClick={handleDeleteSelected} disabled={selectedIds.size === 0} style={{ opacity: selectedIds.size === 0 ? 0.35 : 1 }}>
                    <Trash2 size={20} strokeWidth={1.8} />
                  </button>
                </div>
              </div>
            ) : (
              <MessageInput
                onSend={handleSend}
                onTyping={handleTyping}
                onTipClick={() => setTipModalOpen(true)}
                onSendGif={handleSendGif}
                viewerUserId={currentUserId}
                disabled={false}
                replyTo={replyTo}
                onCancelReply={() => setReplyTo(null)}
              />
            )}
          </>
        )}
      </div>
    </>
  );
}