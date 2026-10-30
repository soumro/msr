import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchReconciliation, updateReceived } from "../services/scholarships";
import { useToast } from "../context/ToastContext";

const fmt = (n) =>
    new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(
        Number(n) || 0,
    );

export default function Reconciliation() {
    const toast = useToast();
    const qc = useQueryClient();
    const [edits, setEdits] = useState({});

    const { data, isLoading } = useQuery({
        queryKey: ["reconciliation"],
        queryFn: fetchReconciliation,
    });

    const save = useMutation({
        mutationFn: updateReceived,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["reconciliation"] });
            toast.success("Saved");
        },
        onError: () => toast.error("Could not save"),
    });

    if (isLoading)
        return (
            <p className="p-6 text-sm text-slate-500 text-center">
                Loading reconciliation…
            </p>
        );

    const rows = data ?? [];

    // Totals across all rows
    const totals = rows.reduce(
        (s, r) => ({
            expected: s.expected + (r.expected ?? 0),
            installment_received:
                s.installment_received + (r.installment_received ?? 0),
            installment_pending:
                s.installment_pending + (r.installment_pending ?? 0),
            effective_received:
                s.effective_received + (r.effective_received ?? 0),
            variance: s.variance + (r.variance ?? 0),
        }),
        {
            expected: 0,
            installment_received: 0,
            installment_pending: 0,
            effective_received: 0,
            variance: 0,
        },
    );

    return (
        <div className="space-y-4">
            {/* Info banner */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl px-5 py-3 text-sm text-purple-900">
                <strong>How this works:</strong> <em>Installments Received</em>{" "}
                is computed from the installment rows on each scholarship.{" "}
                <em>Manual Received</em> lets finance record the bank-verified
                amount — it overrides the installment sum when non-zero.
                Variance is calculated against <em>Manual Received</em> if set,
                else against
                <em> Installments Received</em>.
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b">
                    <h2 className="font-semibold">
                        Finance / Donor Reconciliation
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Compares approved amounts against actual money received
                        via installments or manual entries.
                    </p>
                </div>

                <div className="overflow-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-100 text-slate-700 text-[11px] uppercase tracking-wide">
                            <tr>
                                <th className="text-left px-3 py-2">Donor</th>
                                <th className="text-left px-3 py-2">Year</th>
                                <th className="text-right px-3 py-2">
                                    Records
                                </th>
                                <th className="text-right px-3 py-2">
                                    Approved
                                </th>
                                <th className="text-right px-3 py-2 bg-emerald-50">
                                    Installments Received
                                </th>
                                <th className="text-right px-3 py-2 bg-amber-50">
                                    Installments Pending
                                </th>
                                <th className="text-right px-3 py-2">
                                    Manual Received
                                </th>
                                <th className="text-right px-3 py-2">
                                    Effective
                                </th>
                                <th className="text-right px-3 py-2">
                                    Variance
                                </th>
                                <th className="text-center px-3 py-2">
                                    Status
                                </th>
                                <th className="text-left px-3 py-2">Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={11}
                                        className="p-6 text-center text-slate-500"
                                    >
                                        No scholarship records yet.
                                    </td>
                                </tr>
                            )}

                            {rows.map((r) => {
                                const key = r.donor + "|" + r.academic_year;
                                const ed = edits[key];
                                const manualValue = ed
                                    ? ed.amount
                                    : (r.manual_received ?? "");
                                const noteValue = ed
                                    ? ed.notes
                                    : (r.notes ?? "");

                                const flush = () => {
                                    if (!ed) return;
                                    save.mutate({
                                        donor: r.donor,
                                        academic_year: r.academic_year,
                                        amount:
                                            ed.amount === ""
                                                ? null
                                                : Number(ed.amount),
                                        notes: ed.notes,
                                    });
                                    setEdits((p) => {
                                        const n = { ...p };
                                        delete n[key];
                                        return n;
                                    });
                                };

                                const statusBadge =
                                    {
                                        matched:
                                            "bg-emerald-100 text-emerald-800 border-emerald-200",
                                        shortfall:
                                            "bg-rose-100 text-rose-800 border-rose-200",
                                        over: "bg-purple-100 text-purple-800 border-purple-200",
                                        unreconciled:
                                            "bg-slate-100 text-slate-600 border-slate-200",
                                    }[r.status] ||
                                    "bg-slate-100 text-slate-600 border-slate-200";

                                return (
                                    <tr
                                        key={key}
                                        className="border-t hover:bg-slate-50/50"
                                    >
                                        <td className="px-3 py-2 font-semibold">
                                            {r.donor}
                                        </td>
                                        <td className="px-3 py-2 text-xs whitespace-nowrap">
                                            {r.academic_year}
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums text-xs">
                                            {r.records}
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums">
                                            {fmt(r.expected)}
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums font-semibold text-emerald-700 bg-emerald-50/50">
                                            {fmt(r.installment_received)}
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums font-semibold text-amber-700 bg-amber-50/50">
                                            {fmt(r.installment_pending)}
                                            {r.installment_failed > 0 && (
                                                <div className="text-[10px] text-rose-600 mt-0.5">
                                                    {fmt(r.installment_failed)}{" "}
                                                    failed
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="number"
                                                min={0}
                                                step="any"
                                                placeholder="—"
                                                className="border border-slate-300 rounded px-2 py-1 w-28 text-right text-xs tabular-nums"
                                                value={manualValue}
                                                onChange={(e) =>
                                                    setEdits((p) => ({
                                                        ...p,
                                                        [key]: {
                                                            amount: e.target
                                                                .value,
                                                            notes: noteValue,
                                                        },
                                                    }))
                                                }
                                                onBlur={flush}
                                            />
                                        </td>
                                        <td
                                            className={`px-3 py-2 text-right tabular-nums font-semibold ${
                                                r.effective_received === null
                                                    ? "text-slate-400"
                                                    : "text-slate-800"
                                            }`}
                                        >
                                            {r.effective_received === null
                                                ? "—"
                                                : fmt(r.effective_received)}
                                        </td>
                                        <td
                                            className={`px-3 py-2 text-right tabular-nums font-semibold ${
                                                r.variance === null
                                                    ? "text-slate-400"
                                                    : Math.abs(r.variance) < 0.5
                                                      ? "text-emerald-700"
                                                      : "text-rose-700"
                                            }`}
                                        >
                                            {r.variance === null
                                                ? "—"
                                                : (r.variance > 0 ? "+" : "") +
                                                  fmt(r.variance)}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <span
                                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${statusBadge}`}
                                            >
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                className="border border-slate-300 rounded px-2 py-1 w-full max-w-[200px] text-xs"
                                                placeholder="Note…"
                                                value={noteValue}
                                                onChange={(e) =>
                                                    setEdits((p) => ({
                                                        ...p,
                                                        [key]: {
                                                            amount: manualValue,
                                                            notes: e.target
                                                                .value,
                                                        },
                                                    }))
                                                }
                                                onBlur={flush}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>

                        {rows.length > 0 && (
                            <tfoot>
                                <tr className="bg-purple-900 text-white font-bold">
                                    <td
                                        colSpan={3}
                                        className="px-3 py-3 text-right"
                                    >
                                        TOTAL
                                    </td>
                                    <td className="px-3 py-3 text-right tabular-nums">
                                        {fmt(totals.expected)}
                                    </td>
                                    <td className="px-3 py-3 text-right tabular-nums bg-emerald-800">
                                        {fmt(totals.installment_received)}
                                    </td>
                                    <td className="px-3 py-3 text-right tabular-nums bg-amber-700">
                                        {fmt(totals.installment_pending)}
                                    </td>
                                    <td className="px-3 py-3"></td>
                                    <td className="px-3 py-3 text-right tabular-nums">
                                        {fmt(totals.effective_received)}
                                    </td>
                                    <td
                                        className={`px-3 py-3 text-right tabular-nums ${
                                            Math.abs(totals.variance) < 0.5
                                                ? "text-emerald-300"
                                                : "text-rose-300"
                                        }`}
                                    >
                                        {(totals.variance > 0 ? "+" : "") +
                                            fmt(totals.variance)}
                                    </td>
                                    <td colSpan={2}></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
}
