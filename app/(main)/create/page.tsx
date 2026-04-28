"use client";

import React, { useState, Suspense, useCallback, useMemo } from "react";
import { ArrowLeft, ImagePlus, BarChart2, HelpCircle, Lock, Calendar, ChevronDown, Type, Film } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { MediaUploader } from "@/components/create/MediaUploader";
import { ThumbnailPicker } from "@/components/create/ThumbnailPicker";
import { PollBuilder } from "@/components/create/PollBuilder";
import { TextComposer } from "@/components/create/TextComposer";
import { createClient } from "@/lib/supabase/client";
import { usePostUpload } from "@/lib/context/PostUploadContext";
import { useAppStore } from "@/lib/store/appStore";

/* ── types ──────────────────────────────────────────────────────────────────── */

type ActivePanel = "none" | "poll" | "quiz" | "text";

/* ── main content ──────────────────────────────────────────────────────────── */

function CreatePostContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const {
    startVideoUpload,
    startPhotoUpload,
    startMultiPhotoUpload,
    startTextPost,
    startPollPost,
  } = usePostUpload();

  const { clearProfile, clearContentFeed } = useAppStore();

  /* ── state ──────────────────────────────────────────────────────────────── */

  const [caption,           setCaption]           = useState("");
  const [files,             setFiles]             = useState<File[]>([]);
  const [activePanel,       setActivePanel]       = useState<ActivePanel>("none");
  const [audience,          setAudience]          = useState<"subscribers" | "everyone">("subscribers");
  const [isPPV,             setIsPPV]             = useState(false);
  const [ppvPrice,          setPpvPrice]          = useState("");
  const [isScheduled,       setIsScheduled]       = useState(false);
  const [schedDate,         setSchedDate]         = useState("");
  const [schedTime,         setSchedTime]         = useState("");
  const [pollOptions,       setPollOptions]       = useState(["", ""]);
  const [pollDuration,      setPollDuration]      = useState("7 days");
  const [textContent,       setTextContent]       = useState("");
  const [textBackground,    setTextBackground]    = useState("dark");
  const [posting,           setPosting]           = useState(false);
  const [error,             setError]             = useState<string | null>(null);

  const [thumbnailBlob,    setThumbnailBlob]    = useState<Blob | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [thumbOpen,        setThumbOpen]        = useState(false);

  /* ── user ───────────────────────────────────────────────────────────────── */

  const [currentUser, setCurrentUser] = useState<{ name: string; username: string; avatar_url: string }>({
    name: "", username: "", avatar_url: "",
  });
  const [userLoaded, setUserLoaded] = useState(false);
  const usernameRef = React.useRef<string>("");

  React.useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("display_name, username, avatar_url")
        .eq("id", user.id)
        .single();
      if (data) {
        const username = data.username || "";
        usernameRef.current = username;
        setCurrentUser({
          name:       data.display_name || username || "",
          username,
          avatar_url: data.avatar_url || "",
        });
      }
      setUserLoaded(true);
    };
    loadUser();
  }, []);

  /* reset thumbnail when files change */
  React.useEffect(() => {
    setThumbnailBlob(null);
    setThumbnailPreview(null);
  }, [files]);

  /* ── derived state ─────────────────────────────────────────────────────── */

  const hasVideo    = files.some((f) => f.type.startsWith("video/"));
  const hasImages   = files.some((f) => f.type.startsWith("image/"));
  const videoFile   = hasVideo ? files.find((f) => f.type.startsWith("video/")) ?? null : null;
  const hasPoll     = activePanel === "poll" || activePanel === "quiz";
  const hasText     = activePanel === "text";
  const pollValid   = pollOptions.filter((o) => o.trim().length > 0).length >= 2;

  /* auto-detect post type for API */
  const resolvedPostType = useMemo(() => {
    if (hasPoll) return activePanel as "poll" | "quiz";
    if (hasVideo) return "video" as const;
    if (files.length > 0) return "photo" as const;
    return "text" as const;
  }, [hasPoll, activePanel, hasVideo, files.length]);

  const canPost = (() => {
    if (hasPoll)  return caption.trim().length > 0 && pollValid;
    if (hasText)  return textContent.trim().length > 0;
    if (files.length > 0) return true;
    return caption.trim().length > 0;
  })();

  /* ── handlers ──────────────────────────────────────────────────────────── */

  const togglePanel = useCallback((panel: "poll" | "quiz" | "text") => {
    setActivePanel((prev) => prev === panel ? "none" : panel);
    setPollOptions(["", ""]);
    setTextContent("");
    setTextBackground("dark");
  }, []);

  const createPost = async (mediaIds: number[]) => {
    const apiContentType = resolvedPostType === "quiz" ? "poll" : resolvedPostType;

    let scheduled_for: string | null = null;
    if (isScheduled && schedDate && schedTime) {
      scheduled_for = new Date(`${schedDate}T${schedTime}`).toISOString();
    }

    const body: Record<string, unknown> = {
      content_type:    apiContentType,
      caption:         hasText ? textContent : (caption || null),
      text_background: hasText ? textBackground : null,
      audience,
      is_ppv:          isPPV,
      ppv_price:       isPPV && ppvPrice ? Math.round(Number(ppvPrice) * 100) : null,
      media_ids:       mediaIds,
      scheduled_for,
    };

    if (hasPoll) {
      body.poll_options  = pollOptions.filter((o) => o.trim().length > 0);
      body.poll_duration = pollDuration;
    }

    const res  = await fetch("/api/posts", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create post");
    return data;
  };

  const invalidateProfileCache = () => {
    const username = usernameRef.current;
    if (username) { clearProfile(username); clearContentFeed(username); }
  };

  const handlePost = async () => {
    if (!canPost || posting || !userLoaded) return;
    setPosting(true);
    setError(null);

    try {
      const photoFiles = files.filter((f) => f.type.startsWith("image/"));
      const videoFile  = files.find((f) => f.type.startsWith("video/"));

      if (photoFiles.length > 0 && videoFile) {
        let photoMediaIds: number[] = [];
        let videoMediaId: number | null = null;
        let photosDone = false;
        let videoDone  = false;

        const tryCreatePost = async () => {
          if (!photosDone || !videoDone) return;
          try {
            const allIds = [...photoMediaIds, ...(videoMediaId != null ? [videoMediaId] : [])];
            await createPost(allIds);
            invalidateProfileCache();
          } catch (err) {
            console.error("[CreatePost] mixed post create error:", err);
          }
        };

        if (photoFiles.length === 1) {
          startPhotoUpload({
            file: photoFiles[0],
            onMediaId: async (mediaId) => {
              photoMediaIds = [mediaId];
              photosDone = true;
              await tryCreatePost();
            },
            onError: (err) => console.error("[CreatePost] mixed photo error:", err),
          });
        } else {
          startMultiPhotoUpload({
            files: photoFiles,
            onMediaIds: async (ids) => {
              photoMediaIds = ids;
              photosDone = true;
              await tryCreatePost();
            },
            onError: (err) => console.error("[CreatePost] mixed photos error:", err),
          });
        }

        startVideoUpload({
          file:          videoFile,
          title:         caption || videoFile.name,
          thumbnailBlob: thumbnailBlob ?? undefined,
          onMediaId: async (mediaId) => {
            videoMediaId = mediaId;
            videoDone = true;
            await tryCreatePost();
          },
          onError: (err) => console.error("[CreatePost] mixed video error:", err),
        });

        invalidateProfileCache();
        router.push(`/${currentUser.username}`);
        return;
      }

      if (videoFile) {
        startVideoUpload({
          file:          videoFile,
          title:         caption || videoFile.name,
          thumbnailBlob: thumbnailBlob ?? undefined,
          onMediaId: async (mediaId) => {
            try { await createPost([mediaId]); invalidateProfileCache(); }
            catch (err) { console.error("[CreatePost] video post error:", err); }
          },
          onError: (err) => console.error("[CreatePost] video upload error:", err),
        });
        invalidateProfileCache();
        router.push(`/${currentUser.username}`);
        return;
      }

      if (photoFiles.length === 1) {
        startPhotoUpload({
          file: photoFiles[0],
          onMediaId: async (mediaId) => {
            try { await createPost([mediaId]); invalidateProfileCache(); }
            catch (err) { console.error("[CreatePost] photo post error:", err); }
          },
          onError: (err) => console.error("[CreatePost] photo upload error:", err),
        });
        invalidateProfileCache();
        router.push(`/${currentUser.username}`);
        return;
      }

      if (photoFiles.length > 1) {
        startMultiPhotoUpload({
          files: photoFiles,
          onMediaIds: async (mediaIds) => {
            try { await createPost(mediaIds); invalidateProfileCache(); }
            catch (err) { console.error("[CreatePost] multi photo error:", err); }
          },
          onError: (err) => console.error("[CreatePost] multi photo upload error:", err),
        });
        invalidateProfileCache();
        router.push(`/${currentUser.username}`);
        return;
      }

      if (resolvedPostType === "text") {
        await createPost([]);
        invalidateProfileCache();
        startTextPost({
          label:   textContent.slice(0, 40) || "Text post",
          onDone:  async () => {},
          onError: (err) => console.error("[CreatePost] text post error:", err),
        });
        router.push(`/${currentUser.username}`);
        return;
      }

      if (hasPoll) {
        await createPost([]);
        invalidateProfileCache();
        startPollPost({
          label:   caption.slice(0, 40) || "Poll",
          onDone:  async () => {},
          onError: (err) => console.error("[CreatePost] poll error:", err),
        });
        router.push(`/${currentUser.username}`);
        return;
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPosting(false);
    }
  };

  /* ── render ─────────────────────────────────────────────────────────────── */

  return (
    <div style={{
      maxWidth: "680px", margin: "0 auto",
      fontFamily: "'Inter', sans-serif",
      minHeight: "100dvh",
      display: "flex", flexDirection: "column",
      backgroundColor: "#0A0A0F",
    }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20,
        backgroundColor: "rgba(10,10,15,0.9)",
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        padding: "12px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid #1F1F2A",
      }}>
        <button
          onClick={() => router.back()}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "#D4D4E8", display: "flex", alignItems: "center", /* ← whiter */
            padding: "4px",
          }}
        >
          <ArrowLeft size={26} strokeWidth={2} /> {/* ← bigger */}
        </button>

        <span style={{
          fontSize: "17px", fontWeight: 700, color: "#FFFFFF", /* ← bigger + whiter */
          letterSpacing: "-0.01em",
        }}>
          Create
        </span>

        <button
          onClick={handlePost}
          disabled={!canPost || posting || !userLoaded}
          style={{
            padding: "7px 20px", borderRadius: "20px",
            border: "none",
            backgroundColor: canPost && !posting && userLoaded ? "#8B5CF6" : "#2A2A3D",
            color: canPost && !posting && userLoaded ? "#fff" : "#6B6B8A",
            fontSize: "15px", fontWeight: 600, /* ← bigger */
            cursor: canPost && !posting && userLoaded ? "pointer" : "default",
            fontFamily: "inherit",
            transition: "all 0.2s",
          }}
        >
          {posting ? "Posting…" : "Post"}
        </button>
      </div>

      {/* ── Content area ────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, padding: "16px",
        display: "flex", flexDirection: "column", gap: "16px",
      }}>

        {/* Error */}
        {error && (
          <div style={{
            padding: "12px 14px", borderRadius: "12px",
            backgroundColor: "rgba(239,68,68,0.06)",
            color: "#EF4444", fontSize: "14px",
          }}>
            {error}
          </div>
        )}

        {/* ── Compose area ────────────────────────────────────────────── */}
        {!hasText && (
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
            {/* ↓ avatar size bumped from "sm" to "md" */}
            <div style={{ paddingTop: "2px", flexShrink: 0 }}>
              <Avatar src={currentUser.avatar_url} alt={currentUser.name} size="md" showRing={false} />
            </div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={hasPoll ? "Ask a question…" : "Add caption…"}
              rows={3}
              style={{
                flex: 1,
                backgroundColor: "transparent",
                border: "none", outline: "none",
                color: "#FFFFFF",        /* ← whiter */
                fontSize: "17px",        /* ← bigger */
                lineHeight: 1.6,
                resize: "none",
                fontFamily: "inherit",
                padding: 0,
                minHeight: "72px",
              }}
            />
          </div>
        )}

        {/* ── Unified media / poll / text area ─────────────────────────── */}
        {hasPoll
          ? <PollBuilder type={activePanel as "poll" | "quiz"} options={pollOptions} onChange={setPollOptions} />
          : hasText
          ? <TextComposer value={textContent} onChange={setTextContent} onBgChange={setTextBackground} />
          : <MediaUploader files={files} onChange={setFiles} />
        }

        {/* ── Thumbnail picker (video only, no poll) ──────────────────── */}
        {videoFile && !hasPoll && (
          <div style={{ borderRadius: "14px", backgroundColor: "#0D0D18", overflow: "hidden" }}>
            {/* Collapsed header / toggle button */}
            <button
              onClick={() => setThumbOpen((v) => !v)}
              style={{
                width:           "100%",
                display:         "flex",
                alignItems:      "center",
                justifyContent:  "space-between",
                padding:         "14px 16px",
                background:      "none",
                border:          "none",
                cursor:          "pointer",
                fontFamily:      "inherit",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Film size={17} color="#8B5CF6" />
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#D4D4E8" }}>Cover frame</span>
                {thumbnailPreview && (
                  <img
                    src={thumbnailPreview}
                    alt=""
                    style={{ width: "28px", height: "28px", borderRadius: "6px", objectFit: "cover" }}
                  />
                )}
              </div>
              <ChevronDown
                size={18}
                color="#8A8AA0"
                style={{
                  transform:  thumbOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}
              />
            </button>

            {/* Slideable body */}
            <div style={{
              maxHeight:  thumbOpen ? "600px" : "0px",
              overflow:   "hidden",
              transition: "max-height 0.3s ease",
            }}>
              <div style={{ padding: "0 14px 14px" }}>
                <ThumbnailPicker
                  file={videoFile}
                  onPicked={(blob, previewUrl) => {
                    setThumbnailBlob(blob);
                    setThumbnailPreview(previewUrl);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Divider ─────────────────────────────────────────────────── */}
        <div style={{ height: "1px", backgroundColor: "#1F1F2A" }} />

        {/* ── Toolbar ─────────────────────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center",
          gap: "6px",
        }}>
          {/* Media button */}
          <ToolbarButton
            icon={<ImagePlus size={22} strokeWidth={1.8} />}  /* ← bigger */
            active={!hasPoll && !hasText && files.length > 0}
            label={!hasPoll && !hasText && files.length > 0 ? `${files.length}` : undefined}
            onClick={() => {
              if (hasPoll || hasText) {
                setActivePanel("none");
                setPollOptions(["", ""]);
                setTextContent("");
                setTextBackground("dark");
                setTimeout(() => {
                  const input = document.querySelector('input[type="file"][accept]') as HTMLInputElement;
                  input?.click();
                }, 50);
              } else {
                const input = document.querySelector('input[type="file"][accept]') as HTMLInputElement;
                input?.click();
              }
            }}
          />

          {/* Poll */}
          <ToolbarButton
            icon={<BarChart2 size={22} strokeWidth={1.8} />}  /* ← bigger */
            active={activePanel === "poll"}
            onClick={() => togglePanel("poll")}
          />

          {/* Quiz */}
          <ToolbarButton
            icon={<HelpCircle size={22} strokeWidth={1.8} />}  /* ← bigger */
            active={activePanel === "quiz"}
            onClick={() => togglePanel("quiz")}
          />

          {/* Text composer */}
          <ToolbarButton
            icon={<Type size={22} strokeWidth={1.8} />}  /* ← bigger */
            active={activePanel === "text"}
            onClick={() => togglePanel("text")}
          />

          <div style={{ flex: 1 }} />

          {/* Audience */}
          <button
            onClick={() => setAudience((a) => a === "subscribers" ? "everyone" : "subscribers")}
            style={{
              display: "flex", alignItems: "center", gap: "5px",
              padding: "6px 12px", borderRadius: "20px",
              border: "none",
              backgroundColor: "#1A1A2E",
              color: "#D4D4E8",     /* ← whiter */
              fontSize: "13px", fontWeight: 600, /* ← bigger */
              cursor: "pointer", fontFamily: "inherit",
              transition: "background-color 0.15s",
            }}
          >
            {audience === "subscribers" ? "Subscribers" : "Everyone"}
            <ChevronDown size={14} strokeWidth={2} />
          </button>
        </div>

        {/* ── Settings (PPV + Schedule) ───────────────────────────────── */}
        <div style={{
          display: "flex", flexDirection: "column", gap: "0",
          borderRadius: "14px",
          backgroundColor: "#0D0D18",
          overflow: "hidden",
        }}>
          {/* PPV toggle */}
          <div style={{
            padding: "14px 16px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            borderBottom: "1px solid #2A2A3D",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Lock size={18} color="#9090B0" strokeWidth={1.5} />  {/* ← bigger + whiter */}
              <div>
                <div style={{ fontSize: "15px", fontWeight: 500, color: "#FFFFFF" }}>Pay-Per-View</div>  {/* ← bigger + whiter */}
                <div style={{ fontSize: "12px", color: "#6B6B8A", marginTop: "1px" }}>Fans pay to unlock</div>
              </div>
            </div>
            <Toggle on={isPPV} onToggle={() => setIsPPV(!isPPV)} />
          </div>

          {/* PPV price input */}
          {isPPV && (
            <div style={{
              padding: "0 16px 14px",
              display: "flex", alignItems: "center", gap: "10px",
            }}>
              <div style={{
                display: "flex", alignItems: "center", gap: "8px",
                flex: 1,
                backgroundColor: "#1A1A2E",
                borderRadius: "10px",
                padding: "10px 14px",
              }}>
                <span style={{ color: "#9090B0", fontSize: "15px", fontWeight: 600 }}>₦</span>
                <input
                  type="number"
                  min="100"
                  max="50000"
                  value={ppvPrice}
                  onChange={(e) => setPpvPrice(e.target.value)}
                  placeholder="Price"
                  style={{
                    flex: 1, backgroundColor: "transparent",
                    border: "none", outline: "none",
                    color: "#FFFFFF", fontSize: "15px",
                    fontFamily: "inherit", caretColor: "#8B5CF6",
                  }}
                />
              </div>
            </div>
          )}

          {/* Schedule toggle */}
          <div style={{
            padding: "14px 16px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Calendar size={18} color="#9090B0" strokeWidth={1.5} />  {/* ← bigger + whiter */}
              <div>
                <div style={{ fontSize: "15px", fontWeight: 500, color: "#FFFFFF" }}>Schedule</div>  {/* ← bigger + whiter */}
                <div style={{ fontSize: "12px", color: "#6B6B8A", marginTop: "1px" }}>Publish later</div>
              </div>
            </div>
            <Toggle on={isScheduled} onToggle={() => setIsScheduled(!isScheduled)} />
          </div>

          {/* Schedule inputs */}
          {isScheduled && (
            <div style={{ padding: "0 16px 14px", display: "flex", gap: "8px" }}>
              <input
                type="date"
                value={schedDate}
                onChange={(e) => setSchedDate(e.target.value)}
                style={{
                  flex: 1, backgroundColor: "#1A1A2E",
                  border: "none", borderRadius: "10px",
                  padding: "10px 14px", color: "#FFFFFF",
                  fontSize: "14px", fontFamily: "inherit",
                  outline: "none", colorScheme: "dark",
                }}
              />
              <input
                type="time"
                value={schedTime}
                onChange={(e) => setSchedTime(e.target.value)}
                style={{
                  flex: 1, backgroundColor: "#1A1A2E",
                  border: "none", borderRadius: "10px",
                  padding: "10px 14px", color: "#FFFFFF",
                  fontSize: "14px", fontFamily: "inherit",
                  outline: "none", colorScheme: "dark",
                }}
              />
            </div>
          )}
        </div>

        {/* Bottom spacing */}
        <div style={{ height: "24px" }} />
      </div>
    </div>
  );
}

/* ── Toggle component ──────────────────────────────────────────────────────── */

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      style={{
        width: "44px", height: "26px",
        borderRadius: "13px",
        backgroundColor: on ? "#8B5CF6" : "#2A2A3D",
        cursor: "pointer",
        position: "relative",
        transition: "background-color 0.2s",
        flexShrink: 0,
      }}
    >
      <div style={{
        position: "absolute",
        top: "3px",
        left: on ? "21px" : "3px",
        width: "20px", height: "20px",
        borderRadius: "50%",
        backgroundColor: "#fff",
        transition: "left 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
      }} />
    </div>
  );
}

/* ── Toolbar button ────────────────────────────────────────────────────────── */

function ToolbarButton({
  icon, active, label, onClick,
}: {
  icon: React.ReactNode; active: boolean; label?: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: "4px",
        padding: "8px 12px",
        borderRadius: "10px",
        border: "none",
        backgroundColor: active ? "rgba(139,92,246,0.12)" : "transparent",
        color: active ? "#8B5CF6" : "#C4C4D4",   /* ← whiter inactive state */
        cursor: "pointer",
        transition: "all 0.15s",
        fontFamily: "inherit",
        fontSize: "13px",
        fontWeight: 600,
      }}
    >
      {icon}
      {label && <span>{label}</span>}
    </button>
  );
}

/* ── Page wrapper ──────────────────────────────────────────────────────────── */

export default function CreatePostPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", backgroundColor: "#0A0A0F" }} />}>
      <CreatePostContent />
    </Suspense>
  );
}