// API locale su localStorage — preparata per essere sostituita da Supabase in futuro

const KEY = {
  users: "cf_users",
  templates: "cf_templates",
  assignments: "cf_assignments",
  active: "cf_active_plans",
  logs: "cf_logs",
};

// Seed iniziale (PT + 3 pazienti + 2 schede di esempio)
seedIfEmpty();

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function write(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

/* ================= USERS ================= */
export function listUsers() {
  return read(KEY.users, []);
}
export function upsertUser(u) {
  const all = listUsers();
  const i = all.findIndex((x) => x.id === u.id);
  if (i >= 0) all[i] = { ...all[i], ...u };
  else all.push(u);
  write(KEY.users, all);
  return u;
}

/* ================= TEMPLATES ================= */
export function listTemplates({ ownerId } = {}) {
  const t = read(KEY.templates, []);
  return ownerId ? t.filter((x) => x.owner_id === ownerId) : t;
}
export function getTemplate(id) {
  return read(KEY.templates, []).find((t) => t.id === id) || null;
}
export function upsertTemplate(tpl) {
  const all = read(KEY.templates, []);
  if (!tpl.id) tpl.id = "tpl_" + Date.now();
  const i = all.findIndex((x) => x.id === tpl.id);
  if (i >= 0) all[i] = { ...all[i], ...tpl };
  else all.unshift(tpl);
  write(KEY.templates, all);
  return tpl;
}
export function deleteTemplate(id) {
  write(
    KEY.templates,
    read(KEY.templates, []).filter((t) => t.id !== id)
  );
}

/* ================= ASSIGNMENTS (PT -> patient -> plan) ================= */
export function listAssignments() {
  return read(KEY.assignments, []);
}
export function assignPlan(ptId, patientId, planId) {
  const all = listAssignments();
  all.unshift({
    id: "as_" + Date.now(),
    pt_id: ptId,
    patient_id: patientId,
    plan_id: planId,
    created_at: new Date().toISOString(),
  });
  write(KEY.assignments, all);
}
export function plansAssignedTo(patientId) {
  const asg = listAssignments().filter((a) => a.patient_id === patientId);
  const ids = asg.map((a) => a.plan_id);
  return read(KEY.templates, []).filter((t) => ids.includes(t.id));
}

/* ================= ACTIVE PLAN ================= */
export function getActivePlan(userId) {
  const map = read(KEY.active, {});
  return map[userId] || null;
}
export function setActivePlan(userId, planId) {
  const map = read(KEY.active, {});
  if (planId) map[userId] = planId;
  else delete map[userId];
  write(KEY.active, map);
  return map[userId] || null;
}

/* ================= WORKOUT LOGS ================= */
/* formato log locale minimale: { id, user_id, date:'YYYY-MM-DD', plan_id?, plan_day_index?, note? } */
export function listLogs({ userId } = {}) {
  const all = read(KEY.logs, []);
  return userId ? all.filter((l) => l.user_id === userId) : all;
}
export function addLog({ userId, date, planId = null, planDayIndex = null, note = "" }) {
  const all = listLogs();
  const exists = all.some((l) => l.user_id === userId && l.date === date);
  if (exists) return; // idempotente
  all.push({
    id: "log_" + Date.now(),
    user_id: userId,
    date,
    plan_id: planId,
    plan_day_index: planDayIndex,
    note,
  });
  write(KEY.logs, all);
}
export function removeLog({ userId, date }) {
  write(
    KEY.logs,
    listLogs().filter((l) => !(l.user_id === userId && l.date === date))
  );
}

/* ================= SEED ================= */
function seedIfEmpty() {
  if (!localStorage.getItem(KEY.users)) {
    write(KEY.users, [
      { id: "pt-1", role: "PT", name: "Coach Luca" },
      { id: "u-1", role: "USER", name: "Simone" },
      { id: "u-2", role: "USER", name: "Giulia" },
      { id: "u-3", role: "USER", name: "Marco" },
    ]);
  }
  if (!localStorage.getItem(KEY.templates)) {
    write(KEY.templates, [
      {
        id: "tpl_A",
        owner_id: "pt-1",
        name: "Ipertrofia A",
        days: [
          { index: 1, exercises: [{ name: "Panca Piana", targetSets: 4, targetReps: 8, targetWeight: 50 }] },
          { index: 2, exercises: [{ name: "Squat", targetSets: 5, targetReps: 5, targetWeight: 80 }] },
          { index: 3, exercises: [{ name: "Lat Machine", targetSets: 4, targetReps: 10, targetWeight: 55 }] },
        ],
      },
      {
        id: "tpl_B",
        owner_id: "pt-1",
        name: "Full Body Base",
        days: [
          { index: 1, exercises: [{ name: "Panca Inclinata Manubri", targetSets: 3, targetReps: 10, targetWeight: 22 }] },
          { index: 2, exercises: [{ name: "Stacchi Rumeni", targetSets: 3, targetReps: 8, targetWeight: 70 }] },
        ],
      },
    ]);
  }
  if (!localStorage.getItem(KEY.assignments)) {
    write(KEY.assignments, [
      { id: "as1", pt_id: "pt-1", patient_id: "u-1", plan_id: "tpl_A", created_at: new Date().toISOString() },
      { id: "as2", pt_id: "pt-1", patient_id: "u-2", plan_id: "tpl_B", created_at: new Date().toISOString() },
    ]);
  }
  if (!localStorage.getItem(KEY.active)) {
    write(KEY.active, { "u-1": "tpl_A" });
  }
  if (!localStorage.getItem(KEY.logs)) {
    const today = new Date();
    const toISO = (d) => d.toISOString().slice(0, 10);
    const logs = [];
    // genera un po' di attività nelle ultime 6 settimane per u-1 e u-2
    for (let i = 0; i < 42; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      if (Math.random() < 0.35) logs.push({ id: "lg" + i, user_id: "u-1", date: toISO(d) });
      if (Math.random() < 0.25) logs.push({ id: "lh" + i, user_id: "u-2", date: toISO(d) });
    }
    write(KEY.logs, logs);
  }
}