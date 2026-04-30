import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import { ArrowLeft, Image as ImgIcon, FileCode, Sparkles, Download, Upload } from "lucide-react";

export default function ClientIntel() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [intel, setIntel] = useState({ asset_type: "site", asset_url: "", manual_data: {}, code_paste: "" });
  const [busy, setBusy] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const ssRef = useRef(null);
  const codeRef = useRef(null);

  const load = async () => {
    const { data } = await api.get(`/clients/${id}/intel`);
    setData(data);
    setIntel({
      asset_type: data.intel.asset_type || "site",
      asset_url: data.intel.asset_url || "",
      manual_data: data.intel.manual_data || {},
      code_paste: data.intel.code_paste || "",
    });
  };
  useEffect(() => { load(); }, [id]);

  const save = async () => { setBusy(true); try { await api.put(`/clients/${id}/intel`, intel); } finally { setBusy(false); } };

  const upload = async (e, kind) => {
    const files = Array.from(e.target.files || []);
    setBusy(true);
    try {
      for (const f of files) {
        const fd = new FormData();
        fd.append("file", f);
        fd.append("kind", kind);
        await api.post(`/clients/${id}/intel/upload`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      }
      await load();
    } finally { setBusy(false); e.target.value = ""; }
  };

  const analyze = async () => {
    await save();
    setAnalyzing(true);
    try {
      await api.post(`/clients/${id}/intel/analyze`);
      await load();
    } catch (e) { alert("Erro: " + (e.response?.data?.detail || e.message)); }
    finally { setAnalyzing(false); }
  };

  const downloadPdf = async (content) => {
    try {
      const { data } = await api.post("/coach/pdf", { content, title: `Análise — ${client?.name || "Cliente"}` }, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
      window.open(url, "_blank");
      const a = document.createElement("a");
      a.href = url; a.download = `nexus-${client?.name || "cliente"}-${Date.now()}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (e) { alert("Erro ao baixar PDF"); }
  };

  if (!data) return <div className="empty">Carregando...</div>;
  const { client, intel: ix } = data;
  const screenshots = ix.screenshots || [];
  const codeFiles = ix.code_files || [];
  const analyses = ix.analyses || [];

  const setMD = (k, v) => setIntel(s => ({ ...s, manual_data: { ...s.manual_data, [k]: v } }));

  return (
    <div data-testid="client-intel-page">
      <div className="page-header-row">
        <div>
          <button className="btn btn-ghost" onClick={() => navigate("/clients")}><ArrowLeft size={14} /> Voltar</button>
          <h1 className="page-title" style={{ marginTop: 8 }}>Painel de Dados — {client.name}</h1>
          <div className="page-subtitle">Inteligência unificada · Visual + Código + Dados manuais</div>
        </div>
        <button className="btn btn-primary" onClick={analyze} disabled={analyzing} data-testid="analyze-btn">
          <Sparkles size={16} /> {analyzing ? "Analisando com IA..." : "Gerar Análise IA"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
        <div className="card">
          <div className="section-title">1. Ativo Digital</div>
          <div className="form-row"><label className="form-label">Tipo</label>
            <select className="select" value={intel.asset_type} onChange={(e) => setIntel({ ...intel, asset_type: e.target.value })}>
              <option value="site">Site</option><option value="app">App</option><option value="ecommerce">E-commerce</option>
            </select>
          </div>
          <div className="form-row"><label className="form-label">URL</label>
            <input className="input" value={intel.asset_url} onChange={(e) => setIntel({ ...intel, asset_url: e.target.value })} placeholder="https://..." data-testid="intel-url" />
          </div>
        </div>

        <div className="card">
          <div className="section-title">2. Dados Manuais</div>
          {[
            ["traffic_monthly", "Tráfego mensal"],
            ["conversion_rate", "Taxa de conversão (%)"],
            ["ad_spend", "Gasto em anúncios (R$)"],
            ["revenue", "Faturamento (R$)"],
            ["main_pain", "Dor principal do cliente"],
          ].map(([k, label]) => (
            <div className="form-row" key={k}>
              <label className="form-label">{label}</label>
              <input className="input" value={intel.manual_data[k] || ""} onChange={(e) => setMD(k, e.target.value)} data-testid={`md-${k}`} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
        <div className="card">
          <div className="section-title">3. Screenshots (UX/UI)</div>
          <input ref={ssRef} type="file" multiple accept="image/*" style={{ display: "none" }} onChange={(e) => upload(e, "screenshot")} data-testid="ss-input" />
          <button className="btn" onClick={() => ssRef.current?.click()} disabled={busy}><Upload size={14} /> Upload Imagens</button>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px,1fr))", gap: 10, marginTop: 14 }}>
            {screenshots.map(s => (
              <div key={s.file_id} className="chip" style={{ cursor: "default", display: "flex", gap: 6, alignItems: "center" }}>
                <ImgIcon size={12} /> {s.name}
              </div>
            ))}
            {screenshots.length === 0 && <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Nenhuma imagem</div>}
          </div>
        </div>

        <div className="card">
          <div className="section-title">4. Código (Code Hub)</div>
          <input ref={codeRef} type="file" multiple accept=".zip,.js,.ts,.html,.css,.py,.json,.md,.txt" style={{ display: "none" }} onChange={(e) => upload(e, "code")} data-testid="code-input" />
          <button className="btn" onClick={() => codeRef.current?.click()} disabled={busy}><Upload size={14} /> Upload ZIP/Código</button>
          <div style={{ marginTop: 10 }}>
            {codeFiles.map(c => (
              <div key={c.file_id} className="chip" style={{ display: "inline-flex", gap: 6, marginRight: 6, marginBottom: 6, cursor: "default" }}>
                <FileCode size={12} /> {c.name}
              </div>
            ))}
          </div>
          <div className="form-row" style={{ marginTop: 12 }}>
            <label className="form-label">ou cole o código</label>
            <textarea className="textarea" rows={6} value={intel.code_paste} onChange={(e) => setIntel({ ...intel, code_paste: e.target.value })} placeholder="// cole aqui..." style={{ fontFamily: "JetBrains Mono", fontSize: 12 }} data-testid="code-paste" />
          </div>
        </div>
      </div>

      <div className="row" style={{ justifyContent: "flex-end", marginBottom: 18 }}>
        <button className="btn" onClick={save} disabled={busy} data-testid="save-intel-btn">{busy ? "Salvando..." : "Salvar Dados"}</button>
      </div>

      <div className="card">
        <div className="section-title">📊 Histórico de Análises IA</div>
        {analyses.length === 0 ? <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Nenhuma análise ainda. Preencha os dados acima e clique em "Gerar Análise IA".</div> :
          analyses.slice().reverse().map(a => (
            <div key={a.id} style={{ padding: 14, border: "1px solid var(--border)", borderRadius: 10, marginBottom: 12, background: "var(--bg-elevated)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date(a.created_at).toLocaleString("pt-BR")}</div>
                <button className="btn btn-primary" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => downloadPdf(a.content)}>
                  <Download size={14} /> Baixar PDF
                </button>
              </div>
              <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.6, color: "var(--text)" }}>{a.content}</div>
            </div>
          ))}
      </div>
    </div>
  );
}
