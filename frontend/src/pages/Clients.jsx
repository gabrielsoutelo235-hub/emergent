import { useEffect, useState } from "react";
import api from "../api";
import { Plus, Edit2, Trash2, X } from "lucide-react";
import { useConfirm } from "../components/Confirm";

const STATUSES = ["Ativo", "Em Risco", "Onboarding", "Cancelado"];
const empty = { name: "", segment: "", status: "Ativo", mrr: 0, health: 80, next_action: "", contact_email: "", notes: "" };

export default function Clients() {
  const confirm = useConfirm();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [filter, setFilter] = useState("");
  const [statusF, setStatusF] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/clients");
      setList(data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const open = (c = null) => {
    if (c) { setForm({ ...empty, ...c }); setEditId(c.id); }
    else { setForm(empty); setEditId(null); }
    setModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    const payload = { ...form, mrr: parseFloat(form.mrr) || 0, health: parseInt(form.health) || 0 };
    if (editId) await api.put(`/clients/${editId}`, payload);
    else await api.post("/clients", payload);
    setModal(false); load();
  };

  const del = async (id, name) => {
    const ok = await confirm(`Remover o cliente "${name}"? Esta ação não pode ser desfeita.`, "Excluir cliente");
    if (!ok) return;
    try {
      await api.delete(`/clients/${id}`);
      await load();
    } catch (e) {
      alert("Erro ao excluir: " + (e.response?.data?.detail || e.message));
    }
  };

  const mrr = list.filter(c => c.status === "Ativo").reduce((s, c) => s + (c.mrr || 0), 0);

  const filtered = list.filter(c => {
    if (filter && !c.name.toLowerCase().includes(filter.toLowerCase())) return false;
    if (statusF && c.status !== statusF) return false;
    return true;
  });

  return (
    <div data-testid="clients-page">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Gestão de Clientes</h1>
          <div className="page-subtitle">Cadastro, status e MRR</div>
        </div>
        <button className="btn btn-primary" onClick={() => open()} data-testid="new-client-btn">
          <Plus size={16} /> Novo Cliente
        </button>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="label">MRR (Receita Mensal Recorrente)</div>
          <div className="value">R$ {mrr.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
          <div className="delta">{list.filter(c => c.status === "Ativo").length} clientes ativos</div>
        </div>
        <div className="kpi-card">
          <div className="label">Total Cadastrados</div>
          <div className="value">{list.length}</div>
          <div className="delta">{list.filter(c => c.status === "Em Risco").length} em risco</div>
        </div>
      </div>

      <div className="row" style={{ marginBottom: 18 }}>
        <input className="input" style={{ maxWidth: 320 }} placeholder="Filtrar por nome..." value={filter} onChange={(e) => setFilter(e.target.value)} data-testid="filter-name-input" />
        <select className="select" style={{ maxWidth: 220 }} value={statusF} onChange={(e) => setStatusF(e.target.value)} data-testid="filter-status-select">
          <option value="">Todos os status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <div className="empty">Carregando...</div> : filtered.length === 0 ? (
        <div className="empty" data-testid="clients-empty">
          <div className="empty-icon">👥</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>Nenhum cliente cadastrado</div>
          <div>Comece adicionando um novo cliente!</div>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Cliente</th><th>Segmento</th><th>Status</th><th>MRR</th><th>Health</th><th>Próxima Ação</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} data-testid={`client-row-${c.id}`}>
                  <td><strong style={{ color: "var(--cyan)" }}>{c.name}</strong><div style={{ fontSize: 11, color: "var(--text-dim)" }}>{c.contact_email}</div></td>
                  <td>{c.segment || "—"}</td>
                  <td><span className={`badge ${c.status === "Ativo" ? "ativo" : c.status === "Em Risco" ? "risco" : c.status === "Onboarding" ? "onboarding" : "cancelado"}`}>{c.status}</span></td>
                  <td>R$ {Number(c.mrr || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                  <td>
                    <div className="health-bar"><div className={`health-fill ${c.health >= 70 ? "high" : c.health >= 40 ? "mid" : "low"}`} style={{ width: `${c.health}%` }} /></div>
                    <span style={{ fontSize: 12 }}>{c.health}%</span>
                  </td>
                  <td style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 180 }}>{c.next_action || "—"}</td>
                  <td>
                    <div className="row" style={{ gap: 6 }}>
                      <button className="btn btn-ghost" onClick={() => open(c)} data-testid={`edit-client-${c.id}`}><Edit2 size={14} /></button>
                      <button className="btn btn-ghost" onClick={() => del(c.id, c.name)} data-testid={`delete-client-${c.id}`} style={{ color: "var(--red)" }}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <form className="modal" onSubmit={save} data-testid="client-modal">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 className="modal-title">{editId ? "Editar Cliente" : "Novo Cliente"}</h3>
              <button type="button" className="btn-ghost btn" onClick={() => setModal(false)}><X size={16} /></button>
            </div>
            <div className="form-row"><label className="form-label">Nome *</label><input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="client-name-input" /></div>
            <div className="form-row"><label className="form-label">Email de contato</label><input className="input" type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
            <div className="form-row"><label className="form-label">Segmento</label><input className="input" value={form.segment} onChange={(e) => setForm({ ...form, segment: e.target.value })} placeholder="ex: SaaS, E-commerce" /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-row"><label className="form-label">Status</label>
                <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-row"><label className="form-label">MRR (R$)</label><input className="input" type="number" step="0.01" value={form.mrr} onChange={(e) => setForm({ ...form, mrr: e.target.value })} data-testid="client-mrr-input" /></div>
            </div>
            <div className="form-row"><label className="form-label">Health (0-100)</label><input className="input" type="number" min="0" max="100" value={form.health} onChange={(e) => setForm({ ...form, health: e.target.value })} /></div>
            <div className="form-row"><label className="form-label">Próxima ação</label><input className="input" value={form.next_action} onChange={(e) => setForm({ ...form, next_action: e.target.value })} /></div>
            <div className="form-row"><label className="form-label">Notas</label><textarea className="textarea" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
              <button type="button" className="btn" onClick={() => setModal(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" data-testid="save-client-btn">Salvar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
