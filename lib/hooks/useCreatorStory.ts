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

const cache:    Record<string, { group: CreatorStoryGroup; fetchedAt: number }> = {};
const inflight: Record<string, Promise<CreatorStoryGroup | null>>               = {};
const CACHE_TTL_MS = 60_000;

function fetchGroup(id: string): Promise<CreatorStoryGroup | null> {
  const cached = cache[id];
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return Promise.resolve(cached.group);
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
      setGroup(cached.group);
      return;
    }
    setLoading(true);
    fetchGroup(creatorId).then((g) => {
      setGroup(g);
      setLoading(false);
    });
  }, [creatorId]);

  const refresh = () => {
    if (!creatorId) return;
    delete cache[creatorId];
    delete inflight[creatorId];
    setLoading(true);
    fetchGroup(creatorId).then((g) => {
      setGroup(g);
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