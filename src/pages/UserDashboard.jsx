// === START: src/pages/UserDashboard.jsx ===
import { useMemo } from "react";

/**
 * Piccolo calendario: mostra la settimana corrente (lun→dom),
 * evidenzia "oggi". Nessuna dipendenza esterna.
 */
function WeekCalendar() {
  const days = useMemo(() => {
    const now = new Date();
    const dow = (now.getDay() + 6) % 7; // 0 = lunedì
    const monday = new Date(now);
    monday.setDate(now.getDate() - dow);

    const arr = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, []);

  const todayKey = new Date().toDateString();

  const W = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="font-semibold" style={{ marginBottom: 12 }}>Calendario (settimana corrente)</div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: 8
      }}>
        {days.map((d, i) => {
          const isToday = d.toDateString() === todayKey;
          return (
            <div
              key={i}
              className="chip"
              style={{
                padding: "10px 8px",
                textAlign: "center",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                background: isToday ? "rgba(99,102,241,0.08)" : "#fff"
              }}
              title={d.toLocaleDateString()}
            >
              <div style={{ fontSize: 12, opacity: 0.7 }}>{W[i]}</div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{d.getDate()}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Box per attivare una scheda come piano corrente dell’utente.
 */
function ActivatePlanBox({ activePlan, templates, onActivate }) {
  const hasActive = Boolean(activePlan?.id);

  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="font-semibold" style={{ marginBottom: 12 }}>Inizia subito</div>

      <div className="muted" style={{ marginBottom: 8 }}>
        {hasActive ? `Piano attivo: ${activePlan.name}` : "Nessuna scheda attiva"}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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

export default function UserDashboard({
  user,
  activePlan,
  setActivePlanForUser,
  templates,
}) {
  return (
    <div className="app-main">
      <h2 className="font-semibold" style={{ fontSize: 28, margin: "10px 0 14px" }}>
        Allenamenti — Utente: <span className="font-medium">{user?.name}</span>
      </h2>

      <div className="tpl-grid" style={{ gridTemplateColumns: "1fr 1fr", alignItems: "start" }}>
        {/* Colonna sinistra: calendario */}
        <WeekCalendar />

        {/* Colonna destra: attivazione piano */}
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
