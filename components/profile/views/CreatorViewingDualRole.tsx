"use client";

import * as React from "react";
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
import { useNav } from "@/lib/hooks/useNav";
import { useAppStore } from "@/lib/store/appStore";

interface Props {
  profile:               User;
  apiPosts:              ApiPost[];
  feedRefreshKey:        number;
  totalLikes:            number;
  fromFanList:           boolean;
  isSubscribed:          boolean;
  isFollowing:           boolean;
  subscriptionPeriodEnd: string | null;
  subscriptionId:        number | undefined;
  fanSubscription:       Subscription | null;
  pricePaid?:            number;
  selectedTier?:         string;
  onSubscribe:           (tier: SubscriptionTier) => void;
  onCancelled:           () => void;
  onFollow:              () => void;
  onTip:                 (id: string) => void;
  onMessage:             () => void;
  onLike:                (id: string) => void;
  onComment:             (id: string) => void;
  onUnlock:              (id: string) => void;
}

const padded: React.CSSProperties = { padding: "0 16px" };

function tierToMonths(tier: string | undefined): number {
  if (tier === "three_month") return 3;
  if (tier === "six_month")   return 6;
  return 1;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: "rgba(139,92,246,0.06)",
      border: "1px solid rgba(139,92,246,0.12)",
      borderRadius: "10px",
      padding: "10px 12px",
      textAlign: "center",
      flex: 1,
    }}>
      <p style={{ fontSize: "11px", color: "#94A3B8", margin: "0 0 3px", fontFamily: "'Inter', sans-serif" }}>{label}</p>
      <p style={{ fontSize: "15px", fontWeight: 600, color: "#F1F5F9", margin: 0, fontFamily: "'Inter', sans-serif" }}>{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0" }}>
      <span style={{ fontSize: "12px", color: "#94A3B8", fontFamily: "'Inter', sans-serif" }}>{label}</span>
      <span style={{ fontSize: "12px", fontWeight: 500, color: "#F1F5F9", fontFamily: "'Inter', sans-serif" }}>{value}</span>
    </div>
  );
}

export default function CreatorViewingDualRole({
  profile, apiPosts, feedRefreshKey, totalLikes,
  fromFanList, isSubscribed, isFollowing,
  subscriptionPeriodEnd, subscriptionId,
  fanSubscription, pricePaid, selectedTier,
  onSubscribe, onCancelled,
  onFollow, onTip, onMessage, onLike, onComment, onUnlock,
}: Props) {
  const { navigate } = useNav();
  const setSettingsPanel = useAppStore((s) => s.setSettingsPanel);

  const handleBackToFans = () => {
    setSettingsPanel("fans");
    navigate("/settings");
  };

  const bannerStats = {
    posts:       apiPosts.length,
    followers:   profile.follower_count ?? 0,
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

  const isActive    = fanSubscription?.status === "active";
  const isCancelled = fanSubscription?.status === "cancelled";
  const statusColor = isActive ? "#10B981" : isCancelled ? "#EF4444" : "#F59E0B";
  const statusBg    = isActive ? "rgba(16,185,129,0.1)" : isCancelled ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)";

  const planLabel = (() => {
    const tier = fanSubscription?.selected_tier;
    if (!tier) return "1 Month";
    if (tier === "three_month") return "3 Months";
    if (tier === "six_month")   return "6 Months";
    return "1 Month";
  })();

  const fanInfoContent = fanSubscription ? (
    <>
      <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
        <StatCard label="Total Spent" value={`₦${(fanSubscription.total_spent ?? 0).toLocaleString("en-NG")}`} />
        <StatCard label="Tips"        value={`₦${(fanSubscription.tips ?? 0).toLocaleString("en-NG")}`} />
        <StatCard label="PPV"         value={String(fanSubscription.ppv_count ?? 0)} />
      </div>
      <div style={{ background: "#120E1E", border: "1px solid rgba(139,92,246,0.18)", borderRadius: "12px", padding: "4px 14px" }}>
        <Row
          label="Status"
          value={
            <span style={{ fontSize: "11px", fontWeight: 600, color: statusColor, background: statusBg, padding: "2px 8px", borderRadius: "999px", textTransform: "capitalize" }}>
              {fanSubscription.status}
            </span>
          }
        />
        <div style={{ height: "1px", background: "rgba(139,92,246,0.1)" }} />
        <Row label="Fan since" value={new Date(fanSubscription.subscribed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} />
        <div style={{ height: "1px", background: "rgba(139,92,246,0.1)" }} />
        <Row label="Renews" value={fanSubscription.expires_at ? new Date(fanSubscription.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"} />
        <div style={{ height: "1px", background: "rgba(139,92,246,0.1)" }} />
        <Row label="Plan" value={planLabel} />
      </div>
    </>
  ) : null;

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
      {fromFanList && (
        <button
          onClick={handleBackToFans}
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
        userId={profile.id} username={profile.username}
      />

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", ...padded }}>
        <ProfileAvatar avatarUrl={profile.avatar_url || undefined} displayName={profile.display_name || profile.username} creatorId={profile.id} isOnline={false} />
        <div style={{ paddingBottom: "12px" }}>
          <ProfileActions
            viewContext="fanViewingCreator"
            isSubscribed={isSubscribed}
            onMessage={onMessage} onTip={() => onTip("")} onFollow={onFollow} isFollowing={isFollowing}
          />
        </div>
      </div>

      <div style={{ padding: "8px 16px 0" }}>
        <ProfileInfo
          {...profileInfoProps}
          mode="full"
          badge={fanSubscription ? {
            label:  isCancelled ? "CANCELLED FAN" : "YOUR FAN",
            color:  "#fff",
            bg:     "linear-gradient(135deg, #8B5CF6, #EC4899)",
            border: "transparent",
          } : undefined}
        />
      </div>

      {isSubscribed ? (
        <div style={{ padding: "16px 16px 8px" }}>
          <SubscribedBanner
            renewalDate={subscriptionPeriodEnd
              ? new Date(subscriptionPeriodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : "—"}
            creatorId={profile.id}
            creatorName={profile.display_name || profile.username}
            avatarUrl={profile.avatar_url || undefined}
            subscriptionId={subscriptionId}
            price={pricePaid != null ? Math.round(pricePaid / 100) : undefined}
            planMonths={tierToMonths(selectedTier)}
            memberSince={subscriptionPeriodEnd
              ? new Date(new Date(subscriptionPeriodEnd).setMonth(
                  new Date(subscriptionPeriodEnd).getMonth() - tierToMonths(selectedTier)
                )).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : undefined}
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

      <ContentFeed
        posts={[]} isSubscribed={isSubscribed} creatorUsername={profile.username}
        initialApiPosts={apiPosts} refreshKey={feedRefreshKey}
        onLike={onLike} onComment={onComment} onTip={onTip} onUnlock={onUnlock}
        extraTab={fanSubscription ? "FAN INFO" : undefined}
        extraTabContent={fanInfoContent}
      />
    </div>
  );
}