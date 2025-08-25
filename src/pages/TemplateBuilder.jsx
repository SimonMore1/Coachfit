// src/pages/TemplateBuilder.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  EXERCISE_LIBRARY,
  EXERCISE_NAMES,
  EQUIPMENTS,
  MUSCLE_GROUPS,
  saveTemplate,
  loadTemplates,
  deleteTemplate,
  duplicateTemplate,
} from "../data.js";

// ... il resto del tuo componente rimane identico,
// assicurati che l’autocomplete legga da EXERCISE_NAMES
// e che il select elenco usi EXERCISE_LIBRARY (label = exercise.name).

/*
NOTE: se nel tuo file avevi già tutta la UI con:
- Campo "Cerca esercizio" con debounce 200ms e pannello di suggerimenti
- Select "Elenco esercizi" (solo per scelta manuale)
- Filtri "Tutti i gruppi" / "Tutti gli attrezzi"

puoi lasciare tutto uguale. L’import sopra rimette a posto
le dipendenze rotte e riporta tutte le costanti da data.js.
*/
export default function TemplateBuilder(props){ /* il TUO codice esistente */ return null; }

/**
 * Pagina "Schede" con:
 * - nome scheda
 * - giorno corrente
 * - filtri (gruppi/attrezzi)
 * - select "Elenco esercizi"
 * - ricerca con AUTOCOMPLETE live sotto l'input
 * - lista esercizi del giorno
 * - pannello "Serie per gruppo" (SeriesSummary)
 */

export default function TemplateBuilder(){
  // stato base
  const [name, setName] = useState("");
  const [dayIndex, setDayIndex] = useState(0);
  // struttura template: days: [{ entries: [...] }]
  const [tpl, setTpl] = useState({ id: null, name: "", days: [{ entries: [] }] });

  // ricerca + autocomplete
  const [search, setSearch] = useState("");
  const [openSug, setOpenSug] = useState(false);
  const [sugs, setSugs] = useState([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const sugRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Filtri (restano, ma non toccano l’autocomplete)
  const [groupFilter, setGroupFilter] = useState("Tutti i gruppi");
  const [equipFilter, setEquipFilter] = useState("Tutti gli attrezzi");

  // ==== helpers ====

  // Normalizza la struttura days/entries
  useEffect(() => {
    setTpl(prev => {
      const safeDays = Array.isArray(prev?.days) ? prev.days : [{ entries: [] }];
      const norm = safeDays.map(d => ({
        ...d,
        entries: Array.isArray(d.entries) ? d.entries : [],
      }));
      return { ...prev, name: prev?.name ?? "", days: norm };
    });
  }, []);

  // elenco esercizi (solo nomi) per select manuale
  const selectOptions = useMemo(() => {
    // filtra solo per select, non per autocomplete
    return EXERCISE_LIBRARY
      .filter(e => {
        const okGroup = groupFilter === "Tutti i gruppi" || e.muscle === groupFilter;
        const okEquip = equipFilter === "Tutti gli attrezzi" || e.equip === equipFilter;
        return okGroup && okEquip;
      })
      .map(e => e.name)
      .sort((a,b) => a.localeCompare(b));
  }, [groupFilter, equipFilter]);

  // aggiorna suggerimenti con debounce 200ms
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!search.trim()) { setSugs([]); setOpenSug(false); setActiveIdx(-1); return; }
    debounceRef.current = setTimeout(() => {
      const q = search.trim().toLowerCase();
      // ranking semplice: inizia per > include
      const starts = EXERCISE_NAMES.filter(n => n.toLowerCase().startsWith(q));
      const includes = EXERCISE_NAMES.filter(n => !starts.includes(n) && n.toLowerCase().includes(q));
      const list = [...starts, ...includes].slice(0, 10);
      setSugs(list);
      setOpenSug(true);
      setActiveIdx(list.length ? 0 : -1);
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  // chiudi suggerimenti su click fuori
  useEffect(() => {
    function onDocClick(e){
      if (!sugRef.current || sugRef.current.contains(e.target) || inputRef.current?.contains(e.target)) return;
      setOpenSug(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // ===== mutazioni =====

  function ensureDay(idx){
    setTpl(prev => {
      const days = [...prev.days];
      while (days.length <= idx) days.push({ entries: [] });
      return { ...prev, days };
    });
  }

  function addExerciseByName(name){
    const lib = EXERCISE_LIBRARY.find(e => e.name === name);
    if (!lib) return;

    ensureDay(dayIndex);
    setTpl(prev => {
      const days = [...prev.days];
      const day = { ...days[dayIndex] };
      const entries = [...day.entries];

      entries.push({
        id: `${lib.id}-${Date.now()}`, // row id client
        exerciseId: lib.id,
        exerciseName: lib.name,
        muscleGroup: detectGroup(lib.name),
        equipment: lib.equip,
        sets: lib.targetSets ?? 3,
        reps: lib.targetReps ?? 10,
        weight_kg: lib.targetWeight ?? null,
        notes: "",
        orderIndex: entries.length,
      });

      day.entries = entries;
      days[dayIndex] = day;
      return { ...prev, days };
    });
  }

  function removeEntry(idx){
    setTpl(prev => {
      const days = [...prev.days];
      const day = { ...days[dayIndex] };
      const entries = [...day.entries];
      entries.splice(idx,1);
      day.entries = entries.map((e,i) => ({ ...e, orderIndex: i }));
      days[dayIndex] = day;
      return { ...prev, days };
    });
  }

  function updateEntry(idx, patch){
    setTpl(prev => {
      const days = [...prev.days];
      const day = { ...days[dayIndex] };
      const entries = [...day.entries];
      entries[idx] = { ...entries[idx], ...patch };
      day.entries = entries;
      days[dayIndex] = day;
      return { ...prev, days };
    });
  }

  // ====== handlers autocomplete ======

  function onInputKeyDown(e){
    if (!openSug) return;
    if (e.key === "ArrowDown"){
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, sugs.length - 1));
    } else if (e.key === "ArrowUp"){
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter"){
      e.preventDefault();
      if (activeIdx >= 0 && sugs[activeIdx]){
        selectSuggestion(sugs[activeIdx]);
      } else if (sugs.length === 1){
        selectSuggestion(sugs[0]);
      }
    } else if (e.key === "Escape"){
      setOpenSug(false);
    }
  }

  function selectSuggestion(name){
    addExerciseByName(name);
    setSearch("");
    setSugs([]);
    setOpenSug(false);
    setActiveIdx(-1);
    // focus prossimo campo sensato? lasciamo l’input pronto ad altra ricerca
    inputRef.current?.focus();
  }

  // ======= UI =======

  const day = tpl.days?.[dayIndex] ?? { entries: [] };

  return (
    <div className="tpl-wrap">
      <div className="tpl-header">
        <input
          className="inp name"
          placeholder="Nome scheda…"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <select className="inp day"
          value={dayIndex}
          onChange={e => setDayIndex(Number(e.target.value))}
        >
          {tpl.days.map((_,i) => <option key={i} value={i}>Giorno {i+1}</option>)}
        </select>
        <button className="btn" onClick={() => setTpl(p => ({...p, days:[...p.days, {entries: []}]}))}>+ Giorno</button>
        <button className="btn" onClick={() => setTpl(p => ({...p, days: p.days.length>1 ? p.days.slice(0,-1) : p.days}))}>−</button>
        <button className="btn primary" style={{marginLeft:"auto"}}>💾 Salva su cloud</button>
      </div>

      <div className="tpl-toolbar">
        {/* Ricerca con autocomplete */}
        <div className="auto-wrap" ref={sugRef}>
          <input
            ref={inputRef}
            className="inp search"
            placeholder="Cerca esercizio…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => { if (sugs.length) setOpenSug(true); }}
            onKeyDown={onInputKeyDown}
          />
          {openSug && sugs.length > 0 && (
            <ul role="listbox" className="auto-panel">
              {sugs.map((s, i) => (
                <li
                  key={s}
                  role="option"
                  aria-selected={i===activeIdx}
                  className={`auto-item ${i===activeIdx ? "active":""}`}
                  onMouseDown={() => selectSuggestion(s)}
                >
                  {highlightMatch(s, search)}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Filtri per la select manuale */}
        <select className="inp" value={groupFilter} onChange={e => setGroupFilter(e.target.value)}>
          <option>Tutti i gruppi</option>
          {["Petto","Schiena","Gambe","Spalle","Bicipiti","Tricipiti","Core","Altro"].map(g => <option key={g}>{g}</option>)}
        </select>
        <select className="inp" value={equipFilter} onChange={e => setEquipFilter(e.target.value)}>
          <option>Tutti gli attrezzi</option>
          {[...new Set(EXERCISE_LIBRARY.map(e=>e.equip))].sort().map(eq => <option key={eq}>{eq}</option>)}
        </select>

        {/* Select manuale “Elenco esercizi” (resta) */}
        <select
          className="inp"
          onChange={e => { if (e.target.value) addExerciseByName(e.target.value); e.target.value=""; }}
          defaultValue=""
        >
          <option value="" disabled>Elenco esercizi</option>
          {selectOptions.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <button className="btn" onClick={() => {/* add current selected? rimane come ora */}}>Aggiungi</button>

        {/* Riepilogo a destra */}
        <div style={{marginLeft:"auto", width: 320}}>
          <SeriesSummary days={tpl.days} currentDayIndex={dayIndex}/>
        </div>
      </div>

      <div className="tpl-list">
        <h4>Esercizi — Giorno {dayIndex+1}</h4>
        {day.entries.length === 0 && <div className="empty">Nessun esercizio in questo giorno.</div>}

        {day.entries.map((row, idx) => (
          <div key={row.id} className="ex-card">
            <div className="ex-name">{row.exerciseName}</div>

            <div className="row">
              <div className="col">
                <label>Serie</label>
                <input
                  type="number"
                  min={1}
                  className="inp"
                  value={row.sets ?? 3}
                  onChange={e => updateEntry(idx, { sets: Number(e.target.value) || 1 })}
                />
              </div>
              <div className="col">
                <label>Ripetizioni</label>
                <input
                  type="number"
                  min={1}
                  className="inp"
                  value={row.reps ?? 10}
                  onChange={e => updateEntry(idx, { reps: Number(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div className="row">
              <div className="col">
                <label>Kg (opz.)</label>
                <input
                  type="number"
                  className="inp"
                  value={row.weight_kg ?? ""}
                  onChange={e => updateEntry(idx, { weight_kg: e.target.value === "" ? null : Number(e.target.value) })}
                />
              </div>
              <div className="col2">
                <label>Note (opzionali)</label>
                <input
                  className="inp"
                  placeholder="Aggiungi una nota"
                  value={row.notes ?? ""}
                  onChange={e => updateEntry(idx, { notes: e.target.value })}
                />
              </div>
              <button className="icon trash" title="Rimuovi" onClick={() => removeEntry(idx)}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// evidenzia il match nella stringa suggerita
function highlightMatch(label, query){
  const q = query.trim();
  if (!q) return label;
  const i = label.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return label;
  const a = label.slice(0,i);
  const b = label.slice(i, i+q.length);
  const c = label.slice(i+q.length);
  return <span>{a}<strong>{b}</strong>{c}</span>;
}