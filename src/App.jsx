// src/App.jsx
import { useEffect, useMemo, useState } from "react";
import "./index.css";

import UserDashboard from "./pages/UserDashboard.jsx";
import TemplateBuilder from "./pages/TemplateBuilder.jsx";
import Calendar from "./pages/Calendar.jsx";
import AuthBox from "./pages/AuthBox.jsx";

import { supabase, hasCloud } from "./lib/supabase";

// 🔁 IMPORTA TUTTO **DA data.js** (non più da utils.js)
import {
  DEMO_USERS,
  DEMO_PATIENTS,
  // API dati
  loadTemplates,
  saveTemplate,
  deleteTemplate,
  duplicateTemplate,
  renameTemplate,
  getActivePlanForUser,
  setActivePlanForUser,
  addWorkoutLog,
  getWorkoutLogs,
} from "./data.js";

export default function App() {
  // ======= Auth =======
  const [session, setSession] = useState(null);
  const [userId, setUserId] = useState("user-1"); // fallback demo
  const [displayName, setDisplayName] = useState("Coach Luca"); // demo

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data?.session ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_ev, sess) => {
      setSession(sess ?? null);
    });
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  // mappa ID utente
  useEffect(() => {
    if (session?.user?.id) {
      setUserId(session.user.id);
      setDisplayName(session.user.email?.split("@")[0] || "Utente");
    } else {
      // demo locale
      setUserId("user-1");
      setDisplayName("Coach Luca");
    }
  }, [session]);

  // ======= Router minimale =======
  const [page, setPage] = useState("allenamenti");

  // ======= Stato dati condiviso =======
  const [templates, setTemplates] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [workoutLogs, setWorkoutLogs] = useState([]);

  // carica templates & activePlan all’avvio / quando cambia utente
  useEffect(() => {
    (async () => {
      const list = await loadTemplates(userId);
      setTemplates(list);
      const ap = await getActivePlanForUser(userId);
      setActivePlan(ap);
      const logs = await getWorkoutLogs(userId);
      setWorkoutLogs(logs);
    })().catch(console.error);
  }, [userId]);

  // ======= Adapter funzioni =======
  const pushWorkoutLog = async ({ date, entries }) => {
    const res = await addWorkoutLog(userId, date, entries);
    const logs = await getWorkoutLogs(userId);
    setWorkoutLogs(logs);
    return res;
  };

  const onSaveTemplate = async (tpl) => {
    const saved = await saveTemplate(userId, tpl);
    const list = await loadTemplates(userId);
    setTemplates(list);
    return saved;
  };

  const onDeleteTemplate = async (templateId) => {
    await deleteTemplate(userId, templateId);
    const list = await loadTemplates(userId);
    setTemplates(list);
  };

  const onDuplicateTemplate = async (templateId) => {
    await duplicateTemplate(userId, templateId);
    const list = await loadTemplates(userId);
    setTemplates(list);
  };

  const onRenameTemplate = async (templateId, name) => {
    await renameTemplate(userId, templateId, name);
    const list = await loadTemplates(userId);
    setTemplates(list);
  };

  const setActivePlanForUserWrapped = async (templateId, dayIndex = 0) => {
    const ap = await setActivePlanForUser(userId, templateId, dayIndex);
    setActivePlan(ap);
    return ap;
  };

  // ======= UI =======
  const logged = !!session || !hasCloud(); // se no-cloud, permetti demo senza login

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <div className="font-semibold">CoachFit <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs">MVP</span></div>
        <nav className="flex gap-2">
          <button
            className={`px-3 py-1 rounded-full ${page === "allenamenti" ? "bg-indigo-600 text-white" : "bg-slate-100"}`}
            onClick={() => setPage("allenamenti")}
          >
            Allenamenti
          </button>
          <button
            className={`px-3 py-1 rounded-full ${page === "schede" ? "bg-indigo-600 text-white" : "bg-slate-100"}`}
            onClick={() => setPage("schede")}
          >
            Schede
          </button>
          <button
            className={`px-3 py-1 rounded-full ${page === "calendario" ? "bg-indigo-600 text-white" : "bg-slate-100"}`}
            onClick={() => setPage("calendario")}
          >
            Calendario
          </button>
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600">{displayName}</span>
          {hasCloud() && (
            logged ? (
              <button
                className="text-sm px-3 py-1 rounded bg-slate-100"
                onClick={() => supabase.auth.signOut()}
              >
                Esci
              </button>
            ) : null
          )}
        </div>
      </header>

      <main className="p-6">
        {hasCloud() && !logged ? (
          <AuthBox />
        ) : page === "schede" ? (
          <TemplateBuilder
            user={{ id: userId, name: displayName }}
            templates={templates}
            onSaveTemplate={onSaveTemplate}
            onDeleteTemplate={onDeleteTemplate}
            onDuplicateTemplate={onDuplicateTemplate}
            onRenameTemplate={onRenameTemplate}
          />
        ) : page === "calendario" ? (
          <Calendar
            user={{ id: userId, name: displayName }}
            workoutLogs={workoutLogs}
          />
        ) : (
          <UserDashboard
            user={{ id: userId, name: displayName }}
            activePlan={activePlan}
            setActivePlanForUser={setActivePlanForUserWrapped}
            workoutLogs={workoutLogs}
            pushWorkoutLog={pushWorkoutLog}
            templates={templates}
          />
        )}
      </main>
    </div>
  );
}