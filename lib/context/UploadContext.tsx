// Backward-compat shim — all upload logic has moved to PostUploadContext.
// This file exists so existing imports of useUpload / UploadProvider
// from this path (e.g. the messages page) continue to work without changes.

export {
  PostUploadProvider as UploadProvider,
  usePostUpload      as useUpload,
  type UploadItem,
} from "@/lib/context/PostUploadContext";