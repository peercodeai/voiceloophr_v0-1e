import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Table SQL (run once):
// create table if not exists user_settings (
//   user_id uuid primary key,
//   openai_api_key text,
//   created_at timestamptz default now(),
//   updated_at timestamptz default now()
// );
// create or replace function update_updated_at_column()
// returns trigger as $$ begin new.updated_at = now(); return new; end; $$ language plpgsql;
// drop trigger if exists trg_user_settings_updated on user_settings;
// create trigger trg_user_settings_updated before update on user_settings for each row execute function update_updated_at_column();

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    const { data, error } = await supabaseAdmin.from('user_settings').select('*').eq('user_id', userId).single()
    if (error && error.code !== 'PGRST116') return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 })
    return NextResponse.json({ success: true, settings: data || null })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    const { userId, openaiApiKey } = await request.json()
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    const { data, error } = await supabaseAdmin
      .from('user_settings')
      .upsert({ user_id: userId, openai_api_key: openaiApiKey }, { onConflict: 'user_id' })
      .select()
      .single()
    if (error) return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
    return NextResponse.json({ success: true, settings: data })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


