// === START: src/lib/supabase.js ===
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Se non hai ancora messo le ENV, evitiamo crash e lavoriamo in "local mode"
export const hasCloud = Boolean(url && anon);

export const supabase = hasCloud
  ? createClient(url, anon, {
      auth: { persistSession: false }, // niente login per ora
    })
  : null;
// === END: src/lib/supabase.js ===