// lib/vault/autoArchive.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export type VaultMediaType = "photo" | "video" | "audio" | "gif";
export type VaultSourceType = "manual" | "post" | "message" | "mass_message";

export interface AutoArchiveInput {
  creator_id:        string;
  media_type:        VaultMediaType;
  file_url:          string;
  thumbnail_url?:    string | null;
  width?:            number | null;
  height?:           number | null;
  duration_seconds?: number | null;
  file_size_bytes?:  number | null;
  mime_type?:        string | null;
  bunny_video_id?:   string | null;
  blur_hash?:        string | null;
  aspect_ratio?:     number | null;
  source_type:       VaultSourceType;
  source_id?:        number | null;
}

/**
 * Adds an uploaded media item to the creator's vault.
 *
 * Fire-and-forget: failures are logged but not thrown so the calling
 * upload route never fails because of a vault archive issue.
 *
 * Caller must pass a Supabase client that can write to vault_items —
 * either a server client for the authenticated user, or a service-role
 * client when archiving on behalf of a user from a webhook/worker.
 */
export async function autoArchiveToVault(
  supabase: SupabaseClient,
  input: AutoArchiveInput
): Promise<{ id: number } | null> {
  try {
    if (!input.creator_id || !input.media_type || !input.file_url) {
      console.warn("[autoArchiveToVault] missing required fields", input);
      return null;
    }

    const { data, error } = await supabase
      .from("vault_items")
      .insert({
        creator_id:       input.creator_id,
        media_type:       input.media_type,
        file_url:         input.file_url,
        thumbnail_url:    input.thumbnail_url    ?? null,
        width:            input.width            ?? null,
        height:           input.height           ?? null,
        duration_seconds: input.duration_seconds ?? null,
        file_size_bytes:  input.file_size_bytes  ?? null,
        mime_type:        input.mime_type        ?? null,
        bunny_video_id:   input.bunny_video_id   ?? null,
        blur_hash:        input.blur_hash        ?? null,
        aspect_ratio:     input.aspect_ratio     ?? null,
        source_type:      input.source_type,
        source_id:        input.source_id        ?? null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[autoArchiveToVault] insert error:", error.message);
      return null;
    }
    return { id: data.id };
  } catch (err) {
    console.error("[autoArchiveToVault] exception:", err);
    return null;
  }
}

/**
 * Bulk variant for posts/mass messages with multiple media files.
 * Returns the inserted ids in the same order as input.
 */
export async function autoArchiveMany(
  supabase: SupabaseClient,
  inputs: AutoArchiveInput[]
): Promise<number[]> {
  if (!inputs.length) return [];
  try {
    const rows = inputs.map((i) => ({
      creator_id:       i.creator_id,
      media_type:       i.media_type,
      file_url:         i.file_url,
      thumbnail_url:    i.thumbnail_url    ?? null,
      width:            i.width            ?? null,
      height:           i.height           ?? null,
      duration_seconds: i.duration_seconds ?? null,
      file_size_bytes:  i.file_size_bytes  ?? null,
      mime_type:        i.mime_type        ?? null,
      bunny_video_id:   i.bunny_video_id   ?? null,
      blur_hash:        i.blur_hash        ?? null,
      aspect_ratio:     i.aspect_ratio     ?? null,
      source_type:      i.source_type,
      source_id:        i.source_id        ?? null,
    }));

    const { data, error } = await supabase
      .from("vault_items")
      .insert(rows)
      .select("id");

    if (error) {
      console.error("[autoArchiveMany] insert error:", error.message);
      return [];
    }
    return (data ?? []).map((r) => r.id);
  } catch (err) {
    console.error("[autoArchiveMany] exception:", err);
    return [];
  }
}