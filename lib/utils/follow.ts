import { createClient } from "@/lib/supabase/client";

export async function followCreator(followedId: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: user.id, followed_id: followedId });

  if (error) throw new Error(error.message);
}

export async function unfollowCreator(followedId: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("followed_id", followedId);

  if (error) throw new Error(error.message);
}

export async function checkIsFollowing(followedId: string): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", user.id)
    .eq("followed_id", followedId)
    .single();

  return !!data;
}