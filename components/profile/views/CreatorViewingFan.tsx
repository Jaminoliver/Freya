"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import ProfileBanner from "@/components/profile/ProfileBanner";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import ProfileInfo from "@/components/profile/ProfileInfo";
import ProfileActions from "@/components/profile/ProfileActions";
import type { User, Subscription } from "@/lib/types/profile";

interface Props {
  profile:         User;
  totalLikes:      number;
  fromFanList:     boolean;
  fanSubscription: Subscription | null;
  onMessage:       () => void;
  messageLoading?: boolean;
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

export default function CreatorViewingFan({
  profile, totalLikes, fromFanList, fanSubscription, onMessage, messageLoading = false,
}: Props) {
  const router = useRouter();

  const bannerStats = {
    posts:       profile.post_count ?? 0,
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

  const handleBack = fromFanList
    ? () => router.push("/settings?panel=fans")
    : undefined;

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
      <ProfileBanner
        bannerUrl={profile.banner_url || undefined}
        displayName={profile.display_name || profile.username}
        isEditable={false} isCreator={false} stats={bannerStats}
        userId={profile.id} username={profile.username}
        onBack={handleBack}
      />

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 16px" }}>
        <ProfileAvatar
          avatarUrl={profile.avatar_url || undefined}
          displayName={profile.display_name || profile.username}
          isOnline={false}
        />
        <div style={{ paddingBottom: "12px" }}>
          <ProfileActions viewContext="creatorViewingFan" onMessage={onMessage} messageLoading={messageLoading} />
        </div>
      </div>

      <div style={{ padding: "8px 16px 0" }}>
        <ProfileInfo {...profileInfoProps} mode="full" />
      </div>

      {fanSubscription && (
        <div style={{ padding: "16px 16px 0" }}>
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            <StatCard label="Total Spent" value={`₦${(fanSubscription.total_spent ?? 0).toLocaleString("en-NG")}`} />
            <StatCard label="Tips"        value={`₦${(fanSubscription.tips ?? 0).toLocaleString("en-NG")}`} />
            <StatCard label="PPV"         value={String(fanSubscription.ppv_count ?? 0)} />
          </div>

          <div style={{
            background: "#120E1E",
            border: "1px solid rgba(139,92,246,0.18)",
            borderRadius: "12px",
            padding: "4px 14px",
          }}>
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
        </div>
      )}
    </div>
  );
}