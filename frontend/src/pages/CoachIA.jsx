import { useEffect, useRef, useState } from "react";
import api from "../api";
import { Send, Bot, Paperclip, X, FileText, Image as ImgIcon, Download } from "lucide-react";

const QUICK = [
  "Analisar meus KPIs atuais",
  "Quais clientes estão em risco?",
  "Sugira oportunidades de upsell",
  "Resumo do meu portfólio",
];

function fileIcon(mt = "") {
  if (mt.startsWith("image/")) return <ImgIcon size={14} />;
  return <FileText size={14} />;
}

export default function CoachIA() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    api.get("/coach/history").then(({ data }) => setMessages(data)).catch(() => {});
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  const onPickFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const f of files) {
        const fd = new FormData();
        fd.append("file", f);
        const { data } = await api.post("/coach/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
        setAttachments(a => [...a, data]);
      }
    } catch (ex) {
      alert("Erro no upload: " + (ex.response?.data?.detail || ex.message));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeAtt = (id) => setAttachments(a => a.filter(x => x.file_id !== id));

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if ((!msg && attachments.length === 0) || busy) return;
    setInput("");
    const userMsg = { role: "user", content: msg || "(arquivos enviados)", id: Date.now().toString(), attachments: attachments.map(a => a.name) };
    setMessages(m => [...m, userMsg]);
    const sentAtt = [...attachments];
    setAttachments([]);
    setBusy(true);
    try {
      const { data } = await api.post("/coach/chat", { message: msg || "Analise os arquivos anexados.", attachments: sentAtt });
      setMessages(m => [...m, { role: "assistant", content: data.response, id: Date.now().toString() + "_a" }]);
    } catch (e) {
      setMessages(m => [...m, { role: "assistant", content: "Erro: " + (e.response?.data?.detail || e.message), id: Date.now().toString() + "_e" }]);
    } finally { setBusy(false); }
  };

  const downloadPdf = async (content, idx) => {
    try {
      const mod = await import("jspdf");
      const JsPDFCtor = mod.jsPDF || mod.default;
      const doc = new JsPDFCtor({ unit: "pt", format: "a4", compress: true });
      const margin = 48;
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const maxW = pageW - margin * 2;

      // Header bar
      doc.setFillColor(12, 14, 21);
      doc.rect(0, 0, pageW, 70, "F");
      doc.setTextColor(0, 229, 255);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("NEXUS OPS - Analise IA", margin, 42);
      doc.setFontSize(9);
      doc.setTextColor(150, 165, 195);
      doc.setFont("helvetica", "normal");
      doc.text(`Coach NEXUS · ${new Date().toLocaleString("pt-BR")}`, margin, 58);

      // Body
      let y = 100;
      doc.setTextColor(40, 50, 70);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");

      // Sanitize content (some unicode chars break default helvetica)
      const safe = String(content || "")
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/\u2014/g, "-")
        .replace(/\u2013/g, "-")
        .replace(/\u2022/g, "•");

      const lines = doc.splitTextToSize(safe, maxW);
      for (const line of lines) {
        if (y > pageH - 60) { doc.addPage(); y = margin; }
        doc.text(line, margin, y);
        y += 16;
      }

      // Footer
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 165, 195);
        doc.text(`NEXUS OPS · pag ${i}/${totalPages}`, pageW - margin, pageH - 24, { align: "right" });
      }

      const filename = `nexus-analise-${Date.now()}.pdf`;

      // Primary: trigger download via blob (works on iOS / mobile too)
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      console.log("[PDF] gerado:", filename);
    } catch (err) {
      console.error("[PDF] erro:", err);
      alert("Erro ao gerar PDF: " + (err?.message || err));
    }
  };

  return (
    <div data-testid="coach-page">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Interrogatório IA</h1>
          <div className="page-subtitle">Coach NEXUS · GPT-5.2 (texto) / Gemini 2.5 (anexos) · análise estratégica</div>
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
                Faça uma pergunta, anexe um documento/imagem ou escolha um atalho.
              </div>
            )}
            {messages.map((m, idx) => (
              <div key={m.id || `${m.created_at}-${idx}`} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start", gap: 6 }}>
                <div className={`msg ${m.role}`} data-testid={`msg-${m.role}`}>{m.content}</div>
                {m.attachments && m.attachments.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {m.attachments.map((n, i) => <span key={i} className="chip" style={{ cursor: "default", fontSize: 11 }}>📎 {n}</span>)}
                  </div>
                )}
                {m.role === "assistant" && m.content && !m.content.startsWith("Erro") && (
                  <button className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => downloadPdf(m.content, idx)} data-testid={`download-pdf-${idx}`}>
                    <Download size={12} /> Baixar PDF
                  </button>
                )}
              </div>
            ))}
            {busy && <div className="msg assistant">⚙️ Analisando dados...</div>}
            <div ref={endRef} />
          </div>

          {attachments.length > 0 && (
            <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, flexWrap: "wrap", background: "var(--bg-elevated)" }}>
              {attachments.map(a => (
                <div key={a.file_id} className="chip" style={{ cursor: "default", display: "flex", alignItems: "center", gap: 6 }}>
                  {fileIcon(a.mime_type)} {a.name}
                  <button onClick={() => removeAtt(a.file_id)} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", padding: 0 }} data-testid={`remove-att-${a.file_id}`}><X size={12} /></button>
                </div>
              ))}
            </div>
          )}

          <div className="chips">
            {QUICK.map(q => <button key={q} className="chip" onClick={() => send(q)} data-testid={`chip-${q}`}>{q}</button>)}
          </div>

          <div className="chat-input-row">
            <input ref={fileRef} type="file" multiple onChange={onPickFiles} style={{ display: "none" }} accept="image/*,.pdf,.txt,.csv,.json,.md,.docx" data-testid="file-input" />
            <button className="btn" onClick={() => fileRef.current?.click()} disabled={uploading || busy} title="Anexar" data-testid="attach-btn">
              <Paperclip size={16} />
            </button>
            <input className="input" placeholder={uploading ? "Enviando arquivo..." : "Digite sua pergunta..."} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} disabled={busy || uploading} data-testid="chat-input" />
            <button className="btn btn-primary" onClick={() => send()} disabled={busy || uploading} data-testid="chat-send-btn"><Send size={16} /></button>
          </div>
        </div>

        <div className="card" style={{ alignSelf: "stretch" }}>
          <div className="section-title">Recursos</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>
            <div style={{ marginBottom: 14 }}><strong style={{ color: "var(--cyan)" }}>📎 Anexos suportados:</strong></div>
            <ul style={{ paddingLeft: 18, marginTop: 4 }}>
              <li>Imagens (PNG, JPG, WEBP)</li>
              <li>PDF, TXT, CSV, MD, JSON</li>
              <li>Análise multimodal GPT-5.2</li>
            </ul>
            <div style={{ marginTop: 14, marginBottom: 6 }}><strong style={{ color: "var(--cyan)" }}>📥 Exportar como PDF:</strong></div>
            <div>Cada resposta tem botão <em>Baixar PDF</em> para gerar relatório formatado da análise.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
