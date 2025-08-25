// === START: src/pages/AuthBox.jsx ===
import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function AuthBox(){
  const [mode, setMode] = useState("login"); // "login" | "signup" | "magic"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleLogin(e){
    e.preventDefault();
    setLoading(true); setMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMsg(error.message);
    setLoading(false);
  }

  async function handleSignup(e){
    e.preventDefault();
    setLoading(true); setMsg("");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setMsg(error.message);
    else setMsg("Registrazione ok! Controlla l’email se è richiesta conferma, poi ricarica.");
    setLoading(false);
  }

  async function handleMagic(e){
    e.preventDefault();
    setLoading(true); setMsg("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) setMsg(error.message);
    else setMsg("Ti ho inviato il link via email. Aprilo e tornerai qui loggato.");
    setLoading(false);
  }

  return (
    <div className="card" style={{maxWidth: 440, margin: "60px auto"}}>
      <h2 style={{marginBottom:12}}>Accedi</h2>

      <div className="tabs small" style={{marginBottom:12}}>
        <button className={`pill ${mode==="login"?"active":""}`} onClick={()=>setMode("login")}>Login</button>
        <button className={`pill ${mode==="signup"?"active":""}`} onClick={()=>setMode("signup")}>Registrati</button>
        <button className={`pill ${mode==="magic"?"active":""}`} onClick={()=>setMode("magic")}>Magic Link</button>
      </div>

      <form onSubmit={mode==="login" ? handleLogin : mode==="signup" ? handleSignup : handleMagic} className="grid" style={{gap:10}}>
        <input
          className="input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={e=>setEmail(e.target.value)}
          required
        />

        {mode !== "magic" && (
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e=>setPassword(e.target.value)}
            minLength={6}
            required
          />
        )}

        <label style={{display:"flex", alignItems:"center", gap:8, fontSize:14, color:"#475569"}}>
          <input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} />
          Ricordami (resta collegato)
        </label>

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Attendi…" : mode==="login" ? "Entra" : mode==="signup" ? "Crea account" : "Invia magic link"}
        </button>

        {msg && <div className="muted" style={{marginTop:8}}>{msg}</div>}
      </form>
    </div>
  );
}
// === END: src/pages/AuthBox.jsx ===