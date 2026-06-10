import type { CreatorStoryGroup } from "@/components/story/StoryBar";

const STALE_MS = 30_000;

interface FeedPage {
  posts:            any[];
  nextSubOffset:    number;
  nextFreshOffset:  number;
  nextHotOffset:    number;
  hasMore:          boolean;
  hasStories:       boolean;
}

interface FeedCache {
  pages:       FeedPage[];
  storiesData: CreatorStoryGroup[] | null;
  fetchedAt:   number | null;
}

let cache: FeedCache = {
  pages:       [],
  storiesData: null,
  fetchedAt:   null,
};

const listeners = new Set<() => void>();

export function getFeedCache(): FeedCache { return cache; }

export function isFeedCacheStale(): boolean {
  if (!cache.fetchedAt || cache.pages.length === 0) return true;
  return Date.now() - cache.fetchedAt > STALE_MS;
}

export function setFeedPages(pages: FeedPage[]) {
  cache = { ...cache, pages, fetchedAt: Date.now() };
  listeners.forEach((fn) => fn());
}

export function setFeedStoriesData(storiesData: CreatorStoryGroup[] | null) {
  cache = { ...cache, storiesData };
  listeners.forEach((fn) => fn());
}

export function patchFeedPost(postId: number, patch: Partial<any>) {
  cache = {
    ...cache,
    pages: cache.pages.map((page) => ({
      ...page,
      posts: page.posts.map((p) => p.id === postId ? { ...p, ...patch } : p),
    })),
  };
  listeners.forEach((fn) => fn());
}

export function clearFeedCache() {
  cache = { pages: [], storiesData: null, fetchedAt: null };
  listeners.forEach((fn) => fn());
}

export function subscribeFeedCache(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}