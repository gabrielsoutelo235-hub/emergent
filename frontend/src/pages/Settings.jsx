import { useState } from "react";
import api from "../api";
import { useAuth } from "../auth";

const COLORS = ["#00e5ff", "#a3e635", "#ff6b2b", "#7c3aed", "#fbbf24"];

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || "",
    role_title: user?.role_title || "",
    company: user?.company || "",
    accent_color: user?.accent_color || "#00e5ff",
  });
  const [saved, setSaved] = useState(false);

  const save = async () => {
    await api.patch("/auth/profile", form);
    document.documentElement.style.setProperty("--cyan", form.accent_color);
    await refreshUser();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div data-testid="settings-page">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Configurações</h1>
          <div className="page-subtitle">Perfil e preferências</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div className="card">
          <div className="section-title">Perfil</div>
          <div className="form-row"><label className="form-label">Nome</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="settings-name-input" /></div>
          <div className="form-row"><label className="form-label">Cargo</label><input className="input" value={form.role_title} onChange={(e) => setForm({ ...form, role_title: e.target.value })} /></div>
          <div className="form-row"><label className="form-label">Empresa</label><input className="input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
          <div className="form-row"><label className="form-label">Email</label><input className="input" value={user?.email || ""} disabled /></div>
        </div>

        <div className="card">
          <div className="section-title">Cor de Acento</div>
          <div className="row" style={{ gap: 12, marginBottom: 18 }}>
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => setForm({ ...form, accent_color: c })} style={{
                width: 40, height: 40, borderRadius: 10, background: c,
                border: form.accent_color === c ? "3px solid var(--text)" : "1px solid var(--border)",
                cursor: "pointer", boxShadow: form.accent_color === c ? `0 0 20px ${c}` : "none"
              }} data-testid={`color-${c}`} />
            ))}
          </div>
          <div className="section-title" style={{ marginTop: 24 }}>Sobre</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>
            <div>NEXUS OPS Dashboard</div>
            <div>Versão 1.0.0 — Dark Hacker</div>
            <div>Powered by FastAPI + React + MongoDB</div>
          </div>
        </div>
      </div>

      <div className="row" style={{ marginTop: 18, justifyContent: "flex-end" }}>
        {saved && <span style={{ color: "var(--lime)", fontSize: 13 }}>✓ Salvo</span>}
        <button className="btn btn-primary" onClick={save} data-testid="save-profile-btn">Salvar Configurações</button>
      </div>
    </div>
  );
}
