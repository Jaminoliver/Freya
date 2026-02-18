import * as React from "react";
import { Button } from "@/components/ui/Button";
import { formatNaira } from "@/lib/utils/profile";

export interface LockedContentProps {
  price: number;
  mediaCount?: number;
  onUnlock?: () => void;
  className?: string;
}

export function LockedContent({
  price,
  mediaCount = 0,
  onUnlock,
  className,
}: LockedContentProps) {
  return (
    <div className={className}>
      <div className="relative aspect-video bg-surface rounded-card overflow-hidden border border-border">
        {/* Blurred Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand/10 via-surface to-coral/10 backdrop-blur-xl" />
        
        {/* Lock Icon Pattern */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5">
          <svg className="w-200 h-200" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center p-24 text-center">
          {/* Lock Icon */}
          <div className="w-64 h-64 mb-16 rounded-full bg-brand/20 flex items-center justify-center">
            <svg className="w-32 h-32 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          {/* Text */}
          <h3 className="text-h3 text-text-primary font-semibold mb-8">
            Locked Content
          </h3>
          <p className="text-body text-text-secondary mb-24">
            {mediaCount > 0 
              ? `This post contains ${mediaCount} locked ${mediaCount === 1 ? 'item' : 'items'}`
              : 'This content is locked'}
          </p>

          {/* Price & Unlock Button */}
          <div className="space-y-12">
            <div className="text-h2 text-brand font-bold">
              {formatNaira(price)}
            </div>
            <Button
              variant="brand"
              size="lg"
              onClick={onUnlock}
            >
              <svg className="w-20 h-20 mr-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
              Unlock for {formatNaira(price)}
            </Button>
          </div>

          {/* Info Text */}
          <p className="text-small text-text-muted mt-16">
            One-time purchase • Instant access
          </p>
        </div>
      </div>
    </div>
  );
}