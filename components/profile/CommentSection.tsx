"use client";

import * as React from "react";
import { CommentSkeleton } from "@/components/loadscreen/CommentSkeleton";
import { CommentRow } from "@/components/profile/CommentRow";
import { Avatar } from "@/components/profile/CommentAvatar";
import { createPortal } from "react-dom";
import { Send, X } from "lucide-react";
import { GifItem, GifPicker } from "@/components/gif/GifComponents";

const QUICK_EMOJIS = ["😊", "😄", "🤣", "😜", "😆", "😝", "😂", "😁", "🥰", "🤩", "💋"];

export interface ApiComment {
  id: string | number;
  content: string;
  gif_url?: string | null;
  created_at: string;
  like_count: number;
  user_id: string;
  viewer_has_liked?: boolean;
  reply_count?: number;
  reply_to_username?: string | null;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface CommentSectionProps {
  postId: string;
  comments: ApiComment[];
  viewer?: { username: string; display_name: string; avatar_url?: string } | null;
  viewerUserId?: string;
  onAddComment?: (postId: string, text: string, gif_url?: string, parent_comment_id?: string | number, reply_to_username?: string | null) => Promise<void>;
  isOpen?: boolean;
  onClose?: () => void;
  isLoading?: boolean;
}


export default function CommentSection({ postId, comments: propComments, viewer, viewerUserId, onAddComment, isOpen = false, onClose, isLoading = false }: CommentSectionProps) {
  const [text,          setText]          = React.useState("");
  const [selectedGif,   setSelectedGif]   = React.useState<GifItem | null>(null);
  const [gifPickerOpen, setGifPickerOpen] = React.useState(false);
  const [localComments, setLocalComments] = React.useState<ApiComment[]>(propComments);
  const [visible,       setVisible]       = React.useState(false);
  const [animateIn,     setAnimateIn]     = React.useState(false);
  const [mounted,       setMounted]       = React.useState(false);

  // Reply state
  const [replyingTo, setReplyingTo] = React.useState<ApiComment | null>(null);

  const inputRef     = React.useRef<HTMLInputElement>(null);
  const sheetRef     = React.useRef<HTMLDivElement>(null);
  const inputAreaRef = React.useRef<HTMLDivElement>(null);
  const commentsRef  = React.useRef<HTMLDivElement>(null);
  const dragStartY   = React.useRef(0);
  const dragDeltaY   = React.useRef(0);
  const isDragging   = React.useRef(false);

  React.useEffect(() => { setMounted(true); }, []);
  React.useEffect(() => { setLocalComments(propComments); }, [propComments]);

  React.useEffect(() => {
    if (isOpen) {
      setVisible(true);
      document.body.style.overflow = "hidden";
      const t = setTimeout(() => {
        setAnimateIn(true);
        setTimeout(() => inputRef.current?.focus(), 350);
      }, 16);
      return () => clearTimeout(t);
    } else {
      setAnimateIn(false);
      document.body.style.overflow = "";
      const t = setTimeout(() => setVisible(false), 320);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  React.useEffect(() => { return () => { document.body.style.overflow = ""; }; }, []);

  React.useEffect(() => {
    if (!gifPickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (inputAreaRef.current && !inputAreaRef.current.contains(e.target as Node)) setGifPickerOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [gifPickerOpen]);

  const handleClose = React.useCallback(() => {
    setAnimateIn(false);
    document.body.style.overflow = "";
    setTimeout(() => { setVisible(false); onClose?.(); }, 320);
  }, [onClose]);

  const onTouchStart = (e: React.TouchEvent) => { dragStartY.current = e.touches[0].clientY; dragDeltaY.current = 0; isDragging.current = true; };
  const onTouchMove  = (e: React.TouchEvent) => {
    if (!isDragging.current || !sheetRef.current) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    dragDeltaY.current = delta;
    if (delta > 0) sheetRef.current.style.transform = `translateY(${delta}px)`;
  };
  const onTouchEnd = () => {
    isDragging.current = false;
    if (dragDeltaY.current > 120) handleClose();
    else if (sheetRef.current) sheetRef.current.style.transform = "translateY(0)";
    dragDeltaY.current = 0;
  };

  const handleDeleted   = (id: string | number) => setLocalComments((prev) => prev.filter((c) => c.id !== id));
  const handleGifSelect = (gif: GifItem) => { setSelectedGif(gif); setGifPickerOpen(false); setText(""); };

  const handleReply = (comment: ApiComment) => {
    setReplyingTo(comment);
    setText("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };


  const cancelReply = () => {
    setReplyingTo(null);
    setText("");
    setSelectedGif(null);
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed && !selectedGif) return;
    if (!viewer) return;

    const isReply = replyingTo !== null;
    const parentId = replyingTo?.id;

    if (isReply && parentId !== undefined) {
      // Optimistic reply — inject into the parent comment's reply list
      const optimisticReply: ApiComment = {
        id:               `local-reply-${Date.now()}`,
        content:          trimmed,
        gif_url:          selectedGif?.url ?? null,
        created_at:       new Date().toISOString(),
        like_count:       0,
        user_id:          viewerUserId || "",
        viewer_has_liked: false,
        reply_to_username: replyingTo.reply_to_username ?? null,
        profiles:         { username: viewer.username, display_name: viewer.display_name, avatar_url: viewer.avatar_url || null },
      };

      // Call _addReply on the parent comment object (optimistic)
      const parentComment = localComments.find((c) => c.id === parentId);
      if (parentComment && typeof (parentComment as any)._addReply === "function") {
        (parentComment as any)._addReply(optimisticReply);
      }

      const gifUrl = selectedGif?.url;
      const replyToUsername = replyingTo.reply_to_username ?? null;
      setText("");
      setSelectedGif(null);
      setReplyingTo(null);
      // Post to API with reply_to_username
      await onAddComment?.(postId, trimmed, gifUrl, parentId, replyToUsername);
      // Refetch replies to replace optimistic ID with real DB ID — enables liking immediately
      if (parentComment && typeof (parentComment as any)._refetchReplies === "function") {
        (parentComment as any)._refetchReplies();
      }

    } else {
      // Normal top-level comment
      const optimistic: ApiComment = {
        id:               `local-${Date.now()}`,
        content:          trimmed,
        gif_url:          selectedGif?.url ?? null,
        created_at:       new Date().toISOString(),
        like_count:       0,
        user_id:          viewerUserId || "",
        viewer_has_liked: false,
        profiles:         { username: viewer.username, display_name: viewer.display_name, avatar_url: viewer.avatar_url || null },
      };

      setLocalComments((prev) => [optimistic, ...prev]);
      commentsRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      const gifUrl = selectedGif?.url;
      setText("");
      setSelectedGif(null);
      await onAddComment?.(postId, trimmed, gifUrl);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } };
  const canSend   = text.trim().length > 0 || selectedGif !== null;

  if (!mounted || !visible) return null;

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={handleClose} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)", opacity: animateIn ? 1 : 0, transition: "opacity 0.32s cubic-bezier(0.32, 0.72, 0, 1)" }} />

      <div ref={sheetRef} style={{ position: "relative", backgroundColor: "#0F0F1A", borderRadius: "20px 20px 0 0", maxHeight: "80vh", display: "flex", flexDirection: "column", transform: animateIn ? "translateY(0)" : "translateY(100%)", transition: "transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)", boxShadow: "0 -4px 40px rgba(0,0,0,0.6)" }}>

        <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} style={{ padding: "12px 16px 0", userSelect: "none", touchAction: "none" }}>
          <div style={{ width: "36px", height: "4px", borderRadius: "2px", backgroundColor: "#2A2A3D", margin: "0 auto 14px" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ fontSize: "15px", fontWeight: 700, color: "#F1F5F9", fontFamily: "'Inter', sans-serif" }}>Comments {localComments.length > 0 ? `· ${localComments.length}` : ""}</span>
            <button onClick={handleClose} style={{ width: "30px", height: "30px", borderRadius: "50%", border: "none", backgroundColor: "#1C1C2E", color: "#6B6B8A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={15} /></button>
          </div>
        </div>

        <div ref={commentsRef} style={{ flex: 1, overflowY: "auto", padding: "0 16px", scrollbarWidth: "none" }}>
          <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
          {isLoading
            ? [0,1,2].map((i) => <CommentSkeleton key={i} />)
            : localComments.length === 0
              ? <p style={{ fontSize: "13px", color: "#4A4A6A", textAlign: "center", padding: "32px 0", fontFamily: "'Inter', sans-serif" }}>No comments yet. Be the first!</p>
              : null
          }
          {!isLoading && localComments.map((c) => (
            <CommentRow
              key={c.id}
              comment={c}
              postId={postId}
              viewerUserId={viewerUserId}
              onDeleted={handleDeleted}
              onReply={handleReply}
            />
          ))}
        </div>

        <div ref={inputAreaRef} style={{ padding: "12px 16px 20px", borderTop: "1px solid #13131F", backgroundColor: "#0F0F1A", position: "relative" }}>
          {gifPickerOpen && (
            <GifPicker onSelect={handleGifSelect} onClose={() => setGifPickerOpen(false)} viewerUserId={viewerUserId} />
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", overflowX: "auto", scrollbarWidth: "none" }}>
            <button
              onClick={() => setGifPickerOpen((o) => !o)}
              style={{ padding: "5px 10px", borderRadius: "8px", border: `1px solid ${gifPickerOpen ? "#8B5CF6" : "#2A2A3D"}`, backgroundColor: gifPickerOpen ? "#2D1F4E" : "#1C1C2E", color: gifPickerOpen ? "#8B5CF6" : "#8A8AA0", fontSize: "12px", fontWeight: 700, cursor: "pointer", flexShrink: 0, fontFamily: "'Inter', sans-serif", transition: "all 0.15s" }}
            >GIF</button>
            {QUICK_EMOJIS.map((emoji) => (
              <button key={emoji} onClick={() => { setText((p) => p + emoji); }}
                style={{ fontSize: "22px", background: "none", border: "none", cursor: "pointer", flexShrink: 0, lineHeight: 1, padding: "2px", borderRadius: "6px", transition: "transform 0.1s" }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.25)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >{emoji}</button>
            ))}
          </div>

          {selectedGif && (
            <div style={{ position: "relative", display: "inline-block", marginBottom: "8px" }}>
              <img src={selectedGif.preview_url || selectedGif.url} alt="Selected GIF" style={{ height: "80px", borderRadius: "8px", display: "block" }} />
              <button onClick={() => setSelectedGif(null)} style={{ position: "absolute", top: "4px", right: "4px", width: "20px", height: "20px", borderRadius: "50%", border: "none", backgroundColor: "rgba(0,0,0,0.7)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                <X size={11} />
              </button>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Avatar src={viewer?.avatar_url} name={viewer?.display_name || "You"} size={34} />
            <div style={{ flex: 1, display: "flex", alignItems: "center", backgroundColor: "#13131F", border: "1px solid #2A2A3D", borderRadius: "24px", padding: "10px 14px", gap: "8px" }}>
              <input
                ref={inputRef} type="text" value={text}
                onChange={(e) => { setText(e.target.value); }}
                onKeyDown={handleKey}
                placeholder={replyingTo ? `Replying to @${replyingTo.profiles?.username || replyingTo.reply_to_username || "user"}…` : selectedGif ? "Add a caption… (optional)" : "Add a comment…"}
                style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: "13px", color: "#E2E8F0", fontFamily: "'Inter', sans-serif", caretColor: "#8B5CF6" }}
              />
              <button onClick={handleSend} disabled={!canSend}
                style={{ background: "none", border: "none", cursor: canSend ? "pointer" : "default", color: canSend ? "#8B5CF6" : "#3A3A4D", display: "flex", alignItems: "center", justifyContent: "center", padding: "2px", transition: "color 0.15s" }}
              >
                <Send size={17} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}