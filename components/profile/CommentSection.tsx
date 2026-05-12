"use client";

import * as React from "react";
import { CommentSkeleton } from "@/components/loadscreen/CommentSkeleton";
import { CommentRow } from "@/components/profile/CommentRow";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import CommentInputBar from "@/components/profile/CommentInputBar";
import type { ReplyingTo } from "@/components/profile/CommentInputBar";

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
  reply_to_id?: string | number | null;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    role?: string | null;
  };
}

interface CommentSectionProps {
  postId: string;
  comments: ApiComment[];
  viewer?: { username: string; display_name: string; avatar_url?: string } | null;
  viewerUserId?: string;
  onAddComment?: (postId: string, text: string, gif_url?: string, parent_comment_id?: string | number, reply_to_username?: string | null, reply_to_id?: string | number | null) => Promise<void>;
  onDeleteComment?: () => void; // ✅ FIX: notify parent on top-level delete
  isOpen?: boolean;
  onClose?: () => void;
  isLoading?: boolean;
  totalCommentCount?: number;
}


export default function CommentSection({ postId, comments: propComments, viewer, viewerUserId, onAddComment, onDeleteComment, isOpen = false, onClose, isLoading = false, totalCommentCount }: CommentSectionProps) {
  const [localComments, setLocalComments] = React.useState<ApiComment[]>(propComments);
  const [visible,       setVisible]       = React.useState(false);
  const [animateIn,     setAnimateIn]     = React.useState(false);
  const [mounted,       setMounted]       = React.useState(false);
  const [sheetHeight,   setSheetHeight]   = React.useState<"60vh" | "88vh" | "65vh">("60vh");

  // Reply state
  const [replyingTo,   setReplyingTo]   = React.useState<ReplyingTo | null>(null);
  const [replyParentId, setReplyParentId] = React.useState<string | number | null>(null);

  const sheetRef    = React.useRef<HTMLDivElement>(null);
  const commentsRef = React.useRef<HTMLDivElement>(null);
  const INPUT_BAR_HEIGHT = 72;
  const lockedScrollY = React.useRef<number>(0);
  const dragStartY   = React.useRef(0);
  const dragDeltaY   = React.useRef(0);
  const isDragging   = React.useRef(false);

  React.useEffect(() => {
    setMounted(true);
    setSheetHeight(window.innerWidth >= 768 ? "65vh" : "60vh");
  }, []);
  React.useEffect(() => { setLocalComments(propComments); }, [propComments]);

  React.useEffect(() => {
    if (isOpen) {
      lockedScrollY.current = window.scrollY;
      const lockScroll = () => window.scrollTo(0, lockedScrollY.current);
      window.addEventListener("scroll", lockScroll, { passive: true });
      setVisible(true);
      const t = setTimeout(() => setAnimateIn(true), 16);
      return () => {
        window.removeEventListener("scroll", lockScroll);
        clearTimeout(t);
      };
    } else {
      setAnimateIn(false);
      setSheetHeight(typeof window !== "undefined" && window.innerWidth >= 768 ? "65vh" : "60vh");
      const t = setTimeout(() => setVisible(false), 320);
      return () => clearTimeout(t);
    }
  }, [isOpen]);


  

  const handleClose = React.useCallback(() => {
    setAnimateIn(false);
    setTimeout(() => { setVisible(false); onClose?.(); }, 320);
  }, [onClose]);

  const onTouchStart = (e: React.TouchEvent) => { dragStartY.current = e.touches[0].clientY; dragDeltaY.current = 0; isDragging.current = true; };
  const onTouchMove  = (e: React.TouchEvent) => {
    if (!isDragging.current || !sheetRef.current) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    dragDeltaY.current = delta;
    if (delta > 0) sheetRef.current.style.transform = `translateY(${delta}px)`;
    else if (delta < -30 && sheetHeight !== "88vh") sheetRef.current.style.transform = `translateY(${delta}px)`;
  };
  const onTouchEnd = () => {
    isDragging.current = false;
    const delta = dragDeltaY.current;
    if (sheetRef.current) sheetRef.current.style.transform = "translateY(0)";
    const defaultHeight = window.innerWidth >= 768 ? "65vh" : "60vh";    if (delta < -60 && sheetHeight !== "88vh") setSheetHeight("88vh");
    else if (delta > 80 && sheetHeight === "88vh") setSheetHeight(defaultHeight);
    else if (delta > 120 && sheetHeight !== "88vh") handleClose();
    dragDeltaY.current = 0;
  };

  // ✅ FIX: notify parent when a top-level comment is deleted
  const handleDeleted = (id: string | number) => {
    setLocalComments((prev) => prev.filter((c) => c.id !== id));
    onDeleteComment?.();
  };

  const handleReply = (comment: ApiComment) => {
    setReplyingTo({
      id: comment.id,
      username: comment.profiles?.username || "user",
      reply_to_username: comment.reply_to_username,
      reply_to_id: comment.reply_to_id,
    });
    setReplyParentId(comment.id);
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setReplyParentId(null);
  };

  const handleSend = async (text: string, gif_url?: string) => {
    if (!text && !gif_url) return;
    if (!viewer) return;

    const trimmed = text.trim();

    if (replyingTo && replyParentId !== null) {
      const replyToUsername = replyingTo.reply_to_username ?? replyingTo.username ?? null;
      const replyToId = replyingTo.reply_to_id ?? null;

      const optimisticReply: ApiComment = {
        id:               `local-reply-${Date.now()}`,
        content:          trimmed,
        gif_url:          gif_url ?? null,
        created_at:       new Date().toISOString(),
        like_count:       0,
        user_id:          viewerUserId || "",
        viewer_has_liked: false,
        reply_to_username: replyToUsername,
        reply_to_id:       replyToId,
        profiles:         { username: viewer.username, display_name: viewer.display_name, avatar_url: viewer.avatar_url || null },
      };

      const parentComment = localComments.find((c) => c.id === replyParentId);
      if (parentComment && typeof (parentComment as any)._addReply === "function") {
        (parentComment as any)._addReply(optimisticReply);
      }

      const capturedParentId = replyParentId;
      setReplyingTo(null);
      setReplyParentId(null);

      await onAddComment?.(postId, trimmed, gif_url, capturedParentId, replyToUsername, replyToId);

      if (parentComment && typeof (parentComment as any)._refetchReplies === "function") {
        (parentComment as any)._refetchReplies();
      }

    } else {
      const optimistic: ApiComment = {
        id:               `local-${Date.now()}`,
        content:          trimmed,
        gif_url:          gif_url ?? null,
        created_at:       new Date().toISOString(),
        like_count:       0,
        user_id:          viewerUserId || "",
        viewer_has_liked: false,
        profiles:         { username: viewer.username, display_name: viewer.display_name, avatar_url: viewer.avatar_url || null },
      };

      setLocalComments((prev) => [optimistic, ...prev]);
      commentsRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      await onAddComment?.(postId, trimmed, gif_url);
    }
  };

  if (!mounted || !visible) return null;

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", pointerEvents: "none" }}>
      <div ref={sheetRef} style={{ position: "relative", width: "100%", maxWidth: "680px", backgroundColor: "#0F0F1A", borderRadius: "20px 20px 0 0", height: sheetHeight, maxHeight: sheetHeight, display: "flex", flexDirection: "column", transform: animateIn ? "translateY(0)" : "translateY(100%)", transition: "transform 0.32s cubic-bezier(0.32, 0.72, 0, 1), height 0.32s cubic-bezier(0.32, 0.72, 0, 1)", boxShadow: "0 -4px 40px rgba(0,0,0,0.6)", pointerEvents: "auto", overscrollBehavior: "contain" }}>

        <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} style={{ padding: "12px 16px 0", userSelect: "none", touchAction: "none" }}>
          <div style={{ width: "36px", height: "4px", borderRadius: "2px", backgroundColor: "#2A2A3D", margin: "0 auto 14px" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ fontSize: "15px", fontWeight: 700, color: "#F1F5F9", fontFamily: "'Inter', sans-serif" }}>Comments {(totalCommentCount ?? localComments.length) > 0 ? `· ${totalCommentCount ?? localComments.length}` : ""}</span>
            <button onClick={handleClose} style={{ width: "30px", height: "30px", borderRadius: "50%", border: "none", backgroundColor: "#1C1C2E", color: "#6B6B8A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={15} /></button>
          </div>
        </div>

        <div ref={commentsRef} style={{ flex: 1, overflowY: "auto", padding: "0 16px 80px", scrollbarWidth: "none", overscrollBehavior: "contain" }}>
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

        </div>
      <CommentInputBar
        viewer={viewer}
        viewerUserId={viewerUserId}
        replyingTo={replyingTo}
        onCancelReply={cancelReply}
        onSend={handleSend}
        isOpen={isOpen}
      />
    </div>,
    document.body
  );
}