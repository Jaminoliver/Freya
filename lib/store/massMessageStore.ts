import { create } from "zustand";

export type MassSegment =
  | "active_subscribers"
  | "all_subscribers"
  | "expired_subscribers"
  | "free_followers"
  | "online_now"
  | "top_spenders"
  | "new_this_week"
  | "followers";

export interface StoredVaultItem {
  id:               number;
  media_type:       "photo" | "video" | "audio" | "gif";
  file_url:         string;
  thumbnail_url:    string | null;
  bunny_video_id:   string | null;
  width:            number | null;
  height:           number | null;
  duration_seconds: number | null;
  blur_hash:        string | null;
  aspect_ratio:     number | null;
  created_at:       string;
  last_used_at:     string | null;
}

export interface MassActiveUpload {
  videoUploadIds:    string[];   // PostUploadContext upload IDs
  receivedVaultIds:  number[];   // vault item IDs as they arrive via callback
  previewThumbnails: string[];   // thumbnail/blob URLs for preview bubble
  previewTypes:      ("photo" | "video")[];
  pendingMessage: {
    text:                  string | null;
    ppvPriceKobo:          number | null;
    audienceSegment:       string;
    excludeActiveChatters: boolean;
    scheduledFor:          string | null;
    existingVaultItemIds:  number[]; // vault items already selected (not being uploaded)
  };
}

interface MassMessageState {
  text:                  string;
  segment:               MassSegment;
  excludeActiveChatters: boolean;
  isPPV:                 boolean;
  ppvPrice:              string;
  scheduledFor:          string | null;
  selectedVaultItems:    StoredVaultItem[];
  activeUpload:          MassActiveUpload | null;

  patch:              (p: Partial<Omit<MassMessageState, "patch" | "addReceivedVaultId" | "clearDraft">>) => void;
  addReceivedVaultId: (id: number) => void;
  clearDraft:         () => void;
}

const DEFAULTS: Omit<MassMessageState, "patch" | "addReceivedVaultId" | "clearDraft"> = {
  text:                  "",
  segment:               "active_subscribers",
  excludeActiveChatters: true,
  isPPV:                 false,
  ppvPrice:              "",
  scheduledFor:          null,
  selectedVaultItems:    [],
  activeUpload:          null,
};

export const useMassMessageStore = create<MassMessageState>((set) => ({
  ...DEFAULTS,

  patch: (p) => set(p),

  addReceivedVaultId: (id) =>
    set((state) => {
      if (!state.activeUpload) return state;
      if (state.activeUpload.receivedVaultIds.includes(id)) return state;
      return {
        activeUpload: {
          ...state.activeUpload,
          receivedVaultIds: [...state.activeUpload.receivedVaultIds, id],
        },
      };
    }),

  clearDraft: () => set(DEFAULTS),
}));