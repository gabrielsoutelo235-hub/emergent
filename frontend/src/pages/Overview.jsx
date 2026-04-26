import { useEffect, useState } from "react";
import api from "../api";
import { TrendingUp, Users as UsersIcon, DollarSign, Activity } from "lucide-react";

export default function Overview() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/overview").then((r) => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return <div className="empty" data-testid="overview-loading">Carregando...</div>;

  const fmt = (n) => `R$ ${Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const segEntries = Object.entries(data.segments || {});

  return (
    <div data-testid="overview-page">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Visão Geral</h1>
          <div className="page-subtitle">Dashboard operacional em tempo real</div>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card" data-testid="kpi-clients">
          <div className="label"><UsersIcon size={12} style={{ display: "inline" }} /> Clientes Ativos</div>
          <div className="value">{data.active_clients}</div>
          <div className="delta">Total: {data.total_clients}</div>
        </div>
        <div className="kpi-card" data-testid="kpi-mrr">
          <div className="label"><DollarSign size={12} style={{ display: "inline" }} /> MRR</div>
          <div className="value">{fmt(data.mrr)}</div>
          <div className="delta">Receita mensal recorrente</div>
        </div>
        <div className="kpi-card" data-testid="kpi-health">
          <div className="label"><Activity size={12} style={{ display: "inline" }} /> Health Médio</div>
          <div className="value">{data.avg_health}%</div>
          <div className="delta">Saúde da carteira</div>
        </div>
        <div className="kpi-card" data-testid="kpi-revenue">
          <div className="label"><TrendingUp size={12} style={{ display: "inline" }} /> Receita Total</div>
          <div className="value">{fmt(data.revenue)}</div>
          <div className={`delta ${data.profit < 0 ? "negative" : ""}`}>Lucro: {fmt(data.profit)}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }} className="overview-grid">
        <div className="card">
          <div className="section-title">Distribuição por Segmento</div>
          {segEntries.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Sem dados</div>
          ) : (
            segEntries.map(([seg, count]) => (
              <div key={seg} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ color: "var(--text-muted)" }}>{seg}</span>
                <span style={{ color: "var(--cyan)", fontWeight: 700 }}>{count}</span>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div className="section-title">Atividade Recente</div>
          {(!data.activity || data.activity.length === 0) ? (
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Sem atividade</div>
          ) : (
            data.activity.map((a) => (
              <div className="activity-item" key={a.id}>
                <div className="activity-dot" />
                <div className="activity-text">
                  {a.description}
                  <div className="activity-time">{new Date(a.created_at).toLocaleString("pt-BR")}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card">
        <div className="section-title">Distribuição de Health Score</div>
        {[
          ["Excelente (80-100)", "excelente", data.health_distribution.excelente],
          ["Bom (60-79)", "bom", data.health_distribution.bom],
          ["Atenção (40-59)", "atencao", data.health_distribution.atencao],
          ["Crítico (0-39)", "critico", data.health_distribution.critico],
        ].map(([label, cls, val]) => {
          const total = data.total_clients || 1;
          const pct = (val / total) * 100;
          return (
            <div className="dist-row" key={cls}>
              <div className="dist-label">{label}</div>
              <div className="dist-bar">
                <div className={`dist-fill ${cls}`} style={{ width: `${Math.max(pct, val > 0 ? 8 : 0)}%` }}>{val}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
