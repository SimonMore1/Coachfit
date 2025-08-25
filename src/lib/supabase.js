// === START: src/lib/supabase.js ===
import { createClient } from '@supabase/supabase-js';

const url  = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasCloud = Boolean(url && anon);

// Client unico, con sessione persistente (fix al problema che ti slogga)
export const supabase = hasCloud
  ? createClient(url, anon, {
      auth: {
        persistSession: true,        // <-- RESTA LOGGATO
        autoRefreshToken: true,
      },
    })
  : null;

// Helper comodi
export async function getSession() {
  if (!supabase) return { data:{ session:null }, error:null };
  return supabase.auth.getSession();
}

export function onAuthChange(cb) {
  if (!supabase) return { data:null, error:null };
  return supabase.auth.onAuthStateChange((_event, sess) => cb(sess || null));
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}
// === END: src/lib/supabase.js ===