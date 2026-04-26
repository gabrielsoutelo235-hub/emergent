import { NavLink, useNavigate } from "react-router-dom";
import { Users, DollarSign, Code2, MessageSquareCode, Globe, LayoutDashboard, Settings, LogOut } from "lucide-react";
import { useAuth } from "../auth";

const items = [
  { to: "/", label: "Visão Geral", icon: LayoutDashboard, end: true },
  { to: "/clients", label: "Gestão de Clientes", icon: Users },
  { to: "/financial", label: "Controle Financeiro", icon: DollarSign },
  { to: "/code", label: "Code Hub", icon: Code2 },
  { to: "/coach", label: "Interrogatório IA", icon: MessageSquareCode },
  { to: "/analyzer", label: "Analisador de Sites", icon: Globe },
  { to: "/settings", label: "Configurações", icon: Settings },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <aside className={`sidebar ${open ? "open" : ""}`} data-testid="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo"><Code2 size={22} /></div>
        <div>
          <div className="brand-name">NEXUS</div>
          <div className="brand-sub">Dark Hacker</div>
        </div>
      </div>

      {items.map((it) => {
        const Icon = it.icon;
        return (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            onClick={onClose}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            data-testid={`nav-${it.to.replace("/", "") || "home"}`}
          >
            <Icon className="icon" size={18} />
            <span>{it.label}</span>
          </NavLink>
        );
      })}

      <div className="sidebar-footer">
        <div className="status-pill">
          <div className="status-dot" />
          <span>Sistema Online</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
          {user?.email}
        </div>
        <button className="btn btn-ghost" onClick={handleLogout} style={{ marginTop: 4 }} data-testid="logout-btn">
          <LogOut size={14} /> Sair
        </button>
      </div>
    </aside>
  );
}
