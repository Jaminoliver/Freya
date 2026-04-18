"use client";

import { useState } from "react";
import { BadgeCheck, Star, MessageCircle } from "lucide-react";
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

export function SubscriptionCardDetailed({
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

  const handleMessage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const params = new URLSearchParams({
      targetUserId: s.creatorId,
      name:         s.creatorName,
      username:     s.username,
      avatar:       s.avatar_url ?? "",
      verified:     s.isVerified ? "1" : "0",
    });
    navigate(`/messages/new?${params.toString()}`);
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

  const renderButton = () => {
    const base = {
      width: "100%", padding: "10px", borderRadius: "10px",
      border: "none", cursor: "pointer",
      fontSize: "13px", fontWeight: 700,
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
          {freeResubBusy ? "..." : "Renew now"}
        </button>
      );
    }

    return (
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleResub(); }}
        disabled={freeResubBusy}
        style={{ ...base, background: "linear-gradient(135deg, #8B5CF6, #EC4899)", color: "#fff", opacity: freeResubBusy ? 0.6 : 1 }}
      >
        {freeResubBusy ? "..." : s.isFreeCreator ? "Resubscribe for free" : "Resubscribe"}
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

      <div style={{
        backgroundColor: "#0D0D18",
        border:          "1px solid #1E1E2E",
        borderRadius:    "14px",
        overflow:        "hidden",
        fontFamily:      "'Inter', sans-serif",
        position:        "relative",
      }}>
        {/* Banner */}
        <div
          onClick={() => navigate(`/${s.username}`)}
          style={{ position: "relative", height: "140px", cursor: "pointer" }}
        >
          {s.banner_url ? (
            <Image src={s.banner_url} alt={s.creatorName} fill sizes="(max-width: 768px) 100vw, 640px" style={{ objectFit: "cover" }} />
          ) : (
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #312E81, #7C2D62)" }} />
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.65) 100%)" }} />

          {/* Top-left badges */}
          <div style={{ position: "absolute", top: "10px", left: "10px", display: "flex", gap: "6px" }}>
            {s.isFreeCreator && (
              <span style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", borderRadius: "20px", padding: "3px 10px", fontSize: "10px", fontWeight: 700, color: "#fff" }}>Free</span>
            )}
            {s.newPosts > 0 && (
              <span style={{ backgroundColor: "rgba(139,92,246,0.85)", backdropFilter: "blur(6px)", borderRadius: "20px", padding: "3px 10px", fontSize: "10px", fontWeight: 700, color: "#fff" }}>
                {s.newPosts} new
              </span>
            )}
          </div>

          {/* Star */}
          <button
            onClick={handleStar}
            disabled={starBusy}
            aria-label={isFavourite ? "Unstar" : "Star"}
            style={{
              position: "absolute", top: "10px", right: "10px",
              width: "32px", height: "32px", borderRadius: "50%",
              backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Star
              size={15}
              strokeWidth={1.8}
              fill={isFavourite ? "#F59E0B" : "none"}
              color={isFavourite ? "#F59E0B" : "#fff"}
            />
          </button>

          {/* Avatar + name (bottom-left) */}
          <div style={{ position: "absolute", bottom: "12px", left: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
            <AvatarWithStoryRing
              src={s.avatar_url}
              alt={s.creatorName}
              size={64}
              hasStory={hasStory}
              hasUnviewed={hasUnviewed}
              onClick={handleAvatarClick}
              borderColor="#0D0D18"
            />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ fontSize: "16px", fontWeight: 700, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>{s.creatorName}</span>
                {s.isVerified && <BadgeCheck size={14} color="#A78BFA" />}
              </div>
              <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.75)" }}>@{s.username}</span>
            </div>
          </div>

          {/* Status pill (bottom-right) */}
          <div style={{
            position: "absolute", bottom: "12px", right: "12px",
            display: "flex", alignItems: "center", gap: "6px",
            backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)",
            padding: "4px 10px", borderRadius: "16px",
          }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: STATUS_COLOR[s.status], boxShadow: `0 0 6px ${STATUS_COLOR[s.status]}` }} />
            <span style={{ fontSize: "10px", fontWeight: 600, color: "#fff" }}>{STATUS_LABEL[s.status]}</span>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "12px 14px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "11px", color: "#6B6B8A" }}>
              {s.status === "active" ? "Expires" : s.status === "attention" ? "Renew by" : "Expired"} {s.expiresAt}
            </span>
            {!s.isFreeCreator && s.price > 0 && (
              <span style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 600 }}>
                ₦{(s.price / 100).toLocaleString("en-NG")}
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <div style={{ flex: 1 }}>{renderButton()}</div>
            {s.status === "active" && (
              <button
                onClick={handleMessage}
                aria-label="Message"
                style={{
                  width: "42px", height: "40px", borderRadius: "10px",
                  border: "1px solid #2A2A3D", backgroundColor: "transparent",
                  color: "#94A3B8", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#8B5CF6"; e.currentTarget.style.color = "#8B5CF6"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A3D"; e.currentTarget.style.color = "#94A3B8"; }}
              >
                <MessageCircle size={16} strokeWidth={1.8} />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}