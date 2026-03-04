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

  // Subscribe to sync from other instances (e.g. feed vs profile)
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

      // Emit to sync all other instances
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
                padding:         "10px 14px",
                borderRadius:    "10px",
                border:          isVoted ? "1.5px solid #8B5CF6" : "1.5px solid #2A2A3D",
                backgroundColor: "transparent",
                cursor:          hasVoted || isPollEnd ? "default" : "pointer",
                overflow:        "hidden",
                textAlign:       "left",
                fontFamily:      "'Inter', sans-serif",
                transition:      "border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!hasVoted && !isPollEnd) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#8B5CF6";
                }
              }}
              onMouseLeave={(e) => {
                if (!isVoted) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#2A2A3D";
                }
              }}
            >
              {showBars && (
                <div style={{
                  position:        "absolute",
                  top: 0, left: 0,
                  height:          "100%",
                  width:           `${pct}%`,
                  backgroundColor: isVoted
                    ? "rgba(139,92,246,0.15)"
                    : isWinner
                    ? "rgba(139,92,246,0.08)"
                    : "rgba(255,255,255,0.03)",
                  transition:      "width 0.4s ease",
                  borderRadius:    "8px",
                }} />
              )}
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {isVoted && (
                    <div style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "#8B5CF6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1 4L3 6L7 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                  <span style={{ fontSize: "14px", color: isVoted ? "#FFFFFF" : "#C4C4D4", fontWeight: isVoted ? 600 : 400 }}>
                    {option.option_text}
                  </span>
                </div>
                {showBars && (
                  <span style={{ fontSize: "13px", fontWeight: 600, color: isVoted ? "#8B5CF6" : "#6B6B8A", flexShrink: 0 }}>
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