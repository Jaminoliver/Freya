type PostSyncEvent = {
  postId: string;
  liked: boolean;
  like_count: number;
  comment_count?: number;
};

type Listener = (event: PostSyncEvent) => void;

const listeners = new Set<Listener>();
const cache = new Map<string, { liked: boolean; like_count: number; comment_count?: number }>();

export const postSyncStore = {
  emit(event: PostSyncEvent) {
    cache.set(event.postId, {
      liked:         event.liked,
      like_count:    event.like_count,
      comment_count: event.comment_count,
    });
    listeners.forEach((fn) => fn(event));
  },

  get(postId: string) {
    return cache.get(postId) ?? null;
  },

  subscribe(fn: Listener) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  },
};