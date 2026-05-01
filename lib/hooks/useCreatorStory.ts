"use client";

import { useEffect, useState } from "react";
import type { CreatorStoryGroup } from "@/components/story/StoryBar";

interface UseCreatorStoryResult {
  group:       CreatorStoryGroup | null;
  hasStory:    boolean;
  hasUnviewed: boolean;
  loading:     boolean;
  refresh:     () => void;
}

function getLocalViewed(): Set<number> {
  try { return new Set(JSON.parse(sessionStorage.getItem("sb_viewed_story_ids") ?? "[]")); } catch { return new Set(); }
}

function applyViewed(group: CreatorStoryGroup): CreatorStoryGroup {
  const viewed = getLocalViewed();
  if (viewed.size === 0) return group;
  const items = group.items.map((s) => viewed.has(s.id) ? { ...s, viewed: true } : s);
  return { ...group, items, hasUnviewed: items.some((s) => !s.viewed && !s.isProcessing) };
}

const cache:    Record<string, { group: CreatorStoryGroup; fetchedAt: number }> = {};
const inflight: Record<string, Promise<CreatorStoryGroup | null>>               = {};
const CACHE_TTL_MS = 60_000;

function fetchGroup(id: string): Promise<CreatorStoryGroup | null> {
  const cached = cache[id];
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return Promise.resolve(applyViewed(cached.group));
  }

  if (id in inflight) return inflight[id];

  inflight[id] = fetch(`/api/stories/creator?creator_id=${id}`)
    .then((res) => res.json())
    .then((data) => {
      if (data.group) {
        cache[id] = { group: data.group, fetchedAt: Date.now() };
        return data.group as CreatorStoryGroup;
      }
      return null;
    })
    .catch(() => null)
    .finally(() => { delete inflight[id]; });

  return inflight[id];
}

export function useCreatorStory(creatorId: string | undefined): UseCreatorStoryResult {
  const [group,   setGroup]   = useState<CreatorStoryGroup | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!creatorId) return;
    const cached = cache[creatorId];
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      setGroup(applyViewed(cached.group));
      return;
    }
    setLoading(true);
    fetchGroup(creatorId).then((g) => {
      setGroup(g ? applyViewed(g) : null);
      setLoading(false);
    });
  }, [creatorId]);

  const refresh = () => {
    if (!creatorId) return;
    delete cache[creatorId];
    delete inflight[creatorId];
    setLoading(true);
    fetchGroup(creatorId).then((g) => {
      setGroup(g ? applyViewed(g) : null);
      setLoading(false);
    });
  };

  return {
    group,
    hasStory:    !!group && group.items.length > 0,
    hasUnviewed: !!group?.hasUnviewed,
    loading,
    refresh,
  };
}