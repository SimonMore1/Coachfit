import { useState } from "react";
import {
  EXERCISE_CATALOG, EXERCISE_NAMES,
  EQUIPMENTS, MODALITIES,
  capWords, detectGroup, clone
} from "../utils";

export default function TemplateBuilder({
  currentUser,
  templates,
  setTemplates,
  setActivePlanForUser
}) {
  const [tplId, setTplId] = useState(null);
  const [tplName, setTplName] = useState("");
  const [draftDays, setDraftDays] = useState([]);
  const [selectedDay, setSelectedDay] = useState(1);

  // input esercizio
  const [exName, setExName] = useState("");
  const [exSets, setExSets] = useState(3);
  const [exReps, setExReps] = useState(10);
  const [exWeight, setExWeight] = useState(20);

  // filtri catalogo
  const [search, setSearch] = useState("");
  const [equip, setEquip] = useState("");
  const [mod, setMod] = useState("");

  // espansione lista schede
  const [expanded, setExpanded] = useState({}); // {id: true/false}

  const addDay = () => {
    const idx = draftDays.length + 1;
    setDraftDays([...draftDays, { index: idx, title: `Giorno ${idx}`, exercises: [] }]);
    setSelectedDay(idx);
  };
  const removeDay = (idx) => {
    const next = draftDays
      .filter(d=>d.index!==idx)
      .map((d,i)=>({...d,index:i+1,title:`Giorno ${i+1}`}));
    setDraftDays(next);
    setSelectedDay(next.length?1:0);
  };

  const addExercise = () => {
    const name = capWords(exName.trim());
    if (!name) return;
    if (!draftDays.length) addDay();

    const days = clone(draftDays);
    const d = days.find(x=>x.index===selectedDay);
    if (!d) return;

    d.exercises.push({
      name,
      targetSets: Math.max(1, Number(exSets) || 1),
      targetReps: Math.max(1, Number(exReps) || 1),
      targetWeight: Math.max(0, Number(exWeight) || 0),
      muscleGroup: detectGroup(name),
    });
    setDraftDays(days);
    setExName("");
  };

  const removeExercise = (dayIndex, i) => {
    const days = clone(draftDays);
    const d = days.find(x=>x.index===dayIndex);
    if (!d) return;
    d.exercises.splice(i,1);
    setDraftDays(days);
  };

  const saveTemplate = () => {
    if (!tplName.trim() || draftDays.length===0) return;
    if (tplId) {
      setTemplates(templates.map(t =>
        t.id===tplId ? {...t, name: capWords(tplName), days:draftDays} : t
      ));
    } else {
      const id = "plan_"+Date.now();
      setTemplates([{ id, ownerId: currentUser.id, name: capWords(tplName), days: draftDays }, ...templates]);
    }
    clearDraft();
  };

  const editTemplate = (t) => {
    setTplId(t.id);
    setTplName(t.name);
    setDraftDays(clone(t.days));
    setSelectedDay(t.days?.[0]?.index || 1);
  };

  const deleteTemplate = (id) => setTemplates(templates.filter(t=>t.id!==id));

  const clearDraft = () => {
    setTplId(null); setTplName(""); setDraftDays([]); setSelectedDay(1);
    setExName(""); setExSets(3); setExReps(10); setExWeight(20);
  };

  // Filtro catalogo
  const filteredCatalog = EXERCISE_CATALOG.filter(e=>{
    if (equip && e.equipment!==equip) return false;
    if (mod && e.modality!==mod) return false;
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="grid grid-2">
      {/* EDITOR */}
      <div className="card">
        <h2>{tplId ? "Modifica scheda" : "Crea nuova scheda"}</h2>

        <div className="row" style={{marginTop:8}}>
          <input className="input" style={{minWidth:240}} placeholder="Nome scheda"
            value={tplName} onChange={e=>setTplName(e.target.value)} />
          <button className="btn btn-primary" onClick={addDay}>+ Giorno</button>
          {draftDays.length>0 && (
            <>
              <span className="muted" style={{fontSize:13}}>Giorno attivo</span>
              <select className="input" value={selectedDay} onChange={e=>setSelectedDay(Number(e.target.value))}>
                {draftDays.map(d=><option key={d.index} value={d.index}>{d.title}</option>)}
              </select>
              <button className="btn btn-danger" onClick={()=>removeDay(selectedDay)}>Elimina giorno</button>
            </>
          )}
        </div>

        {/* Filtri catalogo */}
        <div className="row" style={{marginTop:10}}>
          <input className="input" placeholder="Cerca esercizio"
                 value={search} onChange={e=>setSearch(e.target.value)} />
          <select className="input" value={equip} onChange={e=>setEquip(e.target.value)}>
            <option value="">Attrezzo (tutti)</option>
            {EQUIPMENTS.map(x=><option key={x} value={x}>{x}</option>)}
          </select>
          <select className="input" value={mod} onChange={e=>setMod(e.target.value)}>
            <option value="">Modalità (tutte)</option>
            {MODALITIES.map(x=><option key={x} value={x}>{x}</option>)}
          </select>
        </div>

        {/* Aggiunta esercizio */}
        {draftDays.length>0 && (
          <>
            <div className="row" style={{marginTop:10}}>
              <input list="catalog" className="input" style={{minWidth:220}}
                     placeholder="Esercizio"
                     value={exName} onChange={e=>setExName(e.target.value)} />
              <datalist id="catalog">
                {filteredCatalog.map((e,i)=><option key={i} value={e.name} />)}
              </datalist>

              <span className="muted" style={{fontSize:13}}>Serie</span>
              <input type="number" className="input" style={{width:70}}
                     value={exSets} onChange={e=>setExSets(e.target.value)} />

              <span className="muted" style={{fontSize:13}}>Reps</span>
              <input type="number" className="input" style={{width:70}}
                     value={exReps} onChange={e=>setExReps(e.target.value)} />

              <span className="muted" style={{fontSize:13}}>Kg</span>
              <input type="number" className="input" style={{width:90}}
                     value={exWeight} onChange={e=>setExWeight(e.target.value)} />

              <button className="btn" onClick={addExercise}>Aggiungi</button>
            </div>

            {/* giorni + esercizi */}
            <div style={{marginTop:10}}>
              {draftDays.map(d=>(
                <div key={d.index} style={{border:"1px solid #e5e7eb",borderRadius:12,padding:12,marginTop:10}}>
                  <div className="row" style={{justifyContent:"space-between"}}>
                    <div style={{fontWeight:600}}>{d.title}</div>
                    <button className="link" onClick={()=>setSelectedDay(d.index)}>Seleziona</button>
                  </div>
                  {d.exercises.length===0 ? (
                    <div className="muted" style={{fontSize:14}}>Nessun esercizio.</div>
                  ) : (
                    <ul style={{margin:0,paddingLeft:0,listStyle:"none"}}>
                      {d.exercises.map((e,i)=>(
                        <li key={i} style={{border:"1px solid #e5e7eb",borderRadius:10,padding:10,marginTop:6}}>
                          <div className="row" style={{alignItems:"baseline"}}>
                            <div style={{minWidth:220,fontWeight:600}}>{e.name}</div>
                            <div className="pill">{e.muscleGroup}</div>
                          </div>
                          <div className="muted" style={{fontSize:13, marginTop:6}}>
                            <b>{e.targetSets}×{e.targetReps}</b>
                          </div>
                          <div style={{marginTop:4}}>
                            Kg: <b>{e.targetWeight}</b>
                          </div>
                          <div className="row" style={{marginTop:6}}>
                            <button className="btn btn-danger" onClick={()=>removeExercise(d.index,i)}>🗑 Rimuovi</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            <div className="space" />
            <div className="row">
              <button className="btn" onClick={clearDraft}>Pulisci</button>
              <button className="btn btn-primary" onClick={saveTemplate}>
                {tplId ? "Salva modifiche" : "Salva scheda"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* LISTA SCHEDE */}
      <div className="card">
        <h2>Le mie schede</h2>

        {templates.filter(t=>t.ownerId===currentUser.id).length===0 ? (
          <div className="muted" style={{marginTop:6}}>Nessuna scheda salvata.</div>
        ) : (
          <ul style={{marginTop:8,paddingLeft:0,listStyle:"none"}}>
            {templates
              .filter(t=>t.ownerId===currentUser.id)
              .map(t=>(
                <li key={t.id} style={{border:"1px solid #e5e7eb",borderRadius:12,padding:10,marginBottom:8}}>
                  <div className="row" style={{justifyContent:"space-between"}}>
                    <div>
                      <div style={{fontWeight:600}}>{t.name}</div>
                      <div className="muted" style={{fontSize:13}}>{t.days.length} giorni</div>
                    </div>
                    <div className="row">
                      <button className="btn" onClick={()=>setExpanded({...expanded,[t.id]:!expanded[t.id]})}>
                        {expanded[t.id] ? "Nascondi ⌃" : "Visualizza ⌄"}
                      </button>
                      <button className="btn" onClick={()=>setActivePlanForUser(currentUser.id, t.id)}>
                        Rendi attiva (per me)
                      </button>
                      <button className="btn" onClick={()=>editTemplate(t)}>Modifica</button>
                      <button className="btn btn-danger" onClick={()=>deleteTemplate(t.id)}>Elimina</button>
                    </div>
                  </div>

                  {expanded[t.id] && (
                    <div style={{marginTop:8}}>
                      {t.days.map(d=>(
                        <div key={d.index} style={{border:"1px solid #e5e7eb",borderRadius:10,padding:8,marginTop:6}}>
                          <div style={{fontWeight:600,marginBottom:6}}>Giorno {d.index}</div>
                          <ul style={{margin:0,paddingLeft:0,listStyle:"none"}}>
                            {d.exercises.map((e,i)=>(
                              <li key={i} style={{borderTop:i? "1px solid #f1f5f9":"none", paddingTop:i?8:0, marginTop:i?8:0}}>
                                <div style={{fontWeight:500}}>{e.name}</div>
                                <div className="muted" style={{fontSize:13}}><b>{e.targetSets}×{e.targetReps}</b></div>
                                <div>Kg: <b>{e.targetWeight}</b></div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}