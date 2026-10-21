import { useEffect, useState } from "react";
import {
    fetchApplication,
    createApplication,
    updateApplication,
} from "../services/scholarships";
import LookupSelect from "./LookupSelect";
import { useToast } from "../context/ToastContext";

const empty = {
    student_id: "",
    student_name: "",
    cnic: "",
    scheme: "",
    academic_year: "",
    eligibility: "pending",
    status: "draft",
    decision_date: "",
    rejection_reason: "",
    notes: "",
};

function formatCnic(v) {
    const d = v.replace(/\D/g, "").slice(0, 13);
    if (d.length <= 5) return d;
    if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`;
    return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
}

export default function ApplicationModal({ applicationId, onClose, onSaved }) {
    const toast = useToast();
    const [form, setForm] = useState(empty);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (applicationId)
            fetchApplication(applicationId)
                .then(setForm)
                .catch(() => {});
        else setForm(empty);
    }, [applicationId]);

    useEffect(() => {
        const handler = (e) => {
            if (e.key === "Escape") onClose();
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                document.getElementById("app-form")?.requestSubmit();
            }
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [onClose]);

    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...form,
                decision_date:
                    form.decision_date && form.decision_date.trim() !== ""
                        ? form.decision_date
                        : null,
            };
            if (applicationId) {
                await updateApplication(applicationId, payload);
                toast.success("Application updated");
            } else {
                await createApplication(payload);
                toast.success("Application created");
            }
            onSaved();
        } catch (err) {
            const msg =
                err?.response?.data?.message ??
                Object.values(err?.response?.data?.errors ?? {})
                    .flat()
                    .join("\n") ??
                "Save failed.";
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-slate-900/50 z-50 flex items-start justify-center p-4 overflow-auto"
            onClick={onClose}
        >
            <form
                id="app-form"
                onSubmit={submit}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-xl shadow-xl w-full max-w-2xl mt-10"
            >
                <div className="px-5 py-3 border-b flex justify-between items-center">
                    <h3 className="font-semibold">
                        {applicationId
                            ? `Edit Application #${applicationId}`
                            : "New Application"}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-500 hover:text-slate-900 text-xl leading-none"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <F label="Student ID" required>
                        <input
                            className="inp"
                            required
                            autoFocus
                            value={form.student_id}
                            onChange={(e) => set("student_id", e.target.value)}
                        />
                    </F>
                    <F label="Student Name">
                        <input
                            className="inp"
                            value={form.student_name}
                            onChange={(e) =>
                                set("student_name", e.target.value)
                            }
                        />
                    </F>
                    <F label="CNIC" required>
                        <input
                            className="inp font-mono"
                            required
                            placeholder="35202-1234567-1"
                            value={form.cnic}
                            onChange={(e) =>
                                set("cnic", formatCnic(e.target.value))
                            }
                        />
                    </F>
                    <F label="Scheme" required>
                        <LookupSelect
                            type="scheme"
                            required
                            value={form.scheme}
                            onChange={(v) => set("scheme", v)}
                        />
                    </F>
                    <F label="Academic Year" required>
                        <LookupSelect
                            type="academic_year"
                            required
                            value={form.academic_year}
                            onChange={(v) => set("academic_year", v)}
                        />
                    </F>
                    <F label="Eligibility" required>
                        <select
                            className="inp"
                            value={form.eligibility}
                            onChange={(e) => set("eligibility", e.target.value)}
                        >
                            {["pending", "eligible", "ineligible"].map((s) => (
                                <option key={s}>{s}</option>
                            ))}
                        </select>
                    </F>
                    <F label="Status" required>
                        <select
                            className="inp"
                            value={form.status}
                            onChange={(e) => set("status", e.target.value)}
                        >
                            {[
                                "draft",
                                "submitted",
                                "under_review",
                                "approved",
                                "rejected",
                            ].map((s) => (
                                <option key={s}>{s}</option>
                            ))}
                        </select>
                    </F>
                    <F label="Decision Date">
                        <input
                            type="date"
                            className="inp"
                            value={form.decision_date ?? ""}
                            onChange={(e) =>
                                set("decision_date", e.target.value)
                            }
                        />
                    </F>
                    <div className="sm:col-span-2">
                        <F label="Rejection Reason (required if rejected)">
                            <textarea
                                rows={2}
                                className="inp"
                                value={form.rejection_reason ?? ""}
                                onChange={(e) =>
                                    set("rejection_reason", e.target.value)
                                }
                            />
                        </F>
                    </div>
                    <div className="sm:col-span-2">
                        <F label="Notes">
                            <textarea
                                rows={2}
                                className="inp"
                                value={form.notes ?? ""}
                                onChange={(e) => set("notes", e.target.value)}
                            />
                        </F>
                    </div>
                </div>

                <div className="px-5 py-3 border-t flex justify-between items-center bg-slate-50 rounded-b-xl">
                    <span className="text-xs text-slate-500">
                        <kbd className="px-1.5 py-0.5 bg-white border rounded text-[10px]">
                            Esc
                        </kbd>{" "}
                        close
                        {" · "}
                        <kbd className="px-1.5 py-0.5 bg-white border rounded text-[10px]">
                            ⌘/Ctrl + ⏎
                        </kbd>{" "}
                        save
                    </span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="border px-4 py-2 rounded-lg text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
                        >
                            {saving ? "Saving…" : "Save"}
                        </button>
                    </div>
                </div>
            </form>

            <style>{`
        .inp{width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:8px 10px;font-size:14px}
        .inp:focus{outline:none;border-color:#0b5d3b;box-shadow:0 0 0 3px rgba(11,93,59,.12)}
      `}</style>
        </div>
    );
}

function F({ label, required, children }) {
    return (
        <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
                {label} {required && <span className="text-red-600">*</span>}
            </label>
            {children}
        </div>
    );
}
