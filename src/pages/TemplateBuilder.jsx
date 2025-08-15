import { useEffect, useMemo, useState } from "react";
import { EXERCISE_CATALOG, MUSCLE_GROUPS, capWords } from "../utils";

/* ----------------- helpers ----------------- */
const LS_KEY = "coachfit-v1.templates";

function readLS(){
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
  catch { return []; }
}
function writeLS(templates){
  localStorage.setItem(LS_KEY, JSON.stringify(templates));
}
function newTemplate(){
  return {
    id: crypto.randomUUID(),
    name: "Nuova scheda",
    days: [
      { id: crypto.randomUUID(), name: "Giorno 1", exercises: [] },
      { id: crypto.randomUUID(), name: "Giorno 2", exercises: [] },
    ],
  };
}
function newExerciseFrom(e){
  return {
    id: crypto.randomUUID(),
    name: e?.name || "",
    group: e?.muscle || "",
    equipment: e?.equipment || "",
    sets: 3,
    reps: 10,
    kg: 20,
    note: "",
  };
}

/* ----------------- component ----------------- */
export default function TemplateBuilder(){
  // carico eventuali schede salvate; se è vuoto, NON creo nulla
  const [templates, setTemplates] = useState(()=> readLS());
  const [activeId, setActiveId]   = useState(()=> templates[0]?.id || null);
  const active = useMemo(
    ()=> templates.find(t => t.id===activeId) || null,
    [templates, activeId]
  );

  // persistenza
  useEffect(()=>{ writeLS(templates); }, [templates]);

  // filtri libreria
  const [q, setQ] = useState("");
  const [fGroup, setFGroup] = useState("");
  const [fEquip, setFEquip] = useState("");
  const [fMode,  setFMode]  = useState("");

  const groups   = MUSCLE_GROUPS;
  const equips   = useMemo(()=> [...new Set(EXERCISE_CATALOG.map(e=>e.equipment))], []);
  const modalities = useMemo(()=> [...new Set(EXERCISE_CATALOG.map(e=>e.modality))], []);

  const filteredLib = useMemo(()=>{
    return EXERCISE_CATALOG.filter(e=>{
      if (q && !e.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (fGroup && e.muscle!==fGroup) return false;
      if (fEquip && e.equipment!==fEquip) return false;
      if (fMode  && e.modality!==fMode) return false;
      return true;
    });
  }, [q,fGroup,fEquip,fMode]);

  // giorno attivo nell’editor
  const [dayIdx, setDayIdx] = useState(0);

  /* ---- azioni lista ---- */
  function addTemplate(){
    const t = newTemplate();
    const next = [t, ...templates];
    setTemplates(next);
    setActiveId(t.id);
    setDayIdx(0);
  }
  function dupTemplate(id){
    const orig = templates.find(t=>t.id===id);
    if (!orig) return;
    const copy = {
      ...structuredClone(orig),
      id: crypto.randomUUID(),
      name: orig.name + " (copia)"
    };
    setTemplates([copy, ...templates]);
    setActiveId(copy.id);
  }
  function delTemplate(id){
    const next = templates.filter(t=>t.id!==id);
    setTemplates(next);
    if (activeId===id) setActiveId(next[0]?.id || null);
  }

  /* ---- editor ---- */
  function updateActive(patch){
    if (!active) return;
    const next = templates.map(t => t.id===active.id ? {...active, ...patch} : t);
    setTemplates(next);
  }
  function updateDayName(i, name){
    if (!active) return;
    const days = active.days.map((d,idx)=> idx===i ? {...d, name} : d);
    updateActive({ days });
  }
  function addDay(){
    if (!active) return;
    const days = [...active.days, { id: crypto.randomUUID(), name:`Giorno ${active.days.length+1}`, exercises: [] }];
    updateActive({ days });
    setDayIdx(days.length-1);
  }
  function removeDay(){
    if (!active) return;
    if (active.days.length<=1) return;
    const days = active.days.toSpliced(dayIdx,1);
    updateActive({ days });
    setDayIdx(Math.max(0, dayIdx-1));
  }

  function addExerciseFromCatalog(item){
    if (!active) return;
    const days = active.days.map((d,idx)=>{
      if (idx!==dayIdx) return d;
      return { ...d, exercises: [...d.exercises, newExerciseFrom(item)] };
    });
    updateActive({ days });
  }
  function updateExercise(i, patch){
    if (!active) return;
    const days = active.days.map((d,idx)=>{
      if (idx!==dayIdx) return d;
      const exs = d.exercises.map((ex,ii)=> ii===i ? {...ex, ...patch} : ex);
      return { ...d, exercises: exs };
    });
    updateActive({ days });
  }
  function removeExercise(i){
    if (!active) return;
    const days = active.days.map((d,idx)=>{
      if (idx!==dayIdx) return d;
      const exs = d.exercises.toSpliced(i,1);
      return { ...d, exercises: exs };
    });
    updateActive({ days });
  }

  return (
    <div className="app-main">
      <h2 className="font-semibold" style={{fontSize:28, margin:"10px 0 14px"}}>
        Builder schede — Utente: <span className="font-medium">Simone</span>
      </h2>

      <div className="tpl-grid">
        {/* --------- colonna sinistra: lista --------- */}
        <div className="card">
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8}}>
            <div className="font-semibold">Le mie schede</div>
            <button className="btn btn-primary" onClick={addTemplate}>+ Nuova scheda</button>
          </div>

          <div className="tpl-list">
            {templates.length===0 && (
              <div className="muted">Nessuna scheda salvata.</div>
            )}

            {templates.map(t=>{
              const daysCount = t.days.length;
              const exCount   = t.days.reduce((s,d)=> s + d.exercises.length, 0);
              const activeCls = t.id===activeId ? "tpl-item active" : "tpl-item";
              return (
                <div key={t.id} className={activeCls} onClick={()=>{ setActiveId(t.id); setDayIdx(0); }}>
                  <div className="tpl-title">{t.name}</div>
                  <div className="muted">{daysCount} giorni — {exCount} esercizi</div>
                  <div className="tpl-actions">
                    <button className="btn-ghost" onClick={(e)=>{e.stopPropagation(); dupTemplate(t.id);}}>Duplica</button>
                    <button className="btn-ghost" onClick={(e)=>{e.stopPropagation(); delTemplate(t.id);}}>Elimina</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* --------- colonna destra: editor --------- */}
        <div className="card">
          {!active ? (
            <div className="muted">Seleziona o crea una scheda per modificarla.</div>
          ) : (
            <>
              <div className="grid" style={{gridTemplateColumns:"1.2fr .8fr auto auto", gap:8}}>
                <input className="input" value={active.name}
                  onChange={e=>updateActive({name:capWords(e.target.value)})}
                  placeholder="Nome scheda" />

                <select className="input" value={dayIdx}
                  onChange={e=>setDayIdx(Number(e.target.value))}>
                  {active.days.map((d,idx)=><option key={d.id} value={idx}>{d.name}</option>)}
                </select>

                <button className="btn" onClick={addDay}>+ Giorno</button>
                <button className="btn" onClick={removeDay}>−</button>
              </div>

              <hr style={{border:"none", borderTop:"1px dashed #e2e8f0", margin:"12px 0"}}/>

              <div className="label">Esercizi — {active.days[dayIdx]?.name?.toLowerCase()}</div>

              {/* riga inserimento */}
              <InsertRow
                groups={groups} equips={equips} modalities={modalities}
                onAdd={(ex)=> addExerciseFromCatalog(ex)}
                filteredLib={filteredLib} q={q} setQ={setQ}
                fGroup={fGroup} setFGroup={setFGroup}
                fEquip={fEquip} setFEquip={setFEquip}
                fMode={fMode} setFMode={setFMode}
              />

              {/* elenco esercizi del giorno */}
              <ul className="ex-list">
                {active.days[dayIdx]?.exercises?.map((ex, i)=>(
                  <li key={ex.id} className="ex-row">
                    <input className="input" value={ex.name}
                      onChange={e=>updateExercise(i,{name:capWords(e.target.value)})}
                      placeholder="Seleziona / scrivi nome"/>

                    <select className="input" value={ex.group}
                      onChange={e=>updateExercise(i,{group:e.target.value})}>
                      <option value="">Gruppo</option>
                      {groups.map(g=><option key={g} value={g}>{g}</option>)}
                    </select>

                    <select className="input" value={ex.equipment}
                      onChange={e=>updateExercise(i,{equipment:e.target.value})}>
                      <option value="">Attrezzo</option>
                      {equips.map(g=><option key={g} value={g}>{g}</option>)}
                    </select>

                    <input className="input" type="number" value={ex.sets}
                      onChange={e=>updateExercise(i,{sets:Number(e.target.value)})}
                      placeholder="Serie"/>

                    <input className="input" type="number" value={ex.reps}
                      onChange={e=>updateExercise(i,{reps:Number(e.target.value)})}
                      placeholder="Reps"/>

                    <input className="input" type="number" value={ex.kg}
                      onChange={e=>updateExercise(i,{kg:Number(e.target.value)})}
                      placeholder="Kg"/>

                    <input className="input" value={ex.note}
                      onChange={e=>updateExercise(i,{note:e.target.value})}
                      placeholder="Note (opzionale)"/>

                    <button className="btn" onClick={()=>removeExercise(i)}>🗑️</button>
                  </li>
                ))}
                {active.days[dayIdx]?.exercises?.length===0 && (
                  <div className="muted">Nessun esercizio in questo giorno.</div>
                )}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------- componente riga di inserimento + libreria ------- */
function InsertRow({
  groups, equips, modalities,
  onAdd, filteredLib,
  q,setQ, fGroup,setFGroup, fEquip,setFEquip, fMode,setFMode
}){
  const [sel, setSel] = useState(null);

  return (
    <>
      <div className="grid" style={{gridTemplateColumns:"1.2fr .8fr .8fr .8fr .6fr .6fr .6fr 1fr", gap:8}}>
        <input className="input" placeholder="Cerca esercizio…" value={q} onChange={e=>setQ(e.target.value)} />

        <select className="input" value={fGroup} onChange={e=>setFGroup(e.target.value)}>
          <option value="">Tutti i gruppi</option>
          {groups.map(g=><option key={g} value={g}>{g}</option>)}
        </select>

        <select className="input" value={fEquip} onChange={e=>setFEquip(e.target.value)}>
          <option value="">Tutti gli attrezzi</option>
          {equips.map(g=><option key={g} value={g}>{g}</option>)}
        </select>

        <select className="input" value={fMode} onChange={e=>setFMode(e.target.value)}>
          <option value="">Tutte le modalità</option>
          {modalities.map(g=><option key={g} value={g}>{g}</option>)}
        </select>

        <div className="input" style={{display:"flex", alignItems:"center", gap:6}}>
          <span>Seleziona</span>
        </div>
        <div className="input">—</div>
        <div className="input">—</div>

        <button
          className="btn btn-primary"
          onClick={()=> sel && onAdd(sel)}
          disabled={!sel}
        >
          Aggiungi
        </button>
      </div>

      <div className="lib-box">
        <div className="lib-list">
          {filteredLib.map(item=>(
            <button
              key={item.name}
              className={"chip selectable " + (sel?.name===item.name ? "active" : "")}
              onClick={()=> setSel(item)}
              title={`${item.muscle} · ${item.equipment}`}
            >
              {item.name}
              <span className="chip muted" style={{marginLeft:6}}>{item.muscle}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}