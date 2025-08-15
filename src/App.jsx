// src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./App.css";
import "./index.css";

import UserDashboard from "./pages/UserDashboard.jsx";
import TemplateBuilder from "./pages/TemplateBuilder.jsx";
import PTDashboard from "./pages/PTDashboard.jsx";

import {
  DEMO_USERS,
  DEMO_PATIENTS,
} from "./utils.js";

/* ----------------------------------------------------
   Navbar: mostra Allenamenti / Schede e (solo per coach) PT
---------------------------------------------------- */
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
          <button
            className={`pill ${page === "allenamenti" ? "active" : ""}`}
            onClick={() => setPage("allenamenti")}
          >
            Allenamenti
          </button>
          <button
            className={`pill ${page === "schede" ? "active" : ""}`}
            onClick={() => setPage("schede")}
          >
            Schede
          </button>
          {isCoach && (
            <button
              className={`pill ${page === "pt" ? "active" : ""}`}
              onClick={() => setPage("pt")}
            >
              PT
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

/* ----------------------------------------------------
   Costanti e persistenza
---------------------------------------------------- */
const STORAGE_KEY = "coachfit-v1";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

/* ----------------------------------------------------
   App
---------------------------------------------------- */
export default function App() {
  // utenti demo + selezione corrente
  const [users] = useState(DEMO_USERS);
  const [currentUserId, setCurrentUserId] = useState(DEMO_USERS[0]?.id || "user-1");
  const currentUser = useMemo(
    () => users.find((u) => u.id === currentUserId),
    [users, currentUserId]
  );

  // stato globale (schede, assegnazioni, attivi, log)
  const [templates, setTemplates] = useState([]);     // array di schede create dall'utente/coach
  const [assignments, setAssignments] = useState([]); // [{planId, userId}] se lo stai usando
  const [activePlans, setActivePlans] = useState({}); // { userId: {id, name, days: [...] } }
  const [workoutLogs, setWorkoutLogs] = useState([]); // [{id, user_id, date, entries:[...] }]

  // pagina corrente
  const [page, setPage] = useState("allenamenti");

  // carica da localStorage
  useEffect(() => {
    const loaded = loadState();
    if (loaded) {
      setTemplates(loaded.templates || []);
      setAssignments(loaded.assignments || []);
      setActivePlans(loaded.activePlans || {});
      setWorkoutLogs(loaded.workoutLogs || []);
    }
  }, []);

  // salva su localStorage ad ogni modifica
  useEffect(() => {
    saveState({ templates, assignments, activePlans, workoutLogs });
  }, [templates, assignments, activePlans, workoutLogs]);

  // helper: attiva una scheda per un utente
  const setActivePlanForUser = (userId, plan) => {
    setActivePlans((prev) => ({ ...prev, [userId]: plan || null }));
  };

  // opzionale: uno switcher utente da mettere in Navbar
  const UserSwitcher = () => (
    <select
      className="input"
      value={currentUserId}
      onChange={(e) => setCurrentUserId(e.target.value)}
    >
      {users.map((u) => (
        <option key={u.id} value={u.id}>
          {u.name} ({u.role})
        </option>
      ))}
    </select>
  );

  return (
    <div className="app-shell">
      {/* HEADER */}
      <Navbar
        user={currentUser}
        page={page}
        setPage={setPage}
        UserSwitcher={UserSwitcher}
      />

      {/* CONTENUTO */}
      <main className="app-main">
        {page === "allenamenti" && (
          <UserDashboard
            user={currentUser}
            activePlan={activePlans[currentUserId] || null}
            setActivePlanForUser={(plan) => setActivePlanForUser(currentUserId, plan)}
            templates={templates}
            setTemplates={setTemplates}
            workoutLogs={workoutLogs}
            setWorkoutLogs={setWorkoutLogs}
          />
        )}

        {page === "schede" && (
          <TemplateBuilder
            user={currentUser}
            templates={templates}
            setTemplates={setTemplates}
          />
        )}

        {page === "pt" && (
          <PTDashboard
            coach={currentUser}
            patients={DEMO_PATIENTS}
            templates={templates}
            assignments={assignments}
            setAssignments={setAssignments}
            workoutLogs={workoutLogs}
            setActivePlanForUser={setActivePlanForUser}
            activePlans={activePlans}
          />
        )}
      </main>
    </div>
  );
}