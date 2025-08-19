// === START: src/pages/TemplateBuilder.jsx ===
import { useEffect, useMemo, useRef, useState } from "react";
import { EXERCISE_CATALOG, MUSCLE_GROUPS, capWords } from "../utils";

// ------- helpers -------
function newTemplate() {
  return {
    id: undefined,
    name: "",
    days: [
      { id: crypto.randomUUID(), name: "Giorno 1", exercises: [] },
      { id: crypto.randomUUID(), name: "Giorno 2", exercises: [] },
    ],
  };
}
function newExerciseFrom(item) {
  return {
    id: crypto.randomUUID(),
    name: item?.name || "",
    group: item?.muscle || "",
    equipment: item?.equipment || "",
    sets: 3,
    reps: 10,
    kg: null,
    note: "",
  };
}

// calcolo riepilogo serie per gruppo (su TUTTA la scheda)
function computeSeriesByGroup(draft) {
  const map = new Map(); // group -> serie
  if (!draft) return { rows: [], total: 0 };

  for (const day of draft.days || []) {
    for (const ex of day.exercises || []) {
      const g = ex.group || "Altro";
      const s = Number(ex.sets ?? 0);
      map.set(g, (map.get(g) || 0) + (isFinite(s) ? s : 0));
    }
  }
  const rows = Array.from(map.entries())
    .map(([group, sets]) => ({ group, sets }))
    .sort((a, b) => a.group.localeCompare(b.group, "it"));
  const total = rows.reduce((sum, r) => sum + r.sets, 0);
  return { rows, total };
}

// ------- componente -------
export default function TemplateBuilder({ user, templates, saveTemplate, deleteTemplate }) {
  const [activeId, setActiveId]   = useState(templates[0]?.id || null);
  const active                    = useMemo(() => templates.find(t => t.id === activeId) || null, [templates, activeId]);

  const [draft, setDraft]         = useState(active || null);
  const [dayIdx, setDayIdx]       = useState(0);

  // Filtri (senza “Modalità”)
  const groups  = MUSCLE_GROUPS;
  const equips  = useMemo(() => [...new Set(EXERCISE_CATALOG.map(e => e.equipment))], []);

  const [fGroup, setFGroup] = useState("");
  const [fEquip, setFEquip] = useState("");

  // Ricerca + Autocomplete
  const [q, setQ]             = useState("");
  const [showSug, setShowSug] = useState(false);
  const [activeSug, setActiveSug] = useState(-1);
  const inputRef = useRef(null);

  // focus su Serie dopo aggiunta
  const lastAddedIdRef = useRef(null);
  const lastAddedSetsRef = useRef(null);

  // libreria filtrata
  const filteredLib = useMemo(() => {
    const base = EXERCISE_CATALOG.filter(e => {
      if (fGroup && e.muscle !== fGroup) return false;
      if (fEquip && e.equipment !== fEquip) return false;
      return true;
    });
    if (!q.trim()) return base;

    const s = q.trim().toLowerCase();
    const starts = [], includes = [];
    for (const e of base) {
      const n = e.name.toLowerCase();
      if (n.startsWith(s)) starts.push(e);
      else if (n.includes(s)) includes.push(e);
    }
    return [...starts, ...includes];
  }, [q, fGroup, fEquip]);

  function selectTemplate(t) {
    setActiveId(t?.id ?? null);
    setDraft(structuredClone(t));
    setDayIdx(0);
  }
  function addTemplate() {
    const t = newTemplate();
    setActiveId(undefined);
    setDraft(t);
    setDayIdx(0);
    setTimeout(() => document.getElementById("tpl-name-input")?.focus(), 0);
  }
  function updateDraft(patch) { setDraft(prev => ({ ...prev, ...patch })); }
  function updateDayName(i, name) {
    const days = draft.days.map((d, idx) => (idx === i ? { ...d, name } : d));
    updateDraft({ days });
  }
  function addDay() {
    const days = [...draft.days, { id: crypto.randomUUID(), name: `Giorno ${draft.days.length + 1}`, exercises: [] }];
    updateDraft({ days });
    setDayIdx(days.length - 1);
  }
  function removeDay() {
    if (draft.days.length <= 1) return;
    const days = draft.days.toSpliced(dayIdx, 1);
    updateDraft({ days });
    setDayIdx(Math.max(0, dayIdx - 1));
  }
  function addExerciseFromCatalog(item) {
    if (!item) return;
    const days = draft.days.map((d, idx) => {
      if (idx !== dayIdx) return d;
      const newEx = newExerciseFrom(item);
      lastAddedIdRef.current = newEx.id;
      return { ...d, exercises: [...d.exercises, newEx] };
    });
    updateDraft({ days });
    setQ(""); setShowSug(false); setActiveSug(-1);
    setTimeout(() => { lastAddedSetsRef.current?.focus?.(); }, 0);
  }
  function updateExercise(i, patch) {
    const days = draft.days.map((d, idx) => {
      if (idx !== dayIdx) return d;
      const exs = d.exercises.map((ex, ii) => (ii === i ? { ...ex, ...patch } : ex));
      return { ...d, exercises: exs };
    });
    updateDraft({ days });
  }
  function removeExercise(i) {
    const days = draft.days.map((d, idx) => {
      if (idx !== dayIdx) return d;
      const exs = d.exercises.toSpliced(i, 1);
      return { ...d, exercises: exs };
    });
    updateDraft({ days });
  }
  async function handleSave() {
    const saved = await saveTemplate({
      id: draft.id,
      name: draft.name?.trim() || "",
      days: draft.days,
    });
    const after = saved || draft;
    selectTemplate(after);
  }
  async function handleDelete(id) {
    await deleteTemplate(id);
    setDraft(null);
    setActiveId(templates[0]?.id || null);
  }

  // debounce 200ms
  const [debouncedQ, setDebouncedQ] = useState("");
  useEffect(() => { const t = setTimeout(() => setDebouncedQ(q), 200); return () => clearTimeout(t); }, [q]);
  function onSearchKeyDown(e) {
    if (!showSug && (e.key === "ArrowDown" || e.key === "ArrowUp")) setShowSug(true);
    const list = filteredLib.slice(0, 10);
    if (!list.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveSug(p => (p < list.length - 1 ? p + 1 : 0)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveSug(p => (p > 0 ? p - 1 : list.length - 1)); }
    else if (e.key === "Enter") {
      let item = null;
      if (activeSug >= 0) item = list[activeSug];
      else if (list.length === 1) item = list[0];
      if (item) { e.preventDefault(); addExerciseFromCatalog(item); }
    } else if (e.key === "Escape") { setShowSug(false); setActiveSug(-1); }
  }

  // === RIEPILOGO SERIE (live) ===
  const summary = useMemo(() => computeSeriesByGroup(draft), [draft]);

  return (
    <div className="app-main">
      <h2 className="font-semibold" style={{ fontSize: 28, margin: "10px 0 14px" }}>
        Builder schede — Utente: <span className="font-medium">{user?.name}</span>
      </h2>

      {/* GRID con 3 colonne: lista | editor | summary (desktop) */}
      <div className="tpl-grid tpl-grid--with-summary">
        {/* SINISTRA: lista schede */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div className="font-semibold">Le mie schede</div>
            <button className="btn btn-primary" onClick={addTemplate}>+ Nuova scheda</button>
          </div>

          <div className="tpl-list">
            {templates.length === 0 && (<div className="muted">Nessuna scheda salvata.</div>)}
            {templates.map(t => {
              const daysCount = t.days.length;
              const exCount = t.days.reduce((s, d) => s + d.exercises.length, 0);
              const activeCls = t.id === activeId ? "tpl-item active" : "tpl-item";
              return (
                <div key={t.id} className={activeCls} onClick={() => selectTemplate(t)}>
                  <div className="tpl-title">{t.name || "Scheda senza titolo"}</div>
                  <div className="muted">{daysCount} giorni — {exCount} esercizi</div>
                  <div className="tpl-actions">
                    <button className="btn-ghost" onClick={(e) => { e.stopPropagation(); selectTemplate({ ...t, id: undefined, name: (t.name || "Copia") + " (copia)" }); }}>Duplica</button>
                    <button className="btn-ghost" onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}>Elimina</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CENTRO: editor */}
        <div className="card">
          {!draft ? (
            <div className="muted">Seleziona o crea una scheda per modificarla.</div>
          ) : (
            <>
              <div className="grid" style={{ gridTemplateColumns: "1.2fr .8fr auto auto auto", gap: 8 }}>
                <input
                  id="tpl-name-input"
                  className="input"
                  value={draft.name}
                  onChange={(e) => updateDraft({ name: capWords(e.target.value) })}
                  placeholder="Nome scheda…"
                />
                <select className="input" value={dayIdx} onChange={(e) => setDayIdx(Number(e.target.value))}>
                  {draft.days.map((d, idx) => <option key={d.id} value={idx}>{d.name}</option>)}
                </select>
                <button className="btn" onClick={addDay}>+ Giorno</button>
                <button className="btn" onClick={removeDay}>−</button>
                <button className="btn btn-primary" onClick={handleSave}>💾 Salva su cloud</button>
              </div>

              <hr style={{ border: "none", borderTop: "1px dashed #e2e8f0", margin: "12px 0" }} />

              <div className="label">Esercizi — {draft.days[dayIdx]?.name?.toLowerCase()}</div>

              {/* Riga inserimento + filtri */}
              <div className="grid lib-insert-row">
                {/* Ricerca con autocomplete */}
                <div className="ac-wrap">
                  <input
                    ref={inputRef}
                    className="input"
                    placeholder="Cerca esercizio…"
                    value={q}
                    onChange={(e) => { setQ(e.target.value); setShowSug(true); }}
                    onFocus={() => setShowSug(true)}
                    onKeyDown={onSearchKeyDown}
                    onBlur={() => setTimeout(() => { setShowSug(false); setActiveSug(-1); }, 120)}
                    aria-autocomplete="list"
                    aria-expanded={showSug}
                    aria-controls="exercise-suggestions"
                  />
                  {showSug && q.trim() && (
                    <div id="exercise-suggestions" role="listbox" className="ac-panel">
                      {filteredLib.slice(0, 10).length === 0 && (<div className="ac-empty">Nessun esercizio trovato</div>)}
                      {filteredLib.slice(0, 10).map((item, idx) => (
                        <div
                          key={item.name}
                          role="option"
                          aria-selected={idx === activeSug}
                          className={"ac-item" + (idx === activeSug ? " active" : "")}
                          onMouseDown={(e) => { e.preventDefault(); addExerciseFromCatalog(item); }}
                          onMouseEnter={() => setActiveSug(idx)}
                        >
                          {highlightMatch(item.name, q)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <select className="input" value={fGroup} onChange={(e) => setFGroup(e.target.value)}>
                  <option value="">Tutti i gruppi</option>
                  {groups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>

                <select className="input" value={fEquip} onChange={(e) => setFEquip(e.target.value)}>
                  <option value="">Tutti gli attrezzi</option>
                  {equips.map(g => <option key={g} value={g}>{g}</option>)}
                </select>

                <select
                  className="input"
                  value=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    const item = EXERCISE_CATALOG.find(x => x.name === val);
                    if (item) addExerciseFromCatalog(item);
                    e.target.value = "";
                  }}
                >
                  <option value="">Elenco esercizi</option>
                  {filteredLib.map(item => (
                    <option key={item.name} value={item.name}>{item.name}</option>
                  ))}
                </select>

                <button className="btn btn-primary" onClick={() => addExerciseFromCatalog(filteredLib[0])} disabled={!filteredLib.length}>
                  Aggiungi
                </button>
              </div>

              {/* Lista esercizi del giorno (card semplificata) */}
              <ul className="ex-list">
                {draft.days[dayIdx]?.exercises?.map((ex, i) => (
                  <li key={ex.id} className="ex-row-simple">
                    <div className="ex-title">{ex.name || "Esercizio"}</div>
                    <div className="ex-rowA">
                      <label className="label">Serie</label>
                      <input
                        ref={ex.id === lastAddedIdRef.current ? (el) => (lastAddedSetsRef.current = el) : undefined}
                        className="input"
                        type="number"
                        min={1}
                        value={ex.sets ?? 3}
                        onChange={(e) => updateExercise(i, { sets: Number(e.target.value) })}
                      />
                      <label className="label">Ripetizioni</label>
                      <input
                        className="input"
                        type="number"
                        min={1}
                        value={ex.reps ?? 10}
                        onChange={(e) => updateExercise(i, { reps: Number(e.target.value) })}
                      />
                    </div>
                    <div className="ex-rowB">
                      <label className="label">Kg (opz.)</label>
                      <input
                        className="input"
                        type="number"
                        value={ex.kg ?? ""}
                        onChange={(e) => {
                          const v = e.target.value === "" ? null : Number(e.target.value);
                          updateExercise(i, { kg: v });
                        }}
                        placeholder="—"
                      />
                      <label className="label">Note (opz.)</label>
                      <input
                        className="input"
                        value={ex.note || ""}
                        onChange={(e) => updateExercise(i, { note: e.target.value })}
                        placeholder="Aggiungi una nota"
                      />
                      <button className="btn" onClick={() => removeExercise(i)} title="Rimuovi">🗑️</button>
                    </div>
                  </li>
                ))}
                {draft.days[dayIdx]?.exercises?.length === 0 && (
                  <div className="muted">Nessun esercizio in questo giorno.</div>
                )}
              </ul>
            </>
          )}
        </div>

        {/* DESTRA: RIEPILOGO SERIE */}
        <aside className="card summary-panel">
          <div className="font-semibold" style={{ marginBottom: 8 }}>📊 Serie per gruppo</div>
          {(!summary.rows.length) ? (
            <div className="muted">Aggiungi esercizi per vedere il riepilogo.</div>
          ) : (
            <ul className="sum-list">
              {summary.rows.map(r => (
                <li key={r.group} className="sum-row">
                  <span className="sum-group">{r.group}</span>
                  <span className="sum-sets">{r.sets}</span>
                </li>
              ))}
            </ul>
          )}
          <hr style={{ border: "none", borderTop: "1px dashed #e2e8f0", margin: "10px 0" }} />
          <div className="sum-total">Totale serie: <b>{summary.total}</b></div>
        </aside>
      </div>
    </div>
  );
}

// evidenzia match nell’autocomplete
function highlightMatch(name, q) {
  if (!q) return name;
  const s = q.trim();
  const i = name.toLowerCase().indexOf(s.toLowerCase());
  if (i < 0) return name;
  const a = name.slice(0, i);
  const b = name.slice(i, i + s.length);
  const c = name.slice(i + s.length);
  return (<>{a}<span style={{ fontWeight: 600 }}>{b}</span>{c}</>);
}
// === END: src/pages/TemplateBuilder.jsx ===