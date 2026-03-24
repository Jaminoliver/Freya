import { NextResponse } from "next/server";
import { createServerSupabaseClient, getUser } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { user, error: authError } = await getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId } = await params;
  const convId = parseInt(conversationId, 10);
  if (isNaN(convId)) return NextResponse.json({ error: "Invalid conversation id" }, { status: 400 });

  // Fetch all user's lists
  const { data: lists, error: listsError } = await supabase
    .from("favourite_chat_lists")
    .select("id, name, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (listsError) return NextResponse.json({ error: listsError.message }, { status: 500 });

  if (!lists || lists.length === 0) {
    return NextResponse.json({ lists: [] });
  }

  const listIds = lists.map((l) => l.id);

  // Fetch ALL items across user's lists with conversation join for avatars
  const { data: allItems, error: itemsError } = await supabase
    .from("favourite_chat_list_items")
    .select(`
      list_id,
      conversation_id,
      conversation:conversations (
        creator_id,
        fan_id,
        creator:profiles!conversations_creator_id_fkey ( avatar_url ),
        fan:profiles!conversations_fan_id_fkey ( avatar_url )
      )
    `)
    .in("list_id", listIds);

  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 });

  // Build per-list data
  const listDataMap = new Map<string, { count: number; avatars: string[]; isMember: boolean }>();

  for (const list of lists) {
    listDataMap.set(list.id, { count: 0, avatars: [], isMember: false });
  }

  for (const item of allItems ?? []) {
    const entry = listDataMap.get(item.list_id);
    if (!entry) continue;

    entry.count++;

    if (item.conversation_id === convId) {
      entry.isMember = true;
    }

    // Get the OTHER participant's avatar (not current user)
    const conv = item.conversation as any;
    if (conv) {
      const isCreator = conv.creator_id === user.id;
      const otherAvatar = isCreator
        ? conv.fan?.avatar_url
        : conv.creator?.avatar_url;
      if (otherAvatar && entry.avatars.length < 4) {
        entry.avatars.push(otherAvatar);
      }
    }
  }

  const result = lists.map((list) => {
    const data = listDataMap.get(list.id)!;
    return {
      id: list.id,
      name: list.name,
      createdAt: list.created_at,
      isMember: data.isMember,
      memberCount: data.count,
      avatars: data.avatars,
    };
  });

  return NextResponse.json({ lists: result });
}