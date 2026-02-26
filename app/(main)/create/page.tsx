"use client";

import React, { useState, Suspense } from "react";
import { ArrowLeft, X, Image, Video, BarChart2, HelpCircle, Type } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { MediaUploader } from "@/components/create/MediaUploader";
import { PollBuilder } from "@/components/create/PollBuilder";
import { PostSettings } from "@/components/create/PostSettings";
import { createClient } from "@/lib/supabase/client";

type PostType = "photo" | "video" | "poll" | "quiz" | "text";

const POST_TYPES: { key: PostType; label: string; icon: React.ReactNode }[] = [
  { key: "photo", label: "Photo", icon: <Image  size={22} strokeWidth={1.6} /> },
  { key: "video", label: "Video", icon: <Video  size={22} strokeWidth={1.6} /> },
  { key: "poll",  label: "Poll",  icon: <BarChart2  size={22} strokeWidth={1.6} /> },
  { key: "quiz",  label: "Quiz",  icon: <HelpCircle size={22} strokeWidth={1.6} /> },
  { key: "text",  label: "Text",  icon: <Type   size={22} strokeWidth={1.6} /> },
];

function isValidPostType(val: string | null): val is PostType {
  return ["photo", "video", "poll", "quiz", "text"].includes(val ?? "");
}

function CreatePostContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const typeParam    = searchParams.get("type");

  const [postType,      setPostType]     = useState<PostType>(isValidPostType(typeParam) ? typeParam : "photo");
  const [caption,       setCaption]      = useState("");
  const [files,         setFiles]        = useState<File[]>([]);
  const [audience,      setAudience]     = useState<"subscribers" | "everyone">("subscribers");
  const [isPPV,         setIsPPV]        = useState(false);
  const [ppvPrice,      setPpvPrice]     = useState("");
  const [isScheduled,   setIsScheduled]  = useState(false);
  const [schedDate,     setSchedDate]    = useState("");
  const [schedTime,     setSchedTime]    = useState("");
  const [pollOptions,   setPollOptions]  = useState(["", ""]);
  const [pollDuration,  setPollDuration] = useState("7 days");
  const [posting,        setPosting]       = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success,        setSuccess]        = useState(false);
  const [error,          setError]          = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<{
    name: string; username: string; avatar_url: string;
  }>({ name: "", username: "", avatar_url: "" });

  React.useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("display_name, username, avatar_url").eq("id", user.id).single();
      if (data) {
        setCurrentUser({
          name:       data.display_name || data.username || "",
          username:   data.username || "",
          avatar_url: data.avatar_url || "",
        });
      }
    };
    loadUser();
  }, []);

  const canPost = caption.trim().length > 0 || files.length > 0 || pollOptions.some((o) => o.trim());

  const handleClear = () => {
    setCaption("");
    setFiles([]);
    setPollOptions(["", ""]);
    setIsPPV(false);
    setPpvPrice("");
    setIsScheduled(false);
    setSchedDate("");
    setSchedTime("");
    setError(null);
  };

  const handlePost = async () => {
    if (!canPost || posting) return;
    setPosting(true);
    setError(null);

    try {
      const mediaIds: number[] = [];

      // Upload files first
      if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file      = files[i];
          const isVideo   = file.type.startsWith("video/");
          const endpoint  = isVideo ? "/api/upload/video" : "/api/upload/photo";
          const formData  = new FormData();
          formData.append("file", file);
          if (isVideo) formData.append("title", caption || file.name);

          setUploadProgress(Math.round(((i) / files.length) * 80));

          const res  = await fetch(endpoint, { method: "POST", body: formData });
          const text = await res.text();
          let data: any = {};
          try { data = JSON.parse(text); } catch { /* non-JSON response */ }
          if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
          mediaIds.push(data.mediaId);
        }
      }

      setUploadProgress(90);

      // Determine content_type
      let content_type: string = postType;
      if (postType === "poll" || postType === "quiz") content_type = "text";

      // Determine scheduled_for
      let scheduled_for: string | null = null;
      if (isScheduled && schedDate && schedTime) {
        scheduled_for = new Date(`${schedDate}T${schedTime}`).toISOString();
      }

      const res       = await fetch("/api/posts", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_type,
          caption:       caption || null,
          is_free:       audience === "everyone",
          is_ppv:        isPPV,
          ppv_price:     isPPV && ppvPrice ? Math.round(Number(ppvPrice) * 100) : null,
          media_ids:     mediaIds,
          scheduled_for,
        }),
      });
      const resText   = await res.text();
      let data: any   = {};
      try { data = JSON.parse(resText); } catch { /* non-JSON — likely a 500 HTML page */ }
      if (!res.ok) throw new Error(data.error || `Failed to create post (${res.status}: ${resText.slice(0, 120)})`);

      setUploadProgress(100);
      setSuccess(true);

      // Brief success flash then redirect to own profile
      setTimeout(() => {
        router.push(`/${currentUser.username}`);
      }, 800);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPosting(false);
      setUploadProgress(0);
    }
  };

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto", fontFamily: "'Inter', sans-serif", minHeight: "100vh" }}>
      {/* Sticky header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20,
        backgroundColor: "rgba(10,10,15,0.9)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid #2A2A3D", padding: "14px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "#A3A3C2", display: "flex", alignItems: "center", padding: 0 }}>
            <ArrowLeft size={20} />
          </button>
          <span style={{ fontSize: "16px", fontWeight: 700, color: "#FFFFFF" }}>NEW POST</span>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={handleClear}
            style={{ padding: "7px 18px", borderRadius: "20px", border: "1.5px solid #8B5CF6", backgroundColor: "transparent", color: "#8B5CF6", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
          >CLEAR</button>
          <button
            onClick={handlePost}
            disabled={!canPost || posting}
            style={{ padding: "7px 18px", borderRadius: "20px", border: "none", backgroundColor: success ? "#22C55E" : (canPost && !posting ? "#8B5CF6" : "#2A2A3D"), color: canPost && !posting ? "#fff" : "#6B6B8A", fontSize: "13px", fontWeight: 600, cursor: canPost && !posting ? "pointer" : "default", fontFamily: "'Inter', sans-serif", transition: "all 0.2s", minWidth: "64px" }}
          >
            {success ? "✓" : posting ? `${uploadProgress}%` : "POST"}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {(posting || success) && (
        <div style={{ height: "2px", backgroundColor: "#1F1F2A" }}>
          <div style={{ height: "100%", backgroundColor: success ? "#22C55E" : "#8B5CF6", width: `${uploadProgress}%`, transition: "width 0.3s, background-color 0.3s" }} />
        </div>
      )}

      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {error && (
          <div style={{ padding: "12px 14px", borderRadius: "10px", backgroundColor: "rgba(239,68,68,0.08)", border: "1.5px solid rgba(239,68,68,0.2)", color: "#EF4444", fontSize: "13px" }}>
            {error}
          </div>
        )}

        <div style={{ backgroundColor: "#0D0D18", border: "1.5px solid #2A2A3D", borderRadius: "14px", overflow: "hidden" }}>
          {(postType === "poll" || postType === "quiz") && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", backgroundColor: "#1C1C2E", borderBottom: "1px solid #2A2A3D" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {postType === "poll" ? <BarChart2 size={18} color="#8B5CF6" /> : <HelpCircle size={18} color="#8B5CF6" />}
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#FFFFFF" }}>{postType === "poll" ? "Poll" : "Quiz"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <select value={pollDuration} onChange={(e) => setPollDuration(e.target.value)} style={{ backgroundColor: "transparent", border: "none", color: "#A3A3C2", fontSize: "13px", cursor: "pointer", outline: "none", fontFamily: "'Inter', sans-serif" }}>
                  {["1 day", "3 days", "7 days", "14 days"].map((d) => <option key={d} value={d} style={{ backgroundColor: "#1C1C2E" }}>{d}</option>)}
                </select>
                <button onClick={() => setPostType("photo")} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B6B8A", display: "flex" }}>
                  <X size={18} />
                </button>
              </div>
            </div>
          )}

          <div style={{ padding: "14px 16px 10px" }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <Avatar src={currentUser.avatar_url} alt={currentUser.name} size="md" showRing />
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: "2px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "#FFFFFF" }}>{currentUser.name}</span>
                </div>
                <span style={{ fontSize: "12px", color: "#8A8AA0" }}>@{currentUser.username}</span>
              </div>
            </div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={postType === "poll" || postType === "quiz" ? "Add a question or context..." : "Write a caption…"}
              style={{ width: "100%", minHeight: "70px", backgroundColor: "transparent", border: "none", outline: "none", color: "#E2E8F0", fontSize: "15px", lineHeight: 1.6, resize: "none", fontFamily: "'Inter', sans-serif", marginTop: "12px", boxSizing: "border-box" }}
            />
          </div>

          {(postType === "poll" || postType === "quiz") && (
            <div style={{ borderTop: "1px solid #2A2A3D" }}>
              <PollBuilder type={postType} options={pollOptions} onChange={setPollOptions} />
            </div>
          )}

          {(postType === "photo" || postType === "video") && (
            <div style={{ padding: "0 16px 14px", borderTop: "1px solid #2A2A3D", paddingTop: "14px", position: "relative" }}>
              {posting && (
                <div style={{
                  position: "absolute", inset: 0, zIndex: 10,
                  backgroundColor: "rgba(10,10,15,0.75)",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px",
                  borderRadius: "8px",
                }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", border: "3px solid #2A2A3D", borderTop: "3px solid #8B5CF6", animation: "spin 0.9s linear infinite" }} />
                  <span style={{ fontSize: "13px", color: "#A3A3C2", fontFamily: "'Inter', sans-serif" }}>
                    {uploadProgress < 80 ? "Uploading…" : uploadProgress < 100 ? "Creating post…" : "Done!"}
                  </span>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              )}
              <MediaUploader type={postType} files={files} onChange={setFiles} />
            </div>
          )}

          {postType === "text" && (
            <div style={{ margin: "0 16px 14px", borderTop: "1px solid #2A2A3D", paddingTop: "14px", textAlign: "center", color: "#4A4A6A", fontSize: "13px" }}>
              Text-only post — just write your caption above and hit Post.
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", padding: "8px 12px", borderTop: "1px solid #2A2A3D", opacity: posting ? 0.4 : 1, pointerEvents: posting ? "none" : "auto" }}>
            {POST_TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => setPostType(t.key)}
                aria-label={t.label}
                style={{ width: "44px", height: "44px", borderRadius: "8px", border: "none", backgroundColor: postType === t.key ? "rgba(139,92,246,0.15)" : "transparent", color: postType === t.key ? "#8B5CF6" : "#B0B0C8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                onMouseEnter={(e) => { if (postType !== t.key) { e.currentTarget.style.color = "#FFFFFF"; e.currentTarget.style.backgroundColor = "#1F1F2A"; } }}
                onMouseLeave={(e) => { if (postType !== t.key) { e.currentTarget.style.color = "#B0B0C8"; e.currentTarget.style.backgroundColor = "transparent"; } }}
              >
                {t.icon}
              </button>
            ))}
          </div>
        </div>

        <PostSettings
          audience={audience}
          onAudienceChange={setAudience}
          isPPV={isPPV}
          onPPVChange={setIsPPV}
          ppvPrice={ppvPrice}
          onPPVPriceChange={setPpvPrice}
          isScheduled={isScheduled}
          onScheduledChange={setIsScheduled}
          schedDate={schedDate}
          onSchedDateChange={setSchedDate}
          schedTime={schedTime}
          onSchedTimeChange={setSchedTime}
          onCancel={() => router.back()}
        />
      </div>
    </div>
  );
}

export default function CreatePostPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", backgroundColor: "#0A0A0F" }} />}>
      <CreatePostContent />
    </Suspense>
  );
}