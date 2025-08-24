// === START: src/pages/UserDashboard.jsx ===
import { useEffect, useMemo, useState } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay } from "date-fns";
import { it } from "date-fns/locale";

/**
 * Props attese:
 * - user
 * - activePlan                 { id, name, days:[...] } | null
 * - setActivePlanForUser       (tpl|null) => Promise<boolean>
 * - templates                  [{id,name,days}]
 * - workoutLogs, setWorkoutLogs, pushWorkoutLog
 */
export default function UserDashboard({
  user,
  activePlan,
  setActivePlanForUser,
  templates,
  workoutLogs,
  setWorkoutLogs,
  pushWorkoutLog,
}){
  // ======= Banner "Inizia subito" (attiva piano) =======
  const [selTplId, setSelTplId] = useState("");
  const selTpl = useMemo(()=> templates.find(t=>t.id===selTplId) || null, [templates, selTplId]);
  useEffect(()=>{
    // di default seleziona il primo template disponibile
    if (!selTplId && templates.length>0) setSelTplId(templates[0].id);
  }, [templates, selTplId]);

  const [activating, setActivating] = useState(false);
  async function handleActivate(){
    if (!selTpl) return;
    setActivating(true);
    const ok = await setActivePlanForUser(selTpl);
    setActivating(false);
    // nulla da fare: App aggiorna activePlan nello stato globale,
    // qui basta far vedere il titolo aggiornato
  }

  // ======= Calendario "mini": lasciamo il mensile/settimanale a Calendar.jsx =======
  // Manteniamo solo la parte di "Allenamento di oggi" (lista esercizi + set)
  const plan = activePlan; // alias

  // Stato del giorno scelto all'interno del piano (Giorno 1, Giorno 2, ...)
  const [dayIdx, setDayIdx] = useState(0);
  useEffect(()=>{
    setDayIdx(0);
  }, [plan?.id]);

  const today = new Date();
  const day = plan?.days?.[dayIdx] || { name: "Giorno 1", exercises: [] };

  // modello per i set del giorno corrente (visualizzazione semplice)
  // 3 set default con reps precompilate a 10 (UI modificabile)
  const [uiSets, setUiSets] = useState({});
  useEffect(()=>{
    // reset quando cambia giorno o piano
    const base = {};
    (day.exercises || []).forEach(ex=>{
      base[ex.id] = [
        { done:false, reps: ex.reps ?? 10, kg: ex.kg ?? "", notes:"" },
        { done:false, reps: ex.reps ?? 10, kg: ex.kg ?? "", notes:"" },
        { done:false, reps: ex.reps ?? 10, kg: ex.kg ?? "", notes:"" },
      ];
    });
    setUiSets(base);
  }, [plan?.id, dayIdx]);

  function updSet(exId, setIndex, patch){
    setUiSets(prev=>{
      const arr = [...(prev[exId] || [])];
      arr[setIndex] = { ...arr[setIndex], ...patch };
      return { ...prev, [exId]: arr };
    });
  }

  async function handleCompleteToday(){
    // comprime i set "completati" (o tutti, se vuoi) in entries
    const entries = (day.exercises || []).map(ex=>{
      const sets = (uiSets[ex.id] || []).map((s,i)=>({
        set: i+1,
        done: !!s.done,
        reps: Number(s.reps)||0,
        kg: (s.kg===""? null : Number(s.kg)),
        notes: s.notes || null,
      }));
      return {
        exerciseId: ex.id,
        exerciseName: ex.name,
        muscleGroup: ex.group || null,
        equipment: ex.equipment || null,
        sets,
      };
    });

    await pushWorkoutLog({
      date: format(new Date(), "yyyy-MM-dd"),
      entries
    });

    // soft feedback
    alert("Allenamento salvato in workout_logs ✅");
  }

  return (
    <div className="grid" style={{gridTemplateColumns:"1.1fr .9fr", gap:16}}>
      {/* Colonna sinistra: quick actions + info piano attivo */}
      <div className="card" style={{gridColumn:"1 / span 2"}}>
        <div style={{display:"flex", alignItems:"center", gap:12, justifyContent:"space-between", flexWrap:"wrap"}}>
          <div>
            <div className="muted" style={{marginBottom:6}}>Inizia subito</div>
            <div className="muted">
              Piano attivo: <b>{activePlan?.name || "— nessuno —"}</b>
            </div>
          </div>

          <div style={{display:"flex", gap:8, alignItems:"center"}}>
            <select className="input" value={selTplId} onChange={e=>setSelTplId(e.target.value)}>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <button className="btn btn-primary" onClick={handleActivate} disabled={!selTpl || activating}>
              {activating ? "Attivo..." : "Attiva"}
            </button>
          </div>
        </div>
      </div>

      {/* Colonna destra: Allenamento di oggi */}
      <div className="card" style={{gridColumn:"1 / span 2"}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12}}>
          <h3>Allenamento di oggi</h3>
          {!!plan?.days?.length && (
            <select className="input" value={dayIdx} onChange={e=>setDayIdx(Number(e.target.value))}>
              {plan.days.map((d,idx)=><option key={d.id || idx} value={idx}>{d.name || `Giorno ${idx+1}`}</option>)}
            </select>
          )}
        </div>

        {(day.exercises || []).map(ex=>(
          <div key={ex.id} className="card" style={{background:"#f8fafc", marginBottom:12}}>
            <div className="chip" style={{fontWeight:600, marginBottom:10}}>{ex.name}</div>

            {[0,1,2].map(i=>(
              <div key={i} className="grid" style={{gridTemplateColumns:"auto 100px 100px 1fr", gap:8, alignItems:"center", marginBottom:8}}>
                <label className="input" style={{display:"flex", gap:8, alignItems:"center"}}>
                  <input
                    type="checkbox"
                    checked={!!uiSets[ex.id]?.[i]?.done}
                    onChange={e=>updSet(ex.id, i, {done:e.target.checked})}
                    style={{marginRight:6}}
                  />
                  Set {i+1}
                </label>

                <input className="input" type="number"
                  value={uiSets[ex.id]?.[i]?.reps ?? 10}
                  onChange={e=>updSet(ex.id, i, {reps: Number(e.target.value)})}
                  placeholder="Reps" />

                <input className="input" type="number"
                  value={uiSets[ex.id]?.[i]?.kg ?? ""}
                  onChange={e=>updSet(ex.id, i, {kg: e.target.value})}
                  placeholder="Kg" />

                <input className="input"
                  value={uiSets[ex.id]?.[i]?.notes ?? ""}
                  onChange={e=>updSet(ex.id, i, {notes: e.target.value})}
                  placeholder="Note (opzionali)" />
              </div>
            ))}
          </div>
        ))}

        {(day.exercises || []).length===0 && (
          <div className="muted">Nessun esercizio nel giorno selezionato.</div>
        )}

        <div style={{textAlign:"right", marginTop:12}}>
          <button className="btn btn-primary" onClick={handleCompleteToday}>Segna completato oggi</button>
        </div>
      </div>
    </div>
  );
}
// === END: src/pages/UserDashboard.jsx ===