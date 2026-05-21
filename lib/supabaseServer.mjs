import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

/** Supabase client for Node.js 20 (needs ws transport for Realtime). */
export function createServerSupabase(supabaseUrl, supabaseAnonKey, options = {}) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    ...options,
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      ...options.auth,
    },
    realtime: {
      transport: ws,
      ...options.realtime,
    },
  });
}
