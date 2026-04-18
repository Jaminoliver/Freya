"use client";

import { useState } from "react";
import { BadgeCheck, Star } from "lucide-react";
import Image from "next/image";
import { useNav } from "@/lib/hooks/useNav";
import { AvatarWithStoryRing } from "@/components/ui/AvatarWithStoryRing";
import { useCreatorStory } from "@/lib/hooks/useCreatorStory";
import StoryViewer from "@/components/story/StoryViewer";
import CheckoutModal from "@/components/checkout/CheckoutModal";
import { ManageBottomSheet } from "./ManageBottomSheet";
import { useSubscriptionActions } from "@/lib/hooks/useSubscriptionActions";
import { STATUS_COLOR, STATUS_LABEL, type Subscription } from "@/lib/types/subscription";
import type { User } from "@/lib/types/profile";

export function SubscriptionCardCompact({
  subscription: s,
  onRefresh,
}: {
  subscription: Subscription;
  onRefresh?:   () => void;
}) {
  const { navigate } = useNav();

  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [manageOpen,      setManageOpen]      = useState(false);
  const [checkoutOpen,    setCheckoutOpen]    = useState(false);

  const { group: storyGroup, hasStory, hasUnviewed, refresh: refreshStory } = useCreatorStory(s.creatorId);

  const {
    isFavourite, autoRenew, starBusy, autoBusy, cancelBusy, freeResubBusy,
    toggleFavourite, toggleAutoRenew, freeResubscribe, cancelSubscription,
  } = useSubscriptionActions(s, onRefresh);

  const handleStar = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavourite();
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasStory && storyGroup) setStoryViewerOpen(true);
    else                        navigate(`/${s.username}`);
  };

  const handleResub = () => {
    if (s.isFreeCreator) freeResubscribe();
    else                 setCheckoutOpen(true);
  };

  const creatorForCheckout: User = {
    id:           s.creatorId,
    username:     s.username,
    display_name: s.creatorName,
    avatar_url:   s.avatar_url,
    is_verified:  s.isVerified,
    banner_url:   s.banner_url,
  } as unknown as User;

  // Primary button
  const renderButton = () => {
    const base = {
      width: "100%", padding: "7px", borderRadius: "8px",
      border: "none", cursor: "pointer",
      fontSize: "11px", fontWeight: 700,
      fontFamily: "'Inter', sans-serif",
    } as const;

    if (s.status === "active") {
      return (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setManageOpen(true); }}
          style={{ ...base, background: "linear-gradient(135deg, #8B5CF6, #EC4899)", color: "#fff" }}
        >
          Manage
        </button>
      );
    }

    if (s.status === "attention") {
      return (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleResub(); }}
          disabled={freeResubBusy}
          style={{ ...base, backgroundColor: "#F59E0B", color: "#0A0A0F", opacity: freeResubBusy ? 0.6 : 1 }}
        >
          {freeResubBusy ? "..." : "Renew"}
        </button>
      );
    }

    // expired
    return (
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleResub(); }}
        disabled={freeResubBusy}
        style={{ ...base, background: "linear-gradient(135deg, #8B5CF6, #EC4899)", color: "#fff", opacity: freeResubBusy ? 0.6 : 1 }}
      >
        {freeResubBusy ? "..." : s.isFreeCreator ? "Resub free" : "Resubscribe"}
      </button>
    );
  };

  return (
    <>
      {storyViewerOpen && storyGroup && (
        <StoryViewer groups={[storyGroup]} startGroupIndex={0} onClose={() => { setStoryViewerOpen(false); refreshStory(); }} />
      )}

      {checkoutOpen && (
        <CheckoutModal
          isOpen={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          type="subscription"
          creator={creatorForCheckout}
          monthlyPrice={s.monthlyPrice}
          threeMonthPrice={s.threeMonthPrice ?? undefined}
          sixMonthPrice={s.sixMonthPrice ?? undefined}
          autoCloseOnSuccess
          onSubscriptionSuccess={() => onRefresh?.()}
        />
      )}

      {manageOpen && (
        <ManageBottomSheet
          subscription={s}
          autoRenew={autoRenew}
          autoBusy={autoBusy}
          cancelBusy={cancelBusy}
          onToggleAutoRenew={toggleAutoRenew}
          onCancel={cancelSubscription}
          onClose={() => setManageOpen(false)}
          onViewProfile={() => { setManageOpen(false); navigate(`/${s.username}`); }}
        />
      )}

      <div
        onClick={() => navigate(`/${s.username}`)}
        style={{
          border:     "1px solid #1E1E2E",
          borderRadius: "12px",
          overflow:   "hidden",
          fontFamily: "'Inter', sans-serif",
          position:   "relative",
          cursor:     "pointer",
          minHeight:  "220px",
        }}
      >
        {/* Full card banner */}
        <div style={{ position: "absolute", inset: 0 }}>
          {s.banner_url ? (
            <Image src={s.banner_url} alt={s.creatorName} fill sizes="200px" style={{ objectFit: "cover" }} />
          ) : (
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #312E81, #7C2D62)" }} />
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.75) 100%)" }} />

          

         

          {/* Star */}
          <button
            onClick={handleStar}
            disabled={starBusy}
            aria-label={isFavourite ? "Unstar" : "Star"}
            style={{
              position: "absolute", top: "6px", right: "6px",
              width: "26px", height: "26px", borderRadius: "50%",
              backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)",
              border: "none", cursor: "pointer", padding: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Star
              size={12}
              strokeWidth={1.8}
              fill={isFavourite ? "#F59E0B" : "none"}
              color={isFavourite ? "#F59E0B" : "#fff"}
            />
          </button>
        </div>

        {/* Body */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 10px 10px" }}>
          <div style={{ marginBottom: "8px" }}>
            <AvatarWithStoryRing
              src={s.avatar_url}
              alt={s.creatorName}
              size={54}
              hasStory={hasStory}
              hasUnviewed={hasUnviewed}
              onClick={handleAvatarClick}
              borderColor="#0D0D18"
            />
          </div>
         <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.creatorName}
                </span>
                {s.isVerified && <BadgeCheck size={11} color="#A78BFA" style={{ flexShrink: 0 }} />}
              </div>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.75)", margin: "1px 0 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                @{s.username}
              </p>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: "6px",
              backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)",
              padding: "4px 10px", borderRadius: "16px", flexShrink: 0,
            }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: STATUS_COLOR[s.status], boxShadow: `0 0 6px ${STATUS_COLOR[s.status]}` }} />
              <span style={{ fontSize: "10px", fontWeight: 600, color: "#fff" }}>{STATUS_LABEL[s.status]}</span>
            </div>
          </div>
          {renderButton()}
        </div>
      </div>
    </>
  );
}