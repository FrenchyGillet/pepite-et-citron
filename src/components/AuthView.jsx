import { useState } from 'react';
import { api } from '../api.js';

export function AuthView({ onAuth }) {
  const [mode,     setMode]     = useState("login");   // "login" | "signup"
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        await api.signUp(email, password);
        // En mode "Confirm email" désactivé, la session est immédiate
        const session = await api.getSession();
        onAuth(session);
      } else {
        await api.signIn(email, password);
        const session = await api.getSession();
        onAuth(session);
      }
    } catch (err) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "24px 16px", background: "var(--bg)",
    }}>
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div className="header-logo" style={{ fontSize: 28 }}>
          <span className="header-pepite">Pépite</span>
          <span className="header-amp"> & </span>
          <span className="header-citron">Citron</span>
        </div>
        <div style={{ fontSize: 13, color: "var(--label3)", marginTop: 6 }}>
          Votre app de vote pour le match
        </div>
      </div>

      {/* Card */}
      <div style={{
        width: "100%", maxWidth: 380,
        background: "var(--bg2)", borderRadius: "var(--radius-lg)", padding: 24,
      }}>
        {/* Tab switcher */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "var(--bg3)", borderRadius: "var(--radius-sm)", padding: 4 }}>
          {[{ id: "login", label: "Se connecter" }, { id: "signup", label: "Créer un compte" }].map(t => (
            <button key={t.id} onClick={() => { setMode(t.id); setError(null); }} style={{
              flex: 1, padding: "8px 0", borderRadius: "var(--radius-sm)", border: "none",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: mode === t.id ? "var(--bg)" : "transparent",
              color: mode === t.id ? "var(--label)" : "var(--label3)",
              boxShadow: mode === t.id ? "0 1px 3px rgba(0,0,0,.3)" : "none",
            }}>{t.label}</button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--label3)", display: "block", marginBottom: 6 }}>
              Adresse email
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="vous@exemple.com" required autoComplete="email"
              style={{ width: "100%", boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--label3)", display: "block", marginBottom: 6 }}>
              Mot de passe
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "8 caractères minimum" : "Votre mot de passe"}
              required minLength={mode === "signup" ? 8 : 1}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              style={{ width: "100%", boxSizing: "border-box" }}
            />
          </div>

          {error && (
            <div style={{
              background: "rgba(255,80,80,.12)", border: "1px solid rgba(255,80,80,.3)",
              borderRadius: "var(--radius-sm)", padding: "10px 12px",
              fontSize: 13, color: "#ff6b6b",
            }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 4 }}>
            {loading
              ? (mode === "signup" ? "Création…" : "Connexion…")
              : (mode === "signup" ? "Créer mon compte" : "Se connecter")
            }
          </button>
        </form>
      </div>

      {/* Voter access info */}
      <div style={{ marginTop: 24, textAlign: "center", maxWidth: 340 }}>
        <p style={{ fontSize: 12, color: "var(--label4)", lineHeight: 1.6 }}>
          Vous souhaitez voter ?{" "}
          <span style={{ color: "var(--label3)" }}>
            Utilisez le lien partagé par votre capitaine.
          </span>
        </p>
      </div>
    </div>
  );
}
