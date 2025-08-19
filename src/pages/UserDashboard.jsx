// === START: src/pages/UserDashboard.jsx ===
import { useMemo } from "react";

export default function UserDashboard({
  user,
  activePlan,
  setActivePlanForUser,
  templates,
  setTemplates,
  workoutLogs,
  setWorkoutLogs,
  pushWorkoutLog,
}) {
  const hasPlan = Boolean(activePlan && activePlan.days && activePlan.days.length);

  const nextWorkoutLabel = useMemo(() => {
    if (!hasPlan) return "Nessuna scheda attiva";
    return activePlan.name || "Allenamento";
  }, [hasPlan, activePlan]);

  return (
    <div className="app-main">
      <h2 className="font-semibold" style={{ fontSize: 28, margin: "10px 0 14px" }}>
        Allenamenti
      </h2>

      {/* Banner stato piano */}
      <div className="card" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 }}>
        <div>
          <div className="muted" style={{ marginBottom:6 }}>Prossimo allenamento</div>
          <div style={{ fontSize:28, fontWeight:700 }}>{nextWorkoutLabel}</div>
        </div>
        <div>
          {/* Attiva/Disattiva piano rapido */}
          <select
            className="input"
            value={activePlan?.id || ""}
            onChange={(e)=>{
              const id = e.target.value || null;
              const tpl = templates.find(t => t.id === id) || null;
              setActivePlanForUser(tpl);
            }}
          >
            <option value="">{hasPlan ? "Disattiva piano" : "Scegli una scheda…"}</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.name || "Scheda"}</option>)}
          </select>
        </div>
      </div>

      {/* NOTE:
         Il vecchio "Riepilogo settimanale (serie per gruppo)" è stato rimosso da Home,
         perché ora vive nella pagina "Schede" come pannello dedicato.
      */}
    </div>
  );
}
// === END: src/pages/UserDashboard.jsx ===