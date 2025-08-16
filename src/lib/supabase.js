// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const url  = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasCloud = Boolean(url && anon);

export const supabase = hasCloud
  ? createClient(url, anon, { auth: { persistSession: false } })
  : null;