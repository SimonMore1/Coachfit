import { useEffect, useState } from "react";
import { DEMO_USERS, DEMO_PATIENTS } from "./utils";
import TemplateBuilder from "./pages/TemplateBuilder.jsx";
import UserDashboard from "./pages/UserDashboard.jsx";
import PTDashboard from "./pages/PTDashboard.jsx";

const STORAGE_KEY = "coachfit-v1";

export default function App(){
  const [users] = useState(DEMO_USERS);
  const [currentUserId, setCurrentUserId] = useState("user-1");
  const currentUser = users.find(u=>u.id===currentUserId);

  // stato globale
  const [templates, setTemplates] = useState([]);             // piani
  const [assignments, setAssignments] = useState([]);         // assegnazioni PT->paziente
  const [activePlans, setActivePlans] = useState({});         // { [userId]: planId }
  const [workoutLogs, setWorkoutLogs] = useState([]);         // log esecuzioni
  const [page, setPage] = useState("allenamenti");            // allenamenti | schede | pt

  // persistenza
  useEffect(()=>{ try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      const p=JSON.parse(raw);
      setTemplates(p.templates||[]);
      setAssignments(p.assignments||[]);
      setActivePlans(p.activePlans||{});
      setWorkoutLogs(p.workoutLogs||[]);
      setCurrentUserId(p.currentUserId||"user-1");
      setPage(p.page||"allenamenti");
    }
  }catch{} },[]);
  useEffect(()=>{
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      templates, assignments, activePlans, workoutLogs, currentUserId, page
    }));
  },[templates,assignments,activePlans,workoutLogs,currentUserId,page]);

  const setActivePlanForUser=(userId, planId)=>{
    setActivePlans(prev=>({...prev, [userId]: planId}));
  };

  return (
    <div>
      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="brand-dot" />
            <span>CoachFit</span>
            <span className="muted" style={{fontSize:12}}>MVP</span>
          </div>
          <div className="nav">
            <select className="input" value={currentUserId} onChange={e=>setCurrentUserId(e.target.value)}>
              {users.map(u=><option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
            </select>
            <button className={page==="allenamenti"?"active":""} onClick={()=>setPage("allenamenti")}>Allenamenti</button>
            <button className={page==="schede"?"active":""} onClick={()=>setPage("schede")}>Schede</button>
            {currentUser?.role==="PT" && (
              <button className={page==="pt"?"active":""} onClick={()=>setPage("pt")}>Dashboard PT</button>
            )}
          </div>
        </div>
      </div>

      {/* Pagine */}
      <div className="container">
        {page==="allenamenti" && (
          currentUser?.role==="USER"
            ? <UserDashboard
                currentUser={currentUser}
                templates={templates}
                assignments={assignments}
                activePlans={activePlans}
                setActivePlanForUser={setActivePlanForUser}
                workoutLogs={workoutLogs}
                setWorkoutLogs={setWorkoutLogs}
              />
            : <div className="card">Apri <b>Dashboard PT</b> per gestire i pazienti.</div>
        )}

        {page==="schede" && (
          <TemplateBuilder
            currentUser={currentUser}
            templates={templates}
            setTemplates={setTemplates}
            setActivePlanForUser={setActivePlanForUser}
          />
        )}

        {page==="pt" && currentUser?.role==="PT" && (
          <PTDashboard
            patients={DEMO_PATIENTS}
            templates={templates}
            assignments={assignments}
            setAssignments={setAssignments}
            workoutLogs={workoutLogs}
          />
        )}
      </div>
    </div>
  );
}