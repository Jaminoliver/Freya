import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}

// Call this before creating any Realtime subscriptions
// to ensure the client has a valid session token
export async function getAuthenticatedBrowserClient() {
  const supabase = getBrowserClient();
  // This forces the client to load the session from cookies/storage
  // so subsequent Realtime subscriptions use the authenticated role
  await supabase.auth.getSession();
  return supabase;
}