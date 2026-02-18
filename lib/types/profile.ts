// User role types
export type UserRole = 'creator' | 'fan';

// User type — matches public.profiles table exactly
export interface User {
  id: string;
  role: UserRole;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  location: string | null;
  website_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  is_verified: boolean;
  is_email_verified: boolean;
  is_age_verified: boolean;
  is_creator_verified: boolean;
  email_verified_at: string | null;
  age_verified_at: string | null;
  creator_verified_at: string | null;
  follower_count: number;
  following_count: number;
  post_count: number;
  subscriber_count: number;
  is_active: boolean;
  is_suspended: boolean;
  suspended_at: string | null;
  suspended_reason: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;

  // Creator-specific (not in DB, handled separately)
  subscriptionPrice?: number;
  bundlePricing?: {
    threeMonths?: number;
    sixMonths?: number;
  };
}

// Profile stats
export interface ProfileStats {
  posts: number;
  media: number;
  likes: number;
  subscribers?: number;
  subscriptions?: number;
}

// Subscription status
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled';

// Subscription type
export interface Subscription {
  id: string;
  subscriber_id: string;
  creator_id: string;
  status: SubscriptionStatus;
  auto_renew: boolean;
  subscribed_at: string;
  expires_at: string;
  total_spent: number;
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
}

// Post type
export interface Post {
  id: string;
  author_id: string;
  author: User;
  content: string;
  media?: Array<{
    type: 'image' | 'video';
    url: string;
  }>;
  is_pinned: boolean;
  is_locked: boolean;
  price?: number;
  likes: number;
  comments: number;
  created_at: string;
  isLiked?: boolean; // Client-side state
}

// Profile view context
export interface ProfileViewContext {
  viewer: User;
  profile: User;
  isOwnProfile: boolean;
  isSubscribed: boolean;
  subscription?: Subscription;
  stats: ProfileStats;
}