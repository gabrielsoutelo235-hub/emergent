import { createContext, useContext, useState, useCallback } from "react";

const ConfirmCtx = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({ open: false, title: "", message: "", resolve: null });

  const confirm = useCallback((message, title = "Confirmar") => {
    return new Promise((resolve) => {
      setState({ open: true, title, message, resolve });
    });
  }, []);

  const handle = (val) => {
    state.resolve?.(val);
    setState({ open: false, title: "", message: "", resolve: null });
  };

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {state.open && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && handle(false)} data-testid="confirm-dialog">
          <div className="modal" style={{ maxWidth: 420 }}>
            <h3 className="modal-title">{state.title}</h3>
            <div style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              {state.message}
            </div>
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button className="btn" onClick={() => handle(false)} data-testid="confirm-cancel-btn">Cancelar</button>
              <button className="btn btn-danger" onClick={() => handle(true)} data-testid="confirm-ok-btn">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmCtx);
