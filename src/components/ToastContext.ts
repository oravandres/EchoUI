import { createContext, useContext } from "react";

export type ToastTone = "success" | "warning";

export type ToastInput = {
  tone: ToastTone;
  title: string;
  detail?: string;
};

export type ToastContextValue = {
  notify: (toast: ToastInput) => string;
  dismiss: (id: string) => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToasts() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToasts must be used within ToastProvider");
  }
  return context;
}
