"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { followCreator, unfollowCreator, checkIsFollowing } from "@/lib/utils/follow";
import ProfileBanner from "@/components/profile/ProfileBanner";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import ProfileInfo from "@/components/profile/ProfileInfo";
import ProfileActions from "@/components/profile/ProfileActions";
import SubscriptionCard from "@/components/profile/SubscriptionCard";
import SubscribedBanner from "@/components/profile/SubscribedBanner";
import FanActivityCard from "@/components/profile/FanActivityCard";
import ContentFeed from "@/components/profile/ContentFeed";
import PostComposer from "@/components/profile/PostComposer";
import CheckoutModal from "@/components/checkout/CheckoutModal";
import { postSyncStore } from "@/lib/store/postSyncStore";
import type { User, Subscription, Post } from "@/lib/types/profile";
import type { CheckoutType, SubscriptionTier } from "@/lib/types/checkout";

interface ProfileCache {
  viewer: User | null;
  profile: User | null;
  totalLikes: number;
  tierId: number | undefined;
  isFollowing: boolean;
  isSubscribed: boolean;
  subscriptionPeriodEnd: string | null;
}
const profileCache = new Map<string, ProfileCache>();

export default function ProfilePage() {
  const params   = useParams();
  const router   = useRouter();
  const username = params.username as string;

  const cached = profileCache.get(username);

  const [viewer,                setViewer]                = React.useState<User | null>(cached?.viewer ?? null);
  const [profile,               setProfile]               = React.useState<User | null>(cached?.profile ?? null);
  const [subscription,          setSubscription]          = React.useState<Subscription | null>(null);
  const [isSubscribed,          setIsSubscribed]          = React.useState(cached?.isSubscribed ?? false);
  const [subscriptionPeriodEnd, setSubscriptionPeriodEnd] = React.useState<string | null>(cached?.subscriptionPeriodEnd ?? null);
  const [posts,                 setPosts]                 = React.useState<Post[]>([]);
  const [loading,               setLoading]               = React.useState(!cached);
  const [isFollowing,           setIsFollowing]           = React.useState(cached?.isFollowing ?? false);
  const [followLoading,         setFollowLoading]         = React.useState(false);
  const [totalLikes,            setTotalLikes]            = React.useState(cached?.totalLikes ?? 0);

  const [checkoutOpen,    setCheckoutOpen]    = React.useState(false);
  const [checkoutType,    setCheckoutType]    = React.useState<CheckoutType>("subscription");
  const [checkoutTier,    setCheckoutTier]    = React.useState<SubscriptionTier>("monthly");
  const [lockedPostId,    setLockedPostId]    = React.useState<string | null>(null);
  const [lockedPostPrice, setLockedPostPrice] = React.useState<number>(0);
  const [tierId,          setTierId]          = React.useState<number | undefined>(cached?.tierId);

  const profileIdRef = React.useRef<string | null>(cached?.profile?.id ?? null);
  const viewerIdRef  = React.useRef<string | null>(cached?.viewer?.id ?? null);

  const openCheckout = (type: CheckoutType, tier: SubscriptionTier = "monthly") => {
    setCheckoutType(type); setCheckoutTier(tier); setCheckoutOpen(true);
  };
  const openTip    = () => openCheckout("tips");
  const openUnlock = (postId: string, price: number = 0) => {
    setLockedPostId(postId); setLockedPostPrice(price);
    setCheckoutType("locked_post"); setCheckoutOpen(true);
  };

  const fetchSubscriptionStatus = React.useCallback(async (creatorId: string) => {
    try {
      const res  = await fetch(`/api/subscriptions/status?creatorId=${creatorId}`);
      const data = await res.json();
      setIsSubscribed(!!data.active);
      setSubscriptionPeriodEnd(data.currentPeriodEnd ?? null);
    } catch (err) {
      console.error("[Profile] Failed to fetch subscription status:", err);
    }
  }, []);

  React.useEffect(() => {
    if (cached) return;

    const fetchData = async () => {
      setLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      let viewerData: User | null = null;
      if (user) {
        viewerIdRef.current = user.id;
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (data) { viewerData = data as User; setViewer(viewerData); }
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*, subscription_price, bundle_price_3_months, bundle_price_6_months")
        .eq("username", username).single();

      let enriched: User | null = null;
      let likesCount = 0;
      let tierIdVal: number | undefined;
      let followingVal = false;
      let subscribedVal = false;
      let periodEndVal: string | null = null;

      if (profileData) {
        profileIdRef.current = profileData.id;
        enriched = {
          ...(profileData as User),
          subscriptionPrice: profileData.subscription_price ?? 0,
          bundlePricing: {
            threeMonths: profileData.bundle_price_3_months ?? undefined,
            sixMonths:   profileData.bundle_price_6_months ?? undefined,
          },
        };
        setProfile(enriched);

        // Use denormalized likes_count from profiles table
        likesCount = profileData.likes_count ?? 0;
        setTotalLikes(likesCount);

        if (profileData.role === "creator") {
          const { data: tierData } = await supabase
            .from("subscription_tiers")
            .select("id")
            .eq("creator_id", profileData.id)
            .single();
          if (tierData) { tierIdVal = tierData.id; setTierId(tierIdVal); }

          if (user && user.id !== profileData.id) {
            const res  = await fetch(`/api/subscriptions/status?creatorId=${profileData.id}`);
            const data = await res.json();
            subscribedVal  = !!data.active;
            periodEndVal   = data.currentPeriodEnd ?? null;
            setIsSubscribed(subscribedVal);
            setSubscriptionPeriodEnd(periodEndVal);

            followingVal = await checkIsFollowing(profileData.id);
            setIsFollowing(followingVal);
          }
        }
      }

      profileCache.set(username, {
        viewer:                viewerData,
        profile:               enriched,
        totalLikes:            likesCount,
        tierId:                tierIdVal,
        isFollowing:           followingVal,
        isSubscribed:          subscribedVal,
        subscriptionPeriodEnd: periodEndVal,
      });

      setLoading(false);
    };

    fetchData();
  }, [username]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (!profileIdRef.current || !viewerIdRef.current) return;
    const supabase  = createClient();
    const creatorId = profileIdRef.current;
    const fanId     = viewerIdRef.current;

    const subscriptionChannel = supabase
      .channel(`sub-status-${creatorId}-${fanId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions", filter: `fan_id=eq.${fanId}` }, (payload: any) => {
        const row = payload.new;
        if (row?.creator_id === creatorId && row?.status === "active") {
          setIsSubscribed(true);
          setSubscriptionPeriodEnd(row.current_period_end ?? null);
          profileCache.delete(username);
        }
        if (row?.creator_id === creatorId && (row?.status === "cancelled" || row?.status === "expired")) {
          setIsSubscribed(false);
          profileCache.delete(username);
        }
      })
      .subscribe();

    const profileChannel = supabase
      .channel(`creator-profile-${creatorId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${creatorId}` }, (payload: any) => {
        const updated = payload.new;
        setProfile((prev) => prev ? { ...prev, subscriber_count: updated.subscriber_count, likes_count: updated.likes_count } : prev);
        setTotalLikes(updated.likes_count ?? 0);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscriptionChannel);
      supabase.removeChannel(profileChannel);
    };
  }, [loading, username]);

  const handleSubscriptionSuccess = React.useCallback(async () => {
    setCheckoutOpen(false);
    profileCache.delete(username);
    if (profile) await fetchSubscriptionStatus(profile.id);
  }, [profile, fetchSubscriptionStatus, username]);

  const handleFollow = async () => {
    if (!profile || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowCreator(profile.id);
        setIsFollowing(false);
        setProfile((prev) => prev ? { ...prev, follower_count: Math.max((prev.follower_count ?? 1) - 1, 0) } : prev);
      } else {
        await followCreator(profile.id);
        setIsFollowing(true);
        setProfile((prev) => prev ? { ...prev, follower_count: (prev.follower_count ?? 0) + 1 } : prev);
      }
      profileCache.delete(username);
    } catch (err) { console.error("Follow error:", err); }
    finally { setFollowLoading(false); }
  };

  const isOwnProfile        = viewer?.id === profile?.id;
  const isCreatorViewingFan = viewer?.role === "creator" && profile?.role === "fan";
  const isViewingCreator    = profile?.role === "creator" && !isOwnProfile && !isCreatorViewingFan;

  const goToProfileSettings = () => router.push("/settings");
  const handlePost          = (content: string, media: File[], isLocked: boolean, price?: number) => console.log("Post:", { content, media, isLocked, price });
  const handleSchedule      = (content: string, media: File[], scheduledFor: Date) => console.log("Schedule:", { content, media, scheduledFor });

  const handleLike    = (_postId: string) => {};
  const handleComment = (id: string) => console.log("Comment:", id);
  const handleTip     = (_id: string) => openTip();
  const handleUnlock  = (id: string) => openUnlock(id);

  const checkoutModal = profile ? (
    <CheckoutModal
      isOpen={checkoutOpen}
      onClose={() => setCheckoutOpen(false)}
      type={checkoutType}
      creator={profile}
      monthlyPrice={profile.subscriptionPrice ?? 0}
      threeMonthPrice={profile.bundlePricing?.threeMonths}
      sixMonthPrice={profile.bundlePricing?.sixMonths}
      initialTier={checkoutTier}
      tierId={tierId}
      postPrice={lockedPostPrice}
      onViewContent={() => router.push(`/${profile.username}`)}
      onGoToSubscriptions={() => router.push("/settings?panel=subscriptions")}
      onSubscriptionSuccess={handleSubscriptionSuccess}
    />
  ) : null;

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
    posts: profile.post_count ?? 0, media: 0, likes: totalLikes,
    subscribers: profile.subscriber_count ?? 0,
  };

  const profileInfoProps = {
    displayName:  profile.display_name || profile.username,
    username:     profile.username,
    bio:          profile.bio || undefined,
    location:     profile.location || undefined,
    websiteUrl:   profile.website_url || undefined,
    twitterUrl:   profile.twitter_url || undefined,
    instagramUrl: profile.instagram_url || undefined,
    telegramUrl:  (profile as any).telegram_url || undefined,
    facebookUrl:  (profile as any).facebook_url || undefined,
    isVerified:   profile.is_verified,
  };

  const padded: React.CSSProperties = { padding: "0 16px" };

  // ── 1. CREATOR VIEWING OWN PROFILE ────────────────────────────────────────
  if (isOwnProfile && profile.role === "creator") {
    return (
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {checkoutModal}
        <ProfileBanner
          bannerUrl={profile.banner_url || undefined} displayName={profile.display_name || profile.username}
          isEditable={true} isCreator={true} stats={bannerStats} userId={profile.id}
          onBannerUpdated={(url) => setProfile((p) => p ? { ...p, banner_url: url } : p)}
        />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", ...padded }}>
          <ProfileAvatar
            avatarUrl={profile.avatar_url || undefined} displayName={profile.display_name || profile.username}
            isEditable={true} isOnline={true} userId={profile.id}
            onAvatarUpdated={(url) => setProfile((p) => p ? { ...p, avatar_url: url } : p)}
          />
          <div style={{ paddingBottom: "12px" }}>
            <ProfileActions viewContext="ownCreator" onEditProfile={goToProfileSettings} />
          </div>
        </div>
        <div style={{ padding: "8px 16px 0" }}>
          <ProfileInfo {...profileInfoProps} mode="full" isEditable={true} />
        </div>
        <div style={{ padding: "16px 16px 8px" }}>
          <PostComposer user={profile} onPost={handlePost} onSchedule={handleSchedule} />
        </div>
        <ContentFeed
          posts={posts} isSubscribed={true} isOwnProfile={true}
          creatorUsername={profile.username}
          onLike={handleLike} onComment={handleComment}
          onTip={handleTip} onUnlock={handleUnlock}
        />
      </div>
    );
  }

  // ── 2. FAN VIEWING OWN PROFILE ────────────────────────────────────────────
  if (isOwnProfile && profile.role === "fan") {
    const fanStats = { posts: profile.post_count ?? 0, media: 0, likes: totalLikes, subscribers: profile.subscriber_count ?? 0 };
    return (
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {checkoutModal}
        <ProfileBanner
          bannerUrl={profile.banner_url || undefined} displayName={profile.display_name || profile.username}
          isEditable={false} isCreator={false} stats={fanStats}
        />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", ...padded }}>
          <ProfileAvatar
            avatarUrl={profile.avatar_url || undefined} displayName={profile.display_name || profile.username}
            isEditable={true} isOnline={true} userId={profile.id}
            onAvatarUpdated={(url) => setProfile((p) => p ? { ...p, avatar_url: url } : p)}
          />
          <div style={{ paddingBottom: "12px" }}>
            <ProfileActions viewContext="ownFan" onEditProfile={goToProfileSettings} />
          </div>
        </div>
        <div style={{ padding: "8px 16px 0" }}>
          <ProfileInfo {...profileInfoProps} mode="full" isEditable={true} />
        </div>
        <ContentFeed
          posts={posts} isSubscribed={true}
          creatorUsername={profile.username}
          onLike={handleLike} onComment={handleComment}
          onTip={handleTip} onUnlock={handleUnlock}
        />
      </div>
    );
  }

  // ── 3. CREATOR VIEWING A FAN'S PROFILE ────────────────────────────────────
  if (isCreatorViewingFan) {
    return (
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "24px 16px" }}>
        {checkoutModal}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <ProfileAvatar avatarUrl={profile.avatar_url || undefined} displayName={profile.display_name || profile.username} isOnline={false} />
          <ProfileActions viewContext="creatorViewingFan" onMessage={() => console.log("Message fan")} />
        </div>
        <div style={{ marginTop: "16px" }}>
          <ProfileInfo {...profileInfoProps} />
        </div>
        {subscription && <div style={{ marginTop: "24px" }}><FanActivityCard subscription={subscription} /></div>}
      </div>
    );
  }

  // ── 4. ANYONE VIEWING A CREATOR (SUBSCRIBED) ──────────────────────────────
  if (isViewingCreator && isSubscribed) {
    const renewalDisplay = subscriptionPeriodEnd
      ? new Date(subscriptionPeriodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "—";
    return (
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {checkoutModal}
        <ProfileBanner bannerUrl={profile.banner_url || undefined} displayName={profile.display_name || profile.username} isEditable={false} isCreator={true} stats={bannerStats} />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", ...padded }}>
          <ProfileAvatar avatarUrl={profile.avatar_url || undefined} displayName={profile.display_name || profile.username} isOnline={false} />
          <div style={{ paddingBottom: "12px" }}>
            <ProfileActions viewContext="fanViewingCreator" onMessage={() => console.log("Message")} onTip={openTip} onShare={() => console.log("Share")} onFollow={handleFollow} isFollowing={isFollowing} />
          </div>
        </div>
        <div style={{ padding: "8px 16px 0" }}>
          <ProfileInfo {...profileInfoProps} mode="full" />
        </div>
        <div style={{ padding: "16px 16px" }}>
          <SubscribedBanner renewalDate={renewalDisplay} creatorId={profile.id} onCancelled={() => fetchSubscriptionStatus(profile.id)} />
        </div>
        <ContentFeed
          posts={posts} isSubscribed={true}
          creatorUsername={profile.username}
          onLike={handleLike} onComment={handleComment}
          onTip={handleTip} onUnlock={handleUnlock}
        />
      </div>
    );
  }

  // ── 5. ANYONE VIEWING A CREATOR (NOT SUBSCRIBED) ──────────────────────────
  if (isViewingCreator && !isSubscribed) {
    return (
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {checkoutModal}
        <ProfileBanner bannerUrl={profile.banner_url || undefined} displayName={profile.display_name || profile.username} isEditable={false} isCreator={true} stats={bannerStats} />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", ...padded }}>
          <ProfileAvatar avatarUrl={profile.avatar_url || undefined} displayName={profile.display_name || profile.username} isOnline={false} />
          <div style={{ paddingBottom: "12px" }}>
            <ProfileActions viewContext="fanViewingCreator" onMessage={() => console.log("Message")} onTip={openTip} onShare={() => console.log("Share")} onFollow={handleFollow} isFollowing={isFollowing} />
          </div>
        </div>
        <div style={{ padding: "8px 16px 0" }}>
          <ProfileInfo {...profileInfoProps} mode="full" />
        </div>
        <div style={{ padding: "16px 16px" }}>
          <SubscriptionCard
            monthlyPrice={profile.subscriptionPrice ?? 0}
            threeMonthPrice={profile.bundlePricing?.threeMonths}
            sixMonthPrice={profile.bundlePricing?.sixMonths}
            isEditable={false}
            onSubscribe={(tier) => openCheckout("subscription", tier)}
          />
        </div>
        <ContentFeed
          posts={posts} isSubscribed={false}
          creatorUsername={profile.username}
          onLike={handleLike} onComment={handleComment}
          onTip={handleTip} onUnlock={handleUnlock}
        />
      </div>
    );
  }

  return null;
}