import { create } from "zustand";
import type { ApiPost } from "@/components/profile/PostRow";

const STALE_MS = 5 * 60 * 1000; // 5 minutes

export function isStale(fetchedAt: number | null): boolean {
  if (!fetchedAt) return true;
  return Date.now() - fetchedAt > STALE_MS;
}

// ── Types ─────────────────────────────────────────────────────

export interface Viewer {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  role: string;
}

export interface FeedEntry {
  posts: any[];         // raw FeedPost[]
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
  // Viewer (logged-in user) — fetched once globally
  viewer: Viewer | null;
  viewerFetchedAt: number | null;
  setViewer: (viewer: Viewer | null) => void;

  // Home feed
  feed: FeedEntry | null;
  setFeed: (entry: FeedEntry) => void;
  updateFeedPost: (postId: string, patch: Partial<any>) => void;
  clearFeed: () => void;

  // Per-profile cache (keyed by username)
  profiles: Record<string, ProfileEntry>;
  setProfile: (username: string, entry: ProfileEntry) => void;
  updateProfile: (username: string, patch: Partial<ProfileEntry>) => void;
  clearProfile: (username: string) => void;

  // Per-profile content feed cache (keyed by username)
  contentFeeds: Record<string, ContentFeedEntry>;
  setContentFeed: (username: string, entry: ContentFeedEntry) => void;
  clearContentFeed: (username: string) => void;
}

// ── Store ─────────────────────────────────────────────────────

export const useAppStore = create<AppStore>((set) => ({
  // Viewer
  viewer: null,
  viewerFetchedAt: null,
  setViewer: (viewer) =>
    set({ viewer, viewerFetchedAt: viewer ? Date.now() : null }),

  // Feed
  feed: null,
  setFeed: (entry) => set({ feed: entry }),
  updateFeedPost: (postId, patch) =>
    set((s) => {
      if (!s.feed) return s;
      return {
        feed: {
          ...s.feed,
          posts: s.feed.posts.map((p) =>
            String(p.id) === postId ? { ...p, ...patch } : p
          ),
        },
      };
    }),
  clearFeed: () => set({ feed: null }),

  // Profiles
  profiles: {},
  setProfile: (username, entry) =>
    set((s) => ({ profiles: { ...s.profiles, [username]: entry } })),
  updateProfile: (username, patch) =>
    set((s) => ({
      profiles: {
        ...s.profiles,
        [username]: { ...s.profiles[username], ...patch },
      },
    })),
  clearProfile: (username) =>
    set((s) => {
      const profiles = { ...s.profiles };
      delete profiles[username];
      return { profiles };
    }),

  // Content feeds
  contentFeeds: {},
  setContentFeed: (username, entry) =>
    set((s) => ({ contentFeeds: { ...s.contentFeeds, [username]: entry } })),
  clearContentFeed: (username) =>
    set((s) => {
      const contentFeeds = { ...s.contentFeeds };
      delete contentFeeds[username];
      return { contentFeeds };
    }),
}));