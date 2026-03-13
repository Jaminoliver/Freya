"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import ProfileBanner from "@/components/profile/ProfileBanner";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import ProfileInfo from "@/components/profile/ProfileInfo";
import ProfileActions from "@/components/profile/ProfileActions";
import SubscriptionCard from "@/components/profile/SubscriptionCard";
import SubscribedBanner from "@/components/profile/SubscribedBanner";
import ContentFeed from "@/components/profile/ContentFeed";
import type { User, Subscription } from "@/lib/types/profile";
import type { ApiPost } from "@/components/profile/PostRow";
import type { SubscriptionTier } from "@/lib/types/checkout";

interface Props {
  profile:                User;
  apiPosts:               ApiPost[];
  feedRefreshKey:         number;
  totalLikes:             number;
  fromFanList:            boolean;
  isSubscribed:           boolean;
  isFollowing:            boolean;
  subscriptionPeriodEnd:  string | null;
  subscriptionId:         number | undefined;
  fanSubscription:        Subscription | null;
  onSubscribe:            (tier: SubscriptionTier) => void;
  onCancelled:            () => void;
  onFollow:               () => void;
  onTip:                  () => void;
  onLike:                 (id: string) => void;
  onComment:              (id: string) => void;
  onUnlock:               (id: string) => void;
}

const padded: React.CSSProperties = { padding: "0 16px" };

export default function CreatorViewingDualRole({
  profile, apiPosts, feedRefreshKey, totalLikes,
  fromFanList, isSubscribed, isFollowing,
  subscriptionPeriodEnd, subscriptionId,
  fanSubscription, onSubscribe, onCancelled,
  onFollow, onTip, onLike, onComment, onUnlock,
}: Props) {
  const router = useRouter();

  const bannerStats = {
    posts:       profile.post_count ?? 0,
    media:       0,
    likes:       totalLikes,
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

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
      {fromFanList && (
        <button
          onClick={() => router.push("/settings?panel=fans")}
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", padding: "12px 16px 4px", color: "#8B5CF6", fontSize: "13px", fontWeight: 600, fontFamily: "'Inter', sans-serif" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          Back to Fans
        </button>
      )}
      <ProfileBanner
        bannerUrl={profile.banner_url || undefined}
        displayName={profile.display_name || profile.username}
        isEditable={false} isCreator={true} stats={bannerStats}
      />
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", ...padded }}>
        <ProfileAvatar avatarUrl={profile.avatar_url || undefined} displayName={profile.display_name || profile.username} isOnline={false} />
        <div style={{ paddingBottom: "12px" }}>
          <ProfileActions
            viewContext="fanViewingCreator"
            onMessage={() => console.log("Message")}
            onTip={onTip}
            onShare={() => console.log("Share")}
            onFollow={onFollow}
            isFollowing={isFollowing}
          />
        </div>
      </div>
      <div style={{ padding: "8px 16px 0" }}>
        <ProfileInfo {...profileInfoProps} mode="full" />
      </div>

      {isSubscribed ? (
        <div style={{ padding: "16px 16px 8px" }}>
          <SubscribedBanner
            renewalDate={subscriptionPeriodEnd
              ? new Date(subscriptionPeriodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : "—"}
            creatorId={profile.id}
            subscriptionId={subscriptionId}
            onCancelled={onCancelled}
          />
        </div>
      ) : (
        <div style={{ padding: "16px 16px 8px" }}>
          <SubscriptionCard
            monthlyPrice={profile.subscriptionPrice ?? 0}
            threeMonthPrice={profile.bundlePricing?.threeMonths}
            sixMonthPrice={profile.bundlePricing?.sixMonths}
            isEditable={false}
            onSubscribe={onSubscribe}
          />
        </div>
      )}

      {fanSubscription && (
        <div style={{ padding: "0 16px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "10px 14px", borderRadius: "10px", backgroundColor: "rgba(139,92,246,0.06)" }}>
            <span style={{
              fontSize: "10px", fontWeight: 700,
              color: fanSubscription.status === "cancelled" ? "#EF4444" : "#8B5CF6",
              letterSpacing: "0.06em", fontFamily: "'Inter', sans-serif", flexShrink: 0,
            }}>
              {fanSubscription.status === "cancelled" ? "SUBSCRIPTION CANCELLED" : "YOUR FAN"}
            </span>
            <div style={{ width: "1px", height: "16px", backgroundColor: "#2A2A3D" }} />
            <span style={{ fontSize: "12px", color: "#94A3B8", fontFamily: "'Inter', sans-serif" }}>
              Since{" "}
              <span style={{ color: "#F1F5F9", fontWeight: 600 }}>
                {new Date(fanSubscription.subscribed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </span>
            <div style={{ width: "1px", height: "16px", backgroundColor: "#2A2A3D" }} />
            <span style={{ fontSize: "12px", color: "#94A3B8", fontFamily: "'Inter', sans-serif" }}>
              Spent{" "}
              <span style={{ color: "#10B981", fontWeight: 600 }}>
                ₦{(fanSubscription.total_spent ?? 0).toLocaleString("en-NG")}
              </span>
            </span>
            <div style={{ width: "1px", height: "16px", backgroundColor: "#2A2A3D" }} />
            <span style={{
              fontSize: "10px", fontWeight: 600,
              color: fanSubscription.status === "active" ? "#10B981" : "#F59E0B",
              backgroundColor: fanSubscription.status === "active" ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
              borderRadius: "4px", padding: "2px 7px",
              textTransform: "capitalize", fontFamily: "'Inter', sans-serif",
            }}>
              {fanSubscription.status}
            </span>
          </div>
        </div>
      )}

      <ContentFeed
        posts={[]} isSubscribed={isSubscribed} creatorUsername={profile.username}
        initialApiPosts={apiPosts} refreshKey={feedRefreshKey}
        onLike={onLike} onComment={onComment} onTip={() => onTip()} onUnlock={onUnlock}
      />
    </div>
  );
}