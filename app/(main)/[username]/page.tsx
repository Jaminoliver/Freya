"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ProfileBanner from "@/components/profile/ProfileBanner";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import ProfileInfo from "@/components/profile/ProfileInfo";
import ProfileActions from "@/components/profile/ProfileActions";
import SubscriptionCard from "@/components/profile/SubscriptionCard";
import SubscribedBanner from "@/components/profile/SubscribedBanner";
import FanActivityCard from "@/components/profile/FanActivityCard";
import ContentFeed from "@/components/profile/ContentFeed";
import PostComposer from "@/components/profile/PostComposer";
import type { User, Subscription, Post } from "@/lib/types/profile";

// ─── Tab Bar ────────────────────────────────────────────────────────────────
type Tab = { label: string; key: string; count?: number };

function TabBar({ tabs, active, onChange }: { tabs: Tab[]; active: string; onChange: (key: string) => void }) {
  return (
    <div style={{ display: "flex", borderBottom: "1px solid #1E1E2E", padding: "0 24px" }}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          style={{
            padding: "12px 20px",
            fontSize: "15px",
            fontWeight: 500,
            fontFamily: "'Inter', sans-serif",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: active === tab.key ? "#8B5CF6" : "#64748B",
            borderBottom: active === tab.key ? "2px solid #8B5CF6" : "2px solid transparent",
            marginBottom: "-1px",
            textTransform: "capitalize",
            transition: "color 0.15s ease",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span style={{
              fontSize: "12px",
              fontWeight: 600,
              color: active === tab.key ? "#8B5CF6" : "#475569",
              backgroundColor: active === tab.key ? "rgba(139,92,246,0.15)" : "#1E1E2E",
              padding: "1px 7px",
              borderRadius: "20px",
              transition: "all 0.15s ease",
            }}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [viewer, setViewer] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<User | null>(null);
  const [subscription, setSubscription] = React.useState<Subscription | null>(null);
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isFollowing, setIsFollowing] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("posts");

  React.useEffect(() => {
    setActiveTab("posts");
  }, [username]);

  React.useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: viewerData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (viewerData) setViewer(viewerData as User);
      }
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*, subscription_price, bundle_price_3_months, bundle_price_6_months")
        .eq("username", username)
        .single();

      if (profileData) {
        const enriched: User = {
          ...(profileData as User),
          subscriptionPrice: profileData.subscription_price ?? 0,
          bundlePricing: {
            threeMonths: profileData.bundle_price_3_months ?? undefined,
            sixMonths: profileData.bundle_price_6_months ?? undefined,
          },
        };
        setProfile(enriched);
      }

      setLoading(false);
    };
    fetchData();
  }, [username]);

  const isOwnProfile = viewer?.username === profile?.username;
  const isCreatorViewingFan = viewer?.role === "creator" && profile?.role === "fan";
  const isFanViewingCreator = viewer?.role === "fan" && profile?.role === "creator";
  const isSubscribed = subscription?.status === "active";

  const goToProfileSettings = () => router.push("/settings");

  const handlePost = (content: string, media: File[], isLocked: boolean, price?: number) => console.log("Post:", { content, media, isLocked, price });
  const handleSchedule = (content: string, media: File[], scheduledFor: Date) => console.log("Schedule:", { content, media, scheduledFor });
  const handleLike = (id: string) => console.log("Like:", id);
  const handleComment = (id: string) => console.log("Comment:", id);
  const handleTip = (id: string) => console.log("Tip:", id);
  const handleUnlock = (id: string) => console.log("Unlock:", id);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "40px", height: "40px", borderRadius: "50%", border: "3px solid #1F1F2A", borderTop: "3px solid #8B5CF6", animation: "spin 0.9s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: "32px", fontWeight: 700, color: "#F1F5F9", marginBottom: "12px" }}>Profile not found</h1>
          <p style={{ fontSize: "16px", color: "#94A3B8" }}>The user @{username} does not exist.</p>
        </div>
      </div>
    );
  }

  const bannerStats = {
    posts: profile.post_count ?? 0,
    media: 0,
    likes: 0,
    subscribers: profile.subscriber_count ?? profile.follower_count ?? 0,
  };

  // ── 1. CREATOR VIEWING OWN PROFILE ─────────────────────────────────────────
  if (isOwnProfile && profile.role === "creator") {
    const tabs: Tab[] = [
      { label: "Posts", key: "posts", count: profile.post_count ?? 0 },
      { label: "Media", key: "media", count: 0 },
      { label: "Subscriptions", key: "subscriptions", count: 0 },
    ];

    return (
      <div style={{ maxWidth: "768px", margin: "0 auto" }}>
        <ProfileBanner
          bannerUrl={profile.banner_url || undefined}
          displayName={profile.display_name || profile.username}
          isEditable={true}
          isCreator={true}
          stats={bannerStats}
          userId={profile.id}
          onBannerUpdated={(url) => setProfile((p) => p ? { ...p, banner_url: url } : p)}
        />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 16px" }}>
          <ProfileAvatar
            avatarUrl={profile.avatar_url || undefined}
            displayName={profile.display_name || profile.username}
            isEditable={true}
            isOnline={true}
            userId={profile.id}
            onAvatarUpdated={(url) => setProfile((p) => p ? { ...p, avatar_url: url } : p)}
          />
          <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingBottom: "12px", paddingRight: "8px" }}>
            <SubscriptionCard
              monthlyPrice={profile.subscriptionPrice ?? 0}
              threeMonthPrice={profile.bundlePricing?.threeMonths}
              sixMonthPrice={profile.bundlePricing?.sixMonths}
              isEditable={true}
              onEditPricing={() => console.log("Edit pricing")}
            />
            <ProfileActions viewContext="ownCreator" onEditProfile={goToProfileSettings} />
          </div>
        </div>
        <div style={{ padding: "8px 24px 0" }}>
          <ProfileInfo
            displayName={profile.display_name || profile.username}
            username={profile.username}
            mode="full"
            bio={profile.bio || undefined}
            location={profile.location || undefined}
            websiteUrl={profile.website_url || undefined}
            twitterUrl={profile.twitter_url || undefined}
            instagramUrl={profile.instagram_url || undefined}
            isVerified={profile.is_verified}
            isEditable={true}
          />
        </div>
        <div style={{ padding: "16px 24px 8px" }}>
          <PostComposer user={profile} onPost={handlePost} onSchedule={handleSchedule} />
        </div>
        <div style={{ marginTop: "8px" }}>
          <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
        </div>
        <div style={{ padding: "0 24px" }}>
          <ContentFeed posts={posts} isSubscribed={true} activeTab={activeTab} onLike={handleLike} onComment={handleComment} onTip={handleTip} onUnlock={handleUnlock} />
        </div>
      </div>
    );
  }

  // ── 2. FAN VIEWING OWN PROFILE ─────────────────────────────────────────────
  if (isOwnProfile && profile.role === "fan") {
    const tabs: Tab[] = [
      { label: "Posts", key: "posts", count: profile.post_count ?? 0 },
      { label: "Media", key: "media", count: 0 },
      { label: "Subscriptions", key: "subscriptions", count: 0 },
    ];

    const fanStats = {
      posts: profile.post_count ?? 0,
      media: 0,
      likes: 0,
      subscribers: profile.subscriber_count ?? 0,
    };

    return (
      <div style={{ maxWidth: "768px", margin: "0 auto" }}>
        <ProfileBanner
          bannerUrl={profile.banner_url || undefined}
          displayName={profile.display_name || profile.username}
          isEditable={false}
          isCreator={false}
          stats={fanStats}
        />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 16px" }}>
          <ProfileAvatar
            avatarUrl={profile.avatar_url || undefined}
            displayName={profile.display_name || profile.username}
            isEditable={true}
            isOnline={true}
            userId={profile.id}
            onAvatarUpdated={(url) => setProfile((p) => p ? { ...p, avatar_url: url } : p)}
          />
          <div style={{ paddingBottom: "12px", paddingRight: "8px" }}>
            <ProfileActions viewContext="ownFan" onEditProfile={goToProfileSettings} />
          </div>
        </div>
        <div style={{ padding: "8px 24px 0" }}>
          <ProfileInfo
            displayName={profile.display_name || profile.username}
            username={profile.username}
            mode="full"
            bio={profile.bio || undefined}
            location={profile.location || undefined}
            websiteUrl={profile.website_url || undefined}
            twitterUrl={profile.twitter_url || undefined}
            instagramUrl={profile.instagram_url || undefined}
            isVerified={profile.is_verified}
            isEditable={true}
          />
        </div>
        <div style={{ marginTop: "16px" }}>
          <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
        </div>
        <div style={{ padding: "16px 24px" }}>
          <ContentFeed posts={posts} isSubscribed={true} activeTab={activeTab} onLike={handleLike} onComment={handleComment} onTip={handleTip} onUnlock={handleUnlock} />
        </div>
      </div>
    );
  }

  // ── 3. CREATOR VIEWING A FAN'S PROFILE ────────────────────────────────────
  if (isCreatorViewingFan) {
    return (
      <div style={{ maxWidth: "768px", margin: "0 auto", padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <ProfileAvatar
            avatarUrl={profile.avatar_url || undefined}
            displayName={profile.display_name || profile.username}
            isOnline={false}
          />
          <ProfileActions viewContext="creatorViewingFan" onMessage={() => console.log("Message fan")} />
        </div>
        <div style={{ marginTop: "16px" }}>
          <ProfileInfo
            displayName={profile.display_name || profile.username}
            username={profile.username}
            bio={profile.bio || undefined}
            location={profile.location || undefined}
            websiteUrl={profile.website_url || undefined}
            twitterUrl={profile.twitter_url || undefined}
            instagramUrl={profile.instagram_url || undefined}
            isVerified={profile.is_verified}
          />
        </div>
        {subscription && (
          <div style={{ marginTop: "24px" }}>
            <FanActivityCard subscription={subscription} />
          </div>
        )}
      </div>
    );
  }

  // ── 4. FAN VIEWING CREATOR (SUBSCRIBED) ───────────────────────────────────
  if (isFanViewingCreator && isSubscribed) {
    const tabs: Tab[] = [
      { label: "Posts", key: "posts", count: profile.post_count ?? 0 },
      { label: "Media", key: "media", count: 0 },
    ];

    return (
      <div style={{ maxWidth: "768px", margin: "0 auto" }}>
        <ProfileBanner bannerUrl={profile.banner_url || undefined} displayName={profile.display_name || profile.username} isEditable={false} isCreator={true} stats={bannerStats} />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 24px" }}>
          <ProfileAvatar avatarUrl={profile.avatar_url || undefined} displayName={profile.display_name || profile.username} isOnline={false} />
          <div style={{ paddingBottom: "12px" }}>
            <ProfileActions viewContext="fanViewingCreator" onMessage={() => console.log("Message")} onTip={() => console.log("Tip")} onShare={() => console.log("Share")} onFollow={() => setIsFollowing((p) => !p)} isFollowing={isFollowing} />
          </div>
        </div>
        <div style={{ padding: "8px 24px 0" }}>
          <ProfileInfo
            displayName={profile.display_name || profile.username}
            username={profile.username}
            mode="full"
            bio={profile.bio || undefined}
            location={profile.location || undefined}
            websiteUrl={profile.website_url || undefined}
            twitterUrl={profile.twitter_url || undefined}
            instagramUrl={profile.instagram_url || undefined}
            isVerified={profile.is_verified}
          />
        </div>
        <div style={{ padding: "16px 24px" }}>
          <SubscribedBanner renewalDate="Mar 15, 2026" onManageSubscription={() => console.log("Manage subscription")} />
        </div>
        <div style={{ marginTop: "4px" }}>
          <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
        </div>
        <div style={{ padding: "16px 24px" }}>
          <ContentFeed posts={posts} isSubscribed={true} activeTab={activeTab} onLike={handleLike} onComment={handleComment} onTip={handleTip} onUnlock={handleUnlock} />
        </div>
      </div>
    );
  }

  // ── 5. FAN VIEWING CREATOR (NOT SUBSCRIBED) ───────────────────────────────
  if (isFanViewingCreator && !isSubscribed) {
    const tabs: Tab[] = [
      { label: "Posts", key: "posts", count: profile.post_count ?? 0 },
      { label: "Media", key: "media", count: 0 },
    ];

    return (
      <div style={{ maxWidth: "768px", margin: "0 auto" }}>
        <ProfileBanner bannerUrl={profile.banner_url || undefined} displayName={profile.display_name || profile.username} isEditable={false} isCreator={true} stats={bannerStats} />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 24px" }}>
          <ProfileAvatar avatarUrl={profile.avatar_url || undefined} displayName={profile.display_name || profile.username} isOnline={false} />
          <div style={{ paddingBottom: "12px" }}>
            <ProfileActions viewContext="fanViewingCreator" onMessage={() => console.log("Message")} onTip={() => console.log("Tip")} onShare={() => console.log("Share")} onFollow={() => setIsFollowing((p) => !p)} isFollowing={isFollowing} />
          </div>
        </div>
        <div style={{ padding: "8px 24px 0" }}>
          <ProfileInfo
            displayName={profile.display_name || profile.username}
            username={profile.username}
            mode="full"
            bio={profile.bio || undefined}
            location={profile.location || undefined}
            websiteUrl={profile.website_url || undefined}
            twitterUrl={profile.twitter_url || undefined}
            instagramUrl={profile.instagram_url || undefined}
            isVerified={profile.is_verified}
          />
        </div>
        <div style={{ padding: "16px 24px" }}>
          <SubscriptionCard
            monthlyPrice={profile.subscriptionPrice ?? 0}
            threeMonthPrice={profile.bundlePricing?.threeMonths}
            sixMonthPrice={profile.bundlePricing?.sixMonths}
            isEditable={false}
          />
        </div>
        <div style={{ marginTop: "4px" }}>
          <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
        </div>
        <div style={{ padding: "16px 24px" }}>
          <ContentFeed posts={posts} isSubscribed={false} activeTab={activeTab} onLike={handleLike} onComment={handleComment} onTip={handleTip} onUnlock={handleUnlock} />
        </div>
      </div>
    );
  }

  return null;
}