// src/pages/TemplateBuilder.jsx
import { useEffect, useMemo, useState } from "react";
import {
  capWords,
  clone,
  EXERCISE_CATALOG,
  EXERCISE_NAMES,
  EQUIPMENTS,
  MODALITIES,
  MUSCLE_GROUPS,
} from "../utils";

// ——— fallback a localStorage se il parent non passa templates/setTemplates
const LS_KEY = "coachfit-templates";

function useTemplatesBridge(templatesProp, setTemplatesProp) {
  const [local, setLocal] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const templates = templatesProp ?? local;
  const setTemplates = setTemplatesProp ?? ((updater) => {
    const next = typeof updater === "function" ? updater(clone(local)) : updater;
    setLocal(next);
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
  });

  return [templates, setTemplates];
}

export default function TemplateBuilder({ currentUser, templates: templatesProp, setTemplates: setTemplatesProp }) {
  const [templates, setTemplates] = useTemplatesBridge(templatesProp, setTemplatesProp);

  // stato editor
  const [activeId, setActiveId] = useState(null);
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  // filtri libreria
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState("Tutti i gruppi");
  const [filterEquip, setFilterEquip] = useState("Tutti gli attrezzi");
  const [filterMod, setFilterMod] = useState("Tutte le modalità");

  // campi inserimento riga (dropdown + valori)
  const [selExercise, setSelExercise] = useState("");
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState(20);

  // attivo
  const active = useMemo(
    () => templates.find(t => t.id === activeId) ?? null,
    [templates, activeId]
  );

  // crea bozza se non esiste
  useEffect(() => {
    if (!activeId) {
      const t = makeNewTemplate();
      setTemplates(prev => [t, ...prev]);
      setActiveId(t.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // lista giorni dell’attivo
  const days = active?.days ?? [];

  // libreria filtrata per menu a tendina
  const filteredNames = useMemo(() => {
    const q = search.trim().toLowerCase();
    return EXERCISE_CATALOG
      .filter(e => (filterGroup === "Tutti i gruppi" || e.muscle === filterGroup))
      .filter(e => (filterEquip === "Tutti gli attrezzi" || e.equipment === filterEquip))
      .filter(e => (filterMod   === "Tutte le modalità" || e.modality === filterMod))
      .filter(e => (q === "" || e.name.toLowerCase().includes(q)))
      .map(e => e.name);
  }, [search, filterGroup, filterEquip, filterMod]);

  function makeNewTemplate() {
    const id = `tpl_${Date.now()}`;
    return {
      id,
      ownerId: currentUser?.id ?? "user-1",
      name: "Nuova scheda",
      days: [
        { num: 1, exercises: [] },
        { num: 2, exercises: [] },
      ]
    };
  }

  function renameTemplate(val) {
    if (!active) return;
    setTemplates(list => list.map(t => t.id === active.id ? { ...t, name: val } : t));
  }

  function addDay() {
    if (!active) return;
    const next = clone(active);
    const max = Math.max(0, ...next.days.map(d => d.num));
    next.days.push({ num: max + 1, exercises: [] });
    setTemplates(list => list.map(t => t.id === active.id ? next : t));
    setActiveDayIndex(next.days.length - 1);
  }

  function removeDay(index) {
    if (!active) return;
    const next = clone(active);
    next.days.splice(index, 1);
    if (next.days.length === 0) next.days.push({ num: 1, exercises: [] });
    setTemplates(list => list.map(t => t.id === active.id ? next : t));
    setActiveDayIndex(0);
  }

  function dupTemplate(id) {
    const t = templates.find(x => x.id === id);
    if (!t) return;
    const copy = clone(t);
    copy.id = `tpl_${Date.now()}`;
    copy.name = `${t.name} (copia)`;
    setTemplates(prev => [copy, ...prev]);
    setActiveId(copy.id);
  }

  function deleteTemplate(id) {
    setTemplates(prev => prev.filter(t => t.id !== id));
    if (activeId === id) setActiveId(null);
  }

  function addExerciseRow() {
    if (!active) return;
    const day = days[activeDayIndex];
    if (!day) return;
    if (!selExercise) return;

    // prendi metadata dal catalogo per muscle/equipment coerenti
    const meta = EXERCISE_CATALOG.find(e => e.name === selExercise);
    const row = {
      name: capWords(selExercise),
      group: meta?.muscle ?? "",
      equipment: meta?.equipment ?? "",
      sets: Number(sets) || 0,
      reps: Number(reps) || 0,
      weight: Number(weight) || 0,
      note: ""
    };
    const next = clone(active);
    next.days[activeDayIndex].exercises.push(row);
    setTemplates(list => list.map(t => t.id === active.id ? next : t));
  }

  function updateRow(idx, patch) {
    if (!active) return;
    const next = clone(active);
    const row = next.days[activeDayIndex].exercises[idx];
    next.days[activeDayIndex].exercises[idx] = { ...row, ...patch };
    setTemplates(list => list.map(t => t.id === active.id ? next : t));
  }

  function removeRow(idx) {
    if (!active) return;
    const next = clone(active);
    next.days[activeDayIndex].exercises.splice(idx, 1);
    setTemplates(list => list.map(t => t.id === active.id ? next : t));
  }

  // UI
  return (
    <div className="app-main" style={{maxWidth:1100, margin:"0 auto", padding:16}}>
      <h2 className="font-semibold" style={{fontSize:22, margin:"8px 0 16px"}}>
        Builder schede — Utente: {currentUser?.name ?? "Simone"}
      </h2>

      <div className="tpl-grid" style={{display:"grid", gridTemplateColumns:"320px 1fr", gap:12}}>
        {/* Lista schede a sinistra */}
        <div className="card">
          <div className="font-medium" style={{marginBottom:8}}>Le mie schede</div>
          <button className="btn btn-primary" onClick={()=>{
            const t = makeNewTemplate();
            setTemplates(prev => [t, ...prev]);
            setActiveId(t.id);
            setActiveDayIndex(0);
          }}>
            + Nuova scheda
          </button>

          <div className="tpl-list" style={{marginTop:10, display:"flex", flexDirection:"column", gap:8}}>
            {templates.map(t => {
              const isActive = t.id === activeId;
              return (
                <div key={t.id}
                     className={`tpl-item ${isActive ? "active":""}`}
                     onClick={()=>{ setActiveId(t.id); setActiveDayIndex(0); }}
                     style={{
                       border:"1px solid #e2e8f0", borderRadius:12, padding:10, cursor:"pointer",
                       outline: isActive ? "2px solid #c7d2fe" : "none", background: isActive ? "#eef2ff" : "#fff"
                     }}>
                  <div className="tpl-title">{t.name}</div>
                  <div className="muted" style={{fontSize:12, color:"#64748b"}}>
                    {t.days.length} giorni — {t.days.reduce((s,d)=>s+(d.exercises?.length||0),0)} esercizi
                  </div>
                  <div className="tpl-actions" style={{display:"flex", gap:6, marginTop:6}}>
                    <button className="btn-ghost" onClick={(e)=>{e.stopPropagation(); dupTemplate(t.id);}}>Duplica</button>
                    <button className="btn-ghost" onClick={(e)=>{e.stopPropagation(); deleteTemplate(t.id);}}>Elimina</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Editor a destra */}
        <div className="card">
          {!active ? (
            <div>Nessuna scheda selezionata.</div>
          ) : (
            <>
              <div style={{display:"grid", gridTemplateColumns:"1fr 180px", gap:12, alignItems:"center"}}>
                <div>
                  <div className="label">Nome scheda</div>
                  <input className="input" value={active.name} onChange={e=>renameTemplate(e.target.value)} />
                </div>
                <div>
                  <div className="label">Giorno</div>
                  <div style={{display:"flex", gap:8}}>
                    <select className="input"
                            value={activeDayIndex}
                            onChange={e=>setActiveDayIndex(Number(e.target.value))}>
                      {days.map((d,i)=><option key={i} value={i}>Giorno {d.num}</option>)}
                    </select>
                    <button className="btn" onClick={addDay}>+ Giorno</button>
                    <button className="btn" onClick={()=>removeDay(activeDayIndex)}>-</button>
                  </div>
                </div>
              </div>

              {/* Riga editor esercizio (MENU A TENDINA) */}
              <div style={{marginTop:14}}>
                <div className="label">Esercizi — giorno {days[activeDayIndex]?.num}</div>

                {/* filtri e ricerca per popolare il select */}
                <div className="lib-box">
                  <div className="lib-filters" style={{display:"flex", gap:8, flexWrap:"wrap"}}>
                    <input className="input" placeholder="Cerca esercizio…" value={search} onChange={e=>setSearch(e.target.value)} />
                    <select className="input" value={filterGroup} onChange={e=>setFilterGroup(e.target.value)}>
                      <option>Tutti i gruppi</option>
                      {MUSCLE_GROUPS.map(g => <option key={g}>{g}</option>)}
                    </select>
                    <select className="input" value={filterEquip} onChange={e=>setFilterEquip(e.target.value)}>
                      <option>Tutti gli attrezzi</option>
                      {EQUIPMENTS.map(e => <option key={e}>{e}</option>)}
                    </select>
                    <select className="input" value={filterMod} onChange={e=>setFilterMod(e.target.value)}>
                      <option>Tutte le modalità</option>
                      {MODALITIES.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>

                  {/* select esercizio + parametri */}
                  <div style={{display:"grid", gridTemplateColumns:"1.4fr 0.8fr 0.8fr 0.6fr 0.6fr 0.6fr auto", gap:8, marginTop:10}}>
                    <select className="input" value={selExercise} onChange={e=>setSelExercise(e.target.value)}>
                      <option value="">— Seleziona esercizio —</option>
                      {filteredNames.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>

                    {/* mostriamo il gruppo/equip dell’esercizio scelto (non editabili qui) */}
                    <div className="input" style={{opacity:.8}}>
                      {EXERCISE_CATALOG.find(e=>e.name===selExercise)?.muscle ?? "—"}
                    </div>
                    <div className="input" style={{opacity:.8}}>
                      {EXERCISE_CATALOG.find(e=>e.name===selExercise)?.equipment ?? "—"}
                    </div>

                    <input className="input" type="number" min="0" value={sets} onChange={e=>setSets(e.target.value)} placeholder="Serie" />
                    <input className="input" type="number" min="0" value={reps} onChange={e=>setReps(e.target.value)} placeholder="Reps" />
                    <input className="input" type="number" min="0" value={weight} onChange={e=>setWeight(e.target.value)} placeholder="Kg" />
                    <button className="btn btn-primary" onClick={addExerciseRow}>Aggiungi</button>
                  </div>
                </div>
              </div>

              {/* tabella esercizi del giorno */}
              <ul className="ex-list" style={{listStyle:"none", margin:"12px 0 0", padding:0, display:"flex", flexDirection:"column", gap:8}}>
                {days[activeDayIndex]?.exercises?.map((ex, idx)=>(
                  <li key={idx} className="ex-row" style={{
                    display:"grid", gridTemplateColumns:"1.4fr 0.8fr 0.8fr 0.6fr 0.6fr 0.6fr 1fr auto",
                    gap:8, border:"1px solid #e2e8f0", borderRadius:10, padding:8, background:"#fff"
                  }}>
                    <input className="input" value={ex.name}
                      onChange={e=>updateRow(idx,{ name: capWords(e.target.value) })} />
                    <div className="input" style={{opacity:.7}}>{ex.group || "—"}</div>
                    <div className="input" style={{opacity:.7}}>{ex.equipment || "—"}</div>
                    <input className="input" type="number" min="0" value={ex.sets} onChange={e=>updateRow(idx,{sets:Number(e.target.value)||0})}/>
                    <input className="input" type="number" min="0" value={ex.reps} onChange={e=>updateRow(idx,{reps:Number(e.target.value)||0})}/>
                    <input className="input" type="number" min="0" value={ex.weight} onChange={e=>updateRow(idx,{weight:Number(e.target.value)||0})}/>
                    <input className="input" placeholder="Note (opzionale)" value={ex.note||""} onChange={e=>updateRow(idx,{note:e.target.value})}/>
                    <button className="btn" onClick={()=>removeRow(idx)}>🗑</button>
                  </li>
                ))}
                {(!days[activeDayIndex] || days[activeDayIndex].exercises.length===0) && (
                  <div className="muted" style={{marginTop:8}}>Nessun esercizio in questo giorno.</div>
                )}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}