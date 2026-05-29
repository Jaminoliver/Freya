import { create } from "zustand";
import type { ApiPost } from "@/components/profile/PostRow";
import { getQueryClient } from "@/lib/providers/QueryProvider";

const STALE_MS          = 20 * 1000; // 20s — instant SPA nav, fresh on hard refresh
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
  settingsPanel: string | null;
  setSettingsPanel: (panel: string | null) => void;
  authModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  clearAll: () => void;
}

const DEFAULT_STORY_UPLOAD: StoryUploadState = { phase: "idle", uploadPct: 0, compressPct: 0, error: null, storyId: null };

export const useAppStore = create<AppStore>((set) => ({
  viewer: null,
  viewerFetchedAt: null,
  setViewer: (viewer) => { saveViewerToStorage(viewer); set({ viewer, viewerFetchedAt: viewer ? Date.now() : null }); },

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

  settingsPanel: null,
  setSettingsPanel: (panel) => set({ settingsPanel: panel }),

  authModalOpen: false,
  openAuthModal:  () => set({ authModalOpen: true }),
  closeAuthModal: () => set({ authModalOpen: false }),

  // ── Clear ALL caches: call on logout or user switch ──────────────────────
  clearAll: () => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(PROFILES_KEY);
        sessionStorage.removeItem(CONTENT_FEEDS_KEY);
        sessionStorage.removeItem(VIEWER_KEY);
        sessionStorage.removeItem("sb_viewed_story_ids");
        sessionStorage.removeItem("home_feed_scroll");
        sessionStorage.removeItem("home_spotlight_scroll");
        sessionStorage.removeItem("home_feed_slides");
      } catch {}
      // Clear TanStack Query cache (owns all server state)
      getQueryClient().clear();
      // Notify module-level caches (ContentFeed, FeedSuggestions, PostCard viewer)
      window.dispatchEvent(new Event("freya:clear-caches"));
    }
    set({
      viewer: null,
      viewerFetchedAt: null,
      profiles: {},
      contentFeeds: {},
      storyUpload: DEFAULT_STORY_UPLOAD,
    });
  },
}));