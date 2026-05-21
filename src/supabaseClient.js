import { createClient } from '@supabase/supabase-js';
import { resolveSupabaseAnonKey, resolveSupabaseUrl } from './lib/publicEnv';

const supabaseUrl = resolveSupabaseUrl();
const supabaseAnonKey = resolveSupabaseAnonKey();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
