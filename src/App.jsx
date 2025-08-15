// App.jsx — routing a schede / allenamenti / PT
import { useEffect, useState } from "react";
import "./index.css";

// Pagine
import UserDashboard from "./pages/UserDashboard.jsx";
import TemplateBuilder from "./pages/TemplateBuilder.jsx";
import PTDashboard from "./pages/PTDashboard.jsx";

// Dati locali (mock) — manteniamo per ora localStorage
import {
  listUsers,
  getActivePlan,
} from "./dataApi.local";

export default function App() {
  // utenti caricati dal mock
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [page, setPage] = useState("allenamenti"); // 'allenamenti' | 'schede' | 'pt'

  // carica utenti
  useEffect(() => {
    const us = listUsers();
    setUsers(us);
    // di default selezioniamo il primo USER (non PT)
    const firstUser = us.find(u => u.role === "USER") || us[0];
    if (firstUser) setCurrentUserId(firstUser.id);
  }, []);

  const currentUser = users.find(u => u.id === currentUserId) || null;
  const isPT = currentUser?.role === "PT";

  /* ---------------- Layout & Nav ---------------- */
  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <div className="brand">
          <span className="dot" /> <span className="brand-name">CoachFit</span>
          <span className="badge">MVP</span>
        </div>

        <div className="header-actions">
          {/* Selettore utente corrente */}
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

          {/* Tabs */}
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
            <button
              className={`pill ${page === "pt" ? "active" : ""}`}
              onClick={() => setPage("pt")}
              title="Dashboard Coach / PT"
            >
              PT
            </button>
          </nav>
        </div>
      </header>

      {/* Corpo pagina */}
      <main className="app-main">
        {page === "allenamenti" && currentUser && (
          <UserDashboard
            owner={currentUser}                  // utente che sta usando l'app
            activePlanId={getActivePlan(currentUser.id)}  // scheda attiva (se c'è)
          />
        )}

        {page === "schede" && (
          <TemplateBuilder
            owner={currentUser || { id: "unknown", role: "USER", name: "Utente" }}
          />
        )}

        {page === "pt" && (
          <PTDashboard />
        )}
      </main>
    </div>
  );
}