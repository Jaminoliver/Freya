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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys, staleTimes } from "@/lib/query/keys";
import { useAppStore } from "@/lib/store/appStore";
import { useUpload } from "@/lib/context/UploadContext";
import { postSyncStore } from "@/lib/store/postSyncStore";
import { startConversation } from "@/app/(main)/messages/page";
import SinglePostSheet from "@/components/shared/SinglePostSheet";
import type { LightboxPost } from "@/components/profile/Lightbox";
const Lightbox = dynamic(() => import("@/components/profile/Lightbox"), { ssr: false });
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
    setProfile: setStoreProfile,
    updateProfile,
    clearProfile,
    viewer: globalViewer,
  } = useAppStore();

  const { uploads } = useUpload();

  const [viewer,                setViewer]                = React.useState<User | null>(null);
  const [profile,               setProfile]               = React.useState<User | null>(null);
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
  const [openPost,           setOpenPost]           = React.useState<{ id: string; sourceIsMessage: boolean } | null>(null);
  const [lightboxPost,       setLightboxPost]       = React.useState<LightboxPost | null>(null);
  const [lightboxMediaIndex, setLightboxMediaIndex] = React.useState(0);
  const imagePosts = React.useMemo(() => apiPosts.filter((p) => !p.locked && p.media?.[0]?.media_type !== "video").map((p) => ({ id: p.id, media: p.media })), [apiPosts]);
  const openLightboxFromProfile = (p: LightboxPost, index: number) => {
    console.log("[ProfilePage] openLightbox called", { postId: p.id, index, windowScrollY: window.scrollY });
    setLightboxMediaIndex(index);
    setLightboxPost(p);
    requestAnimationFrame(() => {
      console.log("[ProfilePage] windowScrollY after rAF1", window.scrollY);
      requestAnimationFrame(() => {
        console.log("[ProfilePage] windowScrollY after rAF2", window.scrollY);
        setTimeout(() => {
          console.log("[ProfilePage] windowScrollY after 500ms", window.scrollY);
        }, 500);
      });
    });
  };

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

  const openAuthModal = useAppStore((s) => s.openAuthModal);
  const openCheckout = (type: CheckoutType, tier: SubscriptionTier = "monthly") => {
    if (!viewer) { openAuthModal(); return; }
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
    if (checkoutType === "tips" && profile) {
      refreshPostsRef.current?.(profile.username);
    }
  }, [checkoutType, lockedPostId, profile]);

  const [messageLoading, setMessageLoading] = React.useState(false);

  const handleMessage = React.useCallback(async () => {
    if (!profile || messageLoading) return;
    setMessageLoading(true);
    const conversationId = await startConversation(profile.id);
    if (conversationId) {
      router.push(`/messages/${conversationId}`);
    } else {
      setMessageLoading(false);
    }
  }, [profile, router, messageLoading]);

  const queryClient = useQueryClient();

  // ── Keep refs in sync so the realtime channel can call them safely ────────
  React.useEffect(() => { profileRef.current = profile; }, [profile]);

  // ── profileQuery: fetch profile from Supabase ─────────────────────────────
  const profileQuery = useQuery({
    queryKey: queryKeys.profile(username),
    queryFn: async () => {
      const supabase = createClient();
      const result   = await supabase
        .from("profiles")
        .select("*, subscription_price, bundle_price_3_months, bundle_price_6_months")
        .eq("username", username)
        .single();
      if (result.error) throw result.error;
      const raw = result.data;
      const user: User & { _likes_count?: number } = {
        ...raw,
        subscriptionPrice: raw.subscription_price ?? 0,
        bundlePricing: {
          threeMonths: raw.bundle_price_3_months ?? undefined,
          sixMonths:   raw.bundle_price_6_months ?? undefined,
        },
        _likes_count: raw.likes_count ?? 0,
      };
      return user;
    },
    staleTime: staleTimes.profile,
    enabled: !!username,
  });

  // ── subStatusQuery: fetch subscription status ─────────────────────────────
  const viewerData   = globalViewer as User | null;
  const profileData  = profileQuery.data ?? null;
  const isOwnProfile = !!viewerData && !!profileData && viewerData.id === profileData.id;
  const isCreator    = profileData?.role === "creator";

  const subStatusQuery = useQuery({
    queryKey: [...queryKeys.profile(username), "subStatus"],
    queryFn: async () => {
      const res  = await fetch(`/api/subscriptions/status?creatorId=${profileData!.id}`);
      const data = await res.json();
      return data;
    },
    staleTime: staleTimes.subscriptions,
    enabled: isCreator && !isOwnProfile && !!viewerData,
  });

  // ── postsQuery: fetch creator posts ──────────────────────────────────────
  const postsQuery = useQuery({
    queryKey: [...queryKeys.profile(username), "posts"],
    queryFn: async () => {
      const res  = await fetch(`/api/posts/creator/${username}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load posts");
      return (data.posts || []) as ApiPost[];
    },
    staleTime: staleTimes.profile,
    enabled: !!profileData,
  });

  // ── Sync query results into local state ───────────────────────────────────
  React.useEffect(() => {
    if (!profileQuery.data) return;
    const p = profileQuery.data;
    setProfile(p);
    profileIdRef.current = p.id;
    setTotalLikes((p as any)._likes_count ?? 0);
    if (viewerData) { setViewer(viewerData); viewerIdRef.current = viewerData.id; }
  }, [profileQuery.data, viewerData]);

  React.useEffect(() => {
    if (!subStatusQuery.data) return;
    const d = subStatusQuery.data;
    setIsSubscribed(!!d.active);
    setSubscriptionPeriodEnd(d.currentPeriodEnd ?? null);
    setSubscriptionId(d.subscriptionId ?? undefined);
    setPricePaid(d.pricePaid ?? undefined);
    setSelectedTier(d.selectedTier ?? undefined);
  }, [subStatusQuery.data]);

  React.useEffect(() => {
    if (!postsQuery.data) return;
    const posts = postsQuery.data.map((p) => {
      const synced = postSyncStore.get(String(p.id));
      if (!synced) return p;
      return { ...p, liked: synced.liked, like_count: synced.like_count };
    });
    setApiPosts(posts);
    setFeedRefreshKey((k) => k + 1);
  }, [postsQuery.data]);

  // ── fanSubscription fetch (creator viewing fan) ───────────────────────────
  React.useEffect(() => {
    if (!profileData || !viewerData) return;
    const ownProfile  = viewerData.id === profileData.id;
    const viewerIsCreator = viewerData.role === "creator";
    if (!viewerIsCreator || ownProfile) return;
    fetch(`/api/fans/subscription?fanId=${profileData.id}`)
      .then((r) => r.json())
      .then((d) => { if (d.subscription) setFanSubscription(d.subscription); })
      .catch(() => {});
  }, [profileData?.id, viewerData?.id]);

  // ── followStatus fetch ────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!profileData || !viewerData || isOwnProfile) return;
    checkIsFollowing(profileData.id)
      .then((val) => setIsFollowing(val as boolean))
      .catch(() => {});
  }, [profileData?.id, viewerData?.id, isOwnProfile]);

  // ── Derive loading + revealed states ─────────────────────────────────────
  const derivedLoading = profileQuery.isLoading || postsQuery.isLoading;

  React.useEffect(() => {
    if (!derivedLoading) {
      setApiLoading(false);
      requestAnimationFrame(() => setRevealed(true));
    }
  }, [derivedLoading]);

  React.useEffect(() => {
    if (profileQuery.isError) setFetchError(true);
  }, [profileQuery.isError]);

  // ── Persist to appStore for backward-compat (removed in Phase 11) ─────────
  React.useEffect(() => {
    if (!profileQuery.data || postsQuery.isLoading) return;
    setStoreProfile(username, {
      viewer:               viewerData,
      profile:              profileQuery.data,
      totalLikes:           (profileQuery.data as any)._likes_count ?? 0,
      tierId:               undefined,
      isFollowing,
      isSubscribed,
      subscriptionPeriodEnd,
      pricePaid,
      selectedTier,
      apiPosts,
      fetchedAt:            Date.now(),
      fanSubscription:      fanSubscription ?? undefined,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileQuery.data, postsQuery.data, isSubscribed]);

  const refreshPosts = React.useCallback(async (creatorUsername: string) => {
    await queryClient.invalidateQueries({ queryKey: [...queryKeys.profile(creatorUsername), "posts"] });
  }, [queryClient]);

  const fetchSubscriptionStatus = React.useCallback(async (_creatorId: string) => {
    await queryClient.invalidateQueries({ queryKey: [...queryKeys.profile(username), "subStatus"] });
  }, [queryClient, username]);

  // ── Keep refs in sync ────────────────────────────────────────────────────
  React.useEffect(() => { refreshPostsRef.current = refreshPosts; },           [refreshPosts]);
  React.useEffect(() => { fetchSubRef.current     = fetchSubscriptionStatus; }, [fetchSubscriptionStatus]);

  React.useEffect(() => {
    if (!profile || !viewer || viewer.id !== profile.id) return;
    let shouldRefresh = false;
    for (const u of uploads) {
      const prev = prevUploadPhases.current[u.id];
      if (u.phase === "done" && prev !== "done") shouldRefresh = true;
      prevUploadPhases.current[u.id] = u.phase;
    }
    if (shouldRefresh) {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.profile(profile.username), "posts"] });
    }
  }, [uploads, profile, viewer, queryClient]);

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
      }, (payload: any) => {
        const row = payload.new;
        if (row?.creator_id !== creatorId) return;
        queryClient.invalidateQueries({ queryKey: [...queryKeys.profile(username), "subStatus"] });
        queryClient.invalidateQueries({ queryKey: [...queryKeys.profile(username), "posts"] });
      })
      .subscribe();

    const profileChannel = supabase
      .channel(`creator-profile-${creatorId}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "profiles",
        filter: `id=eq.${creatorId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.profile(username) });
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
    await queryClient.invalidateQueries({ queryKey: [...queryKeys.profile(username), "subStatus"] });
    await queryClient.invalidateQueries({ queryKey: [...queryKeys.profile(username), "posts"] });
    clearProfile(username);
  }, [username, clearProfile, updateProfile, queryClient]);

  const handleCancelled = React.useCallback(async () => {
    if (profile) {
      setIsSubscribed(false);
      updateProfile(username, { isSubscribed: false });
      clearProfile(username);
      await queryClient.invalidateQueries({ queryKey: [...queryKeys.profile(username), "subStatus"] });
      await queryClient.invalidateQueries({ queryKey: [...queryKeys.profile(username), "posts"] });
    }
  }, [profile, username, clearProfile, updateProfile, queryClient]);

  const handleFollow = async () => {
    if (!viewer) { openAuthModal(); return; }
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
    <div style={{ position: "relative" }}>
      {lightboxPost && (
        <Lightbox
          post={lightboxPost}
          allPosts={imagePosts}
          initialMediaIndex={lightboxMediaIndex}
          onClose={() => setLightboxPost(null)}
          onNavigate={(p, mediaIndex) => { setLightboxMediaIndex(mediaIndex ?? 0); setLightboxPost(p); }}
        />
      )}
      <SinglePostSheet
        postId={openPost?.id ?? null}
        sourceIsMessage={openPost?.sourceIsMessage ?? false}
        onClose={() => setOpenPost(null)}
      />
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
          onSubscriptionSuccess={() => window.location.reload()}
          autoCloseOnSuccess={checkoutType === "ppv" || checkoutType === "tips"}
          onViewContent={() => router.push(`/${profile.username}`)}
          onGoToSubscriptions={() => router.push("/settings?panel=subscriptions")}
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
              onOpenPost={(id) => setOpenPost({ id, sourceIsMessage: false })}
              onImageClick={(p, index) => openLightboxFromProfile(p, index)}
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
              messageLoading={messageLoading}
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
              messageLoading={messageLoading}
              onOpenPost={(id) => setOpenPost({ id, sourceIsMessage: false })}
              onImageClick={(p, index) => openLightboxFromProfile(p, index)}
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
              messageLoading={messageLoading}
              onOpenPost={(id) => setOpenPost({ id, sourceIsMessage: false })}
              onImageClick={(p, index) => openLightboxFromProfile(p, index)}
            />
          )}

          {isViewingCreator && !isSubscribed && profile && !isCreatorViewingDualRole && (
            <UnsubscribedCreatorProfile
              profile={profile} apiPosts={apiPosts} feedRefreshKey={feedRefreshKey}
              totalLikes={totalLikes} isFollowing={isFollowing}
              onSubscribe={(tier) => openCheckout("subscription", tier)}
              onFollow={handleFollow} onTip={openTip}
              onLike={handleLike} onComment={handleComment} onUnlock={handleUnlock}
              onOpenPost={(id) => setOpenPost({ id, sourceIsMessage: false })}
              onImageClick={(p, index) => openLightboxFromProfile(p, index)}
            />
          )}

        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfilePageInner />
    </Suspense>
  );
}