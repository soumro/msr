import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { rollOverScholarship } from "../services/scholarships";
import { useToast } from "../context/ToastContext";

function shiftYear(year, delta) {
    const parts = String(year || "").split("-");
    if (parts.length !== 2) return "";
    const s = parseInt(parts[0], 10);
    const e = parseInt(parts[1], 10);
    if (isNaN(s) || isNaN(e)) return "";
    return `${s + delta}-${e + delta}`;
}

const fmt = (n) => new Intl.NumberFormat("en-PK").format(Number(n) || 0);

export default function RollOverModal({ scholarship, onClose, onRolledOver }) {
    const toast = useToast();
    const qc = useQueryClient();
    const [saving, setSaving] = useState(false);

    const currentYear = scholarship?.academic_year ?? "";
    const defaultTarget = shiftYear(currentYear, 1);

    const [form, setForm] = useState({
        academic_year: defaultTarget || "",
        category: "renewal",
        renewal_status: "due",
        approved_amount: scholarship?.approved_amount ?? 0,
    });

    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const submit = async (e) => {
        e.preventDefault();
        if (!form.academic_year.trim()) {
            toast.error("Pick a target year.");
            return;
        }
        if (form.academic_year === currentYear) {
            toast.error("Target year must differ from source year.");
            return;
        }

        setSaving(true);
        try {
            const res = await rollOverScholarship(scholarship.id, form);
            toast.success(
                `Rolled over to ${form.academic_year} — new record #${res.data.id}`,
            );

            qc.invalidateQueries({ queryKey: ["scholarships"] });
            qc.invalidateQueries({ queryKey: ["dashboard"] });
            qc.invalidateQueries({ queryKey: ["duplicates"] });
            qc.invalidateQueries({ queryKey: ["report-grouped"] });
            qc.invalidateQueries({ queryKey: ["report-summary"] });

            onRolledOver?.(res.data);
            onClose();
        } catch (err) {
            const msg =
                err?.response?.data?.message ??
                Object.values(err?.response?.data?.errors ?? {})
                    .flat()
                    .join("\n") ??
                "Roll over failed";
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-slate-900/50 z-[90] flex items-start justify-center p-4 overflow-auto"
            onClick={onClose}
        >
            <form
                onSubmit={submit}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-xl shadow-xl w-full max-w-lg mt-16"
            >
                <div className="px-5 py-3 border-b flex justify-between items-start">
                    <div className="min-w-0">
                        <h3 className="font-semibold">Roll Over Scholarship</h3>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                            From <strong>{scholarship.academic_year}</strong> ·{" "}
                            {scholarship.scheme} ·{" "}
                            {scholarship.student_name || scholarship.student_id}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-500 hover:text-slate-900 text-xl leading-none px-2"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Target Academic Year *
                        </label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() =>
                                    set(
                                        "academic_year",
                                        shiftYear(currentYear, -1),
                                    )
                                }
                                className="border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-50 whitespace-nowrap"
                            >
                                ← {shiftYear(currentYear, -1)}
                            </button>
                            <input
                                type="text"
                                required
                                value={form.academic_year}
                                onChange={(e) =>
                                    set("academic_year", e.target.value)
                                }
                                placeholder="2026-2027"
                                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm text-center font-mono"
                            />
                            <button
                                type="button"
                                onClick={() =>
                                    set(
                                        "academic_year",
                                        shiftYear(currentYear, 1),
                                    )
                                }
                                className="border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-50 whitespace-nowrap"
                            >
                                {shiftYear(currentYear, 1)} →
                            </button>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                            Next year (typical renewal):{" "}
                            <strong>{defaultTarget}</strong>
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Category *
                            </label>
                            <select
                                value={form.category}
                                onChange={(e) =>
                                    set("category", e.target.value)
                                }
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                            >
                                <option value="renewal">
                                    Renewal (continuing)
                                </option>
                                <option value="fresh">
                                    Fresh (first time)
                                </option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Renewal Status *
                            </label>
                            <select
                                value={form.renewal_status}
                                onChange={(e) =>
                                    set("renewal_status", e.target.value)
                                }
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                            >
                                <option value="due">Due</option>
                                <option value="not_due">Not due</option>
                                <option value="submitted">Submitted</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Approved Amount (PKR) *
                        </label>
                        <input
                            type="number"
                            min={0}
                            step="any"
                            required
                            value={form.approved_amount}
                            onChange={(e) =>
                                set("approved_amount", Number(e.target.value))
                            }
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                        />
                        <p className="text-[11px] text-slate-500 mt-1">
                            Source: PKR {fmt(scholarship.approved_amount)}{" "}
                            (adjust for next year's rate)
                        </p>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 leading-relaxed">
                        <strong>New record will have:</strong> same student /
                        scheme / donor / department, but payment status{" "}
                        <em>pending</em>, no cheque, no received date, no
                        installments. Add installments for the new year after
                        this is created.
                    </div>
                </div>

                <div className="px-5 py-3 border-t flex justify-end gap-2 bg-slate-50 rounded-b-xl">
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
                        className="bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
                    >
                        {saving ? "Rolling over…" : "Create Record"}
                    </button>
                </div>
            </form>
        </div>
    );
}
