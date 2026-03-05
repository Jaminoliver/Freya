import { createBrowserClient } from '@supabase/ssr'

// Web Locks API causes indefinite hangs on some devices/browsers.
// This no-op lock bypasses it entirely — safe for browser clients.
const noOpLock = async (
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<any>
): Promise<any> => {
  return await fn();
};

let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (client) return client
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        lock: noOpLock,
      },
    }
  )
  return client
}