// === START: src/pages/UserDashboard.jsx ===
import React, { useEffect, useMemo, useState } from "react";

/**
 * Props attese da App:
 * - user
 * - activePlan                  { id, name, days:[{ id,name, exercises:[{id,name,group,equipment,sets,reps,kg,note?}] }] } | null
 * - setActivePlanForUser(tpl)   => Promise<boolean>
 * - templates                   [{ id,name,days }]
 * - pushWorkoutLog({date, entries}) => Promise<boolean>
 */

function IniziaSubito({ activePlan, templates, onActivate }) {
  const [sel, setSel] = useState(activePlan?.id || "");

  useEffect(() => {
    setSel(activePlan?.id || "");
  }, [activePlan?.id]);

  return (
    <div className="card" style={{display:"grid", gridTemplateColumns:"1fr auto", gap:12}}>
      <div>
        <div className="muted" style={{marginBottom:6}}>Inizia subito</div>
        <div className="muted">Piano attivo: <strong>{activePlan?.name || "—"}</strong></div>
      </div>
      <div style={{display:"flex", gap:8, alignItems:"center"}}>
        <select className="input" value={sel} onChange={(e)=>setSel(e.target.value)} style={{minWidth:220}}>
          {templates.length === 0 && <option value="">— Nessuna scheda —</option>}
          {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button
          className="btn btn-primary"
          onClick={()=>{
            const tpl = templates.find(t=>t.id===sel);
            onActivate(tpl || null);
          }}
        >Attiva</button>
      </div>
    </div>
  );
}

/** Pannello esecuzione: n set per esercizio */
function WorkoutOfDay({ dateISO, activePlan, dayIndex, pushWorkoutLog }) {
  // { [exerciseId]: { note:"", sets:[{done,reps,kg}], } }
  const [progress, setProgress] = useState({});

  const exercises = useMemo(() => {
    const d = activePlan?.days?.[dayIndex];
    return Array.isArray(d?.exercises) ? d.exercises : [];
  }, [activePlan, dayIndex]);

  const buildDefaultSets = React.useCallback((ex) => {
    const count = Math.max(1, Number(ex?.sets) || 1);
    const reps  = Math.max(1, Number(ex?.reps) || 10);
    return Array.from({ length: count }, () => ({ done: false, reps, kg: "" }));
  }, []);

  // sincronia quando cambia giorno / scheda
  useEffect(() => {
    const next = {};
    for (const ex of exercises) {
      const prev = progress[ex.id];
      next[ex.id] = {
        note: prev?.note ?? "",
        sets: Array.isArray(prev?.sets) && prev.sets.length === (Number(ex.sets) || 1)
          ? prev.sets
          : buildDefaultSets(ex),
      };
    }
    setProgress(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlan?.id, dayIndex]);

  const updateSet = (exId, idx, patch) => {
    setProgress((p) => {
      const cur = p[exId] ?? { note: "", sets: [] };
      const sets = cur.sets.slice();
      sets[idx] = { ...sets[idx], ...patch };
      return { ...p, [exId]: { ...cur, sets } };
    });
  };

  const updateNote = (exId, note) => {
    setProgress((p) => {
      const cur = p[exId] ?? { note: "", sets: [] };
      return { ...p, [exId]: { ...cur, note } };
    });
  };

  const handleCompleteToday = async () => {
    const entries = exercises.map((ex) => {
      const cur = progress[ex.id] ?? { note: "", sets: buildDefaultSets(ex) };
      return {
        exerciseId: ex.id,
        name: ex.name,
        sets: cur.sets.map(s => ({
          done: !!s.done,
          reps: Number(s.reps) || 0,
          kg:   s.kg === "" ? null : Number(s.kg),
        })),
        note: cur.note || null,
        group: ex.group || null,
        equipment: ex.equipment || null,
      };
    });

    const ok = await pushWorkoutLog({ date: dateISO, entries });
    if (ok) {
      // reset solo le spunte
      setProgress((p) => {
        const n = { ...p };
        for (const ex of exercises) {
          if (!n[ex.id]) continue;
          n[ex.id] = {
            ...n[ex.id],
            sets: n[ex.id].sets.map(s => ({ ...s, done: false })),
          };
        }
        return n;
      });
    }
  };

  if (!activePlan) {
    return (
      <div className="card">
        <div className="muted">Nessun piano attivo. Seleziona una scheda e premi “Attiva”.</div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 style={{fontWeight:700, fontSize:20, margin:"0 0 10px"}}>Allenamento di oggi</h3>

      {exercises.length === 0 && (
        <div className="muted">Questo giorno non ha esercizi.</div>
      )}

      {exercises.map((ex) => {
        const cur = progress[ex.id] ?? { note: "", sets: buildDefaultSets(ex) };
        return (
          <div key={ex.id} className="exercise-card">
            <div className="chip" style={{marginBottom:8}}>{ex.name}</div>

            {cur.sets.map((s, idx) => (
              <div key={idx} className="set-row">
                <label className="set-label">Set {idx+1}</label>

                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={!!s.done}
                    onChange={(e)=>updateSet(ex.id, idx, { done: e.target.checked })}
                    aria-label={`Set ${idx+1} completato`}
                  />
                </label>

                <input
                    className="input"
                    type="number"
                    min={0}
                    value={s.reps}
                    onChange={(e)=>updateSet(ex.id, idx, { reps: e.target.value })}
                    placeholder="Reps"
                />

                <div className="kg-box">
                  <span>Kg</span>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={s.kg}
                    onChange={(e)=>updateSet(ex.id, idx, { kg: e.target.value })}
                    placeholder="Kg"
                  />
                </div>
              </div>
            ))}

            <input
              className="input"
              value={cur.note}
              onChange={(e)=>updateNote(ex.id, e.target.value)}
              placeholder="Note (opzionali)"
              style={{marginTop:8}}
            />
          </div>
        );
      })}

      {exercises.length > 0 && (
        <div style={{display:"flex", justifyContent:"flex-end", marginTop:12}}>
          <button className="btn btn-primary" onClick={handleCompleteToday}>
            Segna completato oggi
          </button>
        </div>
      )}
    </div>
  );
}

export default function UserDashboard({
  user,
  activePlan,
  setActivePlanForUser,
  templates,
  pushWorkoutLog,
}) {
  // giorno selezionato (indice del giorno nella scheda)
  const [dayIdx, setDayIdx] = useState(0);

  // se cambia scheda e l'indice eccede, torna a 0
  useEffect(() => {
    const max = Math.max(0, (activePlan?.days?.length || 1) - 1);
    if (dayIdx > max) setDayIdx(0);
  }, [activePlan?.id]); // eslint-disable-line

  // data ISO del “giorno corrente” (oggi)
  const dateISO = useMemo(() => new Date().toISOString().slice(0,10), []);

  return (
    <div className="page-wrap">
      <h1 className="page-title">Allenamenti — Utente: {user?.name}</h1>

      {/* Banner attivazione */}
      <IniziaSubito
        activePlan={activePlan}
        templates={templates}
        onActivate={setActivePlanForUser}
      />

      {/* Header giorno + selettore giorno scheda */}
      <div className="toolbar" style={{margin:"12px 0"}}>
        <div className="muted">Data: <strong>{dateISO}</strong></div>
        <div style={{marginLeft:"auto", display:"flex", gap:8, alignItems:"center"}}>
          <span className="label">Giorno scheda</span>
          <select
            className="input"
            value={dayIdx}
            onChange={e=>setDayIdx(Number(e.target.value))}
          >
            {activePlan?.days?.map((d,i)=>(
              <option key={d.id || i} value={i}>{d.name || `Giorno ${i+1}`}</option>
            ))}
            {!activePlan && <option value={0}>—</option>}
          </select>
        </div>
      </div>

      {/* 2 colonne: (sinistra vuota per ora / destra allenamento) */}
      <div className="grid" style={{gridTemplateColumns:"1fr 1.1fr", gap:16}}>
        <div className="column-left">
          {/* qui in futuro: note del giorno, storico recente, suggerimenti, ecc. */}
        </div>

        <div className="column-right">
          <WorkoutOfDay
            dateISO={dateISO}
            activePlan={activePlan}
            dayIndex={dayIdx}
            pushWorkoutLog={pushWorkoutLog}
          />
        </div>
      </div>
    </div>
  );
}
// === END: src/pages/UserDashboard.jsx ===