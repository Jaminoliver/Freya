"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { followCreator, unfollowCreator, checkIsFollowing } from "@/lib/utils/follow";
import { ProfileSkeleton } from "@/components/loadscreen/ProfileSkeleton";
import type { ProfileSkeletonContext } from "@/components/loadscreen/ProfileSkeleton";
import type { User, Subscription } from "@/lib/types/profile";
import type { CheckoutType, SubscriptionTier } from "@/lib/types/checkout";
import type { ApiPost } from "@/components/profile/PostRow";
import { useAppStore, isStale } from "@/lib/store/appStore";
import { useUpload } from "@/lib/context/UploadContext";
import { postSyncStore } from "@/lib/store/postSyncStore";

// ── Dynamic imports: only the active view loads ──────────────────────────────
const CheckoutModal              = dynamic(() => import("@/components/checkout/CheckoutModal"), { ssr: false });
const OwnCreatorProfile          = dynamic(() => import("@/components/profile/views/OwnCreatorProfile"), { ssr: false });
const OwnFanProfile              = dynamic(() => import("@/components/profile/views/OwnFanProfile"), { ssr: false });
const CreatorViewingFan          = dynamic(() => import("@/components/profile/views/CreatorViewingFan"), { ssr: false });
const CreatorViewingDualRole     = dynamic(() => import("@/components/profile/views/CreatorViewingDualRole"), { ssr: false });
const SubscribedCreatorProfile   = dynamic(() => import("@/components/profile/views/SubscribedCreatorProfile"), { ssr: false });
const UnsubscribedCreatorProfile = dynamic(() => import("@/components/profile/views/UnsubscribedCreatorProfile"), { ssr: false });

export function clearContentFeedCaches() {}

function ProfilePageInner() {
  const params       = useParams();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const username     = params.username as string;
  const fromFanList  = searchParams.get("from") === "fans";

  const {
    profiles,
    setProfile: setStoreProfile,
    updateProfile,
    clearProfile,
    viewer: globalViewer,
  } = useAppStore();

  const { uploads } = useUpload();

  const [viewer,                setViewer]                = React.useState<User | null>(null);
  const [profile,               setProfile]               = React.useState<User | null>(null);
  const [subscription,          setSubscription]          = React.useState<Subscription | null>(null);
  const [isSubscribed,          setIsSubscribed]          = React.useState(false);
  const [subscriptionPeriodEnd, setSubscriptionPeriodEnd] = React.useState<string | null>(null);
  const [subscriptionId,        setSubscriptionId]        = React.useState<number | undefined>(undefined);
  const [pricePaid,             setPricePaid]             = React.useState<number | undefined>(undefined);
  const [selectedTier,          setSelectedTier]          = React.useState<string | undefined>(undefined);
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
  const [lockedPostId,    setLockedPostId]    = React.useState<number | undefined>(undefined);
  const [lockedPostPrice, setLockedPostPrice] = React.useState<number>(0);

  const [fanSubscription, setFanSubscription] = React.useState<Subscription | null>(null);

  const profileIdRef = React.useRef<string | null>(null);
  const viewerIdRef  = React.useRef<string | null>(null);

  // ── Stable refs so realtime callbacks always have fresh values ────────────
  const profileRef      = React.useRef<User | null>(null);
  const refreshPostsRef = React.useRef<((u: string) => Promise<void>) | null>(null);
  const fetchSubRef     = React.useRef<((id: string) => Promise<void>) | null>(null);

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
    setCheckoutType(type);
    setCheckoutTier(tier);
    setCheckoutOpen(true);
  };

  const openTip = () => openCheckout("tips");

  const handleUnlock = (id: string) => {
    const post = apiPosts.find((p) => String(p.id) === id);
    if (!post) return;
    if (post.is_ppv) {
      setLockedPostId(post.id);
      setLockedPostPrice((post.ppv_price ?? 0) / 100);
      setCheckoutType("ppv");
      setCheckoutOpen(true);
    } else {
      openCheckout("subscription");
    }
  };

  const handleCheckoutSuccess = React.useCallback(() => {
    if (checkoutType === "ppv" && lockedPostId) {
      setApiPosts((prev) =>
        prev.map((p) =>
          p.id === lockedPostId ? { ...p, locked: false, can_access: true } : p
        )
      );
      setFeedRefreshKey((k) => k + 1);
    }
  }, [checkoutType, lockedPostId]);

  const handleMessage = React.useCallback(async () => {
    if (!profile) return;
    try {
      const res  = await fetch("/api/conversations", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ targetUserId: profile.id }),
      });
      const data = await res.json();
      if (res.ok && data.conversationId) {
        router.push(`/messages/${data.conversationId}`);
      }
    } catch (err) {
      console.error("[handleMessage] failed:", err);
    }
  }, [profile, router]);

  const fetchSubscriptionStatus = React.useCallback(async (creatorId: string) => {
    try {
      const res  = await fetch(`/api/subscriptions/status?creatorId=${creatorId}`);
      const data = await res.json();
      setIsSubscribed(!!data.active);
      setSubscriptionPeriodEnd(data.currentPeriodEnd ?? null);
      setSubscriptionId(data.subscriptionId ?? undefined);
      setPricePaid(data.pricePaid ?? undefined);
      setSelectedTier(data.selectedTier ?? undefined);
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

  // ── Keep refs in sync so the realtime channel can call them safely ────────
  React.useEffect(() => { profileRef.current      = profile; },               [profile]);
  React.useEffect(() => { refreshPostsRef.current = refreshPosts; },           [refreshPosts]);
  React.useEffect(() => { fetchSubRef.current     = fetchSubscriptionStatus; }, [fetchSubscriptionStatus]);

  const backgroundRevalidate = React.useCallback(async (creatorId: string, creatorUsername: string) => {
    try {
      const [subRes, postsRes] = await Promise.allSettled([
        fetch(`/api/subscriptions/status?creatorId=${creatorId}`),
        fetch(`/api/posts/creator/${creatorUsername}`),
      ]);
      if (subRes.status === "fulfilled" && subRes.value.ok) {
        const data = await subRes.value.json();
        const subscribedVal   = !!data.active;
        const periodEndVal    = data.currentPeriodEnd ?? null;
        const pricePaidVal    = data.pricePaid ?? undefined;
        const selectedTierVal = data.selectedTier ?? undefined;
        setIsSubscribed(subscribedVal);
        setSubscriptionPeriodEnd(periodEndVal);
        setPricePaid(pricePaidVal);
        setSelectedTier(selectedTierVal);
        updateProfile(creatorUsername, {
          isSubscribed: subscribedVal,
          subscriptionPeriodEnd: periodEndVal,
          pricePaid: pricePaidVal,
          selectedTier: selectedTierVal,
        });
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

    setFanSubscription(null);

    const cached = profiles[username];
    const fresh  = cached && !isStale(cached.fetchedAt);

    if (fresh) {
      if (cached.viewer)  { setViewer(cached.viewer);   viewerIdRef.current  = cached.viewer.id; }
      if (cached.profile) { setProfile(cached.profile); profileIdRef.current = cached.profile.id; }
      setApiPosts((cached.apiPosts ?? []).map((p) => {
        const synced = postSyncStore.get(String(p.id));
        if (!synced) return p;
        return { ...p, liked: synced.liked, like_count: synced.like_count };
      }));
      setIsSubscribed(cached.isSubscribed ?? false);
      setSubscriptionPeriodEnd(cached.subscriptionPeriodEnd ?? null);
      setPricePaid(cached.pricePaid ?? undefined);
      setSelectedTier(cached.selectedTier ?? undefined);
      setIsFollowing(cached.isFollowing ?? false);
      setTotalLikes(cached.totalLikes ?? 0);
      if (cached.fanSubscription) setFanSubscription(cached.fanSubscription);
      setApiLoading(false);
      requestAnimationFrame(() => setRevealed(true));

      if (cached.profile?.role === "creator" && cached.viewer?.id !== cached.profile.id) {
        backgroundRevalidate(cached.profile.id, cached.profile.username);
      }
      return;
    }

    const fetchData = async () => {
      try {
        const supabase    = createClient();
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

        let enriched: User | null            = null;
        let likesCount                       = 0;
        let followingVal                     = false;
        let subscribedVal                    = false;
        let periodEndVal: string | null      = null;
        let pricePaidVal: number | undefined  = undefined;
        let selectedTierVal: string | undefined = undefined;
        let fetchedPosts: ApiPost[]          = [];
        let fanSubData: Subscription | null  = null;

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
            const [subRes, followRes, postsRes, fanSubRes] = await Promise.allSettled([
              !isOwnProfile && userId
                ? fetch(`/api/subscriptions/status?creatorId=${profileRaw.id}`)
                : Promise.resolve(null),
              !isOwnProfile && userId
                ? checkIsFollowing(profileRaw.id)
                : Promise.resolve(false),
              fetch(`/api/posts/creator/${profileRaw.username}`),
              viewerData?.role === "creator" && !isOwnProfile && userId
                ? fetch(`/api/fans/subscription?fanId=${profileRaw.id}`)
                : Promise.resolve(null),
            ]);

            if (subRes.status === "fulfilled" && subRes.value instanceof Response && subRes.value.ok) {
              const data = await subRes.value.json();
              subscribedVal   = !!data.active;
              periodEndVal    = data.currentPeriodEnd ?? null;
              pricePaidVal    = data.pricePaid ?? undefined;
              selectedTierVal = data.selectedTier ?? undefined;
              setIsSubscribed(subscribedVal);
              setSubscriptionPeriodEnd(periodEndVal);
              setPricePaid(pricePaidVal);
              setSelectedTier(selectedTierVal);
            }
            if (followRes.status === "fulfilled") {
              followingVal = followRes.value as boolean;
              setIsFollowing(followingVal);
            }
            if (postsRes.status === "fulfilled" && postsRes.value instanceof Response && postsRes.value.ok) {
              const data = await postsRes.value.json();
              fetchedPosts = (data.posts || []).map((p: any) => {
                const synced = postSyncStore.get(String(p.id));
                if (!synced) return p;
                return { ...p, liked: synced.liked, like_count: synced.like_count };
              });
              setApiPosts(fetchedPosts);
            }
            if (fanSubRes.status === "fulfilled" && fanSubRes.value instanceof Response && fanSubRes.value.ok) {
              const data = await fanSubRes.value.json();
              if (data.subscription) {
                fanSubData = data.subscription;
                setFanSubscription(data.subscription);
              }
            }
          } else {
            const [fanPostsRes, fanSubRes2] = await Promise.allSettled([
              fetch(`/api/posts/creator/${profileRaw.username}`),
              viewerData?.role === "creator" && !isOwnProfile && userId
                ? fetch(`/api/fans/subscription?fanId=${profileRaw.id}`)
                : Promise.resolve(null),
            ]);
            if (fanPostsRes.status === "fulfilled" && fanPostsRes.value instanceof Response && fanPostsRes.value.ok) {
              const data = await fanPostsRes.value.json();
              fetchedPosts = data.posts || [];
              setApiPosts(fetchedPosts);
            }
            if (fanSubRes2.status === "fulfilled" && fanSubRes2.value instanceof Response && fanSubRes2.value.ok) {
              const data = await fanSubRes2.value.json();
              if (data.subscription) {
                fanSubData = data.subscription;
                setFanSubscription(data.subscription);
              }
            }
          }
        }

        setStoreProfile(username, {
          viewer: viewerData, profile: enriched, totalLikes: likesCount,
          tierId: undefined,
          isFollowing: followingVal,
          isSubscribed: subscribedVal, subscriptionPeriodEnd: periodEndVal,
          pricePaid: pricePaidVal,
          selectedTier: selectedTierVal,
          apiPosts: fetchedPosts, fetchedAt: Date.now(),
          fanSubscription: fanSubData ?? undefined,
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

  React.useEffect(() => {
    if (!profile || !viewer || viewer.id !== profile.id) return;
    let shouldRefresh = false;
    for (const u of uploads) {
      const prev = prevUploadPhases.current[u.id];
      if (u.phase === "done" && prev !== "done") shouldRefresh = true;
      prevUploadPhases.current[u.id] = u.phase;
    }
    if (shouldRefresh) refreshPosts(profile.username);
  }, [uploads, profile, viewer, refreshPosts]);

  const prevUploadPhases = React.useRef<Record<string, string>>({});

  // ── Realtime channel: subscription + profile updates ─────────────────────
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
      }, async (payload: any) => {
        const row = payload.new;

        if (row?.creator_id === creatorId && row?.status === "active") {
          setIsSubscribed(true);
          setSubscriptionPeriodEnd(row.current_period_end ?? null);
          clearProfile(username);
          const currentProfile = profileRef.current;
          if (currentProfile?.username) {
            await fetchSubRef.current?.(creatorId);
            await refreshPostsRef.current?.(currentProfile.username);
          }
        }

        if (row?.creator_id === creatorId && (row?.status === "cancelled" || row?.status === "expired")) {
          setIsSubscribed(false);
          clearProfile(username);
          const currentProfile = profileRef.current;
          if (currentProfile?.username) {
            await fetchSubRef.current?.(creatorId);
            await refreshPostsRef.current?.(currentProfile.username);
          }
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
      try { await fetchSubscriptionStatus(profile.id); } catch (e) { console.error(e); }
      try { await refreshPosts(profile.username); }     catch (e) { console.error(e); }
    }
    clearProfile(username);
  }, [profile, fetchSubscriptionStatus, refreshPosts, username, clearProfile, updateProfile]);

  const handleCancelled = React.useCallback(async () => {
    if (profile) {
      setIsSubscribed(false);
      updateProfile(username, { isSubscribed: false });
      clearProfile(username);
      try { await fetchSubscriptionStatus(profile.id); } catch (e) { console.error(e); }
      try { await refreshPosts(profile.username); }     catch (e) { console.error(e); }
    }
  }, [profile, fetchSubscriptionStatus, refreshPosts, username, clearProfile, updateProfile]);

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

  const isOwnProfile             = viewer?.id === profile?.id;
  const isCreatorViewingFan      = viewer?.role === "creator" && profile?.role === "fan" && !isOwnProfile;
  const isCreatorViewingDualRole = viewer?.role === "creator" && profile?.role === "creator" && !isOwnProfile && !!fanSubscription;
  const isViewingCreator         = profile?.role === "creator" && !isOwnProfile && !isCreatorViewingFan;

  const handlePost     = (content: string, media: File[], isLocked: boolean, price?: number) => console.log("Post:", { content, media, isLocked, price });
  const handleSchedule = (content: string, media: File[], scheduledFor: Date) => console.log("Schedule:", { content, media, scheduledFor });

  React.useEffect(() => {
    const unsub = postSyncStore.subscribe((event) => {
      setApiPosts((prev) =>
        prev.map((p) =>
          String(p.id) === event.postId
            ? { ...p, liked: event.liked, like_count: event.like_count }
            : p
        )
      );
    });
    return unsub;
  }, []);

  const handleLike    = (_postId: string) => {};
  const handleComment = (id: string) => console.log("Comment:", id);

  // ── FIX: capture post ID so tips are linked to the correct post ──────────
  const handleTip = (id: string) => {
    const post = apiPosts.find((p) => String(p.id) === id);
    setLockedPostId(post?.id);
    openTip();
  };

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
          postPrice={lockedPostPrice}
          postId={lockedPostId}
          onSuccess={handleCheckoutSuccess}
          onViewContent={() => router.push(`/${profile.username}`)}
          onGoToSubscriptions={() => router.push("/settings?panel=subscriptions")}
          onSubscriptionSuccess={handleSubscriptionSuccess}
        />
      )}

      {apiLoading && <ProfileSkeleton context={skeletonContext} />}

      {!apiLoading && (
        <div style={{ opacity: revealed ? 1 : 0, transition: "opacity 0.35s ease" }}>

          {isOwnProfile && profile?.role === "creator" && (
            <OwnCreatorProfile
              profile={profile} apiPosts={apiPosts} feedRefreshKey={feedRefreshKey}
              totalLikes={totalLikes}
              onBannerUpdated={(url) => setProfile((p) => p ? { ...p, banner_url: url } : p)}
              onAvatarUpdated={(url) => setProfile((p) => p ? { ...p, avatar_url: url } : p)}
              onEditProfile={() => router.push("/settings")}
              onPost={handlePost} onSchedule={handleSchedule}
              onLike={handleLike} onComment={handleComment} onTip={handleTip} onUnlock={handleUnlock}
            />
          )}

          {isOwnProfile && profile?.role === "fan" && (
            <OwnFanProfile
              profile={profile} apiPosts={apiPosts} feedRefreshKey={feedRefreshKey}
              totalLikes={totalLikes}
              onAvatarUpdated={(url) => setProfile((p) => p ? { ...p, avatar_url: url } : p)}
              onEditProfile={() => router.push("/settings")}
              onLike={handleLike} onComment={handleComment} onTip={handleTip} onUnlock={handleUnlock}
            />
          )}

          {isCreatorViewingFan && profile && (
            <CreatorViewingFan
              profile={profile} totalLikes={totalLikes}
              fromFanList={fromFanList} fanSubscription={fanSubscription}
              onMessage={handleMessage}
            />
          )}

          {isCreatorViewingDualRole && profile && (
            <CreatorViewingDualRole
              profile={profile} apiPosts={apiPosts} feedRefreshKey={feedRefreshKey}
              totalLikes={totalLikes} fromFanList={fromFanList}
              isSubscribed={isSubscribed} isFollowing={isFollowing}
              subscriptionPeriodEnd={subscriptionPeriodEnd} subscriptionId={subscriptionId}
              fanSubscription={fanSubscription}
              pricePaid={pricePaid}
              selectedTier={selectedTier}
              onSubscribe={(tier) => openCheckout("subscription", tier)}
              onCancelled={handleCancelled} onFollow={handleFollow}
              onTip={handleTip} onMessage={handleMessage}
              onLike={handleLike} onComment={handleComment} onUnlock={handleUnlock}
            />
          )}

          {isViewingCreator && isSubscribed && profile && !isCreatorViewingDualRole && (
            <SubscribedCreatorProfile
              profile={profile} apiPosts={apiPosts} feedRefreshKey={feedRefreshKey}
              totalLikes={totalLikes} isFollowing={isFollowing}
              subscriptionPeriodEnd={subscriptionPeriodEnd} subscriptionId={subscriptionId}
              onCancelled={handleCancelled} onFollow={handleFollow}
              onTip={handleTip} onMessage={handleMessage}
              onLike={handleLike} onComment={handleComment} onUnlock={handleUnlock}
              pricePaid={pricePaid}
              selectedTier={selectedTier}
            />
          )}

          {isViewingCreator && !isSubscribed && profile && !isCreatorViewingDualRole && (
            <UnsubscribedCreatorProfile
              profile={profile} apiPosts={apiPosts} feedRefreshKey={feedRefreshKey}
              totalLikes={totalLikes} isFollowing={isFollowing}
              onSubscribe={(tier) => openCheckout("subscription", tier)}
              onFollow={handleFollow} onTip={openTip}
              onLike={handleLike} onComment={handleComment} onUnlock={handleUnlock}
            />
          )}

        </div>
      )}
    </>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfilePageInner />
    </Suspense>
  );
}