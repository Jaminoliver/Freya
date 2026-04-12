"use client";

import { useState, useEffect } from "react";
import { BarChart2, Clock } from "lucide-react";
import { getRelativeTime } from "@/lib/utils/profile";
import { postSyncStore } from "@/lib/store/postSyncStore";

export interface PollOption {
  id:            number;
  option_text:   string;
  vote_count:    number;
  display_order: number;
}

export interface PollData {
  id:                   number;
  question:             string;
  total_votes:          number;
  ends_at:              string | null;
  options:              PollOption[];
  user_voted_option_id: number | null;
}

export function PollDisplay({
  poll,
  postId,
  onVoted,
}: {
  poll:    PollData;
  postId:  string;
  onVoted: (updated: PollData) => void;
}) {
  const [voting,    setVoting]    = useState(false);
  const [localPoll, setLocalPoll] = useState(poll);
  const [voteError, setVoteError] = useState<string | null>(null);

  const hasVoted  = localPoll.user_voted_option_id !== null;
  const isPollEnd = localPoll.ends_at ? new Date(localPoll.ends_at) < new Date() : false;
  const showBars  = hasVoted || isPollEnd;

  useEffect(() => {
    return postSyncStore.subscribe((event) => {
      if (event.postId === postId && event.poll_data) {
        setLocalPoll(event.poll_data);
      }
    });
  }, [postId]);

  const handleVote = async (optionId: number) => {
    if (hasVoted || voting || isPollEnd) return;
    setVoting(true);
    setVoteError(null);

    const optimistic: PollData = {
      ...localPoll,
      total_votes:          localPoll.total_votes + 1,
      user_voted_option_id: optionId,
      options: localPoll.options.map((o) =>
        o.id === optionId ? { ...o, vote_count: o.vote_count + 1 } : o
      ),
    };
    setLocalPoll(optimistic);

    try {
      const res  = await fetch(`/api/posts/${postId}/vote`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ option_id: optionId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setLocalPoll(poll);
        setVoteError(data.error || "Failed to vote");
        return;
      }

      const updated: PollData = {
        ...localPoll,
        user_voted_option_id: optionId,
        options: data.options.map((o: { id: number; option_text: string; vote_count: number; display_order: number }) => ({
          id:            o.id,
          option_text:   o.option_text,
          vote_count:    o.vote_count,
          display_order: o.display_order,
        })),
        total_votes: data.options.reduce((sum: number, o: { vote_count: number }) => sum + o.vote_count, 0),
      };
      setLocalPoll(updated);
      onVoted(updated);

      postSyncStore.emit({
        postId,
        liked:      false,
        like_count: 0,
        poll_data:  updated,
      });

    } catch {
      setLocalPoll(poll);
      setVoteError("Something went wrong");
    } finally {
      setVoting(false);
    }
  };

  const maxVotes = Math.max(...localPoll.options.map((o) => o.vote_count), 1);

  return (
    <div style={{ padding: "0 16px 14px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <BarChart2 size={14} color="#8B5CF6" />
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#8B5CF6" }}>POLL</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "12px", color: "#6B6B8A" }}>
            {localPoll.total_votes} {localPoll.total_votes === 1 ? "vote" : "votes"}
          </span>
          {localPoll.ends_at && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Clock size={11} color="#6B6B8A" />
              <span style={{ fontSize: "11px", color: isPollEnd ? "#EF4444" : "#6B6B8A" }}>
                {isPollEnd ? "Ended" : `Ends ${getRelativeTime(localPoll.ends_at)}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Options */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {localPoll.options.map((option) => {
          const isVoted  = localPoll.user_voted_option_id === option.id;
          const pct      = localPoll.total_votes > 0
            ? Math.round((option.vote_count / localPoll.total_votes) * 100)
            : 0;
          const isWinner = showBars && option.vote_count === maxVotes && localPoll.total_votes > 0;

          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={hasVoted || voting || isPollEnd}
              style={{
                position:        "relative",
                width:           "100%",
                height:          "44px",
                borderRadius:    "10px",
                border:          "none",
                backgroundColor: "#1A1A2E",
                cursor:          hasVoted || isPollEnd ? "default" : "pointer",
                overflow:        "hidden",
                textAlign:       "left",
                fontFamily:      "'Inter', sans-serif",
                padding:         0,
              }}
            >
              {/* Full-width dim background fill (always shown, voted option only) */}
              {isVoted && (
                <div style={{
                  position:        "absolute",
                  inset:           0,
                  background:      "linear-gradient(135deg, #8B5CF6, #EC4899)",
                  opacity:         0.25,
                  borderRadius:    "10px",
                }} />
              )}

              {/* Proportional fill */}
              {showBars && (
                <div style={{
                  position:        "absolute",
                  top: 0, left: 0,
                  height:          "100%",
                  width:           `${pct}%`,
                  background:      isVoted
                    ? "linear-gradient(135deg, #8B5CF6, #EC4899)"
                    : isWinner
                    ? "rgba(139,92,246,0.2)"
                    : "rgba(139,92,246,0.1)",
                  borderRadius:    "10px",
                  transition:      "width 0.4s ease",
                }} />
              )}

              {/* Hover fill for unvoted state */}
              {!hasVoted && !isPollEnd && (
                <div
                  className="poll-hover-fill"
                  style={{
                    position:        "absolute",
                    inset:           0,
                    background:      "rgba(139,92,246,0.08)",
                    borderRadius:    "10px",
                    opacity:         0,
                    transition:      "opacity 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
                />
              )}

              {/* Content row */}
              <div style={{
                position:       "relative",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "space-between",
                height:         "100%",
                padding:        "0 14px",
                zIndex:         1,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {isVoted && (
                    <div style={{
                      width:           "18px",
                      height:          "18px",
                      borderRadius:    "50%",
                      backgroundColor: "#fff",
                      display:         "flex",
                      alignItems:      "center",
                      justifyContent:  "center",
                      flexShrink:      0,
                    }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                  <span style={{
                    fontSize:   "14px",
                    fontWeight: isVoted ? 600 : 400,
                    color:      isVoted ? "#fff" : showBars && !isVoted ? "#C4C4D4" : "#F1F5F9",
                  }}>
                    {option.option_text}
                  </span>
                </div>

                {showBars && (
                  <span style={{
                    fontSize:   "13px",
                    fontWeight: 700,
                    color:      isVoted ? "#fff" : "#6B6B8A",
                    flexShrink: 0,
                  }}>
                    {pct}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {voteError && (
        <p style={{ fontSize: "12px", color: "#EF4444", margin: "8px 0 0" }}>{voteError}</p>
      )}
    </div>
  );
}