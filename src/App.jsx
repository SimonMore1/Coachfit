// === START: src/App.jsx ===
import React, { useEffect, useMemo, useState } from "react";
import "./index.css";

import UserDashboard from "./pages/UserDashboard.jsx";
import TemplateBuilder from "./pages/TemplateBuilder.jsx";
import PTDashboard from "./pages/PTDashboard.jsx";

import { DEMO_USERS, DEMO_PATIENTS } from "./utils.js";
import {
  getTemplates, upsertTemplate, deleteTemplate,
  getActivePlan, setActivePlan,
  getWorkoutLogs, addWorkoutLog
} from "./data";

import { supabase, hasCloud, signInWithMagicLink, signOut } from "./lib/supabase";

// ---------------- Navbar ----------------
function Navbar({ user, page, setPage, UserSwitcher, authUser, onSignOut }) {
  const isCoach =
    user?.role?.toUpperCase?.() === "PT" ||
    user?.role?.toUpperCase?.() === "COACH" ||
    (typeof user?.id === "string" && user.id.startsWith?.("pt-"));

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
          {isCoach && (
            <button className={`pill ${page==="pt"?"active":""}`} onClick={()=>setPage("pt")}>PT</button>
          )}
        </nav>

        {supabase ? (
          <div style={{display:"flex", gap:8, alignItems:"center"}}>
            {authUser ? (
              <>
                <span className="muted" style={{fontSize:14}}>
                  {authUser.email}
                </span>
                <button className="btn" onClick={onSignOut}>Esci</button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}

// ---------------- Auth Screen ----------------
function AuthGate({ onLoggedIn }) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  async function handleSend() {
    setMsg("");
    try {
      const { error } = await signInWithMagicLink(email);
      if (error) throw error;
      setMsg("Ti ho inviato un link di accesso via email. Aprilo per entrare.");
    } catch (e) {
      setMsg(e.message || "Errore nell'invio del link.");
    }
  }

  return (
    <div className="container" style={{maxWidth:560, margin:"60px auto"}}>
      <h1 style={{marginBottom:8}}>Accedi</h1>
      <p className="muted" style={{marginBottom:16}}>
        Inserisci la tua email: riceverai un <b>Magic Link</b> per entrare.
      </p>
      <div className="grid" style={{gridTemplateColumns:"1fr auto", gap:8}}>
        <input className="input" type="email" placeholder="tu@esempio.com"
          value={email} onChange={e=>setEmail(e.target.value)} />
        <button className="btn btn-primary" onClick={handleSend}>Invia link</button>
      </div>
      {msg && <div className="muted" style={{marginTop:12}}>{msg}</div>}
      <hr style={{border:"none", borderTop:"1px dashed #e2e8f0", margin:"24px 0"}}/>
      <p className="muted">
        Nota: se stai testando in locale, assicurati che Supabase → Auth → Redirect URLs
        includa <code>http://localhost:5173</code>.
      </p>
    </div>
  );
}

// ---------------- App ----------------
export default function App(){
  const [page, setPage] = useState("allenamenti");

  // Sessione Supabase
  const [authUser, setAuthUser] = useState(null);
  const [sessionReady, setSessionReady] = useState(!supabase);

  useEffect(()=>{
    if (!supabase) { setSessionReady(true); return; }
    supabase.auth.getSession().then(({ data })=>{
      setAuthUser(data.session?.user ?? null);
      setSessionReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session)=>{
      setAuthUser(session?.user ?? null);
    });
    return () => sub?.subscription?.unsubscribe();
  }, []);

  const isAuthedCloud = hasCloud && !!authUser;

  // Utente corrente (demo/offline vs authed cloud)
  const [demoUsers] = useState(DEMO_USERS);
  const [currentUserId, setCurrentUserId] = useState(demoUsers[0]?.id || "");

  useEffect(()=>{
    if (isAuthedCloud) setCurrentUserId(authUser.id);
  }, [isAuthedCloud, authUser]);

  const currentUser = useMemo(()=>{
    if (isAuthedCloud) {
      return {
        id: authUser.id,
        name: authUser.email?.split("@")[0] || "Utente",
        role: "USER",
      };
    }
    return demoUsers.find(u=>u.id===currentUserId) || demoUsers[0];
  }, [isAuthedCloud, authUser, demoUsers, currentUserId]);

  // Stato dati cloud
  const [templates, setTemplatesState]   = useState([]);       // [{id,name,days}]
  const [activePlan, setActivePlanState] = useState(null);     // {id,name,days}
  const [workoutLogs, setWorkoutLogsState] = useState([]);

  // Carica dati quando cambia "utente corrente"
  useEffect(()=>{
    // Se abbiamo le ENV ma NON siamo loggati, blocco: RLS negherebbe ogni cosa
    if (hasCloud && !isAuthedCloud) {
      setTemplatesState([]); setActivePlanState(null); setWorkoutLogsState([]);
      return;
    }
    // Se non c'è utente valido, niente
    if (!currentUser?.id) return;

    async function load() {
      const [tpls, plan, logs] = await Promise.all([
        getTemplates(currentUser.id),
        getActivePlan(currentUser.id),
        getWorkoutLogs(currentUser.id)
      ]);
      setTemplatesState(tpls);
      setActivePlanState(plan);
      setWorkoutLogsState(logs);
    }
    load();
  }, [currentUser?.id, isAuthedCloud]);

  // API wrapper per passare alle pagine
  const saveTemplate = async (tpl) => {
    const saved = await upsertTemplate(currentUser.id, tpl);
    if (!saved) return;
    setTemplatesState(prev => {
      const exists = prev.some(t => t.id === saved.id);
      return exists ? prev.map(t => t.id===saved.id ? saved : t) : [saved, ...prev];
    });
  };

  const removeTemplate = async (id) => {
    const ok = await deleteTemplate(currentUser.id, id);
    if (ok) setTemplatesState(prev => prev.filter(t => t.id !== id));
  };

  const assignActivePlan = async (tpl) => {
    const ok = await setActivePlan(currentUser.id, tpl || null);
    if (ok) setActivePlanState(tpl || null);
  };

  const pushWorkoutLog = async (log) => {
    const ok = await addWorkoutLog(currentUser.id, log);
    if (ok) setWorkoutLogsState(prev => [{id: crypto.randomUUID(), ...log}, ...prev]);
  };

  // Switcher demo (compare solo se NON loggato)
  const UserSwitcher = !isAuthedCloud ? () => (
    <select className="input" value={currentUserId} onChange={e=>setCurrentUserId(e.target.value)}>
      {demoUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
    </select>
  ) : null;

  // Se abbiamo Supabase configurato ma nessuna sessione: mostra login
  if (supabase && sessionReady && !authUser) {
    return <AuthGate onLoggedIn={()=>{}} />;
  }

  return (
    <div className="app-shell">
      <Navbar
        user={currentUser}
        page={page}
        setPage={setPage}
        UserSwitcher={UserSwitcher}
        authUser={authUser}
        onSignOut={signOut}
      />

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
            assignments={[]}                  // integriamo dopo (coach → pazienti)
            setAssignments={()=>{}}
            workoutLogs={workoutLogs}
            setActivePlanForUser={(tpl, userId)=>{/* TODO: multi-user cloud */}}
            activePlans={{[currentUser.id]: activePlan}}
          />
        )}
      </main>
    </div>
  );
}
// === END: src/App.jsx ===