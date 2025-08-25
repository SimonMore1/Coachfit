// === START: src/pages/TemplateBuilder.jsx ===
import { useEffect, useMemo, useRef, useState } from "react";
import { EXERCISE_LIBRARY, MUSCLE_GROUPS, capWords } from "../utils";

/**
 * Props attese:
 * - user                       { id, name, role }
 * - templates                  [{ id, name, days:[{id,name,entries:[]}] }]
 * - saveTemplate               (tpl) => Promise<savedTpl>
 * - deleteTemplate             (tplId) => Promise<boolean>
 */

function newTemplate() {
  return {
    id: undefined, // nuovo finché non salvi su cloud (verrà assegnato)
    name: "",
    days: [
      { id: crypto.randomUUID(), name: "Giorno 1", entries: [] },
      { id: crypto.randomUUID(), name: "Giorno 2", entries: [] },
    ],
  };
}

function makeEntryFromExercise(ex, orderIndex = 0) {
  // entry “snellita”: include già sets/reps che la pagina Allenamenti leggerà
  return {
    exerciseId: ex.id || null,
    exerciseName: ex.name,
    muscleGroup: ex.muscle || null,
    equipment: ex.equip || null,

    // campi chiave per Allenamenti
    sets: 3,      // default: modificabile nella riga
    reps: 10,     // default: modificabile nella riga

    // opzionali
    weight_kg: null,
    notes: null,

    orderIndex
  };
}

export default function TemplateBuilder({ user, templates, saveTemplate, deleteTemplate }) {
  // selezione scheda a sinistra
  const [activeId, setActiveId] = useState(templates[0]?.id ?? null);
  const active = useMemo(() => templates.find(t => t.id === activeId) || null, [templates, activeId]);

  // bozza in modifica
  const [draft, setDraft] = useState(active ?? null);
  const [dayIdx, setDayIdx] = useState(0);

  // selezione da libreria
  const [q, setQ] = useState("");
  const [fGroup, setFGroup] = useState("");
  const [fEquip, setFEquip] = useState("");
  const [selectedId, setSelectedId] = useState("");

  // focus sul nome scheda quando ne crei una nuova
  const nameRef = useRef(null);
  useEffect(() => {
    if (draft && draft.id === undefined && nameRef.current) {
      nameRef.current.focus();
    }
  }, [draft?.id]);

  // quando cambi scheda
  useEffect(() => {
    if (active) {
      setDraft(structuredClone(active));
      setDayIdx(0);
    } else {
      setDraft(null);
      setDayIdx(0);
    }
  }, [activeId]); // eslint-disable-line

  const groups  = MUSCLE_GROUPS;
  const equips  = useMemo(() => [...new Set(EXERCISE_LIBRARY.map(e => e.equip))], []);
  const lib = useMemo(() => {
    const query = (q || "").toLowerCase();
    return EXERCISE_LIBRARY.filter(e => {
      if (query && !e.name.toLowerCase().includes(query)) return false;
      if (fGroup && e.muscle !== fGroup) return false;
      if (fEquip && e.equip !== fEquip) return false;
      return true;
    });
  }, [q, fGroup, fEquip]);

  function selectTemplate(t) {
    setActiveId(t?.id ?? null);
  }

  function addTemplate() {
    setActiveId(undefined);
    setDraft(newTemplate());
    setDayIdx(0);
    setSelectedId("");
    setQ("");
  }

  function updateDraft(patch) {
    setDraft(prev => ({ ...prev, ...patch }));
  }

  function updateDayName(i, name) {
    const days = draft.days.map((d, idx) => idx === i ? { ...d, name } : d);
    updateDraft({ days });
  }

  function addDay() {
    const days = [
      ...draft.days,
      { id: crypto.randomUUID(), name: `Giorno ${draft.days.length + 1}`, entries: [] }
    ];
    updateDraft({ days });
    setDayIdx(days.length - 1);
  }

  function removeDay() {
    if (!draft || draft.days.length <= 1) return;
    const days = draft.days.toSpliced(dayIdx, 1);
    updateDraft({ days });
    setDayIdx(Math.max(0, dayIdx - 1));
  }

  function addSelectedExercise() {
    if (!selectedId) return;
    const ex = EXERCISE_LIBRARY.find(e => e.id === selectedId);
    if (!ex) return;
    const curr = draft.days[dayIdx];
    const orderIndex = curr.entries.length;
    const entry = makeEntryFromExercise(ex, orderIndex);
    const days = draft.days.map((d, idx) => {
      if (idx !== dayIdx) return d;
      return { ...d, entries: [...d.entries, entry] };
    });
    updateDraft({ days });
    setSelectedId("");
    // dopo aver aggiunto, focus su Serie della riga appena creata? (lo lasciamo opzionale)
  }

  function updateEntry(i, patch) {
    const days = draft.days.map((d, idx) => {
      if (idx !== dayIdx) return d;
      const next = d.entries.map((en, ii) => ii === i ? { ...en, ...patch } : en);
      return { ...d, entries: next };
    });
    updateDraft({ days });
  }

  function removeEntry(i) {
    const days = draft.days.map((d, idx) => {
      if (idx !== dayIdx) return d;
      const next = d.entries.toSpliced(i, 1).map((en, ii) => ({ ...en, orderIndex: ii }));
      return { ...d, entries: next };
    });
    updateDraft({ days });
  }

  async function handleSave() {
    // fallback: se nome vuoto, salviamo con un default (come richiesto)
    const nameToSave = draft.name?.trim() || "Scheda senza titolo";
    const saved = await saveTemplate({
      id: draft.id,
      name: nameToSave,
      days: draft.days
    });
    if (saved) {
      // risincronizza lista/bozza
      setActiveId(saved.id);
      setDraft(structuredClone(saved));
      alert("Scheda salvata nel cloud ✅");
    } else {
      alert("Errore nel salvataggio.");
    }
  }

  async function handleDelete(id) {
    if (!id) {
      // bozza non salvata
      setDraft(null);
      setActiveId(templates[0]?.id ?? null);
      return;
    }
    const ok = await deleteTemplate(id);
    if (ok) {
      setDraft(null);
      setActiveId(templates[0]?.id ?? null);
    }
  }

  // riepilogo serie per gruppo (live)
  const seriesByGroup = useMemo(() => {
    if (!draft) return {};
    const acc = {};
    for (const d of draft.days) {
      for (const en of d.entries) {
        const g = en.muscleGroup || "Altro";
        const s = Number(en.sets) || 0;
        acc[g] = (acc[g] || 0) + s;
      }
    }
    return acc;
  }, [draft]);

  const seriesTotal = useMemo(
    () => Object.values(seriesByGroup).reduce((s, n) => s + n, 0),
    [seriesByGroup]
  );

  return (
    <div className="app-main">
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", margin:"6px 0 14px"}}>
        <h2 className="font-semibold" style={{fontSize:24, margin:0}}>
          Schede — <span className="font-medium">{user?.name}</span>
        </h2>
        <div className="muted">Costruisci e salva le tue schede nel cloud</div>
      </div>

      <div className="tpl-grid" style={{gridTemplateColumns: "320px 1fr 260px"}}>
        {/* SINISTRA: lista schede */}
        <div className="card">
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8}}>
            <div className="font-semibold">Le mie schede</div>
            <button className="btn btn-primary" onClick={addTemplate}>+ Nuova</button>
          </div>

          <div className="tpl-list">
            {templates.length === 0 && <div className="muted">Nessuna scheda salvata.</div>}
            {templates.map(t => {
              const activeCls = t.id === activeId ? "tpl-item active" : "tpl-item";
              const daysCount = t.days.length;
              const exCount = t.days.reduce((s, d) => s + (d.entries?.length || 0), 0);
              return (
                <div key={t.id} className={activeCls} onClick={() => selectTemplate(t)}>
                  <div className="tpl-title">{t.name || "Scheda senza titolo"}</div>
                  <div className="muted">{daysCount} giorni — {exCount} esercizi</div>
                  <div className="tpl-actions">
                    <button
                      className="btn-ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        const copy = structuredClone(t);
                        copy.id = undefined;
                        copy.name = (t.name || "Scheda") + " (copia)";
                        setActiveId(undefined);
                        setDraft(copy);
                        setDayIdx(0);
                      }}
                    >
                      Duplica
                    </button>
                    <button
                      className="btn-ghost"
                      onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                    >
                      Elimina
                    </button>
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
              {/* Header editor */}
              <div className="grid" style={{gridTemplateColumns:"1.4fr .9fr auto auto auto", gap:8}}>
                <input
                  ref={nameRef}
                  className="input"
                  value={draft.name}
                  onChange={e => updateDraft({ name: capWords(e.target.value) })}
                  placeholder="Nome scheda…"
                />

                <select
                  className="input"
                  value={dayIdx}
                  onChange={e => setDayIdx(Number(e.target.value))}
                >
                  {draft.days.map((d, idx) => (
                    <option key={d.id} value={idx}>
                      {d.name || `Giorno ${idx + 1}`}
                    </option>
                  ))}
                </select>

                <button className="btn" onClick={addDay}>+ Giorno</button>
                <button className="btn" onClick={removeDay}>−</button>
                <button className="btn btn-primary" onClick={handleSave}>💾 Salva su cloud</button>
              </div>

              {/* Rename giorno */}
              <div className="mt-3" style={{display:"flex", gap:8, alignItems:"center"}}>
                <span className="label">Rinomina giorno selezionato:</span>
                <input
                  className="input"
                  value={draft.days[dayIdx]?.name || ""}
                  onChange={e => updateDayName(dayIdx, capWords(e.target.value))}
                  placeholder="Es. Spinta, Tirata, Gambe…"
                />
              </div>

              <hr style={{border:"none", borderTop:"1px dashed #e2e8f0", margin:"12px 0"}}/>

              {/* Barra inserimento */}
              <div className="grid" style={{gridTemplateColumns:"1fr .8fr .8fr 1fr auto", gap:8}}>
                <input
                  className="input"
                  placeholder="Cerca esercizio…"
                  value={q}
                  onChange={e => setQ(e.target.value)}
                />

                <select className="input" value={fGroup} onChange={e => setFGroup(e.target.value)}>
                  <option value="">Tutti i gruppi</option>
                  {groups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>

                <select className="input" value={fEquip} onChange={e => setFEquip(e.target.value)}>
                  <option value="">Tutti gli attrezzi</option>
                  {equips.map(g => <option key={g} value={g}>{g}</option>)}
                </select>

                <select
                  className="input"
                  value={selectedId}
                  onChange={e => setSelectedId(e.target.value)}
                >
                  <option value="">Elenco esercizi</option>
                  {lib.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
                </select>

                <button className="btn btn-primary" onClick={addSelectedExercise} disabled={!selectedId}>
                  Aggiungi
                </button>
              </div>

              {/* Elenco esercizi del giorno (card semplificata) */}
              <ul className="ex-list">
                {draft.days[dayIdx]?.entries?.map((en, i) => (
                  <li key={i} className="card" style={{padding:"10px 10px"}}>
                    {/* Header: nome esercizio */}
                    <div className="chip" style={{marginBottom:8}}>
                      {en.exerciseName || "Esercizio"}
                      {en.muscleGroup ? <span className="chip muted">{en.muscleGroup}</span> : null}
                      {en.equipment ? <span className="chip muted">{en.equipment}</span> : null}
                    </div>

                    {/* Row A: Serie / Reps */}
                    <div className="grid" style={{gridTemplateColumns:"repeat(4, minmax(0, 1fr))", gap:8}}>
                      <div>
                        <div className="label">Serie</div>
                        <input
                          className="input"
                          type="number"
                          value={en.sets ?? 3}
                          onChange={e => updateEntry(i, { sets: Number(e.target.value) || 0 })}
                          placeholder="3"
                          min={0}
                        />
                      </div>
                      <div>
                        <div className="label">Ripetizioni</div>
                        <input
                          className="input"
                          type="number"
                          value={en.reps ?? 10}
                          onChange={e => updateEntry(i, { reps: Number(e.target.value) || 0 })}
                          placeholder="10"
                          min={0}
                        />
                      </div>
                      <div>
                        <div className="label">Kg (opz.)</div>
                        <input
                          className="input"
                          type="number"
                          value={en.weight_kg ?? ""}
                          onChange={e => {
                            const raw = e.target.value;
                            updateEntry(i, { weight_kg: raw === "" ? null : Number(raw) });
                          }}
                          placeholder="es. 20"
                          min={0}
                        />
                      </div>
                      <div>
                        <div className="label">Note (opz.)</div>
                        <input
                          className="input"
                          type="text"
                          value={en.notes ?? ""}
                          onChange={e => updateEntry(i, { notes: e.target.value })}
                          placeholder="Tempi, tecnica, RIR…"
                        />
                      </div>
                    </div>

                    {/* Azioni */}
                    <div style={{display:"flex", justifyContent:"flex-end", marginTop:8}}>
                      <button className="btn" onClick={() => removeEntry(i)}>🗑️</button>
                    </div>
                  </li>
                ))}
                {(!draft.days[dayIdx]?.entries || draft.days[dayIdx].entries.length === 0) && (
                  <div className="muted">Nessun esercizio in questo giorno.</div>
                )}
              </ul>
            </>
          )}
        </div>

        {/* DESTRA: riepilogo serie per gruppo */}
        <div className="card">
          <div className="font-semibold" style={{marginBottom:8}}>Riepilogo serie per gruppo</div>
          {Object.keys(seriesByGroup).length === 0 && <div className="muted">Nessun dato.</div>}
          <div style={{display:"flex", flexDirection:"column", gap:6}}>
            {Object.entries(seriesByGroup)
              .sort((a,b) => a[0].localeCompare(b[0], "it"))
              .map(([group, count]) => (
                <div key={group} style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                  <span>{group}</span>
                  <span className="pill"><strong>{count}</strong> serie</span>
                </div>
              ))}
          </div>
          <hr style={{border:"none", borderTop:"1px dashed #e2e8f0", margin:"12px 0"}}/>
          <div style={{display:"flex", justifyContent:"space-between"}}>
            <span className="font-semibold">Totale serie</span>
            <span className="pill"><strong>{seriesTotal}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
// === END: src/pages/TemplateBuilder.jsx ===