// === START: src/pages/UserDashboard.jsx ===
import { useEffect, useMemo, useState } from "react";

// ---------- util date ----------
function toISO(d) {
  const z = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}
function startOfWeekMonday(d) {
  const copy = new Date(d);
  const day = (copy.getDay() + 6) % 7; // 0 = lun
  copy.setDate(copy.getDate() - day);
  copy.setHours(0,0,0,0);
  return copy;
}
function startOfMonth(d) {
  const copy = new Date(d.getFullYear(), d.getMonth(), 1);
  copy.setHours(0,0,0,0);
  return copy;
}
function addDays(d, n) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}
function getMonthGrid(base) {
  // ritorna 42 giorni (6 settimane) per la griglia mese
  const first = startOfMonth(base);
  const gridStart = startOfWeekMonday(first);
  const days = [];
  for (let i = 0; i < 42; i++) days.push(addDays(gridStart, i));
  return days;
}
function weekDays(base) {
  const start = startOfWeekMonday(base);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

// ---------- storage (per utente) ----------
function loadCalendarData(userId) {
  try {
    const raw = localStorage.getItem(`coachfit-calendar-${userId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function saveCalendarData(userId, data) {
  localStorage.setItem(`coachfit-calendar-${userId}`, JSON.stringify(data || {}));
}

/**
 * Box per attivare una scheda come piano corrente dell’utente.
 * (lasciata invariata come richiesto)
 */
function ActivatePlanBox({ activePlan, templates, onActivate }) {
  const hasActive = Boolean(activePlan?.id);

  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="font-semibold" style={{ marginBottom: 12 }}>Inizia subito</div>

      <div className="muted" style={{ marginBottom: 8 }}>
        {hasActive ? `Piano attivo: ${activePlan.name}` : "Nessuna scheda attiva"}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select
          className="input"
          id="select-template"
          defaultValue=""
          style={{ minWidth: 220 }}
        >
          <option value="" disabled>— Scegli una scheda —</option>
          {templates.map(t => (
            <option key={t.id} value={t.id}>{t.name || "Scheda senza titolo"}</option>
          ))}
        </select>

        <button
          className="btn btn-primary"
          onClick={() => {
            const sel = document.getElementById("select-template");
            const id = sel?.value || "";
            const chosen = templates.find(t => t.id === id) || null;
            onActivate(chosen);
          }}
        >
          Attiva
        </button>
      </div>
    </div>
  );
}

/**
 * Calendario con toggle Mese/Settimana.
 * - Mostra dot verde sui giorni "allenato".
 * - Clic su giorno apre pannello note/allenato.
 * - Dati salvati in localStorage per utente.
 */
function Calendar({
  userId,
  view, setView,
  anchorDate, setAnchorDate,
  data, setData
}) {
  const today = new Date();
  const todayISO = toISO(today);

  const weekdaysShort = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

  const monthDays = useMemo(() => getMonthGrid(anchorDate), [anchorDate]);
  const week = useMemo(() => weekDays(anchorDate), [anchorDate]);

  // selezione giorno per note
  const [selectedDate, setSelectedDate] = useState(null);
  const selectedISO = selectedDate ? toISO(selectedDate) : null;
  const selectedEntry = selectedISO ? data[selectedISO] || { trained: false, note: "" } : null;

  function prev() {
    if (view === "month") {
      const d = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - 1, 1);
      setAnchorDate(d);
    } else {
      setAnchorDate(addDays(anchorDate, -7));
    }
  }
  function next() {
    if (view === "month") {
      const d = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 1);
      setAnchorDate(d);
    } else {
      setAnchorDate(addDays(anchorDate, +7));
    }
  }
  function goToday() {
    setAnchorDate(new Date());
  }

  function toggleTrainedFor(dateObj) {
    const iso = toISO(dateObj);
    const entry = data[iso] || { trained: false, note: "" };
    const next = { ...data, [iso]: { ...entry, trained: !entry.trained } };
    setData(next);
    saveCalendarData(userId, next);
  }
  function saveNoteFor(dateObj, note) {
    const iso = toISO(dateObj);
    const entry = data[iso] || { trained: false, note: "" };
    const next = { ...data, [iso]: { ...entry, note } };
    setData(next);
    saveCalendarData(userId, next);
  }

  // header mese/settimana
  const monthTitle = anchorDate.toLocaleDateString("it-IT", { month: "long", year: "numeric" });

  return (
    <div className="card calendar">
      {/* Head */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div className="cal-head" style={{ margin: 0, textTransform: "capitalize" }}>
          {monthTitle}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn" onClick={prev}>◀</button>
          <button className="btn" onClick={goToday}>Oggi</button>
          <button className="btn" onClick={next}>▶</button>
          <div className="pill">
            <button
              className={`btn-ghost ${view === "week" ? "active" : ""}`}
              onClick={() => setView("week")}
              style={{ padding: "6px 10px" }}
            >
              Settimana
            </button>
            <button
              className={`btn-ghost ${view === "month" ? "active" : ""}`}
              onClick={() => setView("month")}
              style={{ padding: "6px 10px" }}
            >
              Mese
            </button>
          </div>
        </div>
      </div>

      {/* intestazione giorni */}
      <div className="cal-weekdays">
        {weekdaysShort.map((w) => <div key={w}>{w}</div>)}
      </div>

      {/* griglia */}
      {view === "month" ? (
        <div className="grid-cols-7">
          {monthDays.map((d, idx) => {
            const dISO = toISO(d);
            const isMute = d.getMonth() !== anchorDate.getMonth();
            const isToday = dISO === todayISO;
            const entry = data[dISO];
            const trained = Boolean(entry?.trained);
            return (
              <div
                key={idx}
                className={`cal-cell ${isMute ? "mute" : ""} ${isToday ? "today" : ""}`}
                onClick={() => setSelectedDate(new Date(d))}
                title={d.toLocaleDateString()}
                style={{ cursor: "pointer" }}
              >
                <div className="cal-date">{d.getDate()}</div>
                {trained && <div className="cal-dot" />}
                {entry?.note && (
                  <div style={{ position:"absolute", left:10, bottom:10, fontSize:11, color:"#64748b", maxWidth:"80%" }}>
                    📝 {entry.note.length > 18 ? entry.note.slice(0,18) + "…" : entry.note}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid-cols-7">
          {week.map((d, idx) => {
            const dISO = toISO(d);
            const isToday = dISO === todayISO;
            const entry = data[dISO];
            const trained = Boolean(entry?.trained);
            return (
              <div
                key={idx}
                className={`cal-cell ${isToday ? "today" : ""}`}
                onClick={() => setSelectedDate(new Date(d))}
                title={d.toLocaleDateString()}
                style={{ cursor: "pointer" }}
              >
                <div className="cal-date">{d.getDate()}</div>
                {trained && <div className="cal-dot" />}
                {entry?.note && (
                  <div style={{ position:"absolute", left:10, bottom:10, fontSize:11, color:"#64748b", maxWidth:"80%" }}>
                    📝 {entry.note.length > 18 ? entry.note.slice(0,18) + "…" : entry.note}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* pannello note/allenato */}
      {selectedDate && (
        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div className="font-semibold">
              {selectedDate.toLocaleDateString("it-IT", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
            </div>
            <button className="btn" onClick={() => setSelectedDate(null)}>Chiudi</button>
          </div>

          <div style={{ display:"flex", gap:10, alignItems:"center", marginTop:10, flexWrap:"wrap" }}>
            <label className="pill" style={{ gap:10, cursor:"pointer" }}>
              <input
                type="checkbox"
                checked={Boolean(selectedEntry?.trained)}
                onChange={() => toggleTrainedFor(selectedDate)}
              />
              Segna come allenato
            </label>

            <input
              className="input"
              style={{ minWidth: 280, flex: "1 1 280px" }}
              placeholder="Note del giorno…"
              value={selectedEntry?.note || ""}
              onChange={(e) => saveNoteFor(selectedDate, e.target.value)}
            />
          </div>
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
}) {
  const userId = user?.id || "user-1";

  // stato calendario per utente
  const [calView, setCalView] = useState("month"); // "month" | "week"
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [calData, setCalData] = useState({}); // { "YYYY-MM-DD": { trained:boolean, note:string } }

  useEffect(() => {
    // carica quando cambia utente
    setCalData(loadCalendarData(userId));
  }, [userId]);

  return (
    <div className="app-main">
      <h2 className="font-semibold" style={{ fontSize: 28, margin: "10px 0 14px" }}>
        Allenamenti — Utente: <span className="font-medium">{user?.name}</span>
      </h2>

      <div className="tpl-grid" style={{ gridTemplateColumns: "1.2fr .8fr", alignItems: "start" }}>
        {/* Colonna sinistra: calendario (mese/settimana + note + segna allenato) */}
        <Calendar
          userId={userId}
          view={calView}
          setView={setCalView}
          anchorDate={anchorDate}
          setAnchorDate={setAnchorDate}
          data={calData}
          setData={setCalData}
        />

        {/* Colonna destra: attivazione piano (lasciata invariata) */}
        <ActivatePlanBox
          activePlan={activePlan}
          templates={templates}
          onActivate={(tpl) => setActivePlanForUser(tpl)}
        />
      </div>
    </div>
  );
}
// === END: src/pages/UserDashboard.jsx ===