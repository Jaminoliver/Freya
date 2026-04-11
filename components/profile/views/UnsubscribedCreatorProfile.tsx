"use client";

import * as React from "react";
import ProfileBanner from "@/components/profile/ProfileBanner";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import ProfileInfo from "@/components/profile/ProfileInfo";
import ProfileActions from "@/components/profile/ProfileActions";
import SubscriptionCard from "@/components/profile/SubscriptionCard";
import ContentFeed from "@/components/profile/ContentFeed";
import type { User } from "@/lib/types/profile";
import type { ApiPost } from "@/components/profile/PostRow";
import type { SubscriptionTier } from "@/lib/types/checkout";

interface Props {
  profile:        User;
  apiPosts:       ApiPost[];
  feedRefreshKey: number;
  totalLikes:     number;
  isFollowing:    boolean;
  onSubscribe:    (tier: SubscriptionTier) => void;
  onFollow:       () => void;
  onTip:          () => void;
  onLike:         (id: string) => void;
  onComment:      (id: string) => void;
  onUnlock:       (id: string) => void;
}

const padded: React.CSSProperties = { padding: "0 16px" };

export default function UnsubscribedCreatorProfile({
  profile, apiPosts, feedRefreshKey, totalLikes,
  isFollowing, onSubscribe, onFollow, onTip,
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
          isOnline={false}
        />
        <div style={{ paddingBottom: "12px" }}>
          <ProfileActions
            viewContext="fanViewingCreator"
            isSubscribed={false}
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
        <SubscriptionCard
          monthlyPrice={profile.subscriptionPrice ?? 0}
          threeMonthPrice={profile.bundlePricing?.threeMonths}
          sixMonthPrice={profile.bundlePricing?.sixMonths}
          isEditable={false}
          onSubscribe={onSubscribe}
        />
      </div>
      <ContentFeed
        posts={[]} isSubscribed={false} creatorUsername={profile.username}
        initialApiPosts={apiPosts} refreshKey={feedRefreshKey}
        onLike={onLike} onComment={onComment} onTip={() => onTip()} onUnlock={onUnlock}
      />
    </div>
  );
}