import { createContext, useCallback, useContext, useState } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const remove = useCallback((id) => {
        setToasts((t) => t.filter((x) => x.id !== id));
    }, []);

    const push = useCallback(
        (message, kind = "info", duration = 3500) => {
            const id = Date.now() + Math.random();
            setToasts((t) => [...t, { id, message, kind }]);
            if (duration > 0) setTimeout(() => remove(id), duration);
            return id;
        },
        [remove],
    );

    const api = {
        success: (m, d) => push(m, "success", d),
        error: (m, d) => push(m, "error", d),
        info: (m, d) => push(m, "info", d),
        warn: (m, d) => push(m, "warn", d),
    };

    return (
        <ToastContext.Provider value={api}>
            {children}
            <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`pointer-events-auto px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-start gap-3 border-l-4 animate-[slideIn_.2s_ease-out] ${
                            t.kind === "success"
                                ? "bg-emerald-50 text-emerald-900 border-emerald-600"
                                : t.kind === "error"
                                  ? "bg-red-50 text-red-900 border-red-600"
                                  : t.kind === "warn"
                                    ? "bg-amber-50 text-amber-900 border-amber-600"
                                    : "bg-slate-50 text-slate-900 border-slate-500"
                        }`}
                    >
                        <span className="flex-1">{t.message}</span>
                        <button
                            onClick={() => remove(t.id)}
                            className="text-slate-400 hover:text-slate-700 text-lg leading-none"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be inside <ToastProvider>");
    return ctx;
}
