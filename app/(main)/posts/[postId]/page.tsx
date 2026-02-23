"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Share2, MoreHorizontal } from "lucide-react";
import PostMedia from "@/components/profile/PostMedia";
import PostActions from "@/components/profile/PostActions";
import CommentSection from "@/components/profile/CommentSection";
import CheckoutModal from "@/components/checkout/CheckoutModal";
import type { CheckoutType, SubscriptionTier } from "@/lib/types/checkout";
import type { User } from "@/lib/types/profile";

const DUMMY_POST = {
  id: "dp1",
  author: {
    username: "zaraobi",
    display_name: "Zara Obi",
    avatar_url: "https://i.pravatar.cc/150?img=47",
    is_verified: true,
  },
  content: "I really love chatting here just as much as teasing with photos and videos 🙈 Sometimes I just want to sit back, open a chat, and talk to someone about anything and everything! So don't be shy, I'm waiting 🖤",
  media: [
    { type: "image", url: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&q=80" },
  ],
  is_locked: false,
  price: null as number | null,
  likes: 466,
  comments: 14,
  tips: 10.03,
  created_at: new Date("2025-10-25").toISOString(),
};

const DUMMY_VIEWER = {
  username: "freya",
  display_name: "Freya",
  avatar_url: "https://i.pravatar.cc/150?img=36",
};

function PostMenu({ isOwnPost }: { isOwnPost: boolean }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const items = isOwnPost
    ? [
        { label: "Edit caption", danger: false, action: () => console.log("edit") },
        { label: "Delete post",  danger: true,  action: () => console.log("delete") },
      ]
    : [
        { label: "Report post",  danger: true,  action: () => console.log("report") },
        { label: "Share link",   danger: false, action: () => console.log("share") },
      ];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ background: "none", border: "none", color: "#6B6B8A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", borderRadius: "8px" }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1C1C2E")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "38px", zIndex: 50, backgroundColor: "#1C1C2E", border: "1px solid #2A2A3D", borderRadius: "10px", overflow: "hidden", minWidth: "160px", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
          {items.map((item, i) => (
            <button
              key={item.label}
              onClick={() => { item.action(); setOpen(false); }}
              style={{
                width: "100%", padding: "10px 14px", border: "none",
                backgroundColor: "transparent",
                color: item.danger ? "#EF4444" : "#C4C4D4",
                fontSize: "13px", textAlign: "left", cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                borderBottom: i < items.length - 1 ? "1px solid #2A2A3D" : "none",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2A2A3D")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SinglePostPage() {
  const params  = useParams();
  const router  = useRouter();

  const post         = DUMMY_POST;
  const viewer       = DUMMY_VIEWER;
  const isOwnPost    = viewer.username === post.author.username;
  const isSubscribed = true;

  // ── Checkout modal state ──
  const [checkoutOpen, setCheckoutOpen] = React.useState(false);
  const [checkoutType, setCheckoutType] = React.useState<CheckoutType>("tips");
  const [checkoutTier, setCheckoutTier] = React.useState<SubscriptionTier>("monthly");

  const openTip    = () => { setCheckoutType("tips");        setCheckoutOpen(true); };
  const openUnlock = () => { setCheckoutType("locked_post"); setCheckoutOpen(true); };

  // ── Comment section state ──
  const [commentOpen, setCommentOpen] = React.useState(false);
  const commentRef = React.useRef<HTMLDivElement>(null);

  const handleComment = () => {
    setCommentOpen((prev) => !prev);
    setTimeout(() => {
      commentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const creatorForCheckout = {
    ...post.author,
    id: "creator-id",
    role: "creator",
    subscriptionPrice: 0,
  } as unknown as User;

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto", fontFamily: "'Inter', sans-serif" }}>

      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        type={checkoutType}
        creator={creatorForCheckout}
        monthlyPrice={0}
        initialTier={checkoutTier}
        postPrice={post.price ?? 0}
        onViewContent={() => setCheckoutOpen(false)}
        onGoToSubscriptions={() => router.push("/settings?panel=subscriptions")}
      />

      {/* Page header */}
      <style>{`
        .post-sticky-header { top: 0; }
        @media (max-width: 767px) { .post-sticky-header { top: 56px; } }
      `}</style>
      <div className="post-sticky-header" style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 24px", borderBottom: "1px solid #1E1E2E",
        position: "sticky", backgroundColor: "#0D0D16", zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={() => router.back()}
            style={{ background: "none", border: "none", color: "#C4C4D4", cursor: "pointer", display: "flex", alignItems: "center", padding: "4px 0" }}
          >
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>
          <span style={{ fontSize: "17px", fontWeight: 800, color: "#F1F5F9", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Post
          </span>
        </div>
        <button
          onClick={() => console.log("share")}
          style={{ background: "none", border: "none", color: "#6B6B8A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", borderRadius: "8px" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1C1C2E")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <Share2 size={18} />
        </button>
      </div>

      {/* Creator info card */}
      <div style={{ margin: "16px 24px 0", backgroundColor: "#13131F", borderRadius: "14px", padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ position: "relative" }}>
              <img
                src={post.author.avatar_url}
                alt=""
                style={{ width: "44px", height: "44px", borderRadius: "50%", objectFit: "cover", display: "block" }}
              />
              <div style={{ position: "absolute", bottom: 1, right: 1, width: 10, height: 10, borderRadius: "50%", backgroundColor: "#22C55E", border: "2px solid #13131F" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "15px", fontWeight: 700, color: "#F1F5F9" }}>{post.author.display_name}</span>
              {post.author.is_verified && <span style={{ fontSize: "14px" }}>😊</span>}
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#8B5CF6", display: "inline-block", flexShrink: 0 }} />
              <span style={{ fontSize: "13px", color: "#6B6B8A" }}>@{post.author.username}</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            <span style={{ fontSize: "12px", color: "#6B6B8A" }}>
              {new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
            <PostMenu isOwnPost={isOwnPost} />
          </div>
        </div>

        {post.content && (
          <p style={{ margin: "14px 0 0", fontSize: "14px", color: "#C4C4D4", lineHeight: 1.7 }}>
            {post.content}
          </p>
        )}
      </div>

      {/* Media */}
      <div style={{ margin: "0 24px" }}>
        <PostMedia
          media={post.media}
          isLocked={post.is_locked}
          price={post.price}
          onUnlock={openUnlock}
        />
      </div>

      {/* Actions */}
      <div style={{ margin: "0 24px" }}>
        <PostActions
          likes={post.likes}
          comments={post.comments}
          tips={post.tips}
          isSubscribed={isSubscribed}
          isOwnProfile={isOwnPost}
          onLike={() => console.log("liked")}
          onComment={handleComment}
          onTip={openTip}
          onBookmark={() => console.log("bookmarked")}
        />
      </div>

      {/* Comments — isOpen wired to state */}
      <div ref={commentRef} style={{ margin: "8px 24px 48px" }}>
        <CommentSection
          postId={post.id}
          comments={[]}
          viewer={viewer}
          isOpen={commentOpen}
          onAddComment={(id, text) => console.log("Comment on", id, ":", text)}
        />
      </div>

    </div>
  );
}