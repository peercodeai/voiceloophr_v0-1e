import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cachedClient: SupabaseClient | null = null

export function getSupabaseBrowser(): SupabaseClient | null {
  if (cachedClient) return cachedClient
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase env not set in browser. Skipping client init.')
    return null
  }
  cachedClient = createClient(supabaseUrl, supabaseAnonKey)
  return cachedClient
}


