// lib/hooks/usePostEngagement.ts
"use client";

import * as React from "react";
import { postSyncStore } from "@/lib/store/postSyncStore";

interface UsePostEngagementOptions {
  postId:               string;
  creatorId:            string;
  initialLiked:         boolean;
  initialLikeCount:     number;
  initialCommentCount:  number;
  initialSavedPost?:    boolean;
  initialSavedCreator?: boolean;
  onLikeSuccess?:       (postId: string) => void;
}

export function usePostEngagement({
  postId,
  creatorId,
  initialLiked,
  initialLikeCount,
  initialCommentCount,
  initialSavedPost    = false,
  initialSavedCreator = false,
  onLikeSuccess,
}: UsePostEngagementOptions) {
  const [liked,           setLiked]           = React.useState(initialLiked);
  const [likeCount,       setLikeCount]       = React.useState(initialLikeCount);
  const [commentCount,    setCommentCount]    = React.useState(initialCommentCount);
  const [commentOpen,     setCommentOpen]     = React.useState(false);
  const [comments,        setComments]        = React.useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = React.useState(false);
  const [commentsFetched, setCommentsFetched] = React.useState(false);
  const [savedPost,       setSavedPost]       = React.useState(initialSavedPost);
  const [savedCreator,    setSavedCreator]    = React.useState(initialSavedCreator);

  // ── Refs for stable access in callbacks (fixes stale closures) ─────────
  const isLiking     = React.useRef(false);
  const prevPostId   = React.useRef(postId);
  const likedRef     = React.useRef(liked);
  const likeCountRef = React.useRef(likeCount);

  React.useEffect(() => { likedRef.current     = liked;     }, [liked]);
  React.useEffect(() => { likeCountRef.current = likeCount; }, [likeCount]);

  // ── Sync with postSyncStore so state stays consistent across cards ─────
  React.useEffect(() => {
    const unsub = postSyncStore.subscribe((event) => {
      if (event.postId !== postId) return;
      setLiked(event.liked);
      setLikeCount(event.like_count);
      if (event.comment_count !== undefined) setCommentCount(event.comment_count);
    });
    return unsub;
  }, [postId]);

  // ── Reset state if the underlying post changes (card reuse in virtualization) ──
  React.useEffect(() => {
    if (prevPostId.current !== postId) {
      prevPostId.current = postId;
      setLiked(initialLiked);
      setLikeCount(initialLikeCount);
      setCommentCount(initialCommentCount);
    }
  }, [postId, initialLiked, initialLikeCount, initialCommentCount]);

  const handleLike = React.useCallback(async () => {
    if (isLiking.current) return;
    isLiking.current = true;
    const wasLiked = liked;
    const oldCount = likeCount;
    const newLiked = !wasLiked;
    const newCount = newLiked ? oldCount + 1 : Math.max(0, oldCount - 1);

    setLiked(newLiked);
    setLikeCount(newCount);
    postSyncStore.emit({ postId, liked: newLiked, like_count: newCount, comment_count: commentCount });

    try {
      const res  = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setLiked(data.liked);
        setLikeCount(data.like_count);
        postSyncStore.emit({ postId, liked: data.liked, like_count: data.like_count, comment_count: commentCount });
        onLikeSuccess?.(postId);
      } else {
        setLiked(wasLiked);
        setLikeCount(oldCount);
        postSyncStore.emit({ postId, liked: wasLiked, like_count: oldCount, comment_count: commentCount });
      }
    } catch {
      setLiked(wasLiked);
      setLikeCount(oldCount);
      postSyncStore.emit({ postId, liked: wasLiked, like_count: oldCount, comment_count: commentCount });
    }
    isLiking.current = false;
  }, [postId, liked, likeCount, commentCount, onLikeSuccess]);

  const handleDoubleTapLike = React.useCallback(async () => {
    if (liked || isLiking.current) return;
    isLiking.current = true;
    const oldCount = likeCount;

    setLiked(true);
    setLikeCount(oldCount + 1);
    postSyncStore.emit({ postId, liked: true, like_count: oldCount + 1, comment_count: commentCount });

    try {
      const res  = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setLiked(data.liked);
        setLikeCount(data.like_count);
        postSyncStore.emit({ postId, liked: data.liked, like_count: data.like_count, comment_count: commentCount });
        onLikeSuccess?.(postId);
      } else {
        setLiked(false);
        setLikeCount(oldCount);
        postSyncStore.emit({ postId, liked: false, like_count: oldCount, comment_count: commentCount });
      }
    } catch {
      setLiked(false);
      setLikeCount(oldCount);
      postSyncStore.emit({ postId, liked: false, like_count: oldCount, comment_count: commentCount });
    }
    isLiking.current = false;
  }, [postId, liked, likeCount, commentCount, onLikeSuccess]);

  const handleToggleComment = React.useCallback(() => {
    const willOpen = !commentOpen;
    setCommentOpen(willOpen);
    if (willOpen && !commentsFetched) {
      setCommentsLoading(true);
      setCommentsFetched(true);
      fetch(`/api/posts/${postId}/comments`)
        .then((r) => r.json())
        .then((d) => { if (d.comments) setComments(d.comments); })
        .catch(() => {})
        .finally(() => setCommentsLoading(false));
    }
  }, [commentOpen, commentsFetched, postId]);

  const closeCommentSection = React.useCallback(() => setCommentOpen(false), []);

  // ── Uses refs to avoid stale closures for liked/likeCount ──────────────
  const handleAddComment = React.useCallback(async (
    id: string, text: string, gif_url?: string,
    parent_comment_id?: string | number,
    reply_to_username?: string | null,
    reply_to_id?: string | number | null
  ) => {
    await fetch(`/api/posts/${id}/comments`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        content:           text,
        gif_url:           gif_url ?? null,
        parent_comment_id: parent_comment_id ?? null,
        reply_to_username: reply_to_username ?? null,
        reply_to_id:       reply_to_id ?? null,
      }),
    });
    setCommentCount((c) => {
      const newCount = c + 1;
      postSyncStore.emit({ postId: id, liked: likedRef.current, like_count: likeCountRef.current, comment_count: newCount });
      return newCount;
    });
    if (!parent_comment_id) {
      const d = await fetch(`/api/posts/${id}/comments`).then((r) => r.json());
      if (d.comments) setComments(d.comments);
    }
  }, []);

  const handleDeleteComment = React.useCallback(() => {
    setCommentCount((c) => {
      const newCount = Math.max(0, c - 1);
      postSyncStore.emit({ postId, liked: likedRef.current, like_count: likeCountRef.current, comment_count: newCount });
      return newCount;
    });
  }, [postId]);

  const handleSavePost = React.useCallback(async () => {
    const next = !savedPost;
    setSavedPost(next);
    try {
      await fetch("/api/saved/posts", {
        method:  next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ post_id: postId }),
      });
    } catch {
      setSavedPost(!next);
    }
  }, [savedPost, postId]);

  const handleSaveCreator = React.useCallback(async () => {
    const next = !savedCreator;
    setSavedCreator(next);
    try {
      await fetch("/api/saved/creators", {
        method:  next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ creator_id: creatorId }),
      });
    } catch {
      setSavedCreator(!next);
    }
  }, [savedCreator, creatorId]);

  return {
    // state
    liked, likeCount, commentCount, commentOpen,
    comments, commentsLoading, savedPost, savedCreator,
    // setters consumers may still need
    setComments, setSavedPost,
    // handlers
    handleLike, handleDoubleTapLike,
    handleToggleComment, closeCommentSection,
    handleAddComment, handleDeleteComment,
    handleSavePost, handleSaveCreator,
  };
}