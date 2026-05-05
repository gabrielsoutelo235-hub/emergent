import { useEffect, useState } from "react";
import api from "../api";
import { Plus, Trash2, X, Code2, Copy, Archive } from "lucide-react";
import { useConfirm } from "../components/Confirm";

const langs = ["javascript", "typescript", "python", "bash", "html", "css", "sql", "json"];
const empty = { title: "", language: "javascript", code: "", description: "", tags: [] };

export default function CodeHub() {
  const confirm = useConfirm();
  const [list, setList] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [tagInput, setTagInput] = useState("");
  const [filter, setFilter] = useState("");
  const [importing, setImporting] = useState(false);
  const archiveRef = useState(null);

  const onImportArchive = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/snippets/import-archive", fd, { headers: { "Content-Type": "multipart/form-data" } });
      alert(`${data.imported} arquivo(s) importado(s) com sucesso!`);
      await load();
    } catch (ex) {
      alert("Erro ao importar: " + (ex.response?.data?.detail || ex.message));
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const load = async () => { const { data } = await api.get("/snippets"); setList(data); };
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    await api.post("/snippets", form);
    setForm(empty); setTagInput(""); setModal(false); load();
  };
  const del = async (id, title) => {
    const ok = await confirm(`Excluir o snippet "${title}"?`, "Excluir snippet");
    if (!ok) return;
    try {
      await api.delete(`/snippets/${id}`);
      await load();
    } catch (e) {
      alert("Erro ao excluir: " + (e.response?.data?.detail || e.message));
    }
  };
  const copy = (code) => { navigator.clipboard.writeText(code); };

  const filtered = list.filter(s => !filter || s.title.toLowerCase().includes(filter.toLowerCase()) || (s.tags || []).some(t => t.includes(filter.toLowerCase())));

  return (
    <div data-testid="codehub-page">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Code Hub</h1>
          <div className="page-subtitle">Repositório de snippets e comandos</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)} data-testid="new-snippet-btn"><Plus size={16} /> Novo Snippet</button>
      </div>

      <div className="row" style={{ marginBottom: 18, gap: 12 }}>
        <input className="input" style={{ maxWidth: 380, flex: 1 }} placeholder="Buscar título ou tag..." value={filter} onChange={(e) => setFilter(e.target.value)} />
        <label className="btn" style={{ cursor: importing ? "wait" : "pointer", opacity: importing ? 0.6 : 1 }}>
          <Archive size={16} /> {importing ? "Importando..." : "Importar ZIP / RAR / 7Z"}
          <input type="file" accept=".zip,.rar,.7z" onChange={onImportArchive} disabled={importing} style={{ display: "none" }} data-testid="import-archive-input" />
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="empty"><div className="empty-icon"><Code2 size={48} style={{ opacity: 0.4 }} /></div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>Nenhum snippet salvo</div>
          <div>Crie seu primeiro snippet de código!</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 18 }}>
          {filtered.map(s => (
            <div key={s.id} className="card" data-testid={`snippet-${s.id}`}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--cyan)" }}>{s.title}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}>{s.language}</div>
                </div>
                <div className="row" style={{ gap: 4 }}>
                  <button className="btn btn-ghost" onClick={() => copy(s.code)} title="Copiar"><Copy size={14} /></button>
                  <button className="btn btn-ghost" onClick={() => del(s.id, s.title)} style={{ color: "var(--red)" }} data-testid={`delete-snippet-${s.id}`}><Trash2 size={14} /></button>
                </div>
              </div>
              {s.description && <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>{s.description}</div>}
              <div className="code-block">{s.code}</div>
              {(s.tags || []).length > 0 && (
                <div className="row" style={{ marginTop: 10, gap: 6 }}>
                  {s.tags.map(t => <span key={t} className="chip" style={{ cursor: "default" }}>#{t}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <form className="modal" style={{ maxWidth: 640 }} onSubmit={save} data-testid="snippet-modal">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 className="modal-title">Novo Snippet</h3>
              <button type="button" className="btn-ghost btn" onClick={() => setModal(false)}><X size={16} /></button>
            </div>
            <div className="form-row"><label className="form-label">Título *</label><input required className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="snippet-title-input" /></div>
            <div className="form-row"><label className="form-label">Linguagem</label>
              <select className="select" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                {langs.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div className="form-row"><label className="form-label">Descrição</label><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="form-row"><label className="form-label">Código *</label><textarea required className="textarea" rows={10} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} style={{ fontFamily: "JetBrains Mono", fontSize: 13 }} data-testid="snippet-code-input" /></div>
            <div className="form-row">
              <label className="form-label">Tags</label>
              <div className="row">
                <input className="input" style={{ flex: 1 }} value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="adicionar tag..." onKeyDown={(e) => {
                  if (e.key === "Enter" && tagInput.trim()) { e.preventDefault(); setForm({ ...form, tags: [...form.tags, tagInput.trim()] }); setTagInput(""); }
                }} />
              </div>
              <div className="row" style={{ marginTop: 8, gap: 6 }}>
                {form.tags.map((t, i) => (
                  <span key={i} className="chip" onClick={() => setForm({ ...form, tags: form.tags.filter((_, j) => j !== i) })} style={{ cursor: "pointer" }}>#{t} ×</span>
                ))}
              </div>
            </div>
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button type="button" className="btn" onClick={() => setModal(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" data-testid="save-snippet-btn">Salvar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
