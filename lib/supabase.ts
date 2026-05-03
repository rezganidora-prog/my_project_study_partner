import { createBrowserClient, createServerClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Singleton browser client — prevents "Multiple GoTrueClient instances" warning
let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function createSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
  }
  return browserClient
}

// Server client for use in Server Components, Route Handlers, and Server Actions
export function createSupabaseServerClient(
  cookieStore: { get: (name: string) => { value: string } | undefined }
) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return Object.keys(cookieStore).map((name) => ({
          name,
          value: cookieStore.get(name)?.value ?? '',
        }))
      },
      setAll() {},
    },
  })
}
