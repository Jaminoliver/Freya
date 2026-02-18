import * as React from "react";
import { Image, Video, BarChart2, Lock, Unlock } from "lucide-react";
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
  const [expanded, setExpanded] = React.useState(false);
  const [content, setContent] = React.useState("");
  const [media, setMedia] = React.useState<File[]>([]);
  const [isLocked, setIsLocked] = React.useState(false);
  const [price, setPrice] = React.useState<number>(0);
  const [showPricing, setShowPricing] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const characterCount = content.length;
  const isOverLimit = characterCount > maxCharacters;
  const canPost = content.trim().length > 0 && !isOverLimit;

  const firstLetter = (user.display_name || user.username || "?").charAt(0).toUpperCase();

  const handleExpand = () => {
    setExpanded(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setMedia((prev) => [...prev, ...files]);
  };

  const handlePost = () => {
    if (canPost && onPost) {
      onPost(content, media, isLocked, isLocked ? price : undefined);
      setContent("");
      setMedia([]);
      setIsLocked(false);
      setPrice(0);
      setShowPricing(false);
      setExpanded(false);
    }
  };

  const toggleLock = () => {
    setIsLocked(!isLocked);
    setShowPricing(!isLocked);
    if (isLocked) setPrice(0);
  };

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
      {/* Main Row: Avatar + Placeholder/Textarea */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px" }}>
        {/* Avatar */}
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: user.avatar_url
              ? `url(${user.avatar_url}) center/cover no-repeat`
              : "linear-gradient(135deg, #8B5CF6, #EC4899)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
            fontWeight: 700,
            color: "#FFFFFF",
            flexShrink: 0,
          }}
        >
          {!user.avatar_url && firstLetter}
        </div>

        {/* Input area */}
        {!expanded ? (
          <div
            onClick={handleExpand}
            style={{
              flex: 1,
              fontSize: "15px",
              color: "#64748B",
              cursor: "text",
              padding: "6px 0",
            }}
          >
            What&apos;s on your mind?
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            style={{
              flex: 1,
              backgroundColor: "transparent",
              border: "none",
              outline: "none",
              fontSize: "15px",
              color: "#F1F5F9",
              resize: "none",
              minHeight: "40px",
              fontFamily: "'Inter', sans-serif",
              lineHeight: "1.5",
            }}
            rows={2}
          />
        )}
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
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pricing */}
      {showPricing && (
        <div style={{ margin: "0 16px 12px", padding: "10px 12px", backgroundColor: "#1F1F2A", borderRadius: "8px", border: "1px solid #2D2D3D" }}>
          <label style={{ display: "block", fontSize: "12px", color: "#94A3B8", marginBottom: "6px" }}>Set price for this post</label>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "#F1F5F9", fontSize: "14px" }}>₦</span>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              min="0"
              step="100"
              placeholder="0"
              style={{ flex: 1, backgroundColor: "#0A0A0F", border: "1px solid #2D2D3D", borderRadius: "6px", padding: "6px 10px", fontSize: "14px", color: "#F1F5F9", outline: "none" }}
            />
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", borderTop: "1px solid #1E1E2E" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={handleMediaUpload} style={{ display: "none" }} />

          {[
            { icon: <Image size={18} strokeWidth={1.8} />, label: "Image", onClick: () => fileInputRef.current?.click() },
            { icon: <Video size={18} strokeWidth={1.8} />, label: "Video", onClick: () => fileInputRef.current?.click() },
            { icon: <BarChart2 size={18} strokeWidth={1.8} />, label: "Poll", onClick: () => {} },
          ].map((btn) => (
            <button
              key={btn.label}
              onClick={btn.onClick}
              aria-label={btn.label}
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "8px",
                backgroundColor: "transparent",
                border: "none",
                color: "#64748B",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "color 0.15s ease, background-color 0.15s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#A3A3C2"; e.currentTarget.style.backgroundColor = "#1F1F2A"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#64748B"; e.currentTarget.style.backgroundColor = "transparent"; }}
            >
              {btn.icon}
            </button>
          ))}

          {/* Lock */}
          <button
            onClick={toggleLock}
            aria-label={isLocked ? "Unlock post" : "Lock post"}
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "8px",
              backgroundColor: isLocked ? "rgba(139, 92, 246, 0.15)" : "transparent",
              border: "none",
              color: isLocked ? "#8B5CF6" : "#64748B",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => { if (!isLocked) { e.currentTarget.style.color = "#A3A3C2"; e.currentTarget.style.backgroundColor = "#1F1F2A"; } }}
            onMouseLeave={(e) => { if (!isLocked) { e.currentTarget.style.color = "#64748B"; e.currentTarget.style.backgroundColor = "transparent"; } }}
          >
            {isLocked ? <Lock size={18} strokeWidth={1.8} /> : <Unlock size={18} strokeWidth={1.8} />}
          </button>
        </div>

        {/* Right side: char count + post button (only when expanded) */}
        {expanded && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "12px", color: isOverLimit ? "#EF4444" : "#64748B" }}>
              {characterCount}/{maxCharacters}
            </span>
            <button
              onClick={handlePost}
              disabled={!canPost}
              style={{
                padding: "7px 18px",
                borderRadius: "8px",
                backgroundColor: canPost ? "#8B5CF6" : "#2D2D3D",
                border: "none",
                color: canPost ? "#FFFFFF" : "#64748B",
                fontSize: "13px",
                fontWeight: 600,
                cursor: canPost ? "pointer" : "not-allowed",
                transition: "background-color 0.15s ease",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              Post
            </button>
          </div>
        )}
      </div>
    </div>
  );
}