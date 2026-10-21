import { createContext, useCallback, useContext, useState } from "react";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
    const [state, setState] = useState(null);

    const confirm = useCallback((opts) => {
        return new Promise((resolve) => {
            setState({
                title: opts.title || "Confirm",
                message: opts.message || "Are you sure?",
                confirmLabel: opts.confirmLabel || "Confirm",
                cancelLabel: opts.cancelLabel || "Cancel",
                danger: !!opts.danger,
                resolve,
            });
        });
    }, []);

    const close = (result) => {
        if (state?.resolve) state.resolve(result);
        setState(null);
    };

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            {state && (
                <div
                    className="fixed inset-0 bg-slate-900/50 z-[110] flex items-center justify-center p-4"
                    onClick={() => close(false)}
                >
                    <div
                        className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="font-semibold text-lg mb-2">
                            {state.title}
                        </h3>
                        <p className="text-sm text-slate-600 mb-6 whitespace-pre-line">
                            {state.message}
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => close(false)}
                                className="border border-slate-300 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50"
                            >
                                {state.cancelLabel}
                            </button>
                            <button
                                onClick={() => close(true)}
                                autoFocus
                                className={`px-4 py-2 rounded-lg text-sm font-semibold text-white ${
                                    state.danger
                                        ? "bg-red-600 hover:bg-red-700"
                                        : "bg-emerald-700 hover:bg-emerald-800"
                                }`}
                            >
                                {state.confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
}

export function useConfirm() {
    const ctx = useContext(ConfirmContext);
    if (!ctx) throw new Error("useConfirm must be inside <ConfirmProvider>");
    return ctx;
}
