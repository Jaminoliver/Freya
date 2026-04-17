// app/api/search/creators/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface CreatorRow {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  subscriber_count: number;
  follower_count: number;
  likes_count: number;
}

// Escape special characters that have meaning in Postgres LIKE/ILIKE patterns
// % matches any sequence, _ matches any single char, \ is the escape char
function escapeIlike(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

// Relevance score — lower is better (sorts ascending)
// 0 = exact username match
// 1 = username starts with query
// 2 = display name word starts with query (handles "Jamin Obi" + "obi")
// 3 = contains query anywhere
function relevanceScore(creator: CreatorRow, query: string): number {
  const q = query.toLowerCase();
  const username = creator.username.toLowerCase();
  const displayName = (creator.display_name ?? "").toLowerCase();

  if (username === q) return 0;
  if (username.startsWith(q)) return 1;

  // Word-boundary match on display name: "Jamin Obi" + "obi" should rank high
  // Split on space/hyphen/apostrophe and check if any word starts with query
  const words = displayName.split(/[\s\-']+/);
  if (words.some((w) => w.startsWith(q))) return 2;

  return 3;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get("q") ?? "";
  const query = rawQuery.trim();

  // Min 2 chars — don't waste DB calls on single-char searches
  if (query.length < 2) {
    return NextResponse.json({ creators: [] });
  }

  // Cap query length to prevent abuse
  if (query.length > 100) {
    return NextResponse.json({ creators: [] });
  }

  const safeQuery = escapeIlike(query);
  const pattern = `%${safeQuery}%`;

  try {
    const supabase = await createServerSupabaseClient();

    // Fetch a larger pool than we return so relevance ranking has room to work
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, is_verified, subscriber_count, follower_count, likes_count")
      .eq("role", "creator")
      .eq("is_active", true)
      .eq("is_suspended", false)
      .or(`username.ilike.${pattern},display_name.ilike.${pattern}`)
      .limit(30);

    if (error) {
      console.error("[api/search/creators] supabase error:", error);
      return NextResponse.json({ creators: [] }, { status: 500 });
    }

    const creators = (data ?? []) as CreatorRow[];

    // Sort by relevance (asc) then by subscriber_count (desc) as tiebreaker
    creators.sort((a, b) => {
      const scoreDiff = relevanceScore(a, query) - relevanceScore(b, query);
      if (scoreDiff !== 0) return scoreDiff;
      return b.subscriber_count - a.subscriber_count;
    });

    return NextResponse.json({ creators: creators.slice(0, 8) });
  } catch (err) {
    console.error("[api/search/creators] exception:", err);
    return NextResponse.json({ creators: [] }, { status: 500 });
  }
}