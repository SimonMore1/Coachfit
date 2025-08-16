// === START: src/data.js ===
import { supabase, hasCloud } from './lib/supabase';

// ------- Fallback Local Storage (per sicurezza) -------
const LS_KEY = 'coachfit-v1';
function loadLS() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); }
  catch { return {}; }
}
function saveLS(obj) {
  localStorage.setItem(LS_KEY, JSON.stringify(obj || {}));
}

function getLS(userId) {
  const all = loadLS();
  const byUser = all[userId] || { templates: [], activePlan: null, workoutLogs: [] };
  return byUser;
}
function setLS(userId, patch) {
  const all = loadLS();
  const byUser = getLS(userId);
  const next = { ...byUser, ...patch };
  all[userId] = next;
  saveLS(all);
  return next;
}

// ------- Cloud helpers (Supabase) -------
export async function getTemplates(userId) {
  if (!hasCloud) {
    return getLS(userId).templates;
  }
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('owner_id', userId)
    .order('updated_at', { ascending: false });
  if (error) { console.error(error); return []; }
  // normalizza in { id, name, days: [...] }
  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    days: row.data?.days || [],
  }));
}

export async function upsertTemplate(userId, tpl) {
  if (!hasCloud) {
    const cur = getLS(userId).templates;
    let next;
    if (tpl.id) {
      next = cur.map(t => t.id === tpl.id ? tpl : t);
    } else {
      tpl = { ...tpl, id: crypto.randomUUID() };
      next = [tpl, ...cur];
    }
    setLS(userId, { templates: next });
    return tpl;
  }
  const payload = {
    id: tpl.id, name: tpl.name, owner_id: userId, data: { days: tpl.days || [] }
  };
  const { data, error } = await supabase
    .from('templates')
    .upsert(payload)
    .select('*')
    .single();
  if (error) { console.error(error); return null; }
  return { id: data.id, name: data.name, days: data.data?.days || [] };
}

export async function deleteTemplate(userId, tplId) {
  if (!hasCloud) {
    const cur = getLS(userId).templates;
    const next = cur.filter(t => t.id !== tplId);
    setLS(userId, { templates: next });
    return true;
  }
  const { error } = await supabase
    .from('templates')
    .delete()
    .eq('id', tplId)
    .eq('owner_id', userId);
  if (error) { console.error(error); return false; }
  return true;
}

export async function getActivePlan(userId) {
  if (!hasCloud) {
    return getLS(userId).activePlan || null;
  }
  const { data, error } = await supabase
    .from('active_plans')
    .select('template_id, templates!inner(id, name, data)')
    .eq('user_id', userId)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') { // not found
    console.error(error); return null;
  }
  if (!data) return null;
  const tpl = data.templates;
  return { id: tpl.id, name: tpl.name, days: tpl.data?.days || [] };
}

export async function setActivePlan(userId, template) {
  if (!hasCloud) {
    setLS(userId, { activePlan: template || null });
    return true;
  }
  const template_id = template?.id || null;
  const { error } = await supabase
    .from('active_plans')
    .upsert({ user_id: userId, template_id });
  if (error) { console.error(error); return false; }
  return true;
}

// (facoltativo) logs per futuri step
export async function getWorkoutLogs(userId) {
  if (!hasCloud) return getLS(userId).workoutLogs;
  const { data, error } = await supabase
    .from('workout_logs')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function addWorkoutLog(userId, log) {
  if (!hasCloud) {
    const cur = getLS(userId).workoutLogs;
    const next = [{id: crypto.randomUUID(), ...log}, ...cur];
    setLS(userId, { workoutLogs: next });
    return true;
  }
  const { error } = await supabase
    .from('workout_logs')
    .insert({ user_id: userId, date: log.date, entries: log.entries || [] });
  if (error) { console.error(error); return false; }
  return true;
}
// === END: src/data.js ===