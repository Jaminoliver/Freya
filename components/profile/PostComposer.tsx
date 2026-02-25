"use client";

import * as React from "react";
import { Image, Video, BarChart2, HelpCircle, Type } from "lucide-react";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/types/profile";

export interface PostComposerProps {
  user: User;
  onPost?: (content: string, media: File[], isLocked: boolean, price?: number) => void;
  onSchedule?: (content: string, media: File[], scheduledFor: Date) => void;
  maxCharacters?: number;
  className?: string;
}

export default function PostComposer({
  user,
  onPost,
  onSchedule,
  maxCharacters = 1000,
  className,
}: PostComposerProps) {
  const router = useRouter();
  const [expanded, setExpanded] = React.useState(false);
  const [content, setContent] = React.useState("");
  const [media, setMedia] = React.useState<File[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const characterCount = content.length;
  const isOverLimit = characterCount > maxCharacters;
  const canPost = content.trim().length > 0 && !isOverLimit;

  const firstLetter = (user.display_name || user.username || "?").charAt(0).toUpperCase();

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setMedia((prev) => [...prev, ...files]);
  };

  const handlePost = () => {
    if (canPost && onPost) {
      onPost(content, media, false, undefined);
      setContent("");
      setMedia([]);
      setExpanded(false);
      textareaRef.current?.blur();
    }
  };

  const iconBtn = (label: string, icon: React.ReactNode, onClick: () => void) => (
    <button
      key={label}
      onClick={onClick}
      aria-label={label}
      style={{
        width: "44px", height: "44px", borderRadius: "8px",
        backgroundColor: "transparent", border: "none", color: "#B0B0C8",
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        transition: "color 0.15s ease, background-color 0.15s ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; e.currentTarget.style.backgroundColor = "#1F1F2A"; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = "#B0B0C8"; e.currentTarget.style.backgroundColor = "transparent"; }}
    >
      {icon}
    </button>
  );

  return (
    <div
      style={{
        backgroundColor: "#13131F",
        borderRadius: "12px",
        border: "1px solid #1E1E2E",
        overflow: "hidden",
        fontFamily: "'Inter', sans-serif",
      }}
      className={className}
    >
      {/* Main Row: Avatar + Textarea */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "10px 14px" }}>
        <div
          style={{
            width: "40px", height: "40px", borderRadius: "50%",
            background: user.avatar_url
              ? `url(${user.avatar_url}) center/cover no-repeat`
              : "linear-gradient(135deg, #8B5CF6, #EC4899)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "14px", fontWeight: 700, color: "#FFFFFF",
            flexShrink: 0, marginTop: "6px",
          }}
        >
          {!user.avatar_url && firstLetter}
        </div>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onFocus={() => setExpanded(true)}
          onBlur={() => { if (!content.trim()) setExpanded(false); }}
          placeholder="What's on your mind?"
          rows={expanded ? 3 : 1}
          style={{
            flex: 1, backgroundColor: "transparent", border: "none", outline: "none",
            fontSize: "16px", color: content ? "#F1F5F9" : "#64748B",
            resize: "none", minHeight: "40px", fontFamily: "'Inter', sans-serif",
            lineHeight: "1.5", paddingTop: "6px", cursor: "text",
            transition: "all 0.15s ease",
          }}
        />
      </div>

      {/* Media Preview */}
      {media.length > 0 && (
        <div style={{ padding: "0 16px 12px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
          {media.map((file, index) => (
            <div key={index} style={{ position: "relative", aspectRatio: "1", borderRadius: "8px", overflow: "hidden", backgroundColor: "#1F1F2A" }}>
              <img src={URL.createObjectURL(file)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <button
                onClick={() => setMedia((prev) => prev.filter((_, i) => i !== index))}
                style={{ position: "absolute", top: "4px", right: "4px", width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.7)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}
              >×</button>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Actions */}
      <div style={{ borderTop: "1px solid #1E1E2E" }}>
        <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={handleMediaUpload} style={{ display: "none" }} />

        {/* Icons row — centered, evenly spaced */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", padding: "6px 14px" }}>
          {iconBtn("Photo", <Image size={22} strokeWidth={1.6} />, () => router.push("/create?type=photo"))}
          {iconBtn("Video", <Video size={22} strokeWidth={1.6} />, () => router.push("/create?type=video"))}
          {iconBtn("Poll", <BarChart2 size={22} strokeWidth={1.6} />, () => router.push("/create?type=poll"))}
          {iconBtn("Quiz", <HelpCircle size={22} strokeWidth={1.6} />, () => router.push("/create?type=quiz"))}
          {iconBtn("Text", <Type size={22} strokeWidth={1.6} />, () => router.push("/create?type=text"))}
        </div>

        {expanded && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px", padding: "4px 14px 10px" }}>
            <span style={{ fontSize: "12px", color: isOverLimit ? "#EF4444" : "#64748B" }}>
              {characterCount}/{maxCharacters}
            </span>
            <button
              onClick={handlePost}
              disabled={!canPost}
              style={{
                padding: "7px 18px", borderRadius: "8px",
                backgroundColor: canPost ? "#8B5CF6" : "#2D2D3D",
                border: "none", color: canPost ? "#FFFFFF" : "#64748B",
                fontSize: "13px", fontWeight: 600,
                cursor: canPost ? "pointer" : "not-allowed",
                transition: "background-color 0.15s ease",
                fontFamily: "'Inter', sans-serif",
              }}
            >Post</button>
          </div>
        )}
      </div>
    </div>
  );
}