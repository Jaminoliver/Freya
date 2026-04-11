"use client";

import * as React from "react";
import ProfileBanner from "@/components/profile/ProfileBanner";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import ProfileInfo from "@/components/profile/ProfileInfo";
import ProfileActions from "@/components/profile/ProfileActions";
import SubscribedBanner from "@/components/profile/SubscribedBanner";
import ContentFeed from "@/components/profile/ContentFeed";
import type { User } from "@/lib/types/profile";
import type { ApiPost } from "@/components/profile/PostRow";

interface Props {
  profile:               User;
  apiPosts:              ApiPost[];
  feedRefreshKey:        number;
  totalLikes:            number;
  isFollowing:           boolean;
  subscriptionPeriodEnd: string | null;
  subscriptionId:        number | undefined;
  pricePaid?:            number;
  selectedTier?:         string;
  onCancelled:           () => void;
  onFollow:              () => void;
  onTip:                 () => void;
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

export default function SubscribedCreatorProfile({
  profile, apiPosts, feedRefreshKey, totalLikes,
  isFollowing, subscriptionPeriodEnd, subscriptionId,
  pricePaid, selectedTier,
  onCancelled, onFollow, onTip, onMessage,
  onLike, onComment, onUnlock,
}: Props) {
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

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
      <ProfileBanner
        bannerUrl={profile.banner_url || undefined}
        displayName={profile.display_name || profile.username}
        isEditable={false} isCreator={true} stats={bannerStats}
      />
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", ...padded }}>
        <ProfileAvatar
          avatarUrl={profile.avatar_url || undefined}
          displayName={profile.display_name || profile.username}
          creatorId={profile.id}
          isOnline={false}
        />
        <div style={{ paddingBottom: "12px" }}>
          <ProfileActions
            viewContext="fanViewingCreator"
            isSubscribed={true}
            onMessage={onMessage}
            onTip={onTip}
            onFollow={onFollow}
            isFollowing={isFollowing}
          />
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
      <ContentFeed
        posts={[]} isSubscribed={true} creatorUsername={profile.username}
        initialApiPosts={apiPosts} refreshKey={feedRefreshKey}
        onLike={onLike} onComment={onComment} onTip={() => onTip()} onUnlock={onUnlock}
      />
    </div>
  );
}