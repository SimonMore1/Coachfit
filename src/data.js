// src/data.js
// Layer dati unico: usa Supabase se disponibile, altrimenti localStorage.
// Inoltre riesporta tutte le costanti/utility della libreria esercizi e dei DEMO,
// così tutti i file possono importare SOLO da "./data.js".

import { supabase, hasCloud } from "./lib/supabase";

// 🔁 RIESPORTI UNIFICATI (così non servono più import da ./utils.js)
export {
  // libreria esercizi / filtri / utilità
  EXERCISE_LIBRARY,
  EXERCISE_CATALOG,
  EXERCISE_NAMES,
  EQUIPMENTS,
  MUSCLE_GROUPS,
  detectGroup,
  // dati demo (PT + utenti) — necessari a App.jsx
  DEMO_USERS,
  DEMO_PATIENTS,
} from "./utils.js";

// ---------------- Helpers locali (fallback) ----------------
const LS_KEYS = {
  templates: "cf_templates_v1",
  active: "cf_active_plan_v1",
  logs: "cf_workout_logs_v1",
};

const readLS = (k, def) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? def;
  } catch {
    return def;
  }
};

const writeLS = (k, v) => localStorage.setItem(k, JSON.stringify(v));

const uid = () =>
  (crypto.randomUUID?.() ||
    String(Date.now()) + Math.random().toString(16).slice(2));

// Normalizza record template dal DB
const normTpl = (row) => ({
  id: row.id,
  owner_id: row.owner_id,
  name: row.name,
  days: Array.isArray(row.days)
    ? row.days
    : (() => {
        try {
          return JSON.parse(row.days || "[]");
        } catch {
          return [];
        }
      })(),
  updated_at: row.updated_at || null,
});

// ================= TEMPLATES =================

export async function loadTemplates(ownerId) {
  if (hasCloud()) {
    const { data, error } = await supabase
      .from("templates")
      .select("*")
      .eq("owner_id", ownerId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(normTpl);
  }
  // locale
  const all = readLS(LS_KEYS.templates, []);
  return all.filter((t) => t.owner_id === ownerId);
}

export async function saveTemplate(ownerId, tpl) {
  // tpl: {id?, name, days:[...]}
  const payload = {
    id: tpl.id || undefined,
    owner_id: ownerId,
    name: tpl.name?.trim() || "Nuova scheda",
    days: Array.isArray(tpl.days) ? tpl.days : [],
  };

  if (hasCloud()) {
    if (payload.id) {
      const { data, error } = await supabase
        .from("templates")
        .update({ name: payload.name, days: payload.days })
        .eq("id", payload.id)
        .select()
        .single();
      if (error) throw error;
      return normTpl(data);
    } else {
      const { data, error } = await supabase
        .from("templates")
        .insert([
          {
            owner_id: payload.owner_id,
            name: payload.name,
            days: payload.days,
          },
        ])
        .select()
        .single();
      if (error) throw error;
      return normTpl(data);
    }
  }

  // locale
  const all = readLS(LS_KEYS.templates, []);
  if (payload.id) {
    const i = all.findIndex((t) => t.id === payload.id);
    if (i >= 0) all[i] = { ...all[i], ...payload };
  } else {
    payload.id = uid();
    all.unshift({ ...payload });
  }
  writeLS(LS_KEYS.templates, all);
  return all.find((t) => t.id === payload.id);
}

export async function deleteTemplate(ownerId, templateId) {
  if (hasCloud()) {
    const { error } = await supabase
      .from("templates")
      .delete()
      .eq("id", templateId)
      .eq("owner_id", ownerId);
    if (error) throw error;
    return true;
  }
  const all = readLS(LS_KEYS.templates, []);
  const next = all.filter(
    (t) => !(t.id === templateId && t.owner_id === ownerId)
  );
  writeLS(LS_KEYS.templates, next);
  return true;
}

export async function duplicateTemplate(ownerId, templateId) {
  const list = await loadTemplates(ownerId);
  const base = list.find((t) => t.id === templateId);
  if (!base) throw new Error("Template non trovato");
  const clone = {
    name: `${base.name} (copia)`,
    days: JSON.parse(JSON.stringify(base.days || [])),
  };
  return saveTemplate(ownerId, clone);
}

export async function renameTemplate(ownerId, templateId, newName) {
  if (hasCloud()) {
    const { data, error } = await supabase
      .from("templates")
      .update({ name: newName })
      .eq("id", templateId)
      .eq("owner_id", ownerId)
      .select()
      .single();
    if (error) throw error;
    return normTpl(data);
  }
  const all = readLS(LS_KEYS.templates, []);
  const i = all.findIndex((t) => t.id === templateId && t.owner_id === ownerId);
  if (i >= 0) {
    all[i].name = String(newName || "").trim() || all[i].name;
    writeLS(LS_KEYS.templates, all);
    return all[i];
  }
  throw new Error("Template non trovato");
}

// ================= ACTIVE PLAN =================

export async function getActivePlanForUser(ownerId) {
  if (hasCloud()) {
    const { data, error } = await supabase
      .from("active_plans")
      .select("*")
      .eq("owner_id", ownerId)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data || null; // {id, owner_id, template_id, day_index}
  }
  return readLS(LS_KEYS.active, null);
}

export async function setActivePlanForUser(ownerId, templateId, dayIndex = 0) {
  if (hasCloud()) {
    const { data, error } = await supabase
      .from("active_plans")
      .upsert(
        [{ owner_id: ownerId, template_id: templateId, day_index: dayIndex }],
        { onConflict: "owner_id" }
      )
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const rec = {
    owner_id: ownerId,
    template_id: templateId,
    day_index: dayIndex,
  };
  writeLS(LS_KEYS.active, rec);
  return rec;
}

// ================= WORKOUT LOGS =================

export async function addWorkoutLog(ownerId, dateISO, entries) {
  // entries: array di set completati per il giorno
  const payload = {
    owner_id: ownerId,
    date: dateISO, // 'YYYY-MM-DD'
    entries: entries || [], // JSONB su supabase
  };

  if (hasCloud()) {
    const { data, error } = await supabase
      .from("workout_logs")
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const all = readLS(LS_KEYS.logs, []);
  all.push({ id: uid(), ...payload });
  writeLS(LS_KEYS.logs, all);
  return true;
}

export async function getWorkoutLogs(ownerId, fromISO, toISO) {
  if (hasCloud()) {
    let q = supabase.from("workout_logs").select("*").eq("owner_id", ownerId);
    if (fromISO) q = q.gte("date", fromISO);
    if (toISO) q = q.lte("date", toISO);
    const { data, error } = await q.order("date", { ascending: true });
    if (error) throw error;
    return data || [];
  }
  const all = readLS(LS_KEYS.logs, []);
  return all
    .filter((r) => r.owner_id === ownerId)
    .filter(
      (r) =>
        (!fromISO || r.date >= fromISO) && (!toISO || r.date <= toISO)
    )
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}