import * as React from "react";
import { PostCard } from "./PostCard";
import { LockedContent } from "./LockedContent";
import { getRelativeTime } from "@/lib/utils/profile";
import type { Post } from "@/lib/types/profile";

export interface ContentFeedProps {
  posts: Post[];
  isSubscribed: boolean;
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onTip?: (postId: string) => void;
  onUnlock?: (postId: string) => void;
  emptyState?: React.ReactNode;
  className?: string;
}

export default function ContentFeed({
  posts,
  isSubscribed,
  onLike,
  onComment,
  onTip,
  onUnlock,
  emptyState,
  className,
}: ContentFeedProps) {
  const [activeTab, setActiveTab] = React.useState<"posts" | "media">("posts");

  const isPostLocked = (post: Post) => post.is_locked && !isSubscribed;

  const mediaPosts = posts.filter((p) => p.media && p.media.length > 0);

  return (
    <div className={className} style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Tabs - always visible */}
      <div style={{ display: "flex", borderBottom: "1px solid #1E1E2E", marginBottom: "16px" }}>
        {(["posts", "media"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "12px 20px",
              fontSize: "15px",
              fontWeight: 500,
              fontFamily: "'Inter', sans-serif",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: activeTab === tab ? "#8B5CF6" : "#64748B",
              borderBottom: activeTab === tab ? "2px solid #8B5CF6" : "2px solid transparent",
              marginBottom: "-1px",
              textTransform: "capitalize",
              transition: "color 0.15s ease",
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Posts Tab */}
      {activeTab === "posts" && (
        <>
          {posts.length === 0 ? (
            emptyState || (
              <div style={{ textAlign: "center", padding: "48px 24px" }}>
                <div style={{ width: "72px", height: "72px", borderRadius: "50%", backgroundColor: "#1F1F2A", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <svg width="36" height="36" fill="none" stroke="#4B5563" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#F1F5F9", margin: "0 0 8px" }}>No posts yet</h3>
                <p style={{ fontSize: "14px", color: "#64748B", margin: 0 }}>Check back later for new content</p>
              </div>
            )
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              {posts.map((post) => {
                const locked = isPostLocked(post);

                if (locked) {
                  return (
                    <div key={post.id} style={{ backgroundColor: "#13131F", borderRadius: "12px", border: "1px solid #1E1E2E", marginBottom: "16px", padding: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                        <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: post.author.avatar_url ? `url(${post.author.avatar_url}) center/cover no-repeat` : "linear-gradient(135deg, #8B5CF6, #EC4899)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: 700, color: "#fff" }}>
                          {!post.author.avatar_url && (post.author.display_name || post.author.username || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "15px", fontWeight: 600, color: "#F1F5F9" }}>{post.author.display_name || post.author.username}</span>
                            <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#8B5CF6" }} />
                          </div>
                          <span style={{ fontSize: "13px", color: "#64748B" }}>{getRelativeTime(post.created_at)}</span>
                        </div>
                      </div>
                      {post.content && (
                        <p style={{ fontSize: "15px", color: "#94A3B8", marginBottom: "12px", filter: "blur(4px)", userSelect: "none" }}>{post.content}</p>
                      )}
                      <LockedContent price={post.price || 0} mediaCount={post.media?.length || 0} onUnlock={() => onUnlock?.(post.id)} />
                    </div>
                  );
                }

                return (
                  <PostCard key={post.id} post={post} isLocked={false} onLike={onLike} onComment={onComment} onTip={onTip} />
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Media Tab */}
      {activeTab === "media" && (
        <>
          {mediaPosts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 24px" }}>
              <div style={{ width: "72px", height: "72px", borderRadius: "50%", backgroundColor: "#1F1F2A", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <svg width="36" height="36" fill="none" stroke="#4B5563" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#F1F5F9", margin: "0 0 8px" }}>No media yet</h3>
              <p style={{ fontSize: "14px", color: "#64748B", margin: 0 }}>Photos and videos will appear here</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2px" }}>
              {mediaPosts.flatMap((post) =>
                (post.media || []).map((item, i) => (
                  <div key={`${post.id}-${i}`} style={{ aspectRatio: "1", overflow: "hidden", borderRadius: "4px", backgroundColor: "#1F1F2A" }}>
                    {item.type === "image" ? (
                      <img src={item.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    ) : (
                      <video src={item.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* Load More */}
      {activeTab === "posts" && posts.length >= 10 && (
        <div style={{ marginTop: "24px", textAlign: "center" }}>
          <button style={{ fontSize: "14px", color: "#8B5CF6", background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
            Load more posts
          </button>
        </div>
      )}
    </div>
  );
}