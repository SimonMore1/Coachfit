// === START: src/pages/AuthBox.jsx ===
import { useState } from "react";
import { supabase, hasCloud } from "../lib/supabase";

/**
 * Schermata di login semplice con Magic Link via email.
 * - Inserisci email -> inviamo il link -> ritorni all'app già loggato.
 */
export default function AuthBox(){
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const [error, setError] = useState("");

  if (!hasCloud) {
    return (
      <div className="app-main">
        <div className="card">
          <h2>Ambiente locale senza cloud</h2>
          <p className="muted">Il login è disabilitato perché non sono presenti le ENV di Supabase.</p>
        </div>
      </div>
    );
  }

  async function handleSubmit(e){
    e.preventDefault();
    setError("");
    setSentTo("");
    if (!email) return;

    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // dopo il click sul link, torna alla root dell'app
        emailRedirectTo: window.location.origin,
      },
    });
    setSending(false);

    if (error) {
      setError(error.message || "Errore durante l'invio del link.");
    } else {
      setSentTo(email);
      setEmail("");
    }
  }

  return (
    <main className="app-main">
      <div className="card" style={{maxWidth:480, margin:"40px auto"}}>
        <h2 style={{marginBottom:12}}>Accedi</h2>
        <p className="muted" style={{marginBottom:16}}>
          Ti inviamo un <b>Magic Link</b> via email. Cliccalo per entrare.
        </p>

        <form onSubmit={handleSubmit} className="grid" style={{gridTemplateColumns:"1fr auto", gap:8}}>
          <input
            className="input"
            type="email"
            placeholder="email@esempio.com"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            required
          />
          <button className="btn btn-primary" disabled={sending || !email}>
            {sending ? "Invio..." : "Invia link"}
          </button>
        </form>

        {sentTo && (
          <div className="chip" style={{marginTop:12}}>
            Link inviato a <b>{sentTo}</b>. Controlla la posta ✉️
          </div>
        )}
        {error && (
          <div className="chip" style={{marginTop:12, background:"#fee2e2", color:"#991b1b"}}>
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
// === END: src/pages/AuthBox.jsx ===