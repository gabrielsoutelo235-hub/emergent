import { useState } from "react";
import { useAuth, formatErr } from "../auth";
import { Code2 } from "lucide-react";

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("admim.chefe@nexusopus.com");
  const [password, setPassword] = useState("20082008G#g");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(email, password, name || email.split("@")[0]);
    } catch (ex) {
      console.error("[auth] submit error:", ex);
      setErr(formatErr(ex));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={submit} data-testid="auth-form">
        <div className="auth-brand">
          <div className="brand-logo"><Code2 size={28} /></div>
          <h1 className="auth-title">NEXUS OPS</h1>
          <div className="auth-sub">Dark Hacker Dashboard</div>
        </div>

        {err && <div className="error-msg" data-testid="auth-error">{err}</div>}

        {mode === "register" && (
          <div className="form-row">
            <label className="form-label">Nome</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" data-testid="register-name-input" />
          </div>
        )}

        <div className="form-row">
          <label className="form-label">Email</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="auth-email-input" />
        </div>

        <div className="form-row">
          <label className="form-label">Senha</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={4} data-testid="auth-password-input" />
        </div>

        <button className="btn btn-primary" type="submit" style={{ width: "100%", justifyContent: "center", marginTop: 8 }} disabled={loading} data-testid="auth-submit-btn">
          {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
        </button>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "var(--text-muted)" }}>
          {mode === "login" ? (
            <>Não tem conta? <button type="button" className="btn-ghost btn" style={{ padding: 4 }} onClick={() => setMode("register")} data-testid="switch-to-register-btn">Cadastre-se</button></>
          ) : (
            <>Já tem conta? <button type="button" className="btn-ghost btn" style={{ padding: 4 }} onClick={() => setMode("login")} data-testid="switch-to-login-btn">Entrar</button></>
          )}
        </div>

        <div style={{ marginTop: 18, padding: 12, background: "var(--bg-elevated)", borderRadius: 8, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6 }}>
          <strong style={{ color: "var(--cyan)" }}>Demo:</strong> admim.chefe@nexusopus.com / 20082008G#g
        </div>
      </form>
    </div>
  );
}
