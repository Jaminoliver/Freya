import { create } from "zustand";
import type { ApiPost } from "@/components/profile/PostRow";

// ── Reduced from 5 min to 30s so profile always refetches after posting ──
const STALE_MS          = 30 * 1000;
const FEED_KEY          = "freya_feed_cache";
const PROFILES_KEY      = "freya_profiles_cache";
const CONTENT_FEEDS_KEY = "freya_content_feeds_cache";

export function isStale(fetchedAt: number | null): boolean {
  if (!fetchedAt) return true;
  return Date.now() - fetchedAt > STALE_MS;
}

// ── sessionStorage helpers ────────────────────────────────────

function loadFeedFromStorage(): FeedEntry | null {
  try {
    const raw = sessionStorage.getItem(FEED_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as FeedEntry;
    if (isStale(entry.fetchedAt)) { sessionStorage.removeItem(FEED_KEY); return null; }
    return entry;
  } catch { return null; }
}

function saveFeedToStorage(entry: FeedEntry) {
  try { sessionStorage.setItem(FEED_KEY, JSON.stringify(entry)); } catch {}
}

function clearFeedFromStorage() {
  try { sessionStorage.removeItem(FEED_KEY); } catch {}
}

function loadProfilesFromStorage(): Record<string, ProfileEntry> {
  try {
    const raw = sessionStorage.getItem(PROFILES_KEY);
    if (!raw) return {};
    const all = JSON.parse(raw) as Record<string, ProfileEntry>;
    const fresh: Record<string, ProfileEntry> = {};
    for (const [k, v] of Object.entries(all)) {
      if (!isStale(v.fetchedAt)) fresh[k] = v;
    }
    return fresh;
  } catch { return {}; }
}

function saveProfilesToStorage(profiles: Record<string, ProfileEntry>) {
  try { sessionStorage.setItem(PROFILES_KEY, JSON.stringify(profiles)); } catch {}
}

function loadContentFeedsFromStorage(): Record<string, ContentFeedEntry> {
  try {
    const raw = sessionStorage.getItem(CONTENT_FEEDS_KEY);
    if (!raw) return {};
    const all = JSON.parse(raw) as Record<string, ContentFeedEntry>;
    const fresh: Record<string, ContentFeedEntry> = {};
    for (const [k, v] of Object.entries(all)) {
      if (!isStale(v.fetchedAt)) fresh[k] = v;
    }
    return fresh;
  } catch { return {}; }
}

function saveContentFeedsToStorage(feeds: Record<string, ContentFeedEntry>) {
  try { sessionStorage.setItem(CONTENT_FEEDS_KEY, JSON.stringify(feeds)); } catch {}
}

// ── Types ─────────────────────────────────────────────────────

export interface Viewer {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  role: string;
}

export interface FeedEntry {
  posts: any[];
  nextCursor: string | null;
  fetchedAt: number;
}

export interface ProfileEntry {
  viewer: any;
  profile: any;
  totalLikes: number;
  tierId: number | undefined;
  isFollowing: boolean;
  isSubscribed: boolean;
  subscriptionPeriodEnd: string | null;
  apiPosts: ApiPost[];
  fetchedAt: number;
}

export interface ContentFeedEntry {
  posts: ApiPost[];
  media: any[];
  fetchedAt: number;
}

// ── Store shape ───────────────────────────────────────────────

interface AppStore {
  viewer: Viewer | null;
  viewerFetchedAt: number | null;
  setViewer: (viewer: Viewer | null) => void;

  feed: FeedEntry | null;
  setFeed: (entry: FeedEntry) => void;
  updateFeedPost: (postId: string, patch: Partial<any>) => void;
  clearFeed: () => void;

  profiles: Record<string, ProfileEntry>;
  setProfile: (username: string, entry: ProfileEntry) => void;
  updateProfile: (username: string, patch: Partial<ProfileEntry>) => void;
  clearProfile: (username: string) => void;

  contentFeeds: Record<string, ContentFeedEntry>;
  setContentFeed: (key: string, entry: ContentFeedEntry) => void;
  clearContentFeed: (key: string) => void;
}

// ── Store ─────────────────────────────────────────────────────

export const useAppStore = create<AppStore>((set) => ({
  // Viewer
  viewer: null,
  viewerFetchedAt: null,
  setViewer: (viewer) =>
    set({ viewer, viewerFetchedAt: viewer ? Date.now() : null }),

  // Feed
  feed: loadFeedFromStorage(),

  setFeed: (entry) => {
    saveFeedToStorage(entry);
    set({ feed: entry });
  },

  updateFeedPost: (postId, patch) =>
    set((s) => {
      if (!s.feed) return s;
      const idx = s.feed.posts.findIndex((p) => String(p.id) === postId);
      if (idx === -1) return s;
      const posts = [...s.feed.posts];
      posts[idx] = { ...posts[idx], ...patch };
      const updated = { ...s.feed, posts };
      saveFeedToStorage(updated);
      return { feed: updated };
    }),

  clearFeed: () => {
    clearFeedFromStorage();
    set({ feed: null });
  },

  // Profiles
  profiles: loadProfilesFromStorage(),

  setProfile: (username, entry) =>
    set((s) => {
      const profiles = { ...s.profiles, [username]: entry };
      saveProfilesToStorage(profiles);
      return { profiles };
    }),

  updateProfile: (username, patch) =>
    set((s) => {
      const profiles = {
        ...s.profiles,
        [username]: { ...s.profiles[username], ...patch },
      };
      saveProfilesToStorage(profiles);
      return { profiles };
    }),

  clearProfile: (username) =>
    set((s) => {
      const profiles = { ...s.profiles };
      delete profiles[username];
      saveProfilesToStorage(profiles);
      return { profiles };
    }),

  // Content feeds
  contentFeeds: loadContentFeedsFromStorage(),

  setContentFeed: (key, entry) =>
    set((s) => {
      const contentFeeds = { ...s.contentFeeds, [key]: entry };
      saveContentFeedsToStorage(contentFeeds);
      return { contentFeeds };
    }),

  clearContentFeed: (key) =>
    set((s) => {
      const contentFeeds = { ...s.contentFeeds };
      delete contentFeeds[key];
      saveContentFeedsToStorage(contentFeeds);
      return { contentFeeds };
    }),
}));