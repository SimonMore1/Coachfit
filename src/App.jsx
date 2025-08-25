// === START: src/App.jsx ===
import React, { useEffect, useMemo, useState } from "react";
import "./index.css";

import UserDashboard from "./pages/UserDashboard.jsx";
import TemplateBuilder from "./pages/TemplateBuilder.jsx";
import PTDashboard from "./pages/PTDashboard.jsx";
import Calendar from "./pages/Calendar.jsx";
import AuthBox from "./pages/AuthBox.jsx";

import { DEMO_USERS, DEMO_PATIENTS } from "./utils.js";
import {
  getTemplates, upsertTemplate, deleteTemplate,
  getActivePlan, setActivePlan,
  getWorkoutLogs, addWorkoutLog
} from "./data";

import { supabase, hasCloud, getSession, onAuthChange, signOut } from "./lib/supabase";

// ---------------- Navbar ----------------
function Navbar({ user, page, setPage, UserSwitcher, onLogout }) {
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
          <button className={`pill ${page==="schede"?"active":""}`} onClick={()=>setPage("schede")}>Schede</button>
          <button className={`pill ${page==="calendario"?"active":""}`} onClick={()=>setPage("calendario")}>Calendario</button>
          {isCoach && (
            <button className={`pill ${page==="pt"?"active":""}`} onClick={()=>setPage("pt")}>PT</button>
          )}
        </nav>

        {hasCloud && (
          <button className="pill" onClick={onLogout}>Esci</button>
        )}
      </div>
    </header>
  );
}

// ---------------- App ----------------
export default function App(){
  // ===== Auth state (solo se hasCloud)
  const [session, setSession] = useState(null);
  useEffect(() => {
    if (!hasCloud) return;
    getSession().then(({ data }) => setSession(data.session || null));
    const { data: sub } = onAuthChange((sess)=> setSession(sess));
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  // ===== Utente “logico” per l’app
  // Se loggato con Supabase → usa user.id; altrimenti demo user-1 / pt-1
  const demoUsers = useMemo(()=> DEMO_USERS, []);
  const cloudUserId = session?.user?.id || null;
  const [currentUserId, setCurrentUserId] = useState(demoUsers[0]?.id || "");

  useEffect(()=>{
    if (cloudUserId) {
      setCurrentUserId(cloudUserId); // forza l’utente = logged user
    }
  }, [cloudUserId]);

  const currentUser = useMemo(()=>{
    if (cloudUserId) return { id: cloudUserId, role: "USER", name:"Utente" };
    return demoUsers.find(u=>u.id===currentUserId) || demoUsers[0];
  }, [cloudUserId, demoUsers, currentUserId]);

  const [page, setPage] = useState("allenamenti");

  // Stato cloud/local dati
  const [templates, setTemplatesState] = useState([]);       // [{id,name,days}]
  const [activePlan, setActivePlanState] = useState(null);   // {id,name,days}
  const [workoutLogs, setWorkoutLogsState] = useState([]);

  // Carica dati quando cambia utente (id loggato o demo)
  useEffect(()=>{
    async function load() {
      const uid = cloudUserId || currentUserId;
      const [tpls, plan, logs] = await Promise.all([
        getTemplates(uid),
        getActivePlan(uid),
        getWorkoutLogs(uid)
      ]);
      setTemplatesState(tpls);
      setActivePlanState(plan);
      setWorkoutLogsState(logs);
    }
    if (currentUserId || cloudUserId) load();
  }, [currentUserId, cloudUserId]);

  // API wrapper per passare alle pagine
  const saveTemplate = async (tpl) => {
    const uid = cloudUserId || currentUserId;
    const saved = await upsertTemplate(uid, tpl);
    if (!saved) return;
    setTemplatesState(prev => {
      const exists = prev.some(t => t.id === saved.id);
      return exists ? prev.map(t => t.id===saved.id ? saved : t) : [saved, ...prev];
    });
  };

  const removeTemplate = async (id) => {
    const uid = cloudUserId || currentUserId;
    const ok = await deleteTemplate(uid, id);
    if (ok) setTemplatesState(prev => prev.filter(t => t.id !== id));
  };

  const assignActivePlan = async (tpl) => {
    const uid = cloudUserId || currentUserId;
    const ok = await setActivePlan(uid, tpl || null);
    if (ok) setActivePlanState(tpl || null);
  };

  const pushWorkoutLog = async (log) => {
    const uid = cloudUserId || currentUserId;
    const ok = await addWorkoutLog(uid, log);
    if (ok) setWorkoutLogsState(prev => [{id: crypto.randomUUID(), ...log}, ...prev]);
  };

  const UserSwitcher = cloudUserId ? null : () => (
    <select className="input" value={currentUserId} onChange={e=>setCurrentUserId(e.target.value)}>
      {demoUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
    </select>
  );

  // ==== Gating: se siamo su cloud e non c’è session → AuthBox
  if (hasCloud && !session) {
    return <AuthBox />;
  }

  return (
    <div className="app-shell">
      <Navbar
        user={currentUser}
        page={page}
        setPage={setPage}
        UserSwitcher={UserSwitcher}
        onLogout={signOut}
      />

      <main className="app-main">
        {page==="allenamenti" && (
          <UserDashboard
            user={currentUser}
            activePlan={activePlan}
            setActivePlanForUser={assignActivePlan}
            templates={templates}
            setTemplates={setTemplatesState}
            workoutLogs={workoutLogs}
            setWorkoutLogs={setWorkoutLogsState}
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

        {page==="calendario" && (
          <Calendar
            user={currentUser}
            workoutLogs={workoutLogs}
            setWorkoutLogs={setWorkoutLogsState}
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
            setActivePlanForUser={(tpl, userId)=>{/* estenderemo multi-user */}}
            activePlans={{[currentUserId]: activePlan}}
          />
        )}
      </main>
    </div>
  );
}
// === END: src/App.jsx ===