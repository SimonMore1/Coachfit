import { useEffect, useMemo, useState } from "react";
import {
  listUsers, listTemplates, listAssignments,
  getActivePlan, setActivePlan,
  listLogs, addLog, removeLog,
  getTemplate, upsertTemplate, assignPlan
} from "../dataApi.local";

// Utilità date
const pad2 = (n)=> (n<10? "0"+n : ""+n);
const toISO = (d)=> `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const addDays = (d, n)=> { const x=new Date(d); x.setDate(x.getDate()+n); return x; };

export default function PTDashboard() {
  // Stato base
  const [users, setUsers] = useState([]);
  const [patients, setPatients] = useState([]);
  const [pt, setPt] = useState(null);

  const [templates, setTemplates] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [selectedUserId, setSelectedUserId] = useState(null);
  const [logs, setLogs] = useState([]);

  // caricamento iniziale
  useEffect(() => {
    const us = listUsers();
    setUsers(us);
    setPt(us.find(u => u.role === "PT") || null);
    setPatients(us.filter(u => u.role === "USER"));
    setTemplates(listTemplates());
    setAssignments(listAssignments());
  }, []);

  // logs del paziente selezionato
  useEffect(() => {
    if (!selectedUserId) { setLogs([]); return; }
    setLogs(listLogs({ userId: selectedUserId }));
  }, [selectedUserId]);

  const selectedUser = useMemo(
    ()=> patients.find(p => p.id === selectedUserId) || null,
    [patients, selectedUserId]
  );

  const activePlanId = useMemo(
    ()=> selectedUserId ? getActivePlan(selectedUserId) : null,
    [selectedUserId, assignments]
  );
  const activePlan = useMemo(
    ()=> activePlanId ? getTemplate(activePlanId) : null,
    [activePlanId, templates]
  );

  const plansForUser = useMemo(
    ()=> selectedUserId ? listTemplates() : [],
    [selectedUserId, templates]
  );
  const assignedToUser = useMemo(
    ()=> selectedUserId ? listAssignments().filter(a=>a.patient_id===selectedUserId) : [],
    [selectedUserId, assignments]
  );

  // ====== Lista pazienti + stato rapido ======
  const rows = useMemo(()=>{
    return patients.map(u => {
      const logsU = listLogs({ userId: u.id }).sort((a,b)=> (a.date < b.date ? 1 : -1));
      const last = logsU[0]?.date || "-";
      const streak = computeStreak(logsU.map(l=>l.date));
      const planId = getActivePlan(u.id);
      const planName = planId ? (getTemplate(planId)?.name || planId) : "-";
      return { id:u.id, name:u.name, planId, planName, last, streak };
    });
  }, [patients]);

  function computeStreak(datesISO){
    const set = new Set(datesISO);
    let streak = 0;
    let day = new Date();
    for (;;){
      const iso = toISO(day);
      if (set.has(iso)) { streak++; day = addDays(day, -1); }
      else break;
    }
    return streak;
  }

  // ====== Heatmap ultimi 8 settimane ======
  const heat = useMemo(()=>{
    const end = new Date(); // oggi incluso
    const start = addDays(end, -7*8+1);
    const arr = [];
    for (let i=0;i<7*8;i++){
      const d = addDays(start, i);
      arr.push({ iso: toISO(d), date: d });
    }
    const setDates = new Set(logs.map(l=>l.date));
    return arr.map(cell => ({
      ...cell,
      v: setDates.has(cell.iso) ? 1 : 0
    }));
  }, [logs]);

  function toggleDay(iso){
    if (!selectedUserId) return;
    const exists = logs.some(l => l.date === iso);
    if (exists) {
      removeLog({ userId: selectedUserId, date: iso });
      setLogs(listLogs({ userId: selectedUserId }));
    } else {
      addLog({ userId: selectedUserId, date: iso });
      setLogs(listLogs({ userId: selectedUserId }));
    }
  }

  // ====== Quick Edit Scheda ======
  const [editPlanId, setEditPlanId] = useState(null);
  const [editDayIndex, setEditDayIndex] = useState(1);
  const planToEdit = useMemo(
    ()=> (editPlanId ? getTemplate(editPlanId) : activePlan) || null,
    [editPlanId, activePlan, templates]
  );

  function addExercise() {
    if (!planToEdit) return;
    const p = structuredClone(planToEdit);
    const day = p.days.find(d=>d.index===Number(editDayIndex));
    if(!day){ p.days.push({ index:Number(editDayIndex), exercises:[] }); }
    const d2 = p.days.find(d=>d.index===Number(editDayIndex));
    d2.exercises.push({ name:"Nuovo Esercizio", targetSets:3, targetReps:10, targetWeight:20 });
    upsertTemplate(p);
    setTemplates(listTemplates());
  }
  function removeExercise(i) {
    if (!planToEdit) return;
    const p = structuredClone(planToEdit);
    const d = p.days.find(x=>x.index===Number(editDayIndex));
    if (!d) return;
    d.exercises.splice(i,1);
    upsertTemplate(p);
    setTemplates(listTemplates());
  }
  function updateExercise(i, field, val) {
    if (!planToEdit) return;
    const p = structuredClone(planToEdit);
    const d = p.days.find(x=>x.index===Number(editDayIndex));
    if (!d || !d.exercises[i]) return;
    if (field==="name") d.exercises[i].name = val;
    if (field==="sets") d.exercises[i].targetSets = Number(val)||0;
    if (field==="reps") d.exercises[i].targetReps = Number(val)||0;
    if (field==="kg")   d.exercises[i].targetWeight = Number(val)||0;
    upsertTemplate(p);
    setTemplates(listTemplates());
  }
  function renamePlan(newName){
    if (!planToEdit) return;
    const p = structuredClone(planToEdit);
    p.name = newName || p.name;
    upsertTemplate(p);
    setTemplates(listTemplates());
  }
  function setPlanForUser(planId){
    if (!selectedUserId) return;
    setActivePlan(selectedUserId, planId);
    // anche assignment (storico) opzionale:
    if (pt) assignPlan(pt.id, selectedUserId, planId);
    setAssignments(listAssignments());
  }

  return (
    <div className="container" style={{ padding: 16 }}>
      <header style={{ marginBottom: 16 }}>
        <h1 className="font-semibold" style={{ fontSize: 20 }}>Dashboard PT</h1>
        {pt && <div className="text-slate-600" style={{ fontSize: 13 }}>Coach: <strong>{pt.name}</strong></div>}
      </header>

      {/* Seleziona paziente */}
      <section className="card" style={{ marginBottom: 16 }}>
        <div className="font-medium" style={{ marginBottom: 8 }}>Pazienti</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <select className="input" value={selectedUserId || ""} onChange={e=>setSelectedUserId(e.target.value)}>
            <option value="">— scegli paziente —</option>
            {patients.map(u=> <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>

          {selectedUser && (
            <div className="pill">
              <span className="text-slate-600" style={{ fontSize: 13 }}>Scheda attiva:</span>
              <strong>{activePlan?.name || "—"}</strong>
            </div>
          )}
        </div>

        {/* tabella rapida */}
        <div style={{ marginTop: 12, overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"separate", borderSpacing:0 }}>
            <thead>
              <tr style={{ textAlign:"left", fontSize:13, color:"#64748b" }}>
                <th style={{ padding:"8px 10px" }}>Paziente</th>
                <th style={{ padding:"8px 10px" }}>Scheda attiva</th>
                <th style={{ padding:"8px 10px" }}>Ultimo allenamento</th>
                <th style={{ padding:"8px 10px" }}>Streak</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r=>(
                <tr key={r.id} style={{ borderTop:"1px solid #e2e8f0" }}>
                  <td style={{ padding:"10px" }}>
                    <button className="btn" onClick={()=>setSelectedUserId(r.id)}>{r.name}</button>
                  </td>
                  <td style={{ padding:"10px" }}>{r.planName}</td>
                  <td style={{ padding:"10px" }}>{r.last}</td>
                  <td style={{ padding:"10px" }}>{r.streak} 🔥</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* HEATMAP + QUICK EDIT */}
      {selectedUser && (
        <section style={{ display:"grid", gridTemplateColumns:"1.2fr .8fr", gap:12 }}>
          {/* HEATMAP */}
          <div className="card">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div className="font-medium">Attività — {selectedUser.name}</div>
              <div className="text-slate-600" style={{ fontSize:12 }}>Ultime 8 settimane</div>
            </div>

            <Heatmap cells={heat} onToggle={(iso)=>toggleDay(iso)} />
            <div style={{ marginTop:8, fontSize:12, color:"#64748b" }}>
              Clicca sui giorni per marcare / smarcare l’allenamento.
            </div>
          </div>

          {/* QUICK EDIT */}
          <div className="card">
            <div className="font-medium">Quick Edit scheda</div>

            <div style={{ display:"flex", gap:8, marginTop:8, flexWrap:"wrap" }}>
              <select className="input" style={{ minWidth:220 }}
                value={ (editPlanId || activePlanId || "") }
                onChange={e=>setEditPlanId(e.target.value)}>
                <option value="">— seleziona scheda —</option>
                {plansForUser.map(p=> <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>

              <button className="btn btn-primary" onClick={() => setPlanForUser(editPlanId || activePlanId)} disabled={!(editPlanId || activePlanId)}>
                Imposta come attiva
              </button>
            </div>

            {planToEdit ? (
              <>
                <div style={{ marginTop:10 }}>
                  <input className="input" defaultValue={planToEdit.name}
                         onBlur={(e)=>renamePlan(e.target.value)} style={{ width:"100%" }}/>
                </div>

                <div style={{ display:"flex", gap:8, marginTop:10 }}>
                  <span className="text-slate-600" style={{ fontSize:13 }}>Giorno</span>
                  <select className="input" value={editDayIndex} onChange={(e)=>setEditDayIndex(Number(e.target.value))}>
                    {planToEdit.days.map(d=> <option key={d.index} value={d.index}>{d.index}</option>)}
                  </select>
                  <button className="btn" onClick={addExercise}>+ esercizio</button>
                </div>

                <div style={{ marginTop:10 }}>
                  {planToEdit.days.find(d=>d.index===Number(editDayIndex))?.exercises?.length ? (
                    <ul style={{ listStyle:"none", margin:0, padding:0 }}>
                      {planToEdit.days.find(d=>d.index===Number(editDayIndex)).exercises.map((ex,i)=>(
                        <li key={i} style={{ border:"1px solid #e2e8f0", borderRadius:12, padding:10, marginTop:8 }}>
                          <div style={{ fontWeight:600 }}>{ex.name}</div>
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr auto", gap:8, marginTop:8 }}>
                            <div>
                              <div className="text-slate-600" style={{ fontSize:12 }}>Nome</div>
                              <input className="input" value={ex.name} onChange={e=>updateExercise(i,"name",e.target.value)} />
                            </div>
                            <div>
                              <div className="text-slate-600" style={{ fontSize:12 }}>Serie</div>
                              <input className="input" type="number" value={ex.targetSets||0} onChange={e=>updateExercise(i,"sets",e.target.value)} />
                            </div>
                            <div>
                              <div className="text-slate-600" style={{ fontSize:12 }}>Reps</div>
                              <input className="input" type="number" value={ex.targetReps||0} onChange={e=>updateExercise(i,"reps",e.target.value)} />
                            </div>
                            <div>
                              <div className="text-slate-600" style={{ fontSize:12 }}>Kg</div>
                              <input className="input" type="number" value={ex.targetWeight||0} onChange={e=>updateExercise(i,"kg",e.target.value)} />
                            </div>
                            <div style={{ display:"flex", alignItems:"end" }}>
                              <button className="btn" onClick={()=>removeExercise(i)}>🗑</button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-slate-600" style={{ fontSize:13 }}>Nessun esercizio in questo giorno.</div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-slate-600" style={{ fontSize:13, marginTop:8 }}>
                Seleziona una scheda per modificarla oppure imposta quella attiva.
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

/* =============== HEATMAP COMPONENTE =============== */
function Heatmap({ cells, onToggle }) {
  // 8 colonne (settimane), 7 righe (lun→dom)
  // allineiamo al lunedì
  const byWeek = [];
  for (let w=0; w<8; w++){
    byWeek.push(cells.slice(w*7, w*7+7));
  }

  return (
    <div style={{ display:"flex", gap:6, marginTop:12, overflowX:"auto" }}>
      {byWeek.map((week, wi)=>(
        <div key={wi} style={{ display:"grid", gridTemplateRows:"repeat(7, 16px)", gap:6 }}>
          {week.map((c, di)=>(
            <div key={c.iso}
              className="hm-cell"
              title={c.iso}
              onClick={()=>onToggle(c.iso)}
              style={{ backgroundColor: c.v ? "#10b981" : "#e5e7eb" }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}