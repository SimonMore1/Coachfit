// === START: src/lib/supabase.js ===
import { createClient } from '@supabase/supabase-js';

const url  = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Se non hai messo le ENV, restiamo in "local mode" (null evita chiamate)
export const supabase = (url && anon)
  ? createClient(url, anon, {
      auth: {
        persistSession: true,          // ricorda sessione su refresh
        autoRefreshToken: true,        // auto refresh jwt
        detectSessionInUrl: true,      // gestisce callback magic-link
      },
    })
  : null;

export const hasCloud = Boolean(supabase);

// Helper comodi per la UI
export async function signInWithMagicLink(email) {
  if (!supabase) throw new Error('Supabase non configurato');
  return supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}
// === END: src/lib/supabase.js ===