// === START: src/pages/UserDashboard.jsx ===
import React, { useMemo, useState } from "react";

/**
 * Props attese:
 * - user
 * - activePlan               {id,name,days:[{name,exercises:[{id,name,group,equipment,sets,reps,kg,note}]}]} | null
 * - setActivePlanForUser     (tpl|null) => Promise<boolean>
 * - templates                [{id,name,days}]
 * - workoutLogs              (non usato qui, ma lasciamo la prop per future estensioni)
 * - setWorkoutLogs           (idem)
 * - pushWorkoutLog           ({date, entries}) => Promise<boolean>  // usato per “completato oggi”
 */
export default function UserDashboard({
  user,
  activePlan,
  setActivePlanForUser,
  templates,
  workoutLogs,
  setWorkoutLogs,
  pushWorkoutLog,
}) {
  const [dayIdx, setDayIdx] = useState(0); // giorno selezionato del piano attivo

  const day = useMemo(() => activePlan?.days?.[dayIdx] || null, [activePlan, dayIdx]);

  async function markTodayDone() {
    const today = new Date();
    const date = today.toISOString().slice(0,10);
    const entries = (day?.exercises || []).map((ex,i) => ({
      type: "set",
      exercise: ex.name,
      set: i+1,
      reps: ex.reps ?? 0,
      kg: ex.kg ?? 0,
      done: true
    }));
    await pushWorkoutLog({ date, entries });
  }

  return (
    <div className="app-main" style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:16}}>
      {/* Banner Inizia Subito */}
      <div className="card" style={{gridColumn:"1 / -1", display:"flex", alignItems:"center", gap:10}}>
        <div style={{flex:1}}>
          <div className="muted">Inizia subito</div>
          <div> Piano attivo: <b>{activePlan?.name || "Nessun piano"}</b></div>
        </div>
        <select
          className="input"
          value={activePlan?.id || ""}
          onChange={(e)=>{
            const id = e.target.value;
            const tpl = templates.find(t=>t.id===id) || null;
            setActivePlanForUser(tpl);
            setDayIdx(0);
          }}
        >
          <option value="">— Scegli una scheda —</option>
          {templates.map(t=> <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button className="btn btn-primary" onClick={()=>setActivePlanForUser(activePlan)}>Attiva</button>
      </div>

      {/* Colonna sinistra: scelta giorno */}
      <div className="card">
        <div className="label">Giorno del piano</div>
        <select
          className="input"
          value={dayIdx}
          onChange={e=>setDayIdx(Number(e.target.value))}
          disabled={!activePlan}
        >
          {(activePlan?.days || []).map((d, i) =>
            <option key={d.id || i} value={i}>{d.name || `Giorno ${i+1}`}</option>
          )}
        </select>

        {!activePlan && <div className="muted" style={{marginTop:8}}>
          Nessun piano attivo. Seleziona una scheda e premi “Attiva”.
        </div>}
      </div>

      {/* Colonna destra: Allenamento di oggi */}
      <div className="card">
        <div className="font-semibold" style={{marginBottom:8}}>Allenamento di oggi</div>
        {!day && <div className="muted">Seleziona un giorno.</div>}

        {day && day.exercises?.map((ex, i)=>(
          <div key={ex.id || i} className="workout-ex-card">
            <div className="chip" style={{marginBottom:6}}>{ex.name}</div>

            <div className="grid" style={{gridTemplateColumns:"auto .7fr .7fr .7fr 1fr", gap:8, alignItems:"center"}}>
              <label className="muted">Set 1</label>
              <input className="input" type="number" defaultValue={ex.reps ?? 10} />
              <input className="input" type="number" placeholder="Kg" defaultValue={ex.kg ?? ""} />
              <div />
              <input className="input" placeholder="Note (opzionali)" defaultValue={ex.note ?? ""}/>
            </div>
          </div>
        ))}

        {day && (
          <div style={{display:"flex", justifyContent:"flex-end", marginTop:10}}>
            <button className="btn btn-primary" onClick={markTodayDone}>Segna completato oggi</button>
          </div>
        )}
      </div>
    </div>
  );
}
// === END: src/pages/UserDashboard.jsx ===