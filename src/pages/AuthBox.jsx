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

  const redirectTo = window.location.origin; // localhost o vercel, auto

  function showError(e){
    if (!e) return;
    // Messaggi più chiari
    if (e.message?.toLowerCase?.().includes("invalid login")) {
      setMsg("Credenziali non valide. Controlla email/password o prova 'Registrati'.");
    } else if (e.message?.includes("User already registered")) {
      setMsg("Email già registrata. Vai su 'Login' per entrare.");
    } else {
      setMsg(e.message);
    }
  }

  async function handleLogin(e){
    e.preventDefault();
    setLoading(true); setMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) showError(error);
    setLoading(false);
  }

  async function handleSignup(e){
    e.preventDefault();
    setLoading(true); setMsg("");
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: redirectTo } // <— IMPORTANTE per le email
    });
    if (error) showError(error);
    else setMsg("Registrazione eseguita! "
      + "Se la conferma email è attiva, controlla la casella e clicca il link. "
      + "Altrimenti sei già pronto: passa su 'Login' ed entra.");
    setLoading(false);
  }

  async function handleMagic(e){
    e.preventDefault();
    setLoading(true); setMsg("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo }
    });
    if (error) showError(error);
    else setMsg("Ti ho inviato un link via email. Aprilo e tornerai qui già loggato.");
    setLoading(false);
  }

  async function resend(){
    setLoading(true); setMsg("");
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: redirectTo }
    });
    if (error) showError(error);
    else setMsg("Email di conferma reinviata (controlla anche SPAM).");
    setLoading(false);
  }

  const onSubmit =
    mode==="login"   ? handleLogin :
    mode==="signup"  ? handleSignup :
                       handleMagic;

  return (
    <div className="card" style={{maxWidth: 440, margin: "60px auto"}}>
      <h2 style={{marginBottom:12}}>Accedi</h2>

      <div className="tabs small" style={{marginBottom:12}}>
        <button className={`pill ${mode==="login"?"active":""}`} onClick={()=>setMode("login")}>Login</button>
        <button className={`pill ${mode==="signup"?"active":""}`} onClick={()=>setMode("signup")}>Registrati</button>
        <button className={`pill ${mode==="magic"?"active":""}`} onClick={()=>setMode("magic")}>Magic Link</button>
      </div>

      <form onSubmit={onSubmit} className="grid" style={{gap:10}}>
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
            placeholder="Password (min 6)"
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

        {mode==="signup" && (
          <button
            className="btn"
            type="button"
            onClick={resend}
            disabled={loading || !email}
            style={{marginTop:4}}
          >
            Reinvia email di conferma
          </button>
        )}

        {msg && <div className="muted" style={{marginTop:8}}>{msg}</div>}
      </form>
    </div>
  );
}
// === END: src/pages/AuthBox.jsx ===