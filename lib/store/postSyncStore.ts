import type { PollData } from "@/components/feed/PollDisplay";

type PostSyncEvent = {
  postId:        string;
  liked:         boolean;
  like_count:    number;
  comment_count?: number;
  poll_data?:    PollData;
};

type CommentLikeSyncEvent = {
  postId:     string;
  commentId:  string | number;
  liked:      boolean;
  like_count: number;
};

type ReplyCountSyncEvent = {
  postId:          string;
  parentCommentId: string | number;
  reply_count:     number;
};

type Listener             = (event: PostSyncEvent) => void;
type CommentListener      = (event: CommentLikeSyncEvent) => void;
type ReplyCountListener   = (event: ReplyCountSyncEvent) => void;

const listeners           = new Set<Listener>();
const commentListeners    = new Set<CommentListener>();
const replyCountListeners = new Set<ReplyCountListener>();

const cache = new Map<string, {
  liked:          boolean;
  like_count:     number;
  comment_count?: number;
  poll_data?:     PollData;
}>();

const commentCache = new Map<string, {
  liked:      boolean;
  like_count: number;
}>();

const replyCountCache = new Map<string, number>();

function commentCacheKey(postId: string, commentId: string | number) {
  return `${postId}:${commentId}`;
}

export const postSyncStore = {
  // ── Post likes / comment count ────────────────────────────────────────────
  emit(event: PostSyncEvent) {
    cache.set(event.postId, {
      liked:         event.liked,
      like_count:    event.like_count,
      comment_count: event.comment_count,
      poll_data:     event.poll_data,
    });
    queueMicrotask(() => listeners.forEach((fn) => fn(event)));
  },

  get(postId: string) {
    return cache.get(postId) ?? null;
  },

  subscribe(fn: Listener) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  },

  // ── Comment likes ─────────────────────────────────────────────────────────
  emitCommentLike(event: CommentLikeSyncEvent) {
    commentCache.set(commentCacheKey(event.postId, event.commentId), {
      liked:      event.liked,
      like_count: event.like_count,
    });
    queueMicrotask(() => commentListeners.forEach((fn) => fn(event)));
  },

  getCommentLike(postId: string, commentId: string | number) {
    return commentCache.get(commentCacheKey(postId, commentId)) ?? null;
  },

  subscribeCommentLike(fn: CommentListener) {
    commentListeners.add(fn);
    return () => { commentListeners.delete(fn); };
  },

  // ── Reply counts ──────────────────────────────────────────────────────────
  emitReplyCount(event: ReplyCountSyncEvent) {
    replyCountCache.set(commentCacheKey(event.postId, event.parentCommentId), event.reply_count);
    queueMicrotask(() => replyCountListeners.forEach((fn) => fn(event)));
  },

  getReplyCount(postId: string, parentCommentId: string | number) {
    return replyCountCache.get(commentCacheKey(postId, parentCommentId)) ?? null;
  },

  subscribeReplyCount(fn: ReplyCountListener) {
    replyCountListeners.add(fn);
    return () => { replyCountListeners.delete(fn); };
  },
};