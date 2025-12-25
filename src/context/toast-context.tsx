"use client"

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"

type ToastVariant = "success" | "error" | "info"

interface Toast {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  notify: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

const variantClasses: Record<ToastVariant, string> = {
  success: "border-emerald-400/50 bg-emerald-500/20 text-emerald-100",
  error: "border-rose-400/50 bg-rose-500/20 text-rose-100",
  info: "border-slate-400/50 bg-slate-500/20 text-slate-100",
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const notify = (message: string, variant: ToastVariant = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts((prev) => [...prev, { id, message, variant }])

    // Auto-dismiss toasts to keep the UI clean without manual actions.
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, 3500)
  }

  const value = useMemo(() => ({ notify }), [])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 right-6 z-[1000] flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-lg border px-4 py-3 text-sm shadow-xl backdrop-blur ${variantClasses[toast.variant]}`}
            role="status"
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast는 ToastProvider 안에서 사용해야 합니다.")
  }
  return context
}
