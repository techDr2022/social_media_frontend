// frontend lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
  });
}

// Create Supabase client with proper configuration
// autoRefreshToken: true - automatically refresh tokens
// persistSession: true - persist session in localStorage
// detectSessionInUrl: true - automatically detect session from URL (hash for magic links, query params for OAuth)
// flowType: 'pkce' - Use PKCE flow for OAuth (required for Google OAuth with query parameters)
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true, // Detects both hash fragments (magic links) and query params (OAuth)
      flowType: 'pkce', // Required for OAuth providers like Google (uses query parameters)
    },
  }
);








