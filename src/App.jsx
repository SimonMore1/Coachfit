// === START: src/App.jsx ===
import React, { useEffect, useMemo, useState } from "react";
import "./index.css";

import UserDashboard from "./pages/UserDashboard.jsx";
import TemplateBuilder from "./pages/TemplateBuilder.jsx";
import PTDashboard from "./pages/PTDashboard.jsx";
import Calendar from "./pages/Calendar.jsx";
import AuthBox from "./pages/AuthBox.jsx";

import { supabase, hasCloud } from "./lib/supabase";
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
          <button className={`pill ${page==="schede"?"active":""}`} onClick={()=>setPage("schede")}>Schede</button>
          <button className={`pill ${page==="calendario"?"active":""}`} onClick={()=>setPage("calendario")}>Calendario</button>
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
  // Auth state
  const [authUser, setAuthUser] = useState(null);
  const [authReady, setAuthReady] = useState(!hasCloud);

  // Demo users (solo in fallback)
  const [users] = useState(DEMO_USERS);

  const [currentUserId, setCurrentUserId] = useState(users[0]?.id || "");
  const currentUser = useMemo(()=>{
    if (authUser) {
      return { id: authUser.id, name: authUser.email?.split("@")[0] || "Utente", role: "USER" };
    }
    return users.find(u=>u.id===currentUserId);
  }, [users, currentUserId, authUser]);

  const [page, setPage] = useState("allenamenti");

  // Stato cloud
  const [templates, setTemplatesState] = useState([]);
  const [activePlan, setActivePlanState] = useState(null);
  const [workoutLogs, setWorkoutLogsState] = useState([]);

  // Auth bootstrap
  useEffect(()=>{
    if (!hasCloud) { setAuthReady(true); return; }
    let mounted = true;

    (async ()=>{
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;
      setAuthUser(user || null);
      setAuthReady(true);
      if (user) setCurrentUserId(user.id);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session)=>{
      const user = session?.user ?? null;
      setAuthUser(user);
      if (user) setCurrentUserId(user.id);
      if (!user) {
        setTemplatesState([]);
        setActivePlanState(null);
        setWorkoutLogsState([]);
      }
    });
    return ()=> sub?.subscription?.unsubscribe?.();
  }, []);

  // Caricamento dati
  useEffect(()=>{
    if (!currentUserId) return;
    async function load(){
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

  // API wrapper
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
    return ok;
  };
  const pushWorkoutLog = async (log) => {
    const ok = await addWorkoutLog(currentUserId, log);
    if (ok) setWorkoutLogsState(prev => [{id: crypto.randomUUID(), ...log}, ...prev]);
  };

  const UserSwitcher = authUser ? null : () => (
    <select className="input" value={currentUserId} onChange={e=>setCurrentUserId(e.target.value)}>
      {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
    </select>
  );

  async function handleLogout(){ await supabase?.auth?.signOut(); }

  if (!authReady) return null;
  if (hasCloud && !authUser) {
    return (
      <div className="app-shell">
        <Navbar user={null} page={"schede"} setPage={()=>{}} UserSwitcher={null} />
        <AuthBox />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Navbar user={currentUser} page={page} setPage={setPage} UserSwitcher={UserSwitcher} />

      {authUser && (
        <div style={{textAlign:"right", padding:"8px 16px"}}>
          <span className="muted" style={{marginRight:8}}>{authUser.email}</span>
          <button className="btn" onClick={handleLogout}>Logout</button>
        </div>
      )}

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