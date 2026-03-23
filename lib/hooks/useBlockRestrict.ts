"use client";

import { useState, useCallback, useEffect } from "react";

interface UseBlockRestrictOptions {
  userId: string;
  fetchOnMount?: boolean;
}

interface UseBlockRestrictReturn {
  isBlocked:        boolean;
  blockedByThem:    boolean;
  isRestricted:     boolean;
  restrictedByThem: boolean;
  loading:          boolean;
  block:            () => Promise<void>;
  unblock:          () => Promise<void>;
  restrict:         () => Promise<void>;
  unrestrict:       () => Promise<void>;
  fetchStatus:      () => Promise<void>;
}

export function useBlockRestrict({
  userId,
  fetchOnMount = false,
}: UseBlockRestrictOptions): UseBlockRestrictReturn {
  const [isBlocked,        setIsBlocked]        = useState(false);
  const [blockedByThem,    setBlockedByThem]    = useState(false);
  const [isRestricted,     setIsRestricted]     = useState(false);
  const [restrictedByThem, setRestrictedByThem] = useState(false);
  const [loading,          setLoading]          = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [blockRes, restrictRes] = await Promise.all([
        fetch(`/api/users/block?userId=${userId}`),
        fetch(`/api/users/restrict?userId=${userId}`),
      ]);
      const [blockData, restrictData] = await Promise.all([
        blockRes.json(),
        restrictRes.json(),
      ]);
      setIsBlocked(blockData.isBlocked             ?? false);
      setBlockedByThem(blockData.blockedByThem      ?? false);
      setIsRestricted(restrictData.isRestricted     ?? false);
      setRestrictedByThem(restrictData.restrictedByThem ?? false);
    } catch (err) {
      console.error("[useBlockRestrict] fetchStatus error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (fetchOnMount) fetchStatus();
  }, [fetchOnMount, fetchStatus]);

  const block = useCallback(async () => {
    await fetch("/api/users/block", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ userId }),
    });
    setIsBlocked(true);
    setIsRestricted(false);
  }, [userId]);

  const unblock = useCallback(async () => {
    await fetch("/api/users/block", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ userId }),
    });
    setIsBlocked(false);
  }, [userId]);

  const restrict = useCallback(async () => {
    if (isBlocked) return;
    await fetch("/api/users/restrict", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ userId }),
    });
    setIsRestricted(true);
  }, [userId, isBlocked]);

  const unrestrict = useCallback(async () => {
    await fetch("/api/users/restrict", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ userId }),
    });
    setIsRestricted(false);
  }, [userId]);

  return {
    isBlocked, blockedByThem,
    isRestricted, restrictedByThem,
    loading,
    block, unblock, restrict, unrestrict, fetchStatus,
  };
}