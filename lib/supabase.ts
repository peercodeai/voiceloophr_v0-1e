import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Create Supabase clients lazily to avoid runtime errors when env vars are missing in dev
// Prefer server-side SUPABASE_URL when available, fallback to NEXT_PUBLIC_* for compatibility
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabaseAdmin: SupabaseClient | null =
  supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null


