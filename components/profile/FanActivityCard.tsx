"use client";

import { Calendar } from "lucide-react";
import { getSpendingTier } from "@/lib/utils/profile";
import type { Subscription } from "@/lib/types/profile";

interface FanActivityCardProps {
  subscription: Subscription;
}

export default function FanActivityCard({ subscription }: FanActivityCardProps) {
  const tier = getSpendingTier(subscription.total_spent) || 'bronze';
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatNaira = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'platinum': return '#E5E7EB';
      case 'gold': return '#FCD34D';
      case 'silver': return '#D1D5DB';
      default: return '#CD7F32';
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#141420',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid #1F1F2A',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Header */}
      <h3
        style={{
          fontSize: '16px',
          fontWeight: 700,
          color: '#F1F5F9',
          marginBottom: '20px',
        }}
      >
        Fan Activity
      </h3>

      {/* Activity Details */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
        }}
      >
        {/* Subscribed Since */}
        <div>
          <div
            style={{
              fontSize: '13px',
              color: '#94A3B8',
              marginBottom: '6px',
            }}
          >
            Subscribed since
          </div>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#F1F5F9',
            }}
          >
            {formatDate(subscription.subscribed_at)}
          </div>
        </div>

        {/* Total Spent */}
        <div>
          <div
            style={{
              fontSize: '13px',
              color: '#94A3B8',
              marginBottom: '6px',
            }}
          >
            Total spent
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: getTierColor(tier),
              }}
            >
              {formatNaira(subscription.total_spent)}
            </span>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '6px',
                backgroundColor: `${getTierColor(tier)}20`,
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6 1L7.5 4.5L11 5L8.5 7.5L9 11L6 9L3 11L3.5 7.5L1 5L4.5 4.5L6 1Z"
                  fill={getTierColor(tier)}
                />
              </svg>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: getTierColor(tier),
                  textTransform: 'capitalize',
                }}
              >
                {tier}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}