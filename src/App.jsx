// === START: src/App.jsx ===
import React, { useEffect, useMemo, useState } from "react";
import "./index.css";

import UserDashboard from "./pages/UserDashboard.jsx";
import TemplateBuilder from "./pages/TemplateBuilder.jsx";
import PTDashboard from "./pages/PTDashboard.jsx";
import Calendar from "./pages/Calendar.jsx";

import { DEMO_USERS, DEMO_PATIENTS } from "./utils.js";
import {
  getTemplates, upsertTemplate, deleteTemplate,
  getActivePlan, setActivePlan,
  getWorkoutLogs, addWorkoutLog
} from "./data";

// ---------------- Navbar ----------------
function Navbar({ user, page, setPage, UserSwitcher }) {
  const isCoach =
    user?.role?.toUpperCase?.() === "PT" ||
    user?.role?.toUpperCase?.() === "COACH" ||
    (typeof user?.id === "string" && user.id.startsWith("pt-"));

  return (
    <header className="app-header">
      <div className="brand">
        <span className="dot"></span>
        <span className="brand-name">CoachFit</span>
        <span className="badge">MVP</span>
      </div>
      <div className="header-actions">
        {UserSwitcher ? <UserSwitcher /> : null}
        <nav className="tabs">
          <button className={`pill ${page==="allenamenti"?"active":""}`} onClick={()=>setPage("allenamenti")}>Allenamenti</button>
          <button className={`pill ${page==="cal"?"active":""}`} onClick={()=>setPage("cal")}>Calendario</button>
          <button className={`pill ${page==="schede"?"active":""}`} onClick={()=>setPage("schede")}>Schede</button>
          {isCoach && (
            <button className={`pill ${page==="pt"?"active":""}`} onClick={()=>setPage("pt")}>PT</button>
          )}
        </nav>
      </div>
    </header>
  );
}

// ---------------- App ----------------
export default function App(){
  const [users] = useState(DEMO_USERS);
  const [currentUserId, setCurrentUserId] = useState(users[0]?.id || "");
  const currentUser = useMemo(
    ()=> users.find(u=>u.id===currentUserId),
    [users, currentUserId]
  );

  const [page, setPage] = useState("allenamenti");

  // Stato cloud
  const [templates, setTemplatesState] = useState([]);       // [{id,name,days}]
  const [activePlan, setActivePlanState] = useState(null);   // {id,name,days}
  const [workoutLogs, setWorkoutLogsState] = useState([]);

  // Carica dati quando cambia utente
  useEffect(()=>{
    async function load() {
      const [tpls, plan, logs] = await Promise.all([
        getTemplates(currentUserId),
        getActivePlan(currentUserId),
        getWorkoutLogs(currentUserId)
      ]);
      setTemplatesState(tpls);
      setActivePlanState(plan);
      setWorkoutLogsState(logs);
    }
    load();
  }, [currentUserId]);

  // API wrapper per passare alle pagine
  const saveTemplate = async (tpl) => {
    const saved = await upsertTemplate(currentUserId, tpl);
    if (!saved) return;
    setTemplatesState(prev => {
      const exists = prev.some(t => t.id === saved.id);
      return exists ? prev.map(t => t.id===saved.id ? saved : t) : [saved, ...prev];
    });
  };

  const removeTemplate = async (id) => {
    const ok = await deleteTemplate(currentUserId, id);
    if (ok) setTemplatesState(prev => prev.filter(t => t.id !== id));
  };

  const assignActivePlan = async (tpl) => {
    const ok = await setActivePlan(currentUserId, tpl || null);
    if (ok) setActivePlanState(tpl || null);
  };

  const pushWorkoutLog = async (log) => {
    const ok = await addWorkoutLog(currentUserId, log);
    if (ok) setWorkoutLogsState(prev => [{id: crypto.randomUUID(), ...log}, ...prev]);
  };

  const UserSwitcher = () => (
    <select className="input" value={currentUserId} onChange={e=>setCurrentUserId(e.target.value)}>
      {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
    </select>
  );

  return (
    <div className="app-shell">
      <Navbar user={currentUser} page={page} setPage={setPage} UserSwitcher={UserSwitcher} />

      <main className="app-main">
        {page==="allenamenti" && (
          <UserDashboard
            user={currentUser}
            activePlan={activePlan}
            setActivePlanForUser={assignActivePlan}
            templates={templates}
            workoutLogs={workoutLogs}
            setWorkoutLogs={setWorkoutLogsState}
            pushWorkoutLog={pushWorkoutLog}
          />
        )}

        {page==="cal" && (
          <Calendar
            user={currentUser}
            workoutLogs={workoutLogs}
            pushWorkoutLog={pushWorkoutLog}
          />
        )}

        {page==="schede" && (
          <TemplateBuilder
            user={currentUser}
            templates={templates}
            saveTemplate={saveTemplate}
            deleteTemplate={removeTemplate}
          />
        )}

        {page==="pt" && (
          <PTDashboard
            coach={currentUser}
            patients={DEMO_PATIENTS}
            templates={templates}
            assignments={[]}
            setAssignments={()=>{}}
            workoutLogs={workoutLogs}
            setActivePlanForUser={(tpl, userId)=>{}}
            activePlans={{[currentUserId]: activePlan}}
          />
        )}
      </main>
    </div>
  );
}
// === END: src/App.jsx ===