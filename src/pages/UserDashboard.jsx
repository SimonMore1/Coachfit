// === START: src/pages/UserDashboard.jsx ===
import { useEffect, useMemo, useState } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay } from "date-fns";
import { it } from "date-fns/locale";

/**
 * Props attese:
 *  - user
 *  - activePlan               { id, name, days: [...] } | null
 *  - setActivePlanForUser     (tpl|null) => Promise
 *  - templates                [{id,name,days}]
 *  - workoutLogs              [{id?, user_id?, date: 'YYYY-MM-DD', entries: [...] }]
 *  - setWorkoutLogs           (fn)
 *  - pushWorkoutLog           ({date, entries}) => Promise<boolean>
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
  // ---------------- Banner "Inizia subito" (sopra al calendario)
  const [pendingTplId, setPendingTplId] = useState(activePlan?.id || "");
  useEffect(() => setPendingTplId(activePlan?.id || ""), [activePlan?.id]);

  async function handleActivate() {
    const tpl = templates.find(t => t.id === pendingTplId) || null;
    await setActivePlanForUser(tpl);
  }

  // ---------------- Calendario
  const [view, setView] = useState("month"); // "month" | "week" (toggle a piacere)
  const [cursor, setCursor] = useState(new Date());
  const logsByDay = useMemo(() => {
    const m = new Map();
    for (const l of workoutLogs || []) {
      m.set(l.date, true);
    }
    return m;
  }, [workoutLogs]);

  function toKey(d) { return format(d, "yyyy-MM-dd"); }
  function DayCell({ day }) {
    const k = toKey(day);
    const trained = logsByDay.has(k);
    return (
      <div className={`cal-day ${isSameMonth(day, cursor) ? "" : "muted"} ${isSameDay(day, new Date()) ? "today" : ""}`}>
        <div className="cal-day-num">{format(day, "d", { locale: it })}</div>
        {trained && <span className="dot-trained" title="Allenamento registrato" />}
      </div>
    );
  }

  const monthGrid = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { locale: it });
    const end = endOfWeek(endOfMonth(cursor), { locale: it });
    const days = [];
    let d = start;
    while (d <= end) {
      days.push(d);
      d = addDays(d, 1);
    }
    return days;
  }, [cursor]);

  // ---------------- Vista esecuzione del PIANO ATTIVO
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  useEffect(() => setSelectedDayIdx(0), [activePlan?.id]);

  // Costruisci la sessione "in esecuzione"
  const session = useMemo(() => {
    if (!activePlan?.days?.length) return null;
    const day = activePlan.days[selectedDayIdx] || activePlan.days[0];
    // entries: per ogni esercizio creo un array di 'sets' con done=false
    const entries = (day.exercises || []).map(ex => {
      const setsCount = Number(ex.sets || 3);
      return {
        exerciseId: ex.id,
        name: ex.name,
        muscle: ex.group || "",
        equipment: ex.equipment || "",
        sets: Array.from({ length: Math.max(1, setsCount) }, () => ({
          reps: Number(ex.reps || 10),
          kg: ex.kg ?? null,
          done: false,
        })),
        note: "",
      };
    });
    return { dayName: day.name, entries };
  }, [activePlan?.id, selectedDayIdx]);

  // Stato mutabile *solo* per la sessione corrente
  const [runEntries, setRunEntries] = useState([]);
  useEffect(() => {
    setRunEntries(session?.entries || []);
  }, [session?.dayName]);

  function toggleDone(eIdx, sIdx) {
    setRunEntries(prev =>
      prev.map((e, i) =>
        i !== eIdx ? e : {
          ...e,
          sets: e.sets.map((s, j) => j !== sIdx ? s : { ...s, done: !s.done })
        }
      )
    );
  }
  function setField(eIdx, sIdx, field, value) {
    setRunEntries(prev =>
      prev.map((e, i) =>
        i !== eIdx ? e : {
          ...e,
          sets: e.sets.map((s, j) => j !== sIdx ? s : { ...s, [field]: value })
        }
      )
    );
  }
  function setNote(eIdx, value) {
    setRunEntries(prev =>
      prev.map((e, i) => i !== eIdx ? e : { ...e, note: value })
    );
  }

  async function saveSession() {
    const date = format(new Date(), "yyyy-MM-dd");
    const ok = await pushWorkoutLog({ date, entries: runEntries });
    if (ok) {
      // aggiorno la lista locale per marcare il calendario
      setWorkoutLogs(prev => [{ id: crypto.randomUUID(), date, entries: runEntries }, ...prev]);
      alert("Allenamento salvato!"); // semplice feedback
    } else {
      alert("Errore nel salvataggio.");
    }
  }

  // ---------------- UI
  return (
    <div className="app-main">
      <h2 className="font-semibold" style={{ fontSize: 28, margin: "10px 0 14px" }}>
        Allenamenti — Utente: <span className="font-medium">{user?.name}</span>
      </h2>

      {/* Banner INIZIA SUBITO sopra il calendario */}
      <div className="card" style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div className="muted" style={{ marginBottom: 4 }}>Inizia subito</div>
          <div className="muted">Piano attivo: <strong>{activePlan?.name || "Nessuno"}</strong></div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select className="input" value={pendingTplId} onChange={e => setPendingTplId(e.target.value)}>
            <option value="">— Scegli una scheda —</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button className="btn btn-primary" onClick={handleActivate}>Attiva</button>
        </div>
      </div>

      {/* Layout a due colonne: Calendario + Esecuzione */}
      <div className="grid" style={{ gridTemplateColumns: "1.2fr .8fr", gap: 16 }}>
        {/* COLONNA 1: Calendario */}
        <div className="card">
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <button className="btn" onClick={() => setCursor(subMonths(cursor, 1))}>◀</button>
            <div className="muted" style={{ minWidth: 160 }}>{format(cursor, "MMMM yyyy", { locale: it })}</div>
            <button className="btn" onClick={() => setCursor(addMonths(cursor, 1))}>▶</button>
            <div style={{ flex: 1 }} />
            <button className={`btn ${view === "week" ? "btn-primary" : ""}`} onClick={() => setView("week")}>Settimana</button>
            <button className={`btn ${view === "month" ? "btn-primary" : ""}`} onClick={() => setView("month")}>Mese</button>
          </div>

          {/* Header giorni */}
          <div className="cal-grid cal-head">
            {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map(d => <div key={d} className="cal-head-cell">{d}</div>)}
          </div>

          {/* Griglia giorni (mese) */}
          <div className="cal-grid">
            {monthGrid.map((d, i) => <DayCell key={i} day={d} />)}
          </div>
        </div>

        {/* COLONNA 2: Vista esecuzione */}
        <div className="card">
          {!activePlan ? (
            <div className="muted">Nessun piano attivo. Seleziona una scheda nel riquadro “Inizia subito” e premi <strong>Attiva</strong>.</div>
          ) : !session ? (
            <div className="muted">Questa scheda non contiene giorni o esercizi.</div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div className="font-semibold">Allenamento di oggi</div>
                <select className="input" value={selectedDayIdx} onChange={e => setSelectedDayIdx(Number(e.target.value))}>
                  {activePlan.days.map((d, idx) => <option key={d.id || idx} value={idx}>{d.name}</option>)}
                </select>
              </div>

              {runEntries.length === 0 && <div className="muted">Nessun esercizio in questo giorno.</div>}

              <ul className="run-list">
                {runEntries.map((ex, eIdx) => (
                  <li key={eIdx} className="run-card">
                    <div className="chip solid" style={{ marginBottom: 8 }}>{ex.name}</div>

                    {/* set row */}
                    <div className="sets-row">
                      {ex.sets.map((s, sIdx) => (
                        <label key={sIdx} className={`set-pill ${s.done ? "done" : ""}`}>
                          <input
                            type="checkbox"
                            checked={s.done}
                            onChange={() => toggleDone(eIdx, sIdx)}
                          />
                          <span>Set {sIdx + 1}</span>
                          <input
                            className="input mini"
                            type="number"
                            value={s.reps}
                            onChange={e => setField(eIdx, sIdx, "reps", Number(e.target.value))}
                            title="Ripetizioni"
                            placeholder="Reps"
                          />
                          <input
                            className="input mini"
                            type="number"
                            value={s.kg ?? ""}
                            onChange={e => setField(eIdx, sIdx, "kg", e.target.value === "" ? null : Number(e.target.value))}
                            title="Kg (opz.)"
                            placeholder="Kg"
                          />
                        </label>
                      ))}
                    </div>

                    <input
                      className="input"
                      placeholder="Note (opzionali)"
                      value={ex.note}
                      onChange={e => setNote(eIdx, e.target.value)}
                    />
                  </li>
                ))}
              </ul>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                <button className="btn btn-primary" onClick={saveSession}>Salva sessione</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
// === END: src/pages/UserDashboard.jsx ===