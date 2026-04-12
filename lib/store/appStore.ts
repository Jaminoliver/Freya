import { create } from "zustand";
import type { ApiPost } from "@/components/profile/PostRow";

const STALE_MS          = 3 * 60 * 1000; // 3 minutes (was 30s — too aggressive for slow Nigerian connections)
const FEED_KEY          = "freya_feed_cache";
const PROFILES_KEY      = "freya_profiles_cache";
const CONTENT_FEEDS_KEY = "freya_content_feeds_cache";
const VIEWER_KEY        = "freya_viewer_cache";

export function isStale(fetchedAt: number | null): boolean {
  if (!fetchedAt) return true;
  return Date.now() - fetchedAt > STALE_MS;
}

function loadViewerFromStorage(): Viewer | null {
  if (typeof window === "undefined") return null;
  try { const raw = sessionStorage.getItem(VIEWER_KEY); if (!raw) return null; return JSON.parse(raw) as Viewer; } catch { return null; }
}
function saveViewerToStorage(viewer: Viewer | null) {
  if (typeof window === "undefined") return;
  try { if (viewer) sessionStorage.setItem(VIEWER_KEY, JSON.stringify(viewer)); else sessionStorage.removeItem(VIEWER_KEY); } catch {}
}
function loadFeedFromStorage(): FeedEntry | null {
  if (typeof window === "undefined") return null;
  try { const raw = sessionStorage.getItem(FEED_KEY); if (!raw) return null; const entry = JSON.parse(raw) as FeedEntry; if (isStale(entry.fetchedAt)) { sessionStorage.removeItem(FEED_KEY); return null; } return entry; } catch { return null; }
}
function saveFeedToStorage(entry: FeedEntry) {
  if (typeof window === "undefined") return;
  try { sessionStorage.setItem(FEED_KEY, JSON.stringify(entry)); } catch {}
}
function clearFeedFromStorage() {
  if (typeof window === "undefined") return;
  try { sessionStorage.removeItem(FEED_KEY); } catch {}
}
function loadProfilesFromStorage(): Record<string, ProfileEntry> {
  if (typeof window === "undefined") return {};
  try { const raw = sessionStorage.getItem(PROFILES_KEY); if (!raw) return {}; const all = JSON.parse(raw) as Record<string, ProfileEntry>; const fresh: Record<string, ProfileEntry> = {}; for (const [k, v] of Object.entries(all)) { if (!isStale(v.fetchedAt)) fresh[k] = v; } return fresh; } catch { return {}; }
}
function saveProfilesToStorage(profiles: Record<string, ProfileEntry>) {
  if (typeof window === "undefined") return;
  try { sessionStorage.setItem(PROFILES_KEY, JSON.stringify(profiles)); } catch {}
}
function loadContentFeedsFromStorage(): Record<string, ContentFeedEntry> {
  if (typeof window === "undefined") return {};
  try { const raw = sessionStorage.getItem(CONTENT_FEEDS_KEY); if (!raw) return {}; const all = JSON.parse(raw) as Record<string, ContentFeedEntry>; const fresh: Record<string, ContentFeedEntry> = {}; for (const [k, v] of Object.entries(all)) { if (!isStale(v.fetchedAt)) fresh[k] = v; } return fresh; } catch { return {}; }
}
function saveContentFeedsToStorage(feeds: Record<string, ContentFeedEntry>) {
  if (typeof window === "undefined") return;
  try { sessionStorage.setItem(CONTENT_FEEDS_KEY, JSON.stringify(feeds)); } catch {}
}

export interface Viewer { id: string; username: string; display_name: string; avatar_url: string | null; role: string; }
export interface FeedEntry { posts: any[]; nextCursor: string | null; fetchedAt: number; }
export interface ProfileEntry {
  viewer: any;
  profile: any;
  totalLikes: number;
  tierId: number | undefined;
  isFollowing: boolean;
  isSubscribed: boolean;
  subscriptionPeriodEnd: string | null;
  pricePaid?: number;      // FIX: was missing, caused price to be dropped on cache save
  selectedTier?: string;   // FIX: was missing, caused tier to be dropped on cache save
  apiPosts: ApiPost[];
  fetchedAt: number;
  fanSubscription?: any | null;
}
export interface ContentFeedEntry { posts: ApiPost[]; media: any[]; fetchedAt: number; }

export type StoryUploadPhase =
  | "idle"
  | "compressing"
  | "init"
  | "uploading"
  | "completing"
  | "processing"
  | "done";

export interface StoryUploadState {
  phase:       StoryUploadPhase;
  uploadPct:   number;
  compressPct: number;
  error:       string | null;
  storyId:     number | null;
}

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
  storyUpload: StoryUploadState;
  setStoryUpload: (patch: Partial<StoryUploadState>) => void;
  resetStoryUpload: () => void;
  isNavigating: boolean;
  setNavigating: (val: boolean) => void;
  settingsPanel: string | null;
  setSettingsPanel: (panel: string | null) => void;
  clearAll: () => void;
}

const DEFAULT_STORY_UPLOAD: StoryUploadState = { phase: "idle", uploadPct: 0, compressPct: 0, error: null, storyId: null };

export const useAppStore = create<AppStore>((set) => ({
  viewer: null,
  viewerFetchedAt: null,
  setViewer: (viewer) => { saveViewerToStorage(viewer); set({ viewer, viewerFetchedAt: viewer ? Date.now() : null }); },

  feed: loadFeedFromStorage(),
  setFeed: (entry) => { saveFeedToStorage(entry); set({ feed: entry }); },
  updateFeedPost: (postId, patch) => set((s) => {
    if (!s.feed) return s;
    const idx = s.feed.posts.findIndex((p) => String(p.id) === postId);
    if (idx === -1) return s;
    const posts = [...s.feed.posts]; posts[idx] = { ...posts[idx], ...patch };
    const updated = { ...s.feed, posts };
    // NOTE: intentionally NOT calling saveFeedToStorage here.
    // This fires on every like/comment sync — serializing the full feed
    // to sessionStorage each time blocks the main thread on low-end phones.
    // The in-memory Zustand store is sufficient for SPA navigation.
    return { feed: updated };
  }),
  clearFeed: () => { clearFeedFromStorage(); set({ feed: null }); },

  profiles: loadProfilesFromStorage(),
  setProfile: (username, entry) => set((s) => { const profiles = { ...s.profiles, [username]: entry }; saveProfilesToStorage(profiles); return { profiles }; }),
  updateProfile: (username, patch) => set((s) => { const profiles = { ...s.profiles, [username]: { ...s.profiles[username], ...patch } }; saveProfilesToStorage(profiles); return { profiles }; }),
  clearProfile: (username) => set((s) => { const profiles = { ...s.profiles }; delete profiles[username]; saveProfilesToStorage(profiles); return { profiles }; }),

  contentFeeds: loadContentFeedsFromStorage(),
  setContentFeed: (key, entry) => set((s) => { const contentFeeds = { ...s.contentFeeds, [key]: entry }; saveContentFeedsToStorage(contentFeeds); return { contentFeeds }; }),
  clearContentFeed: (key) => set((s) => { const contentFeeds = { ...s.contentFeeds }; delete contentFeeds[key]; saveContentFeedsToStorage(contentFeeds); return { contentFeeds }; }),

  storyUpload: DEFAULT_STORY_UPLOAD,
  setStoryUpload: (patch) => set((s) => ({ storyUpload: { ...s.storyUpload, ...patch } })),
  resetStoryUpload: () => set({ storyUpload: DEFAULT_STORY_UPLOAD }),

  isNavigating: false,
  setNavigating: (val) => set({ isNavigating: val }),
  settingsPanel: null,
  setSettingsPanel: (panel) => set({ settingsPanel: panel }),

  // ── Clear ALL caches: call on logout or user switch ──────────────────────
  clearAll: () => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(FEED_KEY);
        sessionStorage.removeItem(PROFILES_KEY);
        sessionStorage.removeItem(CONTENT_FEEDS_KEY);
        sessionStorage.removeItem(VIEWER_KEY);
        sessionStorage.removeItem("sb_viewed_story_ids");
        sessionStorage.removeItem("home_feed_scroll");
        sessionStorage.removeItem("home_spotlight_scroll");
        sessionStorage.removeItem("home_feed_slides");
      } catch {}
      // Notify module-level caches (ContentFeed, FeedSuggestions, PostCard viewer)
      window.dispatchEvent(new Event("freya:clear-caches"));
    }
    set({
      viewer: null,
      viewerFetchedAt: null,
      feed: null,
      profiles: {},
      contentFeeds: {},
      storyUpload: DEFAULT_STORY_UPLOAD,
    });
  },
}));