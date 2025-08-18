// === START: src/pages/TemplateBuilder.jsx ===
import { useMemo, useState } from "react";
import { EXERCISE_CATALOG, MUSCLE_GROUPS, capWords } from "../utils";

function newTemplate(){
  return {
    id: undefined,
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
    sets: 3, reps: 10, kg: 20, note: ""
  };
}

export default function TemplateBuilder({ user, templates, saveTemplate, deleteTemplate }){
  const [activeId, setActiveId] = useState(templates[0]?.id || null);
  const active = useMemo(()=> templates.find(t=>t.id===activeId) || null, [templates, activeId]);

  const [draft, setDraft] = useState(active || null);
  const [dayIdx, setDayIdx] = useState(0);

  // filtri libreria (per input e select)
  const [q, setQ] = useState("");
  const [fGroup, setFGroup] = useState("");
  const [fEquip, setFEquip] = useState("");
  const [fMode,  setFMode]  = useState("");

  const groups     = MUSCLE_GROUPS;
  const equips     = useMemo(()=> [...new Set(EXERCISE_CATALOG.map(e=>e.equipment))], []);
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

  function selectTemplate(t){
    setActiveId(t?.id ?? null);
    setDraft(structuredClone(t));
    setDayIdx(0);
  }
  function addTemplate(){
    const t = newTemplate();
    setActiveId(undefined);
    setDraft(t);
    setDayIdx(0);
  }
  function updateDraft(patch){ setDraft(prev => ({...prev, ...patch})); }
  function updateDayName(i, name){
    const days = draft.days.map((d,idx)=> idx===i ? {...d, name} : d);
    updateDraft({ days });
  }
  function addDay(){
    const days = [...draft.days, { id: crypto.randomUUID(), name:`Giorno ${draft.days.length+1}`, exercises: [] }];
    updateDraft({ days });
    setDayIdx(days.length-1);
  }
  function removeDay(){
    if (draft.days.length<=1) return;
    const days = draft.days.toSpliced(dayIdx,1);
    updateDraft({ days });
    setDayIdx(Math.max(0, dayIdx-1));
  }
  function addExerciseFromCatalog(item){
    const days = draft.days.map((d,idx)=>{
      if (idx!==dayIdx) return d;
      return { ...d, exercises: [...d.exercises, newExerciseFrom(item)] };
    });
    updateDraft({ days });
  }
  function updateExercise(i, patch){
    const days = draft.days.map((d,idx)=>{
      if (idx!==dayIdx) return d;
      const exs = d.exercises.map((ex,ii)=> ii===i ? {...ex, ...patch} : ex);
      return { ...d, exercises: exs };
    });
    updateDraft({ days });
  }
  function removeExercise(i){
    const days = draft.days.map((d,idx)=>{
      if (idx!==dayIdx) return d;
      const exs = d.exercises.toSpliced(i,1);
      return { ...d, exercises: exs };
    });
    updateDraft({ days });
  }

  async function handleSave(){
    const saved = await saveTemplate({
      id: draft.id,
      name: draft.name,
      days: draft.days
    });
    const after = saved || draft;
    selectTemplate(after);
  }

  async function handleDelete(id){
    await deleteTemplate(id);
    setDraft(null);
    setActiveId(templates[0]?.id || null);
  }

  return (
    <div className="page-schede">
      <h2 className="font-semibold" style={{fontSize:28, margin:"10px 0 14px"}}>
        Builder schede — Utente: <span className="font-medium">{user?.name}</span>
      </h2>

      <div className="tpl-grid">
        {/* SINISTRA: lista schede */}
        <div className="card">
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8}}>
            <div className="font-semibold">Le mie schede</div>
            <button className="btn btn-primary" onClick={addTemplate}>+ Nuova scheda</button>
          </div>

          <div className="tpl-list">
            {templates.length===0 && (<div className="muted">Nessuna scheda salvata.</div>)}
            {templates.map(t=>{
              const daysCount = t.days.length;
              const exCount   = t.days.reduce((s,d)=> s + d.exercises.length, 0);
              const activeCls = t.id===activeId ? "tpl-item active" : "tpl-item";
              return (
                <div key={t.id} className={activeCls} onClick={()=>selectTemplate(t)}>
                  <div className="tpl-title">{t.name}</div>
                  <div className="muted">{daysCount} giorni — {exCount} esercizi</div>
                  <div className="tpl-actions">
                    <button className="btn-ghost" onClick={(e)=>{e.stopPropagation(); selectTemplate({...t, id: undefined, name: t.name+" (copia)"});}}>Duplica</button>
                    <button className="btn-ghost" onClick={(e)=>{e.stopPropagation(); handleDelete(t.id);}}>Elimina</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* DESTRA: editor */}
        <div className="card">
          {!draft ? (
            <div className="muted">Seleziona o crea una scheda per modificarla.</div>
          ) : (
            <>
              <div className="grid" style={{gridTemplateColumns:"1.2fr .8fr auto auto auto", gap:8}}>
                <input className="input" value={draft.name}
                  onChange={e=>updateDraft({name:capWords(e.target.value)})}
                  placeholder="Nome scheda" />

                <select className="input" value={dayIdx}
                  onChange={e=>setDayIdx(Number(e.target.value))}>
                  {draft.days.map((d,idx)=><option key={d.id} value={idx}>{d.name}</option>)}
                </select>

                <button className="btn" onClick={addDay}>+ Giorno</button>
                <button className="btn" onClick={removeDay}>−</button>
                <button className="btn btn-primary" onClick={handleSave}>💾 Salva su cloud</button>
              </div>

              <hr style={{border:"none", borderTop:"1px dashed #e2e8f0", margin:"12px 0"}}/>

              <div className="label">Esercizi — {draft.days[dayIdx]?.name?.toLowerCase()}</div>

              <InsertRow
                groups={groups} equips={equips} modalities={modalities}
                onAdd={(ex)=> addExerciseFromCatalog(ex)}
                filteredLib={filteredLib} q={q} setQ={setQ}
                fGroup={fGroup} setFGroup={setFGroup}
                fEquip={fEquip} setFEquip={setFEquip}
                fMode={fMode} setFMode={setFMode}
              />

              <ul className="ex-list">
                {draft.days[dayIdx]?.exercises?.map((ex, i)=>(
                  <li key={ex.id} className="ex-row">
                    <input className="input" value={ex.name}
                      onChange={e=>updateExercise(i,{name:capWords(e.target.value)})}
                      placeholder="Nome esercizio"/>

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
                {draft.days[dayIdx]?.exercises?.length===0 && (
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

        <button className="btn btn-primary" onClick={()=> sel && onAdd(sel)} disabled={!sel}>
          Aggiungi
        </button>
      </div>

      {/* Libreria “selezionabile” come elenco a scorrimento verticale */}
      <div className="lib-box">
        <div className="lib-list-vertical">
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
// === END: src/pages/TemplateBuilder.jsx ===