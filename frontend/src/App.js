import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Menu } from "lucide-react";
import { AuthProvider, useAuth } from "./auth";
import { ConfirmProvider } from "./components/Confirm";
import Sidebar from "./components/Sidebar";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import Clients from "./pages/Clients";
import Financial from "./pages/Financial";
import CodeHub from "./pages/CodeHub";
import CoachIA from "./pages/CoachIA";
import SiteAnalyzer from "./pages/SiteAnalyzer";
import Settings from "./pages/Settings";
import "./App.css";

function ProtectedShell() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);

  if (loading) return <div className="auth-screen"><div style={{ color: "var(--cyan)" }}>Carregando NEXUS...</div></div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="app-shell">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div>
        <div className="topbar">
          <button className="btn btn-ghost" onClick={() => setOpen(true)} data-testid="menu-btn"><Menu size={20} /></button>
          <div style={{ color: "var(--cyan)", fontWeight: 800 }}>NEXUS</div>
        </div>
        <main className="main">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/financial" element={<Financial />} />
            <Route path="/code" element={<CodeHub />} />
            <Route path="/coach" element={<CoachIA />} />
            <Route path="/analyzer" element={<SiteAnalyzer />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <ConfirmProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/*" element={<ProtectedShell />} />
          </Routes>
        </BrowserRouter>
      </ConfirmProvider>
    </AuthProvider>
  );
}
