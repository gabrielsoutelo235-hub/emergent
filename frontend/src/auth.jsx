import { createContext, useContext, useEffect, useState } from "react";
import api from "./api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/auth/me");
        setUser(data);
      } catch {
        setUser(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    if (data.token) localStorage.setItem("nx_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (email, password, name) => {
    const { data } = await api.post("/auth/register", { email, password, name });
    if (data.token) localStorage.setItem("nx_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    localStorage.removeItem("nx_token");
    setUser(false);
  };

  const refreshUser = async () => {
    const { data } = await api.get("/auth/me");
    setUser(data);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);

export function formatErr(error) {
  // Accept either an error object or a detail value
  if (!error) return "Erro desconhecido";
  // If it's an axios error object
  if (error.response) {
    const detail = error.response.data?.detail;
    if (detail) {
      if (typeof detail === "string") return detail;
      if (Array.isArray(detail)) return detail.map(e => e.msg || JSON.stringify(e)).join(", ");
      return String(detail);
    }
    return `Erro ${error.response.status}: ${error.response.statusText || "resposta inválida do servidor"}`;
  }
  if (error.request) {
    return "Servidor não respondeu. Verifique sua conexão e tente novamente.";
  }
  if (typeof error === "string") return error;
  return error.message || "Erro inesperado";
}
