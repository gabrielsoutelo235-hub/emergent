import { useEffect, useState } from "react";
import api from "../api";
import { Globe, Search, Zap } from "lucide-react";

function ScoreCircle({ value, color, label }) {
  const dash = 282.7;
  const filled = (value / 100) * dash;
  return (
    <div className="score-tile">
      <div className="score-circle">
        <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
          <circle cx="50" cy="50" r="45" fill="none" stroke="var(--bg-elevated)" strokeWidth="8" />
          <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="8" strokeDasharray={`${filled} ${dash}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 0.8s" }} />
        </svg>
        <div className="score-num" style={{ color }}>{value}</div>
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
    </div>
  );
}

export default function SiteAnalyzer() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.get("/analyses").then(({ data }) => setHistory(data)).catch(() => {});
  }, []);

  const analyze = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setBusy(true); setResult(null);
    try {
      const { data } = await api.post("/analyze", { url: url.trim() });
      setResult(data);
      setHistory(h => [data, ...h].slice(0, 10));
    } catch (ex) {
      alert("Erro ao analisar URL");
    } finally { setBusy(false); }
  };

  const vitalPct = (val, max) => Math.min(100, (val / max) * 100);

  return (
    <div data-testid="analyzer-page">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Analisador de Sites</h1>
          <div className="page-subtitle">Performance, SEO, Segurança e UX</div>
        </div>
      </div>

      <form className="card" onSubmit={analyze} style={{ marginBottom: 20 }}>
        <div className="row">
          <Globe size={18} style={{ color: "var(--cyan)" }} />
          <input className="input" style={{ flex: 1 }} placeholder="https://exemplo.com" value={url} onChange={(e) => setUrl(e.target.value)} required data-testid="analyzer-url-input" />
          <button className="btn btn-primary" type="submit" disabled={busy} data-testid="analyzer-btn">
            <Search size={16} /> {busy ? "Analisando..." : "Analisar"}
          </button>
        </div>
      </form>

      {result && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
            <div className="card">
              <div className="section-title">Scores Lighthouse</div>
              <div className="scores-grid">
                <ScoreCircle value={result.scores.performance} color="var(--cyan)" label="Performance" />
                <ScoreCircle value={result.scores.seo} color="var(--lime)" label="SEO" />
                <ScoreCircle value={result.scores.security} color="var(--orange)" label="Segurança" />
                <ScoreCircle value={result.scores.ux} color="var(--violet)" label="UX" />
              </div>
            </div>

            <div className="card">
              <div className="section-title">Core Web Vitals</div>
              {[
                ["LCP", `${result.vitals.lcp}ms`, vitalPct(result.vitals.lcp, 3000)],
                ["FID", `${result.vitals.fid}ms`, vitalPct(result.vitals.fid, 300)],
                ["CLS", `${result.vitals.cls}`, vitalPct(result.vitals.cls, 0.3) ],
                ["TTFB", `${result.vitals.ttfb}ms`, vitalPct(result.vitals.ttfb, 800)],
              ].map(([l, v, pct]) => (
                <div className="vital-row" key={l}>
                  <div className="vital-label-row"><span>{l}</span><span style={{ color: "var(--cyan)" }}>{v}</span></div>
                  <div className="vital-bar"><div className="vital-fill" style={{ width: `${pct}%` }} /></div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 18 }}>
            <div className="section-title"><Zap size={14} style={{ display: "inline", marginRight: 6 }} />Recomendações</div>
            <ul style={{ paddingLeft: 22, lineHeight: 2, color: "var(--text-muted)" }}>
              {result.recommendations.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        </>
      )}

      <div className="card">
        <div className="section-title">Histórico de Análises</div>
        {history.length === 0 ? <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Nenhuma análise ainda</div> :
          history.map(h => (
            <div key={h.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border)", cursor: "pointer" }} onClick={() => setResult(h)}>
              <div>
                <div style={{ fontSize: 14, color: "var(--text)" }}>{h.url}</div>
                <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{new Date(h.created_at).toLocaleString("pt-BR")}</div>
              </div>
              <div className="row" style={{ gap: 12, fontSize: 12 }}>
                <span style={{ color: "var(--cyan)" }}>P {h.scores.performance}</span>
                <span style={{ color: "var(--lime)" }}>S {h.scores.seo}</span>
                <span style={{ color: "var(--orange)" }}>Sec {h.scores.security}</span>
                <span style={{ color: "var(--violet)" }}>UX {h.scores.ux}</span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
