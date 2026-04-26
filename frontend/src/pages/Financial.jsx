import { useEffect, useState } from "react";
import api from "../api";
import { Plus, Trash2, X, TrendingUp, TrendingDown } from "lucide-react";
import { useConfirm } from "../components/Confirm";

const empty = { client_name: "", description: "", amount: 0, type: "receita" };

export default function Financial() {
  const confirm = useConfirm();
  const [list, setList] = useState([]);
  const [clients, setClients] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);

  const load = async () => {
    const [t, c] = await Promise.all([api.get("/transactions"), api.get("/clients")]);
    setList(t.data);
    setClients(c.data);
  };
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    await api.post("/transactions", { ...form, amount: parseFloat(form.amount) || 0 });
    setForm(empty); setModal(false); load();
  };

  const del = async (id) => {
    const ok = await confirm("Excluir este lançamento financeiro?", "Excluir lançamento");
    if (!ok) return;
    try {
      await api.delete(`/transactions/${id}`);
      await load();
    } catch (e) {
      alert("Erro ao excluir: " + (e.response?.data?.detail || e.message));
    }
  };

  const revenue = list.filter(t => t.type === "receita").reduce((s, t) => s + (t.amount || 0), 0);
  const expenses = list.filter(t => t.type === "despesa").reduce((s, t) => s + (t.amount || 0), 0);
  const ticket = list.length ? revenue / Math.max(list.filter(t => t.type === "receita").length, 1) : 0;

  // revenue by client
  const byClient = {};
  list.filter(t => t.type === "receita").forEach(t => {
    const k = t.client_name || "Avulso";
    byClient[k] = (byClient[k] || 0) + (t.amount || 0);
  });
  const maxClient = Math.max(1, ...Object.values(byClient));

  const fmt = (n) => `R$ ${Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  return (
    <div data-testid="financial-page">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Controle Financeiro</h1>
          <div className="page-subtitle">Lançamentos, receita e despesa</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)} data-testid="new-transaction-btn"><Plus size={16} /> Novo Lançamento</button>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card"><div className="label">Receita</div><div className="value">{fmt(revenue)}</div><div className="delta"><TrendingUp size={12} style={{ display: "inline" }} /> {list.filter(t => t.type === "receita").length} entradas</div></div>
        <div className="kpi-card"><div className="label">Despesa</div><div className="value" style={{ color: "var(--orange)" }}>{fmt(expenses)}</div><div className="delta negative"><TrendingDown size={12} style={{ display: "inline" }} /> {list.filter(t => t.type === "despesa").length} saídas</div></div>
        <div className="kpi-card"><div className="label">Lucro Líquido</div><div className="value" style={{ color: revenue - expenses >= 0 ? "var(--lime)" : "var(--red)" }}>{fmt(revenue - expenses)}</div><div className="delta">Resultado</div></div>
        <div className="kpi-card"><div className="label">Ticket Médio</div><div className="value">{fmt(ticket)}</div><div className="delta">Por receita</div></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
        <div className="card">
          <div className="section-title">Receita por Cliente</div>
          {Object.keys(byClient).length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Sem dados</div>
          ) : Object.entries(byClient).sort(([,a],[,b]) => b-a).map(([name, val]) => (
            <div key={name} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: "var(--text)" }}>{name}</span>
                <span style={{ color: "var(--cyan)", fontWeight: 700 }}>{fmt(val)}</span>
              </div>
              <div style={{ height: 6, background: "var(--bg-elevated)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", background: "linear-gradient(90deg, var(--cyan), var(--lime))", width: `${(val / maxClient) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="section-title">Lançamentos Recentes</div>
          {list.length === 0 ? <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Sem dados</div> :
            list.slice(0, 8).map(t => (
              <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <div>
                  <div style={{ fontSize: 14 }}>{t.description}</div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{t.client_name || "Avulso"} · {new Date(t.date).toLocaleDateString("pt-BR")}</div>
                </div>
                <div className="row">
                  <div style={{ color: t.type === "receita" ? "var(--lime)" : "var(--orange)", fontWeight: 700, fontSize: 14 }}>
                    {t.type === "receita" ? "+" : "-"}{fmt(t.amount)}
                  </div>
                  <button className="btn btn-ghost" onClick={() => del(t.id)} style={{ color: "var(--red)" }} data-testid={`delete-transaction-${t.id}`}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <form className="modal" onSubmit={save} data-testid="transaction-modal">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 className="modal-title">Novo Lançamento</h3>
              <button type="button" className="btn-ghost btn" onClick={() => setModal(false)}><X size={16} /></button>
            </div>
            <div className="form-row">
              <label className="form-label">Tipo</label>
              <select className="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="receita">Receita</option>
                <option value="despesa">Despesa</option>
              </select>
            </div>
            <div className="form-row">
              <label className="form-label">Cliente (opcional)</label>
              <select className="select" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })}>
                <option value="">— Avulso —</option>
                {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-row"><label className="form-label">Descrição *</label><input required className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="transaction-desc-input" /></div>
            <div className="form-row"><label className="form-label">Valor (R$) *</label><input required className="input" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} data-testid="transaction-amount-input" /></div>
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button type="button" className="btn" onClick={() => setModal(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" data-testid="save-transaction-btn">Salvar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
