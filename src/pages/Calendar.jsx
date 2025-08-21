// === START: src/pages/Calendar.jsx ===
import React, { useEffect, useMemo, useState } from "react";
import {
  addMonths, subMonths,
  startOfMonth, endOfMonth,
  startOfWeek, endOfWeek,
  addDays, isSameMonth, isSameDay, format
} from "date-fns";
import { it } from "date-fns/locale";

/**
 * Props attese:
 * - user
 * - workoutLogs              [{ id?, user_id?, date:'YYYY-MM-DD', entries:[...] }]
 * - pushWorkoutLog           ({date, entries}) => Promise<boolean>
 */
export default function Calendar({ user, workoutLogs, pushWorkoutLog }) {
  const [view, setView] = useState("month");             // "month" | "week"
  const [cursor, setCursor] = useState(new Date());      // data che sto guardando
  const [selected, setSelected] = useState(new Date());  // giorno selezionato
  const [note, setNote] = useState("");

  // mappa date->true per puntino “hai fatto qualcosa”
  const marks = useMemo(() => {
    const m = new Set();
    (workoutLogs || []).forEach(l => m.add(l.date));
    return m;
  }, [workoutLogs]);

  // helper date <-> string
  const d2s = (d) => format(d, "yyyy-MM-dd");
  const dayHasLog = (d) => marks.has(d2s(d));

  // load nota (se presente) dalla entry del giorno (tipo: note)
  useEffect(() => {
    const key = d2s(selected);
    const found = (workoutLogs || []).find(l => l.date === key);
    if (!found) { setNote(""); return; }
    const e = (found.entries || []).find(x => x?.type === "note");
    setNote(e?.text || "");
  }, [selected, workoutLogs]);

  async function saveNote() {
    const key = d2s(selected);
    // Salviamo come entries:[{type:'note', text:'...'}]
    const ok = await pushWorkoutLog({
      date: key,
      entries: note?.trim()
        ? [{ type: "note", text: note.trim() }]
        : [] // svuota la nota se stringa vuota
    });
    // Non serve altro: l’App aggiorna workoutLogs e questo componente si riallinea
  }

  function header() {
    return (
      <div className="card" style={{marginBottom:16, display:"flex", gap:8, alignItems:"center"}}>
        <button className="btn" onClick={()=> setCursor(prev => subMonths(prev,1))}>◀</button>
        <div className="font-semibold" style={{minWidth:180}}>
          {format(cursor, "MMMM yyyy", {locale: it})}
        </div>
        <div style={{flex:1}} />
        <div className="btn-group">
          <button className={`pill ${view==="week"?"active":""}`} onClick={()=>setView("week")}>Settimana</button>
          <button className={`pill ${view==="month"?"active":""}`} onClick={()=>setView("month")}>Mese</button>
        </div>
      </div>
    );
  }

  function cells() {
    const days = [];
    const start = view==="month"
      ? startOfWeek(startOfMonth(cursor), {weekStartsOn:1})
      : startOfWeek(selected, {weekStartsOn:1});
    const end   = view==="month"
      ? endOfWeek(endOfMonth(cursor), {weekStartsOn:1})
      : endOfWeek(selected, {weekStartsOn:1});

    let day = start;
    while(day <= end) {
      const inMonth = isSameMonth(day, cursor);
      const active  = isSameDay(day, selected);

      days.push(
        <button
          key={day.toISOString()}
          onClick={()=> setSelected(day)}
          className="calendar-cell"
          style={{
            width:"100%", aspectRatio:"1 / 1", borderRadius:12,
            background: active ? "rgba(79,70,229,0.08)" : "var(--surface,#f8fafc)",
            outline: active ? "2px solid rgba(79,70,229,0.35)" : "1px solid #eef2f7",
            color: inMonth ? "#0f172a" : "#94a3b8",
            position:"relative"
          }}
          title={format(day,"PPP",{locale:it})}
        >
          <div style={{position:"absolute", top:8, left:10, fontSize:13}}>
            {format(day,"d", {locale:it})}
          </div>
          {dayHasLog(day) && (
            <span style={{
              position:"absolute", right:10, bottom:10, width:6, height:6,
              borderRadius:999, background:"#10b981"
            }}/>
          )}
        </button>
      );
      day = addDays(day,1);
    }

    const cols = 7;
    return (
      <div className="grid" style={{gridTemplateColumns:`repeat(${cols}, 1fr)`, gap:10}}>
        {days}
      </div>
    );
  }

  return (
    <div className="app-main" style={{display:"grid", gridTemplateColumns:"1.3fr 0.7fr", gap:16}}>
      <div>
        {header()}
        {cells()}
      </div>

      <div className="card" style={{position:"sticky", top:12, alignSelf:"start"}}>
        <div className="font-semibold" style={{marginBottom:8}}>
          {format(selected,"EEEE d MMMM yyyy",{locale:it})}
        </div>
        <label className="label">Nota del giorno</label>
        <textarea
          className="input"
          rows={8}
          placeholder="Scrivi una nota…"
          value={note}
          onChange={e=>setNote(e.target.value)}
        />
        <div style={{display:"flex", gap:8, justifyContent:"flex-end", marginTop:10}}>
          <button className="btn" onClick={()=>setNote("")}>Svuota</button>
          <button className="btn btn-primary" onClick={saveNote}>Salva nota</button>
        </div>
        <div className="muted" style={{marginTop:8}}>I giorni con note/allenamenti hanno un puntino verde.</div>
      </div>
    </div>
  );
}
// === END: src/pages/Calendar.jsx ===