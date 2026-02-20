import * as React from "react";
import { PostCard } from "./PostCard";
import { LockedContent } from "./LockedContent";
import { getRelativeTime } from "@/lib/utils/profile";
import type { Post } from "@/lib/types/profile";

export interface ContentFeedProps {
  posts: Post[];
  isSubscribed: boolean;
  activeTab?: string;
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
  activeTab = "posts",
  onLike,
  onComment,
  onTip,
  onUnlock,
  emptyState,
  className,
}: ContentFeedProps) {
  const isPostLocked = (post: Post) => post.is_locked && !isSubscribed;

  const mediaPosts = posts.filter((p) => p.media && p.media.length > 0);
  const lockedPosts = posts.filter((p) => p.is_locked);

  // ── Empty state helper ─────────────────────────────────────────────────────
  const EmptyPlaceholder = ({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) => (
    <div style={{ textAlign: "center", padding: "48px 24px" }}>
      <div style={{ width: "72px", height: "72px", borderRadius: "50%", backgroundColor: "#1F1F2A", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
        {icon}
      </div>
      <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#F1F5F9", margin: "0 0 8px" }}>{title}</h3>
      <p style={{ fontSize: "14px", color: "#64748B", margin: 0 }}>{subtitle}</p>
    </div>
  );

  const PostsIcon = (
    <svg width="36" height="36" fill="none" stroke="#4B5563" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );

  const MediaIcon = (
    <svg width="36" height="36" fill="none" stroke="#4B5563" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );

  const LockIcon = (
    <svg width="36" height="36" fill="none" stroke="#4B5563" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );

  const StarIcon = (
    <svg width="36" height="36" fill="none" stroke="#4B5563" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );

  // ── Shared post renderer ───────────────────────────────────────────────────
  const renderPost = (post: Post) => {
    const locked = isPostLocked(post);

    if (locked) {
      return (
        <div key={post.id} style={{ backgroundColor: "#13131F", borderRadius: "12px", border: "1px solid #1E1E2E", marginBottom: "16px", padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <div style={{
              width: "42px", height: "42px", borderRadius: "50%",
              background: post.author.avatar_url ? `url(${post.author.avatar_url}) center/cover no-repeat` : "linear-gradient(135deg, #8B5CF6, #EC4899)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "16px", fontWeight: 700, color: "#fff",
            }}>
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

    return <PostCard key={post.id} post={post} isLocked={false} onLike={onLike} onComment={onComment} onTip={onTip} />;
  };

  // ── Tabs ───────────────────────────────────────────────────────────────────

  // Posts
  if (activeTab === "posts") {
    return (
      <div className={className} style={{ fontFamily: "'Inter', sans-serif" }}>
        {posts.length === 0
          ? emptyState || <EmptyPlaceholder icon={PostsIcon} title="No posts yet" subtitle="Check back later for new content" />
          : <div style={{ display: "flex", flexDirection: "column" }}>{posts.map(renderPost)}</div>
        }
        {posts.length >= 10 && (
          <div style={{ marginTop: "24px", textAlign: "center" }}>
            <button style={{ fontSize: "14px", color: "#8B5CF6", background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
              Load more posts
            </button>
          </div>
        )}
      </div>
    );
  }

  // Media
  if (activeTab === "media") {
    return (
      <div className={className} style={{ fontFamily: "'Inter', sans-serif" }}>
        {mediaPosts.length === 0
          ? <EmptyPlaceholder icon={MediaIcon} title="No media yet" subtitle="Photos and videos will appear here" />
          : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2px" }}>
              {mediaPosts.flatMap((post) =>
                (post.media || []).map((item, i) => (
                  <div key={`${post.id}-${i}`} style={{ aspectRatio: "1", overflow: "hidden", borderRadius: "4px", backgroundColor: "#1F1F2A" }}>
                    {item.type === "image"
                      ? <img src={item.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      : <video src={item.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    }
                  </div>
                ))
              )}
            </div>
          )
        }
      </div>
    );
  }

  // Locked Content (creator own profile only)
  if (activeTab === "locked") {
    return (
      <div className={className} style={{ fontFamily: "'Inter', sans-serif" }}>
        {lockedPosts.length === 0
          ? <EmptyPlaceholder icon={LockIcon} title="No locked posts" subtitle="Create a locked post to offer exclusive content" />
          : <div style={{ display: "flex", flexDirection: "column" }}>{lockedPosts.map((post) => <PostCard key={post.id} post={post} isLocked={true} onLike={onLike} onComment={onComment} onTip={onTip} />)}</div>
        }
      </div>
    );
  }

  // Subscriptions (fan own profile only)
  if (activeTab === "subscriptions") {
    return (
      <div className={className} style={{ fontFamily: "'Inter', sans-serif" }}>
        <EmptyPlaceholder icon={StarIcon} title="No subscriptions yet" subtitle="Creators you subscribe to will appear here" />
      </div>
    );
  }

  return null;
}