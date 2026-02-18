import { User, Subscription } from '@/lib/types/profile';

/**
 * Format currency in Naira
 * @example formatNaira(5000) // "₦5,000"
 */
export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`;
}

/**
 * Format large numbers (e.g., 1.2K, 3.5K, 10M)
 * @example formatCount(1200) // "1.2K"
 * @example formatCount(3500000) // "3.5M"
 */
export function formatCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}K`;
  }
  return count.toString();
}

/**
 * Get relative time string (e.g., "2 hours ago", "3 days ago")
 * @example getRelativeTime("2024-02-18T10:00:00Z") // "2 hours ago"
 */
export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;
  }

  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'} ago`;
}

/**
 * Format date as "Jan 15, 2026"
 * @example formatDate("2026-01-15T00:00:00Z") // "Jan 15, 2026"
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Calculate subscription duration in months
 * @example getSubscriptionDuration("2025-11-15T00:00:00Z") // 3
 */
export function getSubscriptionDuration(subscribedAt: string): number {
  const subscribeDate = new Date(subscribedAt);
  const now = new Date();
  const diffInMonths = 
    (now.getFullYear() - subscribeDate.getFullYear()) * 12 + 
    (now.getMonth() - subscribeDate.getMonth());
  return Math.max(1, diffInMonths);
}

/**
 * Determine spending tier based on total amount
 * @example getSpendingTier(45000) // "silver"
 */
export function getSpendingTier(
  totalSpent: number
): 'bronze' | 'silver' | 'gold' | 'platinum' | null {
  if (totalSpent >= 100_000) return 'platinum';
  if (totalSpent >= 50_000) return 'gold';
  if (totalSpent >= 20_000) return 'silver';
  if (totalSpent >= 5_000) return 'bronze';
  return null;
}

/**
 * Check if viewer is subscribed to profile
 * @example isSubscribed("user123", "creator456", subscription) // true
 */
export function isSubscribed(
  viewerId: string,
  profileId: string,
  subscription?: Subscription
): boolean {
  if (!subscription) return false;
  return (
    subscription.subscriberId === viewerId &&
    subscription.creatorId === profileId &&
    subscription.status === 'active'
  );
}

/**
 * Get profile URL
 * @example getProfileUrl("amaradivine") // "/amaradivine"
 */
export function getProfileUrl(username: string): string {
  return `/${username}`;
}

/**
 * Validate username format
 * Username: 3-30 characters, alphanumeric + underscore only
 * @example isValidUsername("amara_divine") // true
 * @example isValidUsername("ab") // false (too short)
 */
export function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  return usernameRegex.test(username);
}

/**
 * Get user display name (fallback to username if no display name)
 * @example getDisplayName(user) // "Amara Divine" or "@amaradivine"
 */
export function getDisplayName(user: User): string {
  return user.displayName || `@${user.username}`;
}

/**
 * Format subscription status text
 * @example formatSubscriptionStatus("active") // "Active"
 */
export function formatSubscriptionStatus(status: 'active' | 'expired' | 'cancelled'): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * Calculate bundle discount percentage
 * @example getBundleDiscount(5000, 12000, 3) // 20
 */
export function getBundleDiscount(
  monthlyPrice: number,
  bundlePrice: number,
  months: number
): number {
  const regularTotal = monthlyPrice * months;
  const discount = ((regularTotal - bundlePrice) / regularTotal) * 100;
  return Math.round(discount);
}

/**
 * Check if user has bundle pricing
 * @example hasBundlePricing(user) // true
 */
export function hasBundlePricing(user: User): boolean {
  return !!(user.bundlePricing?.threeMonths || user.bundlePricing?.sixMonths);
}

/**
 * Get tier badge variant for Badge component
 * @example getTierBadgeVariant("gold") // "gold"
 */
export function getTierBadgeVariant(tier: 'bronze' | 'silver' | 'gold' | 'platinum' | null): 
  'brand' | 'gold' | 'coral' | 'success' | 'error' | 'muted' {
  switch (tier) {
    case 'platinum':
      return 'brand';
    case 'gold':
      return 'gold';
    case 'silver':
      return 'muted';
    case 'bronze':
      return 'coral';
    default:
      return 'muted';
  }
}