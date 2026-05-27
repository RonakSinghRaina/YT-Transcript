export const PUBLIC_SUPABASE_URL = 'https://xtkdvqyhkzhpgubqmbcu.supabase.co';
export const PUBLIC_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0a2R2cXloa3pocGd1YnFtYmN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNTQwOTQsImV4cCI6MjA5NDczMDA5NH0.RGakZyUYHMFiZX0XNIBGRmoaoykhkCWMydipoJugt-w';

export function resolveServerSupabaseCredentials() {
  return {
    supabaseUrl:
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || PUBLIC_SUPABASE_URL,
    supabaseAnonKey:
      process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || PUBLIC_SUPABASE_ANON_KEY,
  };
}
