// lib/hooks/usePostEngagement.ts
"use client";

import * as React from "react";
import { useQueryClient }    from "@tanstack/react-query";
import { queryKeys }         from "@/lib/query/keys";
import { useAppStore }       from "@/lib/store/appStore";
import { useGuestGuard }     from "@/lib/hooks/useGuestGuard";

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
  const { clearProfile } = useAppStore();
  const queryClient = useQueryClient();
  const guard = useGuestGuard();

  // ── Helper: update this post in the feed cache ─────────────────────────
  const updateFeedCache = React.useCallback((updater: (p: any) => any) => {
    queryClient.setQueryData(queryKeys.feed(), (old: any) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          posts: page.posts.map((p: any) => String(p.id) === postId ? updater(p) : p),
        })),
      };
    });
  }, [queryClient, postId]);

  // ── Refs for stable access in callbacks (fixes stale closures) ─────────
  const isLiking     = React.useRef(false);
  const prevPostId   = React.useRef(postId);
  const likedRef     = React.useRef(liked);
  const likeCountRef = React.useRef(likeCount);

  React.useEffect(() => { likedRef.current     = liked;     }, [liked]);
  React.useEffect(() => { likeCountRef.current = likeCount; }, [likeCount]);

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
    updateFeedCache((p) => ({ ...p, liked: newLiked, like_count: newCount }));

    try {
      const res  = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setLiked(data.liked);
        setLikeCount(data.like_count);
        updateFeedCache((p) => ({ ...p, liked: data.liked, like_count: data.like_count }));
        onLikeSuccess?.(postId);
      } else {
        setLiked(wasLiked);
        setLikeCount(oldCount);
        updateFeedCache((p) => ({ ...p, liked: wasLiked, like_count: oldCount }));
      }
    } catch {
      setLiked(wasLiked);
      setLikeCount(oldCount);
      updateFeedCache((p) => ({ ...p, liked: wasLiked, like_count: oldCount }));
    }
    isLiking.current = false;
  }, [postId, liked, likeCount, commentCount, onLikeSuccess, updateFeedCache]);

  const handleDoubleTapLike = React.useCallback(async () => {
    if (liked || isLiking.current) return;
    isLiking.current = true;
    const oldCount = likeCount;

    setLiked(true);
    setLikeCount(oldCount + 1);
    updateFeedCache((p) => ({ ...p, liked: true, like_count: oldCount + 1 }));

    try {
      const res  = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setLiked(data.liked);
        setLikeCount(data.like_count);
        updateFeedCache((p) => ({ ...p, liked: data.liked, like_count: data.like_count }));
        onLikeSuccess?.(postId);
      } else {
        setLiked(false);
        setLikeCount(oldCount);
        updateFeedCache((p) => ({ ...p, liked: false, like_count: oldCount }));
      }
    } catch {
      setLiked(false);
      setLikeCount(oldCount);
      updateFeedCache((p) => ({ ...p, liked: false, like_count: oldCount }));
    }
    isLiking.current = false;
  }, [postId, liked, likeCount, commentCount, onLikeSuccess, updateFeedCache]);

  const prefetchRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (commentsFetched) return;
    const el = prefetchRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      setCommentsLoading(true);
      setCommentsFetched(true);
      fetch(`/api/posts/${postId}/comments`)
        .then((r) => r.json())
        .then((d) => { if (d.comments) setComments(d.comments); })
        .catch(() => {})
        .finally(() => setCommentsLoading(false));
    }, { rootMargin: "200px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [postId, commentsFetched]);

  const handleToggleComment = React.useCallback(() => {
    setCommentOpen((o) => !o);
  }, []);

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
      updateFeedCache((p) => ({ ...p, comment_count: newCount }));
      return newCount;
    });
    if (!parent_comment_id) {
      const d = await fetch(`/api/posts/${id}/comments`).then((r) => r.json());
      if (d.comments) setComments(d.comments);
    }
  }, [updateFeedCache]);

  const handleDeleteComment = React.useCallback(() => {
    setCommentCount((c) => {
      const newCount = Math.max(0, c - 1);
      updateFeedCache((p) => ({ ...p, comment_count: newCount }));
      return newCount;
    });
  }, [postId, updateFeedCache]);

  const handleSavePost = React.useCallback(async () => {
    const next = !savedPost;
    setSavedPost(next);
    updateFeedCache((p) => ({ ...p, saved_post: next }));
    try {
      const res = await fetch("/api/saved/posts", {
        method:  next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ post_id: postId }),
      });
      if (!res.ok) {
        setSavedPost(!next);
        updateFeedCache((p) => ({ ...p, saved_post: !next }));
      }
    } catch {
      setSavedPost(!next);
      updateFeedCache((p) => ({ ...p, saved_post: !next }));
    }
  }, [savedPost, postId, updateFeedCache]);

  const handleSaveCreator = React.useCallback(async () => {
    const next = !savedCreator;
    setSavedCreator(next);
    clearProfile(creatorId);
    updateFeedCache((p) => ({ ...p, saved_creator: next }));
    try {
      const res = await fetch("/api/saved/creators", {
        method:  next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ creator_id: creatorId }),
      });
      if (!res.ok) {
        setSavedCreator(!next);
        updateFeedCache((p) => ({ ...p, saved_creator: !next }));
      }
    } catch {
      setSavedCreator(!next);
      updateFeedCache((p) => ({ ...p, saved_creator: !next }));
    }
  }, [savedCreator, creatorId, postId, clearProfile, updateFeedCache]);

  return {
    // state
    liked, likeCount, commentCount, commentOpen,
    comments, commentsLoading, savedPost, savedCreator,
    // setters consumers may still need
    setComments, setSavedPost,
    // handlers
    prefetchRef,
    handleLike:            guard(handleLike),
    handleDoubleTapLike:   guard(handleDoubleTapLike),
    handleToggleComment:   guard(handleToggleComment),
    closeCommentSection,
    handleAddComment:      (...args: Parameters<typeof handleAddComment>) => guard(handleAddComment)(...args) ?? Promise.resolve(),
    handleDeleteComment,
    handleSavePost:        guard(handleSavePost),
    handleSaveCreator:     guard(handleSaveCreator),
  };
}