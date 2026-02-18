import * as React from "react";
import { IconButton } from "@/components/ui/IconButton";

export interface EngagementBarProps {
  postId: string;
  likes: number;
  comments: number;
  isLiked?: boolean;
  isLocked?: boolean;
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onTip?: (postId: string) => void;
  onShare?: (postId: string) => void;
  className?: string;
}

export function EngagementBar({
  postId,
  likes,
  comments,
  isLiked: initialIsLiked = false,
  isLocked = false,
  onLike,
  onComment,
  onTip,
  onShare,
  className,
}: EngagementBarProps) {
  const [isLiked, setIsLiked] = React.useState(initialIsLiked);
  const [likeCount, setLikeCount] = React.useState(likes);

  const handleLike = () => {
    if (isLocked) return;
    
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikeCount(prev => newIsLiked ? prev + 1 : prev - 1);
    onLike?.(postId);
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between pt-16 border-t border-border">
        <div className="flex items-center gap-16">
          {/* Like */}
          <button
            onClick={handleLike}
            className="flex items-center gap-8 group"
            disabled={isLocked}
          >
            <IconButton
              variant="ghost"
              size="sm"
              aria-label={isLiked ? "Unlike" : "Like"}
              icon={
                <svg
                  className={`w-20 h-20 transition-all ${
                    isLiked 
                      ? "fill-coral text-coral scale-110" 
                      : "fill-none group-hover:text-coral group-hover:scale-105"
                  }`}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              }
            />
            <span className={`text-small transition-colors ${
              isLiked ? "text-coral font-semibold" : "text-text-secondary"
            }`}>
              {likeCount}
            </span>
          </button>

          {/* Comment */}
          <button
            onClick={() => onComment?.(postId)}
            className="flex items-center gap-8 group"
            disabled={isLocked}
          >
            <IconButton 
              variant="ghost" 
              size="sm" 
              aria-label="Comment"
              icon={
                <svg 
                  className="w-20 h-20 group-hover:text-brand group-hover:scale-105 transition-all" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              }
            />
            <span className="text-small text-text-secondary group-hover:text-brand transition-colors">
              {comments}
            </span>
          </button>

          {/* Tip */}
          <button
            onClick={() => onTip?.(postId)}
            className="flex items-center gap-8 group"
            disabled={isLocked}
          >
            <IconButton 
              variant="ghost" 
              size="sm" 
              aria-label="Send tip"
              icon={
                <svg 
                  className="w-20 h-20 group-hover:text-gold group-hover:scale-105 transition-all" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <span className="text-small text-text-muted">
              Tip
            </span>
          </button>
        </div>

        {/* Share */}
        <button
          onClick={() => onShare?.(postId)}
          className="group"
        >
          <IconButton 
            variant="ghost" 
            size="sm" 
            aria-label="Share"
            icon={
              <svg 
                className="w-20 h-20 group-hover:text-text-primary group-hover:scale-105 transition-all" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            }
          />
        </button>
      </div>
    </div>
  );
}