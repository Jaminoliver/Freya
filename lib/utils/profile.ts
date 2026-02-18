import { User, Subscription } from '@/lib/types/profile';

export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`;
}

export function formatCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;

  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'} ago`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getSubscriptionDuration(subscribedAt: string): number {
  const subscribeDate = new Date(subscribedAt);
  const now = new Date();
  const diffInMonths =
    (now.getFullYear() - subscribeDate.getFullYear()) * 12 +
    (now.getMonth() - subscribeDate.getMonth());
  return Math.max(1, diffInMonths);
}

export function getSpendingTier(totalSpent: number): 'bronze' | 'silver' | 'gold' | 'platinum' | null {
  if (totalSpent >= 100_000) return 'platinum';
  if (totalSpent >= 50_000) return 'gold';
  if (totalSpent >= 20_000) return 'silver';
  if (totalSpent >= 5_000) return 'bronze';
  return null;
}

export function isSubscribed(
  viewerId: string,
  profileId: string,
  subscription?: Subscription
): boolean {
  if (!subscription) return false;
  return (
    subscription.subscriber_id === viewerId &&   // ✅ FIX 1: was subscriberId
    subscription.creator_id === profileId &&      // ✅ FIX 2: was creatorId
    subscription.status === 'active'
  );
}

export function getProfileUrl(username: string): string {
  return `/${username}`;
}

export function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  return usernameRegex.test(username);
}

export function getDisplayName(user: User): string {
  return user.display_name || `@${user.username}`;  // ✅ FIX 3: was displayName
}

export function formatSubscriptionStatus(status: 'active' | 'expired' | 'cancelled'): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function getBundleDiscount(monthlyPrice: number, bundlePrice: number, months: number): number {
  const regularTotal = monthlyPrice * months;
  const discount = ((regularTotal - bundlePrice) / regularTotal) * 100;
  return Math.round(discount);
}

export function hasBundlePricing(user: User): boolean {
  return !!(user.bundlePricing?.threeMonths || user.bundlePricing?.sixMonths);
}

export function getTierBadgeVariant(tier: 'bronze' | 'silver' | 'gold' | 'platinum' | null):
  'brand' | 'gold' | 'coral' | 'success' | 'error' | 'muted' {
  switch (tier) {
    case 'platinum': return 'brand';
    case 'gold': return 'gold';
    case 'silver': return 'muted';
    case 'bronze': return 'coral';
    default: return 'muted';
  }
}