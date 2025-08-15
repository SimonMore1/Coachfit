import { useEffect, useMemo, useState } from "react";
import { MUSCLE_GROUPS, detectGroup, todayISO, clone, capWords } from "../utils";

export default function UserDashboard({
  currentUser, templates, assignments,
  activePlans, setActivePlanForUser,
  workoutLogs, setWorkoutLogs
}) {
  const activePlanId = activePlans[currentUser.id] || null;
  const selfPlan = activePlanId ? templates.find(t => t.id === activePlanId) : null;

  const assignedPlanIds = useMemo(
    () => assignments.filter(a => a.patientId === currentUser.id).map(a => a.planId),
    [assignments, currentUser.id]
  );
  const assignedPlans = templates.filter(t => assignedPlanIds.includes(t.id));

  const nextIndex = useMemo(() => {
    if (!selfPlan) return 1;
    const logs = workoutLogs
      .filter(l => l.userId === currentUser.id && l.planId === selfPlan.id)
      .sort((a, b) => a.planDayIndex - b.planDayIndex);
    const last = logs.length ? logs[logs.length - 1].planDayIndex : 0;
    return Math.min(last + 1, selfPlan.days.length);
  }, [selfPlan, workoutLogs, currentUser.id]);

  const dayStatus = (dayIndex) => {
    if (!selfPlan) return "todo";
    const log = workoutLogs.find(l => l.userId === currentUser.id && l.planId === selfPlan.id && l.planDayIndex === dayIndex);
    if (!log) return "todo";
    return log.status === "skipped" ? "skipped" : "done";
  };

  const [selectedDay, setSelectedDay] = useState(null);
  const [showPlan, setShowPlan] = useState(false);
  useEffect(() => { if (selfPlan && !selectedDay) setSelectedDay(nextIndex); }, [selfPlan, nextIndex, selectedDay]);

  /* ── avvio/skip giorno ── */
  const startDay = (index) => {
    if (!selfPlan) return;
    const day = selfPlan.days?.find(d => d.index === index);
    if (!day) return;

    const sets = day.exercises.map(e => ({
      name: capWords(e.name),
      muscleGroup: detectGroup(e.name),
      targetSets: Number(e.targetSets) || 1,
      reps: Number(e.targetReps) || 0,  // reps consigliate per serie
      weight: "",
      setsDone: 0,
      notes: "",
      missed: false
    }));

    setWorkoutLogs([
      {
        id: "log_" + Date.now(),
        userId: currentUser.id,
        planId: selfPlan.id,
        planDayIndex: index,
        date: todayISO(),
        status: "in-progress",
        sets
      },
      ...workoutLogs
    ]);
  };

  const skipDay = (index) => {
    if (!selfPlan) return;
    setWorkoutLogs([
      {
        id: "log_" + Date.now(),
        userId: currentUser.id,
        planId: selfPlan.id,
        planDayIndex: index,
        date: todayISO(),
        status: "skipped",
        sets: []
      },
      ...workoutLogs
    ]);
  };

  /* ── editing set ── */
  const upd = (fn) => setWorkoutLogs(prev => fn(clone(prev)));
  const findLogIndexById = (arr, id) => arr.findIndex(l => l.id === id);

  const markMissed = (logId, i) => {
    upd(arr => {
      const j = findLogIndexById(arr, logId); if (j < 0) return arr;
      arr[j].sets[i].missed = !arr[j].sets[i].missed;
      return arr;
    });
  };
  const updateField = (logId, i, field, val) => {
    upd(arr => {
      const j = findLogIndexById(arr, logId); if (j < 0) return arr;
      const s = arr[j].sets[i];
      if (field === "name"){ s.name = capWords(val); s.muscleGroup = detectGroup(val); }
      if (field === "reps"){ s.reps = Number(val) || 0; }
      if (field === "weight"){ s.weight = val; }
      if (field === "setsDone"){ s.setsDone = Math.max(0, Number(val) || 0); }
      if (field === "notes"){ s.notes = val; }
      return arr;
    });
  };
  const removeSet = (logId, i) => {
    upd(arr => {
      const j = findLogIndexById(arr, logId); if (j < 0) return arr;
      arr[j].sets.splice(i, 1); return arr;
    });
  };

  const currentLog = (() => {
    if (!selfPlan || !selectedDay) return null;
    return workoutLogs.find(l => l.userId === currentUser.id && l.planId === selfPlan.id && l.planDayIndex === selectedDay) || null;
  })();

  const weekly = useWeeklySummary(workoutLogs, currentUser.id, selfPlan);

  const isExerciseDone = (s) =>
    !s.missed && Number(s.weight) > 0 && Number(s.setsDone) >= Number(s.targetSets);

  const logStatusBadge = (log) => {
    if (!log) return <span className="badge badge-gray">Nessun log</span>;
    if (log.status === "skipped") return <span className="badge badge-orange">Saltato</span>;
    if (log.sets.length>0 && log.sets.every(isExerciseDone)) return <span className="badge badge-green">Completato</span>;
    if (log.sets.some(s=>s.missed)) return <span className="badge badge-red">Parz. non fatti</span>;
    return <span className="badge badge-gray">In corso</span>;
  };

  /* ===== CALENDARIO ===== */
  const [calMode, setCalMode] = useState("weekly"); // "weekly" | "monthly"
  const [calRef, setCalRef] = useState(new Date()); // riferimento vista
  const logsByDate = useMemo(()=>{
    const m = new Map();
    workoutLogs
      .filter(l=>l.userId===currentUser.id)
      .forEach(l=>{
        const arr = m.get(l.date) || [];
        arr.push(l);
        m.set(l.date, arr);
      });
    return m; // Map('YYYY-MM-DD' -> Log[])
  },[workoutLogs,currentUser.id]);

  return (
    <div>
      <div className="hero">
        <div>
          <div className="muted" style={{fontSize:13}}>Prossimo allenamento</div>
          <div style={{fontSize:22,fontWeight:600}}>
            {selfPlan ? <>Giorno {nextIndex} — <span style={{opacity:.9}}>{selfPlan.name}</span></> : "Nessuna scheda attiva"}
          </div>
        </div>
        <div className="row">
          {selfPlan && (<>
            <button className="btn" onClick={()=>startDay(nextIndex)}>Esegui giorno {nextIndex}</button>
            <button className="btn" onClick={()=>skipDay(nextIndex)}>Skippa giorno {nextIndex}</button>
          </>)}
        </div>
      </div>

      {!selfPlan && (
        <div className="card" style={{marginTop:16}}>
          <h3 style={{marginTop:0}}>Attiva una scheda</h3>
          <div className="row" style={{marginTop:8}}>
            <select className="input" defaultValue="">
              <option value="" disabled>Piani assegnati dal PT…</option>
              {assignedPlans.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <button className="btn btn-primary" onClick={(e)=>{
              const sel=e.currentTarget.previousSibling; if(sel && sel.value) setActivePlanForUser(currentUser.id, sel.value);
            }}>Attiva</button>
          </div>
          <div className="row" style={{marginTop:8}}>
            <select className="input" defaultValue="">
              <option value="" disabled>…oppure una tua scheda</option>
              {templates.filter(t=>t.ownerId===currentUser.id).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <button className="btn" onClick={(e)=>{
              const sel=e.currentTarget.previousSibling; if(sel && sel.value) setActivePlanForUser(currentUser.id, sel.value);
            }}>Attiva</button>
          </div>
        </div>
      )}

      {selfPlan && (
        <div className="card" style={{marginTop:16}}>
          <div className="row" style={{justifyContent:"space-between"}}>
            <h3>Calendario scheda</h3>
            <button className="link" onClick={()=>setShowPlan(s=>!s)}>{showPlan?"Nascondi scheda completa":"Vedi scheda completa"}</button>
          </div>
          <div className="muted" style={{fontSize:13, marginBottom:8}}>Clicca un giorno per vederlo/modificarlo</div>
          <div className="daybar">
            {(selfPlan.days||[]).map(d=>{
              const st=dayStatus(d.index);
              const cls=["day",st,(selectedDay===d.index?"selected":""),(nextIndex===d.index?"next":"")].join(" ").trim();
              return <div key={d.index} className={cls} onClick={()=>setSelectedDay(d.index)}>Giorno {d.index}</div>;
            })}
          </div>

          {/* SOLO il giorno selezionato */}
          {!!selectedDay && (
            <div style={{marginTop:12}}>
              <div style={{fontWeight:600, marginBottom:6}}>Giorno {selectedDay} — dettagli</div>
              <ul style={{margin:0, paddingLeft:0, listStyle:"none"}}>
                {(selfPlan.days.find(d=>d.index===selectedDay)?.exercises||[]).map((e,i)=>(
                  <li key={i} style={{border:"1px solid #e5e7eb",borderRadius:10,padding:10,marginTop:6}}>
                    <div style={{fontWeight:600}}>{capWords(e.name)}</div>
                    <div className="muted" style={{fontSize:13, marginTop:6}}>
                      <b>{e.targetSets}×{e.targetReps}</b>
                    </div>
                    <div style={{marginTop:4}}>Kg: <b>{e.targetWeight}</b></div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tutta la scheda (SOLO se espansa) */}
          {showPlan && (
            <div style={{marginTop:12}}>
              {(selfPlan.days||[]).map(d=>(
                <div key={d.index} style={{border:"1px solid #e5e7eb", borderRadius:12, padding:12, marginTop:10}}>
                  <div style={{fontWeight:600, marginBottom:6}}>Giorno {d.index}</div>
                  <ul style={{margin:0, paddingLeft:0, listStyle:"none"}}>
                    {d.exercises.map((e,i)=>(
                      <li key={i} style={{borderTop:i?"1px solid #f1f5f9":"none", paddingTop:i?8:0, marginTop:i?8:0}}>
                        <div style={{fontWeight:500}}>{capWords(e.name)}</div>
                        <div className="muted" style={{fontSize:13}}><b>{e.targetSets}×{e.targetReps}</b></div>
                        <div>Kg: <b>{e.targetWeight}</b></div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {currentLog && (
        <div className="card" style={{marginTop:16}}>
          <div className="row" style={{justifyContent:"space-between"}}>
            <h3 style={{margin:0}}>Log — Giorno {currentLog.planDayIndex} — {currentLog.date}</h3>
            {logStatusBadge(currentLog)}
          </div>

          {currentLog.sets.length===0 ? (
            <div className="muted" style={{marginTop:8}}>Nessun esercizio nel log.</div>
          ) : (
            <ul style={{marginTop:12,paddingLeft:0,listStyle:"none"}}>
              {currentLog.sets.map((s,i)=>{
                const notOk = !(Number(s.setsDone)>=Number(s.targetSets) && Number(s.weight)>0) && !s.missed;
                return (
                  <li key={i} className={`set-row ${s.missed?"missed":""} ${(!notOk && !s.missed)?"done":""}`}>
                    <input className="input" style={{width:220}}
                           value={s.name}
                           onChange={e=>updateField(currentLog.id,i,"name",e.target.value)} />
                    <span className="pill">{s.muscleGroup}</span>

                    <span className="muted" style={{fontSize:13}}>Serie fatte</span>
                    <input type="number" className="input" style={{width:80}}
                           value={s.setsDone ?? 0}
                           onChange={e=>updateField(currentLog.id,i,"setsDone",e.target.value)} />

                    <span className="muted" style={{fontSize:13}}>Reps</span>
                    <input type="number" className="input" style={{width:70}}
                           value={s.reps}
                           onChange={e=>updateField(currentLog.id,i,"reps",e.target.value)} />

                    <span className="muted" style={{fontSize:13}}>Kg</span>
                    <input type="number" className={`input ${notOk && s.setsDone>0 && (!s.weight || Number(s.weight)<=0)?"error":""}`} style={{width:90}}
                           value={s.weight}
                           onChange={e=>updateField(currentLog.id,i,"weight",e.target.value)}
                           placeholder="kg" />

                    <input className="input" style={{flex:1,minWidth:160}}
                           placeholder="Note (facoltative)"
                           value={s.notes}
                           onChange={e=>updateField(currentLog.id,i,"notes",e.target.value)} />

                    <button className="btn" title="Segna NON FATTA" onClick={()=>markMissed(currentLog.id,i)}>✕</button>
                    <button className="btn" title="Rimuovi esercizio" onClick={()=>removeSet(currentLog.id,i)}>🗑</button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Riepilogo (solo serie) */}
      <div className="card" style={{marginTop:16}}>
        <h3>Riepilogo settimanale</h3>
        <WeeklySummary userId={currentUser.id} workoutLogs={workoutLogs} selfPlan={selfPlan}/>
      </div>

      {/* Calendario */}
      <div className="card" style={{marginTop:16}}>
        <div className="row" style={{justifyContent:"space-between"}}>
          <h3>Calendario</h3>
          <div className="row">
            <button className={`btn ${calMode==="weekly"?"btn-primary":""}`} onClick={()=>setCalMode("weekly")}>Settimanale</button>
            <button className={`btn ${calMode==="monthly"?"btn-primary":""}`} onClick={()=>setCalMode("monthly")}>Mensile</button>
          </div>
        </div>

        <CalendarPanel
          mode={calMode}
          refDate={calRef}
          setRefDate={setCalRef}
          logsByDate={logsByDate}
          templates={templates}
        />
      </div>
    </div>
  );
}

/* ===== Riepilogo: Serie fatte + Serie target ===== */
function WeeklySummary({userId, workoutLogs, selfPlan}){
  const {done, target} = useMemo(()=>{
    const sumsDone={}; const sumsTarget={};
    MUSCLE_GROUPS.forEach(g=>{sumsDone[g]=0; sumsTarget[g]=0;});

    const startOfWeek=(d)=>{const x=new Date(d); const dow=(x.getDay()+6)%7; x.setDate(x.getDate()-dow); x.setHours(0,0,0,0); return x;};
    const start=startOfWeek(new Date()); const end=new Date(start); end.setDate(start.getDate()+6);
    const inWeek=(iso)=>{const [y,m,dd]=iso.split("-").map(Number); const d=new Date(y,m-1,dd); return d>=start && d<=end; };

    // Serie fatte (dai log)
    workoutLogs.forEach(l=>{
      if(l.userId!==userId) return;
      if(!inWeek(l.date)) return;
      l.sets.forEach(s=>{
        const g = MUSCLE_GROUPS.includes(s.muscleGroup)?s.muscleGroup:"Altro";
        sumsDone[g] += Number(s.setsDone)||0;
      });
    });

    // Serie target (dal piano attivo, per i giorni loggati in settimana)
    if(selfPlan){
      workoutLogs.forEach(l=>{
        if(l.userId!==userId) return;
        if(!inWeek(l.date)) return;
        const day = selfPlan.days?.find(d=>d.index===l.planDayIndex);
        day?.exercises.forEach(e=>{
          const g = detectGroup(e.name);
          const k = Number(e.targetSets)||0;
          sumsTarget[g] += k;
        });
      });
    }

    return {done:sumsDone, target:sumsTarget};
  },[userId,workoutLogs,selfPlan]);

  return (
    <div className="grid grid-2" style={{marginTop:12}}>
      {MUSCLE_GROUPS.map(g=>(
        <div key={g} style={{border:"1px solid #e5e7eb",borderRadius:12,padding:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontWeight:500}}>{g}</div>
          <div style={{textAlign:"right"}}>
            <div className="muted" style={{fontSize:12}}>Serie fatte</div>
            <div style={{fontWeight:600}}>{done[g]}</div>
            <div className="muted" style={{fontSize:12}}>Serie target</div>
            <div style={{fontWeight:600}}>{target[g]}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ===== Calendario settimanale/mensile con log espandibili ===== */
function CalendarPanel({mode, refDate, setRefDate, logsByDate, templates}){
  const [openDate, setOpenDate] = useState(null);

  const fmtISO = (d)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

  const startOfWeek=(d)=>{const x=new Date(d); const dow=(x.getDay()+6)%7; x.setDate(x.getDate()-dow); x.setHours(0,0,0,0); return x;};

  const days = useMemo(()=>{
    if(mode==="weekly"){
      const start = startOfWeek(refDate);
      return Array.from({length:7},(_,i)=>{const d=new Date(start); d.setDate(start.getDate()+i); return d;});
    } else {
      const first = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
      const last  = new Date(refDate.getFullYear(), refDate.getMonth()+1, 0);
      const start = startOfWeek(first);
      const total = Math.ceil(( (last - start)/(1000*60*60*24) + 1 )/7)*7; // 5 o 6 settimane
      return Array.from({length:total},(_,i)=>{const d=new Date(start); d.setDate(start.getDate()+i); return d;});
    }
  },[mode,refDate]);

  const prev = ()=> setRefDate(d=>{
    const x=new Date(d);
    if(mode==="weekly"){ x.setDate(x.getDate()-7); } else { x.setMonth(x.getMonth()-1); }
    return x;
  });
  const next = ()=> setRefDate(d=>{
    const x=new Date(d);
    if(mode==="weekly"){ x.setDate(x.getDate()+7); } else { x.setMonth(x.getMonth()+1); }
    return x;
  });

  const title = mode==="weekly"
    ? (()=>{const s=startOfWeek(refDate); const e=new Date(s); e.setDate(s.getDate()+6); return `${s.toLocaleDateString()} → ${e.toLocaleDateString()}`;})()
    : refDate.toLocaleDateString(undefined,{month:"long", year:"numeric"});

  return (
    <div>
      <div className="row" style={{justifyContent:"space-between", marginBottom:8}}>
        <div className="muted">{title}</div>
        <div className="row">
          <button className="btn" onClick={prev}>←</button>
          <button className="btn" onClick={next}>→</button>
        </div>
      </div>

      <div className={`calendar ${mode==="weekly"?"cal-7":"cal-7"}`}>
        {mode==="monthly" && ["Lun","Mar","Mer","Gio","Ven","Sab","Dom"].map(h=>(
          <div key={h} className="cal-head">{h}</div>
        ))}
        {days.map((d,i)=>{
          const iso = fmtISO(d);
          const isThisMonth = d.getMonth()===refDate.getMonth();
          const logs = logsByDate.get(iso)||[];
          const has = logs.length>0;
          return (
            <div key={i} className={`cal-cell ${isThisMonth?"":"mute"}`} onClick={()=>setOpenDate(openDate===iso?null:iso)}>
              <div className="cal-date">{d.getDate()}</div>
              {has && <div className="cal-dot" title={`${logs.length} allenamento/i`} />}
              {openDate===iso && has && (
                <div className="cal-pop">
                  {logs.map(l=>{
                    const planName = templates.find(t=>t.id===l.planId)?.name || l.planId;
                    return (
                      <div key={l.id} className="cal-log">
                        <div style={{fontWeight:600}}>{planName} — Giorno {l.planDayIndex}</div>
                        <ul style={{margin:6, paddingLeft:16}}>
                          {l.sets.slice(0,4).map((s,idx)=>(
                            <li key={idx}>
                              {s.name}: {s.setsDone ?? 0}/{s.targetSets}×{s.reps}{Number(s.weight)>0?` @ ${s.weight}kg`:""}
                            </li>
                          ))}
                          {l.sets.length>4 && <li className="muted">…altro</li>}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* Hook: riepilogo settimana (serie fatte/target) */
function useWeeklySummary(workoutLogs, userId, selfPlan){
  const sumsDone={}; const sumsTarget={};
  MUSCLE_GROUPS.forEach(g=>{sumsDone[g]=0; sumsTarget[g]=0;});

  const startOfWeek=(d)=>{const x=new Date(d); const dow=(x.getDay()+6)%7; x.setDate(x.getDate()-dow); x.setHours(0,0,0,0); return x;};
  const start=startOfWeek(new Date()); const end=new Date(start); end.setDate(start.getDate()+6);
  const inWeek=(iso)=>{const [y,m,dd]=iso.split("-").map(Number); const d=new Date(y,m-1,dd); return d>=start && d<=end; };

  workoutLogs.forEach(l=>{
    if(l.userId!==userId) return;
    if(!inWeek(l.date)) return;
    l.sets.forEach(s=>{
      const g = MUSCLE_GROUPS.includes(s.muscleGroup)?s.muscleGroup:"Altro";
      sumsDone[g] += Number(s.setsDone)||0;
    });
  });

  if(selfPlan){
    workoutLogs.forEach(l=>{
      if(l.userId!==userId) return;
      if(!inWeek(l.date)) return;
      const day = selfPlan.days?.find(d=>d.index===l.planDayIndex);
      day?.exercises.forEach(e=>{
        const g = detectGroup(e.name);
        sumsTarget[g] += Number(e.targetSets)||0;
      });
    });
  }

  return {done:sumsDone, target:sumsTarget};
}