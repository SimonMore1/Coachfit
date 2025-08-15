import { useEffect, useMemo, useState } from "react";
import ActivatePlan from "../components/ActivatePlan.jsx";

/**
 * Dashboard Utente – mock interattivo per testare UX:
 * - CTA se non c'è una scheda attiva (selettore + "piano veloce")
 * - Calendario cliccabile con pannello per segnarlo completato + nota
 * - Riepilogo settimanale aggiornato
 *
 * Non richiede backend; i completamenti aggiunti vivono in stato locale
 * (unito ai workoutLogs eventualmente passati dal parent).
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
  const workoutLogsProp = props.workoutLogs || [];
  const currentUser = props.currentUser || null;

  // ---- mock: logs locali (per marcare giorni completati senza toccare il parent) ----
  const [logsLocal, setLogsLocal] = useState([]);
  const allLogs = useMemo(
    () => [...workoutLogsProp, ...logsLocal],
    [workoutLogsProp, logsLocal]
  );

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

  // ------ Riepilogo settimanale (serie fatte = giorni completati nella settimana) ------
  const weekly = useWeeklySummary(allLogs);

  // ------ Calendario ------
  const [viewMode, setViewMode] = useState(
    () => localStorage.getItem("cf:cal:view") || "month"
  ); // "week" | "month"
  useEffect(() => {
    localStorage.setItem("cf:cal:view", viewMode);
  }, [viewMode]);

  const today = new Date();

  // ------ Pannello Giorno selezionato ------
  const [panel, setPanel] = useState(null); // { iso, label, note }
  const isDoneDate = useMemo(() => {
    const set = new Set(allLogs.map((l) => l?.date || l?.day || ""));
    return (iso) => set.has(iso);
  }, [allLogs]);

  function markDone(iso, note) {
    // se in futuro il parent ci passa un setWorkoutLogs, usalo qui
    setLogsLocal((prev) => {
      if (prev.some((l) => l.date === iso)) return prev; // idempotente
      return [...prev, { date: iso, note: note || "" }];
    });
    setPanel(null);
  }

  function clearDone(iso) {
    setLogsLocal((prev) => prev.filter((l) => l.date !== iso));
    setPanel(null);
  }

  // ------ CTA: crea piano veloce ------
  function createQuickPlan() {
    const quick = {
      id: "quick-" + Date.now(),
      name: "Piano Veloce",
      days: [
        { day: 1, title: "Giorno 1", exercises: [] },
        { day: 2, title: "Giorno 2", exercises: [] },
        { day: 3, title: "Giorno 3", exercises: [] },
      ],
    };
    // attiva con solo id (rispetta la firma che già usi)
    setActivePlanForUser(quick.id);
    // (opzionale) potresti salvarlo in localStorage se vuoi riusarlo
  }

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

      {/* SE NON C'È UNA SCHEDA ATTIVA → CTA veloci */}
      {!activePlan && (
        <section className="card" style={{ marginBottom: 16 }}>
          <div className="font-medium" style={{ marginBottom: 8 }}>
            Inizia subito
          </div>
          <div className="pill" style={{ gap: 10, flexWrap: "wrap" }}>
            <span className="text-slate-600" style={{ fontSize: 13 }}>
              Attiva un piano:
            </span>
            {/* 1) Selettore già pronto */}
            <ActivatePlan
              templates={templates}
              assignedPlans={assignedPlans}
              activePlan={activePlan}
              onActivate={({ id }) => setActivePlanForUser(id)}
              onClear={() => setActivePlanForUser(null)}
            />
            {/* 2) Piano veloce */}
            <button className="btn btn-primary" onClick={createQuickPlan}>
              Crea un piano veloce
            </button>
          </div>
        </section>
      )}

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
        <div
          className="flex items-center"
          style={{ display: "flex", gap: 8, marginBottom: 8 }}
        >
          <h2 className="font-semibold" style={{ fontSize: 18, marginRight: "auto" }}>
            Calendario allenamenti
          </h2>
          <div className="pill">
            <button
              className="btn btn-ghost"
              style={{
                padding: "4px 10px",
                fontSize: 13,
                ...(viewMode === "week" ? { border: "1px solid #cbd5e1" } : {}),
              }}
              onClick={() => setViewMode("week")}
            >
              Settimana
            </button>
            <button
              className="btn btn-ghost"
              style={{
                padding: "4px 10px",
                fontSize: 13,
                ...(viewMode === "month" ? { border: "1px solid #cbd5e1" } : {}),
              }}
              onClick={() => setViewMode("month")}
            >
              Mese
            </button>
          </div>
        </div>

        <CalendarBlock
          mode={viewMode}
          today={today}
          logs={allLogs}
          onPickDay={(d) => setPanel({ iso: d.iso, label: dayLabel(d) })}
          isDoneDate={isDoneDate}
        />
      </section>

      {/* PANNELLO GIORNO */}
      {panel && (
        <DayPanel
          iso={panel.iso}
          label={panel.label}
          defaultNote={
            allLogs.find((l) => (l?.date || l?.day) === panel.iso)?.note || ""
          }
          isDone={isDoneDate(panel.iso)}
          onClose={() => setPanel(null)}
          onDone={(note) => markDone(panel.iso, note)}
          onClear={() => clearDone(panel.iso)}
        />
      )}
    </div>
  );
}

/* =========================
   RIEPILOGO settimanale mock
   ========================= */
function useWeeklySummary(allLogs) {
  const startOfWeek = getWeekStart(new Date()); // lunedì
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const doneThisWeek = new Set(
    allLogs
      .map((l) => l?.date || l?.day || "")
      .filter((iso) => {
        const d = isoToDate(iso);
        return d >= startOfWeek && d <= endOfWeek;
      })
  );

  const groups = [
    "Petto",
    "Schiena",
    "Gambe",
    "Spalle",
    "Bicipiti",
    "Tricipiti",
    "Core",
    "Altro",
  ];

  return groups.map((g) => ({
    g,
    setsDone: doneThisWeek.size, // mock: 1 allenamento = 1 "serie fatta"
    setsTarget: 4, // mock: target fisso a 4 per ora
  }));
}

/* =========================
   CALENDARIO
   ========================= */

function CalendarBlock({ mode = "month", today, logs, onPickDay, isDoneDate }) {
  const week = useMemo(() => getCurrentWeekDays(today), [today]);
  const month = useMemo(() => getMonthMatrix(today), [today]);

  if (mode === "week") {
    return (
      <div className="calendar">
        <div className="cal-head">Settimana corrente</div>
        <div className="cal-weekdays">
          {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>
        <div className="grid-cols-7">
          {week.map((d) => (
            <CalendarCell
              key={d.key}
              date={d}
              isToday={d.isToday}
              muted={false}
              isDone={isDoneDate(d.iso)}
              onClick={() => onPickDay(d)}
            />
          ))}
        </div>
      </div>
    );
  }

  // mese
  return (
    <div className="calendar">
      <div className="cal-head">
        {monthLabel(month.year, month.month)} {month.year}
      </div>
      <div className="cal-weekdays">
        {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>
      <div className="grid-cols-7">
        {month.cells.map((cell, i) => (
          <CalendarCell
            key={i}
            date={cell}
            isToday={cell.isToday}
            muted={!cell.inMonth}
            isDone={isDoneDate(cell.iso)}
            onClick={() => onPickDay(cell)}
          />
        ))}
      </div>
    </div>
  );
}

function CalendarCell({ date, muted, isDone, isToday, onClick }) {
  return (
    <div
      className={`cal-cell ${muted ? "mute" : ""} ${isToday ? "today" : ""}`}
      onClick={onClick}
      style={{ cursor: "pointer" }}
      title={`${date.d}/${date.m} ${date.y}`}
    >
      <div className="cal-date">{date.d}</div>
      <div className="cal-dot" style={{ opacity: isDone ? 1 : 0.15 }} />
    </div>
  );
}

/* =========================
   PANNELLO GIORNO
   ========================= */
function DayPanel({ iso, label, defaultNote, isDone, onClose, onDone, onClear }) {
  const [note, setNote] = useState(defaultNote || "");
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width: 420, maxWidth: "100%", background: "#fff" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-semibold" style={{ fontSize: 18 }}>
          {label}
        </div>

        <div className="text-slate-600" style={{ fontSize: 13, marginTop: 6 }}>
          {iso}
        </div>

        <div style={{ marginTop: 12 }}>
          <div className="text-slate-600" style={{ fontSize: 13, marginBottom: 6 }}>
            Note (opzionale)
          </div>
          <textarea
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Es: stanco, ho ridotto il volume…"
            style={{
              width: "100%",
              minHeight: 80,
              resize: "vertical",
              borderRadius: 12,
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
          {isDone ? (
            <button className="btn" onClick={() => onClear()}>
              Cancella completato
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => onDone(note)}>
              Segna completato
            </button>
          )}
          <button className="btn" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================
   HELPERS
   ========================= */
function pad2(n){return n<10?("0"+n):(""+n)}
function toISO(y,m,d){return `${y}-${pad2(m)}-${pad2(d)}`}
function isoToDate(iso){const [y,m,d]=iso.split("-").map(Number); return new Date(y,(m-1),d)}
function monthLabel(year,month){
  const labels=["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
  return labels[month-1]||"";
}
function sameDate(a,b){return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate()}
function getWeekStart(d0){
  const d=new Date(d0); const wd=(d.getDay()+6)%7; d.setHours(0,0,0,0); d.setDate(d.getDate()-wd); return d;
}
function dayLabel(d){return `${pad2(d.d)}/${pad2(d.m)} ${d.y}`}

function getCurrentWeekDays(base){
  const today=new Date(base);
  const start=getWeekStart(today);
  const out=[];
  for(let i=0;i<7;i++){
    const dd=new Date(start); dd.setDate(start.getDate()+i);
    const y=dd.getFullYear(), m=dd.getMonth()+1, d=dd.getDate();
    out.push({y,m,d, iso:toISO(y,m,d), key:`${y}-${m}-${d}`, isToday:sameDate(dd,new Date())});
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