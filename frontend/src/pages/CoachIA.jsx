import { useEffect, useRef, useState } from "react";
import api from "../api";
import { Send, Bot } from "lucide-react";

const QUICK = [
  "Analisar meus KPIs atuais",
  "Quais clientes estão em risco?",
  "Sugira oportunidades de upsell",
  "Resumo do meu portfólio",
];

export default function CoachIA() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    api.get("/coach/history").then(({ data }) => setMessages(data)).catch(() => {});
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || busy) return;
    setInput("");
    setMessages(m => [...m, { role: "user", content: msg, id: Date.now().toString() }]);
    setBusy(true);
    try {
      const { data } = await api.post("/coach/chat", { message: msg });
      setMessages(m => [...m, { role: "assistant", content: data.response, id: Date.now().toString() + "_a" }]);
    } catch (e) {
      setMessages(m => [...m, { role: "assistant", content: "Erro ao consultar Coach IA. Tente novamente.", id: Date.now().toString() + "_e" }]);
    } finally { setBusy(false); }
  };

  return (
    <div data-testid="coach-page">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Interrogatório IA</h1>
          <div className="page-subtitle">Coach NEXUS · GPT-5.2 · análise estratégica</div>
        </div>
      </div>

      <div className="chat-shell">
        <div className="chat-box">
          <div className="chat-header">
            <div className="chat-avatar"><Bot size={20} /></div>
            <div>
              <div style={{ fontWeight: 700 }}>Coach NEXUS</div>
              <div style={{ fontSize: 11, color: "var(--lime)" }}>{busy ? "Pensando..." : "Pronto"}</div>
            </div>
          </div>
          <div className="chat-messages">
            {messages.length === 0 && (
              <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 20, fontSize: 14 }}>
                Comece com uma pergunta ou escolha um atalho abaixo.
              </div>
            )}
            {messages.map(m => (
              <div key={m.id || m.created_at} className={`msg ${m.role}`} data-testid={`msg-${m.role}`}>{m.content}</div>
            ))}
            {busy && <div className="msg assistant">⚙️ Analisando dados...</div>}
            <div ref={endRef} />
          </div>
          <div className="chips">
            {QUICK.map(q => <button key={q} className="chip" onClick={() => send(q)} data-testid={`chip-${q}`}>{q}</button>)}
          </div>
          <div className="chat-input-row">
            <input className="input" placeholder="Digite sua pergunta..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} disabled={busy} data-testid="chat-input" />
            <button className="btn btn-primary" onClick={() => send()} disabled={busy} data-testid="chat-send-btn"><Send size={16} /></button>
          </div>
        </div>

        <div className="card" style={{ alignSelf: "stretch" }}>
          <div className="section-title">Sobre o Coach</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>
            O Coach NEXUS analisa em tempo real seus dados de clientes, MRR e operação para responder com:
            <ul style={{ paddingLeft: 18, marginTop: 10 }}>
              <li>Diagnósticos baseados em dados</li>
              <li>Sugestões de retenção e upsell</li>
              <li>Resumos executivos</li>
              <li>Análise de churn e oportunidades</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
