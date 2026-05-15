import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ToastContext, type ToastInput } from "@/components/ToastContext";

type Toast = ToastInput & {
  id: string;
};

const maxVisibleToasts = 4;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((toast: ToastInput) => {
    const id = `toast-${nextId.current}`;
    nextId.current += 1;
    setToasts((current) => [{ ...toast, id }, ...current].slice(0, maxVisibleToasts));
    return id;
  }, []);

  const value = useMemo(
    () => ({
      dismiss,
      notify,
    }),
    [dismiss, notify]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-viewport" aria-label="Notifications">
        {toasts.map((toast) => (
          <section
            className={`toast toast-${toast.tone}`}
            key={toast.id}
            role={toast.tone === "success" ? "status" : "alert"}
          >
            <div>
              <p className="toast-title">{toast.title}</p>
              {toast.detail ? <p className="toast-detail">{toast.detail}</p> : null}
            </div>
            <button
              className="toast-dismiss"
              type="button"
              aria-label={`Dismiss notification: ${toast.title}`}
              onClick={() => dismiss(toast.id)}
            >
              Dismiss
            </button>
          </section>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
