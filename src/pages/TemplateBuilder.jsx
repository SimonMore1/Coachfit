// === START: src/pages/TemplateBuilder.jsx ===
import { useEffect, useMemo, useRef, useState } from "react";
import { EXERCISE_CATALOG, MUSCLE_GROUPS, capWords } from "../utils";

// ---------- helpers ----------
function newTemplate(){
  return {
    id: undefined,
    // 👇 campo vuoto (niente “Nuova scheda”)
    name: "",
    days: [
      { id: crypto.randomUUID(), name: "Giorno 1", exercises: [] },
      { id: crypto.randomUUID(), name: "Giorno 2", exercises: [] },
    ],
  };
}

// crea un esercizio “scheda” a partire da un record di catalogo
function newExerciseFrom(e, orderIndex = 0){
  return {
    id: crypto.randomUUID(),

    // VISIBILI
    name: e?.name || "",
    sets: 3,
    reps: 10,
    kg: null,           // opzionale
    note: "",           // opzionale

    // NASCOSTI (ma salvati)
    group: e?.muscle || "",
    equipment: e?.equipment || "",

    // ordinamento
    orderIndex,
  };
}

// debounce minimale senza librerie
function useDebouncedValue(value, delay = 200){
  const [debounced, setDebounced] = useState(value);
  useEffect(()=>{
    const t = setTimeout(()=> setDebounced(value), delay);
    return ()=> clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ---------- page ----------
export default function TemplateBuilder({ user, templates, saveTemplate, deleteTemplate }){
  const [activeId, setActiveId] = useState(templates[0]?.id || null);
  const active = useMemo(()=> templates.find(t=>t.id===activeId) || null, [templates, activeId]);

  const [draft, setDraft] = useState(active || null);
  const [dayIdx, setDayIdx] = useState(0);

  // ref per focus automatico sul campo nome scheda
  const nameRef = useRef(null);

  // --- FILTRI: q, gruppo, attrezzo ---
  const [q, setQ] = useState("");
  const qDeb = useDebouncedValue(q, 200);
  const [fGroup, setFGroup] = useState("");
  const [fEquip, setFEquip] = useState("");

  const groups = MUSCLE_GROUPS;
  const equips = useMemo(()=> [...new Set(EXERCISE_CATALOG.map(e=>e.equipment))], []);

  // lista filtrata (ricerca + filtri)
  const filteredLib = useMemo(()=>{
    return EXERCISE_CATALOG.filter(e=>{
      if (qDeb && !e.name.toLowerCase().includes(qDeb.toLowerCase())) return false;
      if (fGroup && e.muscle !== fGroup) return false;
      if (fEquip && e.equipment !== fEquip) return false;
      return true;
    });
  }, [qDeb, fGroup, fEquip]);

  // focus automatico su "Serie" quando aggiungo un esercizio
  const [lastAddedId, setLastAddedId] = useState(null);
  const setRefs = useRef(new Map());
  useEffect(()=>{
    if (!lastAddedId) return;
    const el = setRefs.current.get(lastAddedId);
    if (el) { el.focus(); }
    setLastAddedId(null);
  }, [lastAddedId]);

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
    // 👇 focus automatico sul campo nome
    setTimeout(()=> nameRef.current?.focus(), 0);
  }

  function updateDraft(patch){ setDraft(prev => ({...prev, ...patch})); }

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
      const ex = newExerciseFrom(item, d.exercises.length);
      const next = { ...d, exercises: [...d.exercises, ex] };
      setLastAddedId(ex.id);
      return next;
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
      const ex = d.exercises[i];
      if (!ex) return d;
      const ok = window.confirm?.(`Rimuovere "${ex.name}"?`) ?? true;
      if (!ok) return d;
      const exs = d.exercises.toSpliced(i,1);
      exs.forEach((e, k)=> e.orderIndex = k);
      return { ...d, exercises: exs };
    });
    updateDraft({ days });
  }

  async function handleSave(){
    // 👇 se il nome è vuoto, usiamo un fallback prima di salvare
    const nameToPersist = draft.name?.trim() || "Scheda senza titolo";
    const saved = await saveTemplate({
      id: draft.id,
      name: nameToPersist,
      days: draft.days
    });
    const after = saved || { ...draft, name: nameToPersist };
    selectTemplate(after);
  }

  async function handleDeleteTemplate(id){
    await deleteTemplate(id);
    setDraft(null);
    setActiveId(templates[0]?.id || null);
  }

  return (
    <div className="app-main">
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
                    <button
                      className="btn-ghost"
                      onClick={(e)=>{e.stopPropagation(); selectTemplate({...t, id: undefined, name: ""}); setTimeout(()=>nameRef.current?.focus(),0);}}
                    >
                      Duplica
                    </button>
                    <button
                      className="btn-ghost"
                      onClick={(e)=>{e.stopPropagation(); handleDeleteTemplate(t.id);}}
                    >
                      Elimina
                    </button>
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
              {/* Barra superiore: nome scheda + switch giorno + azioni */}
              <div className="grid" style={{gridTemplateColumns:"1.2fr .8fr auto auto auto", gap:8}}>
                <input
                  ref={nameRef}
                  className="input"
                  value={draft.name}
                  onChange={e=>updateDraft({name:e.target.value})}
                  placeholder="Nome scheda…"
                />

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

              {/* Inserimento + Filtri + Select */}
              <InsertRow
                groups={groups}
                equips={equips}
                onAdd={(ex)=> addExerciseFromCatalog(ex)}
                filteredLib={filteredLib}
                q={q} setQ={setQ}
                fGroup={fGroup} setFGroup={setFGroup}
                fEquip={fEquip} setFEquip={setFEquip}
              />

              {/* Elenco esercizi del giorno */}
              <ul className="ex-list">
                {draft.days[dayIdx]?.exercises?.map((ex, i)=>(
                  <li
                    key={ex.id}
                    className="card"
                    style={{padding:"10px", display:"flex", flexDirection:"column", gap:8}}
                  >
                    {/* Header: nome + cestino */}
                    <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                      <div className="chip" title={`${ex.group} · ${ex.equipment}`}>{ex.name}</div>
                      <button className="btn" onClick={()=>removeExercise(i)} aria-label="Rimuovi">🗑️</button>
                    </div>

                    {/* Riga A: Serie / Reps */}
                    <div className="grid" style={{gridTemplateColumns:"1fr 1fr", gap:8}}>
                      <input
                        ref={node=>{
                          if (node) setRefs.current.set(ex.id, node);
                          else setRefs.current.delete(ex.id);
                        }}
                        className="input"
                        type="number"
                        min={1}
                        value={ex.sets ?? 3}
                        onChange={e=>updateExercise(i,{sets:Number(e.target.value) || 0})}
                        placeholder="Serie"
                      />
                      <input
                        className="input"
                        type="number"
                        min={1}
                        value={ex.reps ?? 10}
                        onChange={e=>updateExercise(i,{reps:Number(e.target.value) || 0})}
                        placeholder="Ripetizioni"
                      />
                    </div>

                    {/* Riga B: Kg (opz) / Note (opz) */}
                    <div className="grid" style={{gridTemplateColumns:"1fr 3fr", gap:8}}>
                      <input
                        className="input"
                        type="number"
                        value={ex.kg ?? ""}
                        onChange={e=>{
                          const v = e.target.value;
                          updateExercise(i,{kg: v==="" ? null : Number(v)});
                        }}
                        placeholder="Kg (opzionale)"
                      />
                      <input
                        className="input"
                        value={ex.note ?? ""}
                        onChange={e=>updateExercise(i,{note:e.target.value})}
                        placeholder="Note (opzionale)"
                      />
                    </div>
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

// ---------- Insert row con Autocomplete + Select "Elenco esercizi" ----------
function InsertRow({
  groups, equips,
  onAdd, filteredLib,
  q, setQ, fGroup, setFGroup, fEquip, setFEquip
}){
  const [selIdx, setSelIdx] = useState(-1);

  // autocomplete
  const [openSug, setOpenSug] = useState(false);
  const [hoverIdx, setHoverIdx] = useState(0);
  const inputRef = useRef(null);
  const sugBoxRef = useRef(null);

  // suggerimenti: primi 8 match dall’elenco già filtrato
  const suggestions = useMemo(()=>{
    if (!q.trim()) return [];
    const qLower = q.trim().toLowerCase();
    const list = filteredLib.filter(e => e.name.toLowerCase().includes(qLower));
    return list.slice(0, 8);
  }, [q, filteredLib]);

  useEffect(()=>{
    setOpenSug(suggestions.length > 0);
    setHoverIdx(0);
  }, [suggestions.length]);

  // click fuori → chiudi
  useEffect(()=>{
    function onClickOutside(e){
      if (!sugBoxRef.current) return;
      if (!sugBoxRef.current.contains(e.target) && e.target !== inputRef.current){
        setOpenSug(false);
      }
    }
    window.addEventListener("click", onClickOutside);
    return ()=> window.removeEventListener("click", onClickOutside);
  }, []);

  const selectedItem = selIdx >= 0 ? filteredLib[selIdx] : null;

  function handlePickSuggestion(item){
    const idx = filteredLib.findIndex(i => i.name === item.name);
    setSelIdx(idx);
    setQ("");
    setOpenSug(false);
    try { document.getElementById("exercise-select")?.focus(); } catch {}
  }

  function onInputKeyDown(e){
    if (!openSug) return;
    if (e.key === "ArrowDown"){
      e.preventDefault();
      setHoverIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp"){
      e.preventDefault();
      setHoverIdx(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter"){
      e.preventDefault();
      const pick = suggestions[hoverIdx];
      if (pick) handlePickSuggestion(pick);
    } else if (e.key === "Escape"){
      setOpenSug(false);
    }
  }

  return (
    <>
      {/* 1 riga: ricerca + filtri + select elenco + bottone */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: "1.2fr .8fr .8fr 1.2fr auto",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 4
        }}
      >
        {/* Ricerca con autocomplete */}
        <div style={{ position: "relative" }}>
          <input
            ref={inputRef}
            className="input"
            placeholder="Cerca esercizio…"
            value={q}
            onChange={e=>setQ(e.target.value)}
            onFocus={()=> setOpenSug(suggestions.length>0)}
            onKeyDown={onInputKeyDown}
            autoComplete="off"
          />
          {openSug && suggestions.length>0 && (
            <div
              ref={sugBoxRef}
              className="card"
              style={{
                position:"absolute", top:"calc(100% + 6px)", left:0, right:0,
                zIndex: 50, padding: 6, maxHeight: 260, overflowY:"auto"
              }}
            >
              {suggestions.map((sug, i)=>(
                <div
                  key={sug.name + i}
                  onMouseEnter={()=> setHoverIdx(i)}
                  onClick={()=> handlePickSuggestion(sug)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    cursor: "pointer",
                    background: i===hoverIdx ? "#eef2ff" : "transparent"
                  }}
                  title={`${sug.muscle} · ${sug.equipment}`}
                >
                  <div className="font-medium">{sug.name}</div>
                  <div className="muted" style={{marginTop:2}}>
                    {sug.muscle} · {sug.equipment}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <select className="input" value={fGroup} onChange={e=>setFGroup(e.target.value)}>
          <option value="">Tutti i gruppi</option>
          {groups.map(g=><option key={g} value={g}>{g}</option>)}
        </select>

        <select className="input" value={fEquip} onChange={e=>setFEquip(e.target.value)}>
          <option value="">Tutti gli attrezzi</option>
          {equips.map(g=><option key={g} value={g}>{g}</option>)}
        </select>

        {/* Select principale: SOLO NOME */}
        <select
          id="exercise-select"
          className="input"
          value={selIdx}
          onChange={e=>setSelIdx(Number(e.target.value))}
        >
          <option value={-1}>— Elenco esercizi —</option>
          {filteredLib.map((item, idx)=>(
            <option key={item.name} value={idx}>
              {item.name}
            </option>
          ))}
        </select>

        <button
          className="btn btn-primary"
          onClick={()=> selectedItem && onAdd(selectedItem)}
          disabled={!selectedItem}
        >
          Aggiungi
        </button>
      </div>
    </>
  );
}
// === END: src/pages/TemplateBuilder.jsx ===