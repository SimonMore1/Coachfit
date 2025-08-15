import { useEffect, useState } from "react";
import { MUSCLE_GROUPS } from "../utils";

export default function PTDashboard({patients, templates, assignments, setAssignments, workoutLogs}) {
  const [assignPlanId,setAssignPlanId]=useState("");
  const [assignPatientId,setAssignPatientId]=useState(patients[0]?.id||"");
  const [assignFreq,setAssignFreq]=useState(3);

  const [selectedPatientId,setSelectedPatientId]=useState(patients[0]?.id||"");
  const patientAssignments=assignments.filter(a=>a.patientId===selectedPatientId);
  const [selectedPlanId,setSelectedPlanId]=useState(patientAssignments[0]?.planId||"");
  useEffect(()=>{ setSelectedPlanId(patientAssignments[0]?.planId||""); },[selectedPatientId,assignments]);

  const activePlan = templates.find(t=>t.id===selectedPlanId) || null;
  const currentLog = activePlan ? workoutLogs.find(l=>l.userId===selectedPatientId && l.planId===activePlan.id) : null;

  const assign=()=>{
    if(!assignPlanId || !assignPatientId) return;
    setAssignments([{id:"as_"+Date.now(),planId:assignPlanId,patientId:assignPatientId,freqPerWeek:Number(assignFreq)},...assignments]);
    setAssignPlanId(""); setAssignFreq(3);
  };

  const weekly = useWeeklySummary(workoutLogs, selectedPatientId);

  return (
    <div className="grid grid-2">
      <div className="card">
        <h2>Assegna scheda a paziente</h2>
        <div className="row" style={{marginTop:8}}>
          <select className="input" style={{minWidth:220}} value={assignPlanId} onChange={e=>setAssignPlanId(e.target.value)}>
            <option value="">Seleziona scheda…</option>
            {templates.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select className="input" value={assignPatientId} onChange={e=>setAssignPatientId(e.target.value)}>
            {patients.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input type="number" className="input" style={{width:80}} value={assignFreq} onChange={e=>setAssignFreq(+e.target.value)} />
          <button className="btn btn-primary" onClick={assign}>Assegna</button>
        </div>
      </div>

      <div className="card">
        <h2>Stato paziente</h2>
        <div className="row" style={{marginTop:8}}>
          <select className="input" value={selectedPatientId} onChange={e=>setSelectedPatientId(e.target.value)}>
            {patients.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {patientAssignments.length>0 ? (
            <select className="input" value={selectedPlanId} onChange={e=>setSelectedPlanId(e.target.value)}>
              {patientAssignments.map(a=>{
                const plan=templates.find(t=>t.id===a.planId);
                return <option key={a.id} value={a.planId}>{plan?.name || a.planId}</option>;
              })}
            </select>
          ) : <span className="muted" style={{fontSize:14}}>Nessuna scheda assegnata.</span>}
        </div>

        {activePlan && currentLog && (
          <div style={{marginTop:12, border:"1px solid #e5e7eb", borderRadius:14, padding:12}}>
            <div className="row" style={{justifyContent:"space-between"}}>
              <div style={{fontWeight:600}}>Ultimo log — {currentLog.date} — Giorno {currentLog.planDayIndex}</div>
              <span className="pill">{currentLog.status==="skipped"?"Saltato":"In corso"}</span>
            </div>
            <ul style={{marginTop:10, paddingLeft:0, listStyle:"none"}}>
              {currentLog.sets.map((s,i)=>(
                <li key={i} className={`set-row ${s.missed?"missed":(s.done?"done":"")}`}>
                  <input type="checkbox" checked={!!s.done} readOnly />
                  <div className="input" style={{width:220}}>{s.name}</div>
                  <span className="pill">{s.muscleGroup}</span>
                  <div className="input" style={{width:70, textAlign:"center"}}>{s.reps}</div>
                  <div className="input" style={{width:90, textAlign:"center"}}>{s.weight || "—"}</div>
                  {s.missed && <span className="badge badge-red">X</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="card" style={{marginTop:12}}>
          <h3>Riepilogo settimanale</h3>
          <div className="grid grid-2" style={{marginTop:12}}>
            {MUSCLE_GROUPS.map(g=>(
              <div key={g} style={{border:"1px solid #e5e7eb", borderRadius:12, padding:12, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                <div style={{fontWeight:500}}>{g}</div>
                <div style={{textAlign:"right"}}>
                  <div className="muted" style={{fontSize:12}}>Serie (fatte)</div>
                  <div style={{fontWeight:600}}>{weekly[g].sets}</div>
                  <div className="muted" style={{fontSize:12}}>Volume</div>
                  <div style={{fontWeight:600}}>{weekly[g].volume}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

function useWeeklySummary(workoutLogs, patientId){
  const sums={}; MUSCLE_GROUPS.forEach(g=>sums[g]={sets:0,volume:0});
  const startOfWeek=(d)=>{const x=new Date(d); const dow=(x.getDay()+6)%7; x.setDate(x.getDate()-dow); x.setHours(0,0,0,0); return x;};
  const start=startOfWeek(new Date()); const end=new Date(start); end.setDate(start.getDate()+6);
  const inWeek=(iso)=>{const [y,m,dd]=iso.split("-").map(Number); const d=new Date(y,m-1,dd); return d>=start && d<=end; };

  workoutLogs.forEach(l=>{
    if(l.userId!==patientId) return;
    if(!inWeek(l.date)) return;
    l.sets.forEach(s=>{
      const g = MUSCLE_GROUPS.includes(s.muscleGroup)?s.muscleGroup:"Altro";
      if(s.done) sums[g].sets += 1;
      if(s.done && s.weight!=="" && Number(s.weight)>0) sums[g].volume += (Number(s.reps)||0)*(Number(s.weight)||0);
    });
  });
  return sums;
}