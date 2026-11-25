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
            <div className="p-8 text-center text-sm text-slate-500">
                Loading…
            </div>
        );

    const rows = data ?? [];
    const totals = rows.reduce(
        (s, r) => ({
            expected: s.expected + (r.expected ?? 0),
            installment_received:
                s.installment_received + (r.installment_received ?? 0),
            installment_pending:
                s.installment_pending + (r.installment_pending ?? 0),
            effective: s.effective + (r.effective_received ?? 0),
            variance: s.variance + (r.variance ?? 0),
        }),
        {
            expected: 0,
            installment_received: 0,
            installment_pending: 0,
            effective: 0,
            variance: 0,
        },
    );

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    Finance Reconciliation
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    Compare approved amounts against actual money received via
                    installments or manual entries
                </p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-xl px-5 py-3 text-sm text-purple-900">
                <strong>How this works:</strong> <em>Installments Received</em>{" "}
                is computed from installment rows.
                <em> Manual Received</em> lets finance record bank-verified
                amounts — overrides the installment sum when non-zero.
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-auto">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase tracking-wider">
                        <tr>
                            <th className="text-left px-3 py-2.5">Donor</th>
                            <th className="text-left px-3 py-2.5">Year</th>
                            <th className="text-right px-3 py-2.5">Records</th>
                            <th className="text-right px-3 py-2.5">Approved</th>
                            <th className="text-right px-3 py-2.5 bg-emerald-50/50">
                                Inst. Received
                            </th>
                            <th className="text-right px-3 py-2.5 bg-amber-50/50">
                                Inst. Pending
                            </th>
                            <th className="text-right px-3 py-2.5">Manual</th>
                            <th className="text-right px-3 py-2.5">
                                Effective
                            </th>
                            <th className="text-right px-3 py-2.5">Variance</th>
                            <th className="text-left px-3 py-2.5">Status</th>
                            <th className="text-left px-3 py-2.5">Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 && (
                            <tr>
                                <td
                                    colSpan={11}
                                    className="p-8 text-center text-slate-500 text-sm"
                                >
                                    No records yet
                                </td>
                            </tr>
                        )}
                        {rows.map((r) => {
                            const key = r.donor + "|" + r.academic_year;
                            const ed = edits[key];
                            const manual = ed
                                ? ed.amount
                                : (r.manual_received ?? "");
                            const note = ed ? ed.notes : (r.notes ?? "");

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

                            const statusTone = {
                                matched:
                                    "bg-emerald-50 text-emerald-700 border-emerald-200",
                                shortfall:
                                    "bg-rose-50 text-rose-700 border-rose-200",
                                over: "bg-purple-50 text-purple-700 border-purple-200",
                                unreconciled:
                                    "bg-slate-100 text-slate-600 border-slate-200",
                            }[r.status];

                            return (
                                <tr
                                    key={key}
                                    className="border-t border-slate-100 hover:bg-slate-50/60"
                                >
                                    <td className="px-3 py-2.5 font-semibold text-slate-800">
                                        {r.donor}
                                    </td>
                                    <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                                        {r.academic_year}
                                    </td>
                                    <td className="px-3 py-2.5 text-right tabular-nums text-xs">
                                        {r.records}
                                    </td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">
                                        {fmt(r.expected)}
                                    </td>
                                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-emerald-700 bg-emerald-50/30">
                                        {fmt(r.installment_received)}
                                    </td>
                                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-amber-700 bg-amber-50/30">
                                        {fmt(r.installment_pending)}
                                        {r.installment_failed > 0 && (
                                            <div className="text-[10px] text-rose-600 mt-0.5">
                                                {fmt(r.installment_failed)}{" "}
                                                failed
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <input
                                            type="number"
                                            min={0}
                                            step="any"
                                            placeholder="—"
                                            className="border border-slate-300 rounded px-2 py-1 w-28 text-right text-xs tabular-nums"
                                            value={manual}
                                            onChange={(e) =>
                                                setEdits((p) => ({
                                                    ...p,
                                                    [key]: {
                                                        amount: e.target.value,
                                                        notes: note,
                                                    },
                                                }))
                                            }
                                            onBlur={flush}
                                        />
                                    </td>
                                    <td
                                        className={`px-3 py-2.5 text-right tabular-nums font-semibold ${r.effective_received === null ? "text-slate-400" : "text-slate-800"}`}
                                    >
                                        {r.effective_received === null
                                            ? "—"
                                            : fmt(r.effective_received)}
                                    </td>
                                    <td
                                        className={`px-3 py-2.5 text-right tabular-nums font-bold ${r.variance === null ? "text-slate-400" : Math.abs(r.variance) < 0.5 ? "text-emerald-700" : "text-rose-700"}`}
                                    >
                                        {r.variance === null
                                            ? "—"
                                            : (r.variance > 0 ? "+" : "") +
                                              fmt(r.variance)}
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <span
                                            className={`inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider border ${statusTone}`}
                                        >
                                            {r.status}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <input
                                            type="text"
                                            placeholder="Note…"
                                            className="border border-slate-300 rounded px-2 py-1 w-full max-w-[200px] text-xs"
                                            value={note}
                                            onChange={(e) =>
                                                setEdits((p) => ({
                                                    ...p,
                                                    [key]: {
                                                        amount: manual,
                                                        notes: e.target.value,
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
                        <tfoot className="bg-purple-900 text-white font-bold">
                            <tr>
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
                                <td></td>
                                <td className="px-3 py-3 text-right tabular-nums">
                                    {fmt(totals.effective)}
                                </td>
                                <td
                                    className={`px-3 py-3 text-right tabular-nums ${Math.abs(totals.variance) < 0.5 ? "text-emerald-300" : "text-rose-300"}`}
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
    );
}
