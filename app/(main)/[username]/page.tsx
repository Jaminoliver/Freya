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
import { ProfileSkeleton } from "@/components/loadscreen/ProfileSkeleton";
import type { ProfileSkeletonContext } from "@/components/loadscreen/ProfileSkeleton";
import type { User, Subscription, Post } from "@/lib/types/profile";
import type { CheckoutType, SubscriptionTier } from "@/lib/types/checkout";
import type { ApiPost } from "@/components/profile/PostRow";
import { useAppStore, isStale } from "@/lib/store/appStore";
import { useUpload } from "@/lib/context/UploadContext";

export default function ProfilePage() {
  const params   = useParams();
  const router   = useRouter();
  const username = params.username as string;

  const {
    profiles,
    setProfile: setStoreProfile,
    updateProfile,
    clearProfile,
    viewer: globalViewer,
  } = useAppStore();

  // FIX: watch uploads to trigger feed refresh on completion
  const { uploads } = useUpload();

  const [viewer,                setViewer]                = React.useState<User | null>(null);
  const [profile,               setProfile]               = React.useState<User | null>(null);
  const [subscription,          setSubscription]          = React.useState<Subscription | null>(null);
  const [isSubscribed,          setIsSubscribed]          = React.useState(false);
  const [subscriptionPeriodEnd, setSubscriptionPeriodEnd] = React.useState<string | null>(null);
  const [subscriptionId,        setSubscriptionId]        = React.useState<number | undefined>(undefined);
  const [apiPosts,              setApiPosts]              = React.useState<ApiPost[]>([]);
  const [apiLoading,            setApiLoading]            = React.useState(true);
  const [revealed,              setRevealed]              = React.useState(false);
  const [fetchError,            setFetchError]            = React.useState(false);
  const [feedRefreshKey,        setFeedRefreshKey]        = React.useState(0);

  const [isFollowing,     setIsFollowing]     = React.useState(false);
  const [followLoading,   setFollowLoading]   = React.useState(false);
  const [totalLikes,      setTotalLikes]      = React.useState(0);
  const [checkoutOpen,    setCheckoutOpen]    = React.useState(false);
  const [checkoutType,    setCheckoutType]    = React.useState<CheckoutType>("subscription");
  const [checkoutTier,    setCheckoutTier]    = React.useState<SubscriptionTier>("monthly");
  const [lockedPostId,    setLockedPostId]    = React.useState<string | null>(null);
  const [lockedPostPrice, setLockedPostPrice] = React.useState<number>(0);
  const [tierId,          setTierId]          = React.useState<number | undefined>(undefined);

  const profileIdRef = React.useRef<string | null>(null);
  const viewerIdRef  = React.useRef<string | null>(null);

  const skeletonContext = React.useMemo<ProfileSkeletonContext>(() => {
    if (!viewer || !profile) return "unsubscribedCreator";
    const isOwn       = viewer.id === profile.id;
    const viewerRole  = viewer.role;
    const profileRole = profile.role;
    if (isOwn && profileRole === "creator")                return "ownCreator";
    if (isOwn && profileRole === "fan")                    return "ownFan";
    if (viewerRole === "creator" && profileRole === "fan") return "creatorViewingFan";
    if (profileRole === "creator" && isSubscribed)         return "subscribedCreator";
    return "unsubscribedCreator";
  }, [viewer, profile, isSubscribed]);

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
      setSubscriptionId(data.subscriptionId ?? undefined);
    } catch (err) {
      console.error("[Profile] Failed to fetch subscription status:", err);
    }
  }, []);

  const refreshPosts = React.useCallback(async (creatorUsername: string) => {
    try {
      const res  = await fetch(`/api/posts/creator/${creatorUsername}`);
      const data = await res.json();
      if (res.ok) {
        const freshPosts: ApiPost[] = data.posts || [];
        setApiPosts(freshPosts);
        updateProfile(creatorUsername, { apiPosts: freshPosts });
        setFeedRefreshKey((k) => k + 1);
      }
    } catch (err) {
      console.error("[ProfilePage] refreshPosts error:", err);
    }
  }, [updateProfile]);

  const backgroundRevalidate = React.useCallback(async (creatorId: string, creatorUsername: string) => {
    try {
      const [subRes, postsRes] = await Promise.allSettled([
        fetch(`/api/subscriptions/status?creatorId=${creatorId}`),
        fetch(`/api/posts/creator/${creatorUsername}`),
      ]);

      if (subRes.status === "fulfilled" && subRes.value.ok) {
        const data = await subRes.value.json();
        const subscribedVal = !!data.active;
        const periodEndVal  = data.currentPeriodEnd ?? null;
        setIsSubscribed(subscribedVal);
        setSubscriptionPeriodEnd(periodEndVal);
        updateProfile(creatorUsername, { isSubscribed: subscribedVal, subscriptionPeriodEnd: periodEndVal });
      }

      if (postsRes.status === "fulfilled" && postsRes.value.ok) {
        const data = await postsRes.value.json();
        const freshPosts: ApiPost[] = data.posts || [];
        setApiPosts(freshPosts);
        updateProfile(creatorUsername, { apiPosts: freshPosts });
        setFeedRefreshKey((k) => k + 1);
      }
    } catch (err) {
      console.error("[ProfilePage] backgroundRevalidate error:", err);
    }
  }, [updateProfile]);

  const [viewerReady, setViewerReady] = React.useState(() => !!globalViewer);

  React.useEffect(() => {
    if (globalViewer) setViewerReady(true);
  }, [globalViewer]);

  React.useEffect(() => {
    if (viewerReady) return;
    const t = setTimeout(() => setViewerReady(true), 1500);
    return () => clearTimeout(t);
  }, [viewerReady]);

  React.useEffect(() => {
    if (!viewerReady) return;

    const cached = profiles[username];
    const fresh  = cached && !isStale(cached.fetchedAt);

    if (fresh) {
      if (cached.viewer)  { setViewer(cached.viewer);   viewerIdRef.current  = cached.viewer.id; }
      if (cached.profile) { setProfile(cached.profile); profileIdRef.current = cached.profile.id; }
      setApiPosts(cached.apiPosts ?? []);
      setIsSubscribed(cached.isSubscribed ?? false);
      setSubscriptionPeriodEnd(cached.subscriptionPeriodEnd ?? null);
      setIsFollowing(cached.isFollowing ?? false);
      setTotalLikes(cached.totalLikes ?? 0);
      setTierId(cached.tierId);
      setApiLoading(false);
      requestAnimationFrame(() => setRevealed(true));

      if (cached.profile?.role === "creator" && cached.viewer?.id !== cached.profile.id) {
        backgroundRevalidate(cached.profile.id, cached.profile.username);
      }
      return;
    }

    const fetchData = async () => {
      try {
        const supabase = createClient();
        const viewerData: User | null = (globalViewer as any) ?? null;

        const profileResult = await supabase
          .from("profiles")
          .select("*, subscription_price, bundle_price_3_months, bundle_price_6_months")
          .eq("username", username)
          .single();

        const profileRaw = profileResult.data ?? null;

        if (viewerData) {
          setViewer(viewerData);
          viewerIdRef.current = viewerData.id;
        }

        let enriched: User | null       = null;
        let likesCount                  = 0;
        let tierIdVal: number | undefined;
        let followingVal                = false;
        let subscribedVal               = false;
        let periodEndVal: string | null = null;
        let fetchedPosts: ApiPost[]     = [];

        if (profileRaw) {
          profileIdRef.current = profileRaw.id;
          enriched = {
            ...(profileRaw as User),
            subscriptionPrice: profileRaw.subscription_price ?? 0,
            bundlePricing: {
              threeMonths: profileRaw.bundle_price_3_months ?? undefined,
              sixMonths:   profileRaw.bundle_price_6_months ?? undefined,
            },
          };
          setProfile(enriched);
          likesCount = profileRaw.likes_count ?? 0;
          setTotalLikes(likesCount);

          const userId       = viewerData?.id ?? null;
          const isOwnProfile = userId === profileRaw.id;
          const isCreator    = profileRaw.role === "creator";

          if (isCreator) {
            console.log("[ProfilePage] fetching creator-specific data");
            const [tierRes, subRes, followRes, postsRes] = await Promise.allSettled([
              supabase
                .from("subscription_tiers")
                .select("id")
                .eq("creator_id", profileRaw.id)
                .maybeSingle(),
              !isOwnProfile && userId
                ? fetch(`/api/subscriptions/status?creatorId=${profileRaw.id}`)
                : Promise.resolve(null),
              !isOwnProfile && userId
                ? checkIsFollowing(profileRaw.id)
                : Promise.resolve(false),
              fetch(`/api/posts/creator/${profileRaw.username}`),
            ]);

            if (tierRes.status === "fulfilled" && tierRes.value.data) {
              tierIdVal = tierRes.value.data.id;
              setTierId(tierIdVal);
            }
            if (subRes.status === "fulfilled" && subRes.value instanceof Response && subRes.value.ok) {
              const data = await subRes.value.json();
              subscribedVal = !!data.active;
              periodEndVal  = data.currentPeriodEnd ?? null;
              setIsSubscribed(subscribedVal);
              setSubscriptionPeriodEnd(periodEndVal);
            } else if (subRes.status === "fulfilled" && subRes.value instanceof Response && !subRes.value.ok) {
              console.warn("[ProfilePage] subRes response not ok — status:", subRes.value.status);
            }
            if (followRes.status === "fulfilled") {
              followingVal = followRes.value as boolean;
              setIsFollowing(followingVal);
            }
            if (postsRes.status === "fulfilled" && postsRes.value instanceof Response && postsRes.value.ok) {
              const data = await postsRes.value.json();
              fetchedPosts = data.posts || [];
              setApiPosts(fetchedPosts);
            } else if (postsRes.status === "fulfilled" && postsRes.value instanceof Response && !postsRes.value.ok) {
              console.warn("[ProfilePage] postsRes response not ok — status:", postsRes.value.status);
            }
          } else {
            try {
              const res  = await fetch(`/api/posts/creator/${profileRaw.username}`);
              const data = await res.json();
              if (res.ok) { fetchedPosts = data.posts || []; setApiPosts(fetchedPosts); }
            } catch { /* non-fatal */ }
          }
        }

        setStoreProfile(username, {
          viewer: viewerData, profile: enriched, totalLikes: likesCount,
          tierId: tierIdVal, isFollowing: followingVal,
          isSubscribed: subscribedVal, subscriptionPeriodEnd: periodEndVal,
          apiPosts: fetchedPosts, fetchedAt: Date.now(),
        });

      } catch (err) {
        console.error("[ProfilePage] fetchData UNCAUGHT ERROR:", err);
        setFetchError(true);
      } finally {
        setApiLoading(false);
        requestAnimationFrame(() => setRevealed(true));
      }
    };

    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, viewerReady, globalViewer]);

  // FIX: single source of truth for upload-triggered feed refresh
  // Only fires on own profile, only when phase transitions to "done"
  // ContentFeed no longer watches uploads — no double-fetch
  const prevUploadPhases = React.useRef<Record<string, string>>({});
  React.useEffect(() => {
    if (!profile || !viewer || viewer.id !== profile.id) return;

    let shouldRefresh = false;
    for (const u of uploads) {
      const prev = prevUploadPhases.current[u.id];
      if (prev && prev !== "done" && u.phase === "done") {
        shouldRefresh = true;
      }
      prevUploadPhases.current[u.id] = u.phase;
    }

    if (shouldRefresh) {
      refreshPosts(profile.username);
    }
  }, [uploads, profile, viewer, refreshPosts]);

  React.useEffect(() => {
    if (!profileIdRef.current || !viewerIdRef.current) return;
    const supabase  = createClient();
    const creatorId = profileIdRef.current;
    const fanId     = viewerIdRef.current;

    const subscriptionChannel = supabase
      .channel(`sub-status-${creatorId}-${fanId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "subscriptions",
        filter: `fan_id=eq.${fanId}`,
      }, (payload: any) => {
        const row = payload.new;
        if (row?.creator_id === creatorId && row?.status === "active") {
          setIsSubscribed(true);
          setSubscriptionPeriodEnd(row.current_period_end ?? null);
          clearProfile(username);
        }
        if (row?.creator_id === creatorId && (row?.status === "cancelled" || row?.status === "expired")) {
          setIsSubscribed(false);
          clearProfile(username);
        }
      })
      .subscribe();

    const profileChannel = supabase
      .channel(`creator-profile-${creatorId}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "profiles",
        filter: `id=eq.${creatorId}`,
      }, (payload: any) => {
        const updated = payload.new;
        setProfile((prev) => prev
          ? { ...prev, subscriber_count: updated.subscriber_count, likes_count: updated.likes_count }
          : prev
        );
        setTotalLikes(updated.likes_count ?? 0);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscriptionChannel);
      supabase.removeChannel(profileChannel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const handleSubscriptionSuccess = React.useCallback(async () => {
    setIsSubscribed(true);
    updateProfile(username, { isSubscribed: true });
    if (profile) {
      try { await fetchSubscriptionStatus(profile.id); } catch (e) { console.error("[Profile] fetchSubscriptionStatus failed:", e); }
      try { await refreshPosts(profile.username); } catch (e) { console.error("[Profile] refreshPosts failed:", e); }
    }
    clearProfile(username);
  }, [profile, fetchSubscriptionStatus, refreshPosts, username, clearProfile, updateProfile]);

  const handleCancelled = React.useCallback(async () => {
    if (profile) {
      await fetchSubscriptionStatus(profile.id);
      await refreshPosts(profile.username);
    }
  }, [profile, fetchSubscriptionStatus, refreshPosts]);

  const handleFollow = async () => {
    if (!profile || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowCreator(profile.id);
        setIsFollowing(false);
        setProfile((prev) => prev ? { ...prev, follower_count: Math.max((prev.follower_count ?? 1) - 1, 0) } : prev);
        updateProfile(username, { isFollowing: false });
      } else {
        await followCreator(profile.id);
        setIsFollowing(true);
        setProfile((prev) => prev ? { ...prev, follower_count: (prev.follower_count ?? 0) + 1 } : prev);
        updateProfile(username, { isFollowing: true });
      }
    } catch (err) { console.error("Follow error:", err); }
    finally { setFollowLoading(false); }
  };

  const isOwnProfile        = viewer?.id === profile?.id;
  const isCreatorViewingFan = viewer?.role === "creator" && profile?.role === "fan";
  const isViewingCreator    = profile?.role === "creator" && !isOwnProfile && !isCreatorViewingFan;

  const goToProfileSettings = () => router.push("/settings");
  const handlePost          = (content: string, media: File[], isLocked: boolean, price?: number) => console.log("Post:", { content, media, isLocked, price });
  const handleSchedule      = (content: string, media: File[], scheduledFor: Date) => console.log("Schedule:", { content, media, scheduledFor });
  const handleLike          = (_postId: string) => {};
  const handleComment       = (id: string) => console.log("Comment:", id);
  const handleTip           = (_id: string) => openTip();
  const handleUnlock        = (id: string) => openUnlock(id);

  if (!apiLoading && fetchError) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#F1F5F9", marginBottom: "12px" }}>Something went wrong</h1>
          <p style={{ fontSize: "16px", color: "#94A3B8", marginBottom: "24px" }}>Could not load this profile. Check your connection.</p>
          <button
            onClick={() => { setFetchError(false); setApiLoading(true); setRevealed(false); }}
            style={{ padding: "12px 24px", borderRadius: "10px", background: "#8B5CF6", color: "#fff", border: "none", cursor: "pointer", fontSize: "15px", fontWeight: 600 }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!apiLoading && !profile && !fetchError) {
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
    posts: profile?.post_count ?? 0, media: 0, likes: totalLikes,
    subscribers: profile?.subscriber_count ?? 0,
  };

  const profileInfoProps = profile ? {
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
  } : {} as any;

  const padded: React.CSSProperties = { padding: "0 16px" };

  return (
    <>
      {profile && (
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
      )}

      {apiLoading && <ProfileSkeleton context={skeletonContext} />}

      {!apiLoading && (
        <div style={{ opacity: revealed ? 1 : 0, transition: "opacity 0.35s ease" }}>

          {/* 1. CREATOR VIEWING OWN PROFILE */}
          {isOwnProfile && profile?.role === "creator" && (
            <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
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
                posts={[]} isSubscribed={true} isOwnProfile={true}
                creatorUsername={profile.username} initialApiPosts={apiPosts}
                refreshKey={feedRefreshKey}
                onLike={handleLike} onComment={handleComment} onTip={handleTip} onUnlock={handleUnlock}
              />
            </div>
          )}

          {/* 2. FAN VIEWING OWN PROFILE */}
          {isOwnProfile && profile?.role === "fan" && (
            <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
              <ProfileBanner
                bannerUrl={profile.banner_url || undefined} displayName={profile.display_name || profile.username}
                isEditable={false} isCreator={false}
                stats={{ posts: profile.post_count ?? 0, media: 0, likes: totalLikes, subscribers: profile.subscriber_count ?? 0 }}
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
                posts={[]} isSubscribed={true} creatorUsername={profile.username}
                initialApiPosts={apiPosts} refreshKey={feedRefreshKey}
                onLike={handleLike} onComment={handleComment}
                onTip={handleTip} onUnlock={handleUnlock}
              />
            </div>
          )}

          {/* 3. CREATOR VIEWING A FAN */}
          {isCreatorViewingFan && profile && (
            <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "24px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <ProfileAvatar avatarUrl={profile.avatar_url || undefined} displayName={profile.display_name || profile.username} isOnline={false} />
                <ProfileActions viewContext="creatorViewingFan" onMessage={() => console.log("Message fan")} />
              </div>
              <div style={{ marginTop: "16px" }}>
                <ProfileInfo {...profileInfoProps} />
              </div>
              {subscription && <div style={{ marginTop: "24px" }}><FanActivityCard subscription={subscription} /></div>}
            </div>
          )}

          {/* 4. FAN VIEWING SUBSCRIBED CREATOR */}
          {isViewingCreator && isSubscribed && profile && (
            <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
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
                <SubscribedBanner
                  renewalDate={subscriptionPeriodEnd
                    ? new Date(subscriptionPeriodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : "—"}
                  creatorId={profile.id}
                  subscriptionId={subscriptionId}
                  onCancelled={handleCancelled}
                />
              </div>
              <ContentFeed
                posts={[]} isSubscribed={isSubscribed} creatorUsername={profile.username}
                initialApiPosts={apiPosts} refreshKey={feedRefreshKey}
                onLike={handleLike} onComment={handleComment}
                onTip={handleTip} onUnlock={handleUnlock}
              />
            </div>
          )}

          {/* 5. FAN VIEWING UNSUBSCRIBED CREATOR */}
          {isViewingCreator && !isSubscribed && profile && (
            <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
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
                posts={[]} isSubscribed={false} creatorUsername={profile.username}
                initialApiPosts={apiPosts} refreshKey={feedRefreshKey}
                onLike={handleLike} onComment={handleComment}
                onTip={handleTip} onUnlock={handleUnlock}
              />
            </div>
          )}

        </div>
      )}
    </>
  );
}