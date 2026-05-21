/** Public Supabase project (anon key is safe to embed in the client). */
export const DEFAULT_SUPABASE_URL = 'https://xtkdvqyhkzhpgubqmbcu.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0a2R2cXloa3pocGd1YnFtYmN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNTQwOTQsImV4cCI6MjA5NDczMDA5NH0.RGakZyUYHMFiZX0XNIBGRmoaoykhkCWMydipoJugt-w';

export function resolveSupabaseUrl() {
  const url = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  return url && !url.includes('your-project') ? url : DEFAULT_SUPABASE_URL;
}

export function resolveSupabaseAnonKey() {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  return key && !key.includes('your-supabase') ? key : DEFAULT_SUPABASE_ANON_KEY;
}
