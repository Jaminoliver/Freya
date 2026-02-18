import * as React from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import FanActivityCard from "./FanActivityCard";
import type { User, Subscription } from "@/lib/types/profile";

export interface FanProfileLayoutProps {
  fan: User;
  subscription: Subscription;
  onMessage?: () => void;
  className?: string;
}

export default function FanProfileLayout({
  fan,
  subscription,
  onMessage,
  className,
}: FanProfileLayoutProps) {
  return (
    <div className={className}>
      <div className="space-y-24">
        <Card>
          <div className="p-24">
            <div className="flex items-start gap-16 mb-24">
              <Avatar
                src={fan.avatar_url ?? undefined}
                alt={fan.display_name ?? fan.username}
                size="lg"
              />
              <div className="flex-1">
                <div className="mb-8">
                  <h2 className="text-h3 text-text-primary font-semibold">
                    {fan.display_name ?? fan.username}
                  </h2>
                  <p className="text-body text-text-secondary">@{fan.username}</p>
                </div>

                {fan.bio && (
                  <p className="text-body text-text-secondary mb-16">{fan.bio}</p>
                )}

                {fan.location && (
                  <div className="flex items-center gap-8 mb-16">
                    <svg className="w-16 h-16 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-small text-text-secondary">{fan.location}</span>
                  </div>
                )}

                <div className="flex items-center gap-8 text-small text-text-muted">
                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Joined {new Date(fan.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-12">
              <Button variant="brand" size="md" onClick={onMessage} className="flex-1">
                <svg className="w-20 h-20 mr-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Message
              </Button>
            </div>
          </div>
        </Card>

        <FanActivityCard subscription={subscription} />
      </div>
    </div>
  );
}