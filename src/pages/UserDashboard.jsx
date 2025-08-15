import { useEffect, useMemo, useState } from "react";
import ActivatePlan from "../components/ActivatePlan.jsx";

/**
 * Dashboard Utente – quick polish grafico + calendario sistemato.
 * Non cambia la logica già esistente.
 */
export default function UserDashboard(props) {
  // ---- mapping tollerante dei props ----
  const templates = props.templates || props.myTemplates || [];
  const assignedPlans =
    props.assignedPlans ||
    props.assignedFromPT ||
    props.plansAssigned ||
    props.assignments ||
    [];
  const activePlan = props.activePlanForUser || props.activePlan || null;
  const setActivePlanForUser =
    props.setActivePlanForUser || props.onSetActivePlan || (() => {});
  const workoutLogs = props.workoutLogs || [];
  const currentUser = props.currentUser || null;

  // ------ Hero: nome scheda attiva ------
  const activeName = useMemo(() => {
    if (!activePlan) return null;
    if (typeof activePlan === "string") {
      const found =
        templates.find((t) => String(t.id) === activePlan) ||
        assignedPlans.find((p) => String(p.id) === activePlan);
      return found?.name || null;
    }
    return activePlan?.name || null;
  }, [activePlan, templates, assignedPlans]);

  // ------ Riepilogo settimanale (placeholder) ------
  const weekly = useMemo(() => {
    return [
      { g: "Petto", setsDone: 0, setsTarget: 0 },
      { g: "Schiena", setsDone: 0, setsTarget: 0 },
      { g: "Gambe", setsDone: 0, setsTarget: 0 },
      { g: "Spalle", setsDone: 0, setsTarget: 0 },
      { g: "Bicipiti", setsDone: 0, setsTarget: 0 },
      { g: "Tricipiti", setsDone: 0, setsTarget: 0 },
      { g: "Core", setsDone: 0, setsTarget: 0 },
      { g: "Altro", setsDone: 0, setsTarget: 0 },
    ];
  }, [workoutLogs, activePlan]);

  // ------ Calendario ------
  const [viewMode, setViewMode] = useState(
    () => localStorage.getItem("cf:cal:view") || "month"
  ); // "week" | "month"
  const today = new Date();
  useEffect(() => {
    localStorage.setItem("cf:cal:view", viewMode);
  }, [viewMode]);

  return (
    <div className="container" style={{ padding: 16 }}>
      {/* INTESTAZIONE */}
      <header style={{ marginBottom: 16 }}>
        <h1 className="font-semibold" style={{ fontSize: 20 }}>
          Allenamenti
        </h1>
        {currentUser && (
          <div className="text-slate-600" style={{ fontSize: 13 }}>
            Utente: <strong>{currentUser?.name || currentUser?.id}</strong>
          </div>
        )}
      </header>

      {/* HERO */}
      <section style={{ marginBottom: 16 }}>
        <div className="hero">
          <div className="text-sm" style={{ opacity: 0.9 }}>
            Prossimo allenamento
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>
            {activeName ? activeName : "Nessuna scheda attiva"}
          </div>
        </div>
      </section>

      {/* ATTIVA UNA SCHEDA */}
      <section style={{ marginBottom: 16 }}>
        <ActivatePlan
          templates={templates}
          assignedPlans={assignedPlans}
          activePlan={activePlan}
          onActivate={({ id /*, source*/ }) => {
            setActivePlanForUser(id);
          }}
          onClear={() => setActivePlanForUser(null)}
        />
      </section>

      {/* RIEPILOGO SETTIMANALE */}
      <section style={{ marginBottom: 16 }}>
        <h2 className="font-semibold" style={{ fontSize: 18, marginBottom: 8 }}>
          Riepilogo settimanale
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {weekly.map((r) => (
            <div key={r.g} className="card">
              <div className="font-medium">{r.g}</div>
              <div className="text-right" style={{ marginTop: 6 }}>
                <div className="text-xs text-slate-600">Serie fatte</div>
                <div className="font-semibold">{r.setsDone}</div>
                <div className="text-xs text-slate-600" style={{ marginTop: 6 }}>
                  Serie target
                </div>
                <div className="font-semibold">{r.setsTarget}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CALENDARIO */}
      <section>
        <div className="flex items-center" style={{ display:"flex", gap: 8, marginBottom: 8 }}>
          <h2 className="font-semibold" style={{ fontSize: 18, marginRight: "auto" }}>
            Calendario allenamenti
          </h2>
          <div className="pill">
            <button
              className="btn btn-ghost"
              style={{ padding: "4px 10px", fontSize: 13, ...(viewMode === "week" ? { border: "1px solid #cbd5e1" } : {}) }}
              onClick={() => setViewMode("week")}
            >
              Settimana
            </button>
            <button
              className="btn btn-ghost"
              style={{ padding: "4px 10px", fontSize: 13, ...(viewMode === "month" ? { border: "1px solid #cbd5e1" } : {}) }}
              onClick={() => setViewMode("month")}
            >
              Mese
            </button>
          </div>
        </div>

        <CalendarBlock mode={viewMode} today={today} logs={workoutLogs} />
      </section>
    </div>
  );
}

/* =========================
   CALENDARIO
   Usa classi di index.css: .calendar, .cal-head, .cal-weekdays, .cal-cell, .cal-date, .cal-dot
   ========================= */

function CalendarBlock({ mode = "month", today, logs }) {
  const doneDates = useMemo(
    () => new Set((logs || []).map((l) => l?.date || l?.day || "")),
    [logs]
  );

  if (mode === "week") {
    const week = getCurrentWeekDays(today);
    return (
      <div className="calendar">
        <div className="cal-head">Settimana corrente</div>
        <div className="cal-weekdays">
          {["Lun","Mar","Mer","Gio","Ven","Sab","Dom"].map((w)=>(
            <div key={w}>{w}</div>
          ))}
        </div>
        <div className="grid-cols-7">
          {week.map((d) => (
            <CalendarCell
              key={d.key}
              date={d}
              isDone={doneDates.has(d.iso)}
              isToday={d.isToday}
            />
          ))}
        </div>
      </div>
    );
  }

  // Mese
  const m = getMonthMatrix(today);
  return (
    <div className="calendar">
      <div className="cal-head">{monthLabel(m.year, m.month)} {m.year}</div>
      <div className="cal-weekdays">
        {["Lun","Mar","Mer","Gio","Ven","Sab","Dom"].map((w)=>(
          <div key={w}>{w}</div>
        ))}
      </div>
      <div className="grid-cols-7">
        {m.cells.map((cell, i) => (
          <CalendarCell
            key={i}
            date={cell}
            muted={!cell.inMonth}
            isDone={doneDates.has(cell.iso)}
            isToday={cell.isToday}
          />
        ))}
      </div>
    </div>
  );
}

function CalendarCell({ date, muted=false, isDone=false, isToday=false }) {
  return (
    <div className={`cal-cell ${muted ? "mute" : ""} ${isToday ? "today" : ""}`}>
      <div className="cal-date">{date.d}</div>
      <div className="cal-dot" style={{ opacity: isDone ? 1 : 0.15 }} />
    </div>
  );
}

/* ---------- helpers calendario ---------- */
function pad2(n){return n<10?("0"+n):(""+n)}
function toISO(y,m,d){return `${y}-${pad2(m)}-${pad2(d)}`}
function monthLabel(year,month){
  const labels=["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
  return labels[month-1]||"";
}
function sameDate(a,b){return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate()}

function getCurrentWeekDays(base){
  const today=new Date(base);
  const start=new Date(today);
  const weekday=(today.getDay()+6)%7; // 0 lun ... 6 dom
  start.setDate(today.getDate()-weekday);
  const out=[];
  for(let i=0;i<7;i++){
    const d=new Date(start); d.setDate(start.getDate()+i);
    const y=d.getFullYear(), m=d.getMonth()+1, dd=d.getDate();
    out.push({y,m,d:dd, iso:toISO(y,m,dd), key:`${y}-${m}-${dd}`, isToday:sameDate(d,new Date())});
  }
  return out;
}

function getMonthMatrix(base){
  const now=new Date();
  const d=new Date(base);
  const year=d.getFullYear(), month=d.getMonth()+1;

  const first=new Date(year,month-1,1);
  const startOffset=(first.getDay()+6)%7; // 0 lun ... 6 dom
  const lastDay=new Date(year,month,0).getDate();

  const cells=[];

  const prevLast=new Date(year,month-1,0).getDate();
  for(let i=startOffset;i>0;i--){
    const day=prevLast-i+1;
    const y=month===1?year-1:year;
    const m=month===1?12:month-1;
    const date=new Date(y,m-1,day);
    cells.push({y,m,d:day,inMonth:false,iso:toISO(y,m,day),isToday:sameDate(date,now)});
  }
  for(let day=1; day<=lastDay; day++){
    const y=year,m=month,date=new Date(y,m-1,day);
    cells.push({y,m,d:day,inMonth:true,iso:toISO(y,m,day),isToday:sameDate(date,now)});
  }
  const rest=(7-(cells.length%7))%7;
  for(let i=1;i<=rest;i++){
    const y=month===12?year+1:year;
    const m=month===12?1:month+1;
    const date=new Date(y,m-1,i);
    cells.push({y,m,d:i,inMonth:false,iso:toISO(y,m,i),isToday:sameDate(date,now)});
  }
  return {year,month,cells};
}