"use client";

import * as React from "react";
import { useParams } from "next/navigation";
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

export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;

  const [viewer, setViewer] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<User | null>(null);
  const [subscription, setSubscription] = React.useState<Subscription | null>(null);
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: viewerData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (viewerData) setViewer(viewerData as User);
      }
      const { data: profileData } = await supabase.from("profiles").select("*").eq("username", username).single();
      if (profileData) setProfile(profileData as User);
      setLoading(false);
    };
    fetchData();
  }, [username]);

  const [isFollowing, setIsFollowing] = React.useState(false);

  // 🧪 TEST MODE — force unsubscribed fan view. Remove these 4 lines when done.
  const isOwnProfile = false;
  const isCreatorViewingFan = false;
  const isFanViewingCreator = true;
  const isSubscribed = false;

  // Original logic — restore these when done testing:
  // const isOwnProfile = viewer?.username === profile?.username;
  // const isCreatorViewingFan = viewer?.role === "creator" && profile?.role === "fan";
  // const isFanViewingCreator = viewer?.role === "fan" && profile?.role === "creator";
  // const isSubscribed = subscription?.status === "active";

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

  // Extracted handlers to avoid nested object literals inside JSX attributes
  const handlePost = (content: string, media: File[], isLocked: boolean, price?: number) => {
    console.log("Post:", { content, media, isLocked, price });
  };

  const handleSchedule = (content: string, media: File[], scheduledFor: Date) => {
    console.log("Schedule:", { content, media, scheduledFor });
  };

  const handleLike = (id: string) => console.log("Like:", id);
  const handleComment = (id: string) => console.log("Comment:", id);
  const handleTip = (id: string) => console.log("Tip:", id);
  const handleUnlock = (id: string) => console.log("Unlock:", id);

  const renderProfileHeader = (
    viewContext: "ownFan" | "ownCreator" | null,
    infoProps: {
      bio?: string | null;
      location?: string | null;
      twitterUrl?: string | null;
      instagramUrl?: string | null;
      isVerified?: boolean;
      isEditable?: boolean;
    },
    showPricing?: boolean
  ) => (
    <div>
      <div style={{ padding: "0 24px" }}>
        <ProfileInfo
          displayName={profile.display_name || profile.username}
          username={profile.username}
          mode="full"
          bio={infoProps.bio}
          location={infoProps.location}
          twitterUrl={infoProps.twitterUrl}
          instagramUrl={infoProps.instagramUrl}
          isVerified={infoProps.isVerified}
          isEditable={infoProps.isEditable}
        />
      </div>
    </div>
  );

  // === CREATOR VIEWING FAN PROFILE ===
  if (isCreatorViewingFan && subscription) {
    return (
      <div style={{ maxWidth: "768px", margin: "0 auto", padding: "24px", position: "relative" }}>
        <div style={{ marginTop: "24px" }}>
          <ProfileAvatar avatarUrl={profile.avatar_url || undefined} displayName={profile.display_name || profile.username} isOnline={false} />
        </div>
        <ProfileActions viewContext="creatorViewingFan" onMessage={() => console.log("Message fan")} />
        <div style={{ marginTop: "20px" }}>
          <ProfileInfo
            displayName={profile.display_name || profile.username}
            username={profile.username}
            bio={profile.bio || undefined}
            location={profile.location || undefined}
            twitterUrl={profile.twitter_url || undefined}
            instagramUrl={profile.instagram_url || undefined}
            isVerified={profile.is_verified}
          />
        </div>
        <div style={{ marginTop: "24px" }}>
          <FanActivityCard subscription={subscription} />
        </div>
      </div>
    );
  }

  // === FAN VIEWING OWN PROFILE ===
  if (isOwnProfile && profile.role === "fan") {
    return (
      <div style={{ maxWidth: "768px", margin: "0 auto" }}>
        <ProfileBanner
          bannerUrl={profile.banner_url || undefined}
          displayName={profile.display_name || profile.username}
          isEditable={true}
          isCreator={true}
          onEditBanner={() => console.log("Edit banner")}
          stats={bannerStats}
        />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 16px" }}>
          <ProfileAvatar
            avatarUrl={profile.avatar_url || undefined}
            displayName={profile.display_name || profile.username}
            isEditable={true}
            isOnline={true}
            onEditAvatar={() => console.log("Edit avatar")}
          />
          <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingBottom: "12px", paddingRight: "8px" }}>
            <SubscriptionCard
              monthlyPrice={profile.subscriptionPrice || 5000}
              threeMonthPrice={profile.bundlePricing?.threeMonths}
              sixMonthPrice={profile.bundlePricing?.sixMonths}
              isEditable={true}
              onEditPricing={() => console.log("Edit pricing")}
            />
            <ProfileActions viewContext="ownCreator" onEditProfile={() => console.log("Edit profile")} />
          </div>
        </div>
        <div style={{ marginTop: "8px" }}>
          {renderProfileHeader("ownCreator", {
            bio: profile.bio,
            location: profile.location,
            twitterUrl: profile.twitter_url,
            instagramUrl: profile.instagram_url,
            isVerified: profile.is_verified,
            isEditable: true,
          }, false)}
        </div>
        <div style={{ height: "1px", backgroundColor: "#1E1E2E", margin: "12px 0" }} />
        <div style={{ padding: "0 24px 16px" }}>
          <PostComposer user={profile} onPost={handlePost} onSchedule={handleSchedule} />
        </div>
        <div style={{ padding: "0 24px" }}>
          <ContentFeed posts={posts} isSubscribed={true} onLike={handleLike} onComment={handleComment} onTip={handleTip} onUnlock={handleUnlock} />
        </div>
      </div>
    );
  }

  // === CREATOR VIEWING OWN PROFILE ===
  if (isOwnProfile && profile.role === "creator") {
    return (
      <div style={{ maxWidth: "768px", margin: "0 auto" }}>
        <ProfileBanner
          bannerUrl={profile.banner_url || undefined}
          displayName={profile.display_name || profile.username}
          isEditable={true}
          isCreator={true}
          onEditBanner={() => console.log("Edit banner")}
          stats={bannerStats}
        />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 16px" }}>
          <ProfileAvatar
            avatarUrl={profile.avatar_url || undefined}
            displayName={profile.display_name || profile.username}
            isEditable={true}
            isOnline={true}
            onEditAvatar={() => console.log("Edit avatar")}
          />
          <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingBottom: "12px", paddingRight: "8px" }}>
            <SubscriptionCard
              monthlyPrice={profile.subscriptionPrice || 5000}
              threeMonthPrice={profile.bundlePricing?.threeMonths}
              sixMonthPrice={profile.bundlePricing?.sixMonths}
              isEditable={true}
              onEditPricing={() => console.log("Edit pricing")}
            />
            <ProfileActions viewContext="ownCreator" onEditProfile={() => console.log("Edit profile")} />
          </div>
        </div>
        <div style={{ marginTop: "8px" }}>
          {renderProfileHeader("ownCreator", {
            bio: profile.bio,
            location: profile.location,
            twitterUrl: profile.twitter_url,
            instagramUrl: profile.instagram_url,
            isVerified: profile.is_verified,
            isEditable: true,
          }, false)}
        </div>
        <div style={{ height: "1px", backgroundColor: "#1E1E2E", margin: "12px 0" }} />
        <div style={{ padding: "0 24px 16px" }}>
          <PostComposer user={profile} onPost={handlePost} onSchedule={handleSchedule} />
        </div>
        <div style={{ padding: "0 24px" }}>
          <ContentFeed posts={posts} isSubscribed={true} onLike={handleLike} onComment={handleComment} onTip={handleTip} onUnlock={handleUnlock} />
        </div>
      </div>
    );
  }

  // === FAN VIEWING CREATOR (NOT SUBSCRIBED) ===
  if (isFanViewingCreator && !isSubscribed) {
    return (
      <div style={{ maxWidth: "768px", margin: "0 auto" }}>
        <ProfileBanner
          bannerUrl={profile.banner_url || undefined}
          displayName={profile.display_name || profile.username}
          isEditable={false}
          isCreator={true}
          stats={bannerStats}
        />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 24px" }}>
          <ProfileAvatar avatarUrl={profile.avatar_url || undefined} displayName={profile.display_name || profile.username} isOnline={false} />
          <div style={{ paddingBottom: "12px" }}>
            <ProfileActions
              viewContext="fanViewingCreator"
              onMessage={() => console.log("Message")}
              onTip={() => console.log("Tip")}
              onShare={() => console.log("Share")}
              onFollow={() => setIsFollowing((p) => !p)}
              isFollowing={isFollowing}
            />
          </div>
        </div>
        <div style={{ padding: "0 24px", marginTop: "8px" }}>
          <ProfileInfo
            displayName={profile.display_name || profile.username}
            username={profile.username}
            mode="full"
            bio={profile.bio || undefined}
            location={profile.location || undefined}
            twitterUrl={profile.twitter_url || undefined}
            instagramUrl={profile.instagram_url || undefined}
            isVerified={profile.is_verified}
          />
        </div>
        <div style={{ padding: "16px 24px" }}>
          <SubscriptionCard
            monthlyPrice={0}
            threeMonthPrice={profile.bundlePricing?.threeMonths ?? 12600}
            sixMonthPrice={profile.bundlePricing?.sixMonths ?? 22800}
            isEditable={false}
          />
        </div>
        <div style={{ height: "1px", backgroundColor: "#1E1E2E", margin: "0 0 12px" }} />
        <div style={{ padding: "0 24px" }}>
          <ContentFeed posts={posts} isSubscribed={false} onLike={handleLike} onComment={handleComment} onTip={handleTip} onUnlock={handleUnlock} />
        </div>
      </div>
    );
  }

  // === FAN VIEWING CREATOR (SUBSCRIBED) ===
  if (isFanViewingCreator && isSubscribed && subscription) {
    return (
      <div style={{ maxWidth: "768px", margin: "0 auto" }}>
        <ProfileBanner
          bannerUrl={profile.banner_url || undefined}
          displayName={profile.display_name || profile.username}
          isEditable={false}
          isCreator={true}
          stats={bannerStats}
        />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 24px" }}>
          <ProfileAvatar avatarUrl={profile.avatar_url || undefined} displayName={profile.display_name || profile.username} isOnline={false} />
          <div style={{ paddingBottom: "12px" }}>
            <ProfileActions
              viewContext="fanViewingCreator"
              onMessage={() => console.log("Message")}
              onTip={() => console.log("Tip")}
              onShare={() => console.log("Share")}
              onFollow={() => setIsFollowing((p) => !p)}
              isFollowing={isFollowing}
            />
          </div>
        </div>
        <div style={{ padding: "16px 24px" }}>
          <SubscribedBanner renewalDate="Mar 15, 2026" onManageSubscription={() => console.log("Manage subscription")} />
        </div>
        <div style={{ padding: "0 24px" }}>
          <ContentFeed posts={posts} isSubscribed={true} onLike={handleLike} onComment={handleComment} onTip={handleTip} onUnlock={handleUnlock} />
        </div>
      </div>
    );
  }

  return null;
}