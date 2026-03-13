"use client";

import * as React from "react";
import ProfileBanner from "@/components/profile/ProfileBanner";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import ProfileInfo from "@/components/profile/ProfileInfo";
import ProfileActions from "@/components/profile/ProfileActions";
import PostComposer from "@/components/profile/PostComposer";
import ContentFeed from "@/components/profile/ContentFeed";
import type { User } from "@/lib/types/profile";
import type { ApiPost } from "@/components/profile/PostRow";

interface Props {
  profile:         User;
  apiPosts:        ApiPost[];
  feedRefreshKey:  number;
  totalLikes:      number;
  onBannerUpdated: (url: string) => void;
  onAvatarUpdated: (url: string) => void;
  onEditProfile:   () => void;
  onPost:          (content: string, media: File[], isLocked: boolean, price?: number) => void;
  onSchedule:      (content: string, media: File[], scheduledFor: Date) => void;
  onLike:          (id: string) => void;
  onComment:       (id: string) => void;
  onTip:           (id: string) => void;
  onUnlock:        (id: string) => void;
}

const padded: React.CSSProperties = { padding: "0 16px" };

export default function OwnCreatorProfile({
  profile, apiPosts, feedRefreshKey, totalLikes,
  onBannerUpdated, onAvatarUpdated, onEditProfile,
  onPost, onSchedule, onLike, onComment, onTip, onUnlock,
}: Props) {
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
      <ProfileBanner
        bannerUrl={profile.banner_url || undefined}
        displayName={profile.display_name || profile.username}
        isEditable={true} isCreator={true} stats={bannerStats} userId={profile.id}
        onBannerUpdated={onBannerUpdated}
      />
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", ...padded }}>
        <ProfileAvatar
          avatarUrl={profile.avatar_url || undefined}
          displayName={profile.display_name || profile.username}
          isEditable={true} isOnline={true} userId={profile.id}
          onAvatarUpdated={onAvatarUpdated}
        />
        <div style={{ paddingBottom: "12px" }}>
          <ProfileActions viewContext="ownCreator" onEditProfile={onEditProfile} />
        </div>
      </div>
      <div style={{ padding: "8px 16px 0" }}>
        <ProfileInfo {...profileInfoProps} mode="full" isEditable={true} />
      </div>
      <div style={{ padding: "16px 16px 8px" }}>
        <PostComposer user={profile} onPost={onPost} onSchedule={onSchedule} />
      </div>
      <ContentFeed
        posts={[]} isSubscribed={true} isOwnProfile={true}
        creatorUsername={profile.username} initialApiPosts={apiPosts}
        refreshKey={feedRefreshKey}
        onLike={onLike} onComment={onComment} onTip={onTip} onUnlock={onUnlock}
      />
    </div>
  );
}