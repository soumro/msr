import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchReconciliation, updateReceived } from "../services/scholarships";

const fmt = (n) => new Intl.NumberFormat("en-PK").format(n);

export default function Reconciliation() {
    const qc = useQueryClient();
    const [edits, setEdits] = useState({});

    const { data, isLoading } = useQuery({
        queryKey: ["reconciliation"],
        queryFn: fetchReconciliation,
    });

    const save = useMutation({
        mutationFn: updateReceived,
        onSuccess: () => qc.invalidateQueries({ queryKey: ["reconciliation"] }),
    });

    if (isLoading)
        return <p className="text-slate-500">Loading reconciliation…</p>;

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b">
                <h2 className="font-semibold">
                    Finance / Donor Reconciliation
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                    Enter the amount actually received. Variance is calculated
                    against the Master Register.
                </p>
            </div>

            <div className="overflow-auto">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
                        <tr>
                            {[
                                "Donor",
                                "Year",
                                "Records",
                                "Expected",
                                "Received",
                                "Variance",
                                "Status",
                                "Notes",
                            ].map((h) => (
                                <th
                                    key={h}
                                    className="text-left px-4 py-2 whitespace-nowrap"
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data?.map((r) => {
                            const key = r.donor + "|" + r.academic_year;
                            const ed = edits[key];
                            const recValue = ed
                                ? ed.amount
                                : (r.received ?? "");
                            const noteValue = ed ? ed.notes : (r.notes ?? "");

                            const flush = () => {
                                if (!ed) return;
                                save.mutate({
                                    donor: r.donor,
                                    academic_year: r.academic_year,
                                    amount: Number(ed.amount) || 0,
                                    notes: ed.notes,
                                });
                                setEdits((p) => {
                                    const n = { ...p };
                                    delete n[key];
                                    return n;
                                });
                            };

                            return (
                                <tr key={key} className="border-t">
                                    <td className="px-4 py-2 font-semibold">
                                        {r.donor}
                                    </td>
                                    <td className="px-4 py-2">
                                        {r.academic_year}
                                    </td>
                                    <td className="px-4 py-2 text-right tabular-nums">
                                        {r.records}
                                    </td>
                                    <td className="px-4 py-2 text-right tabular-nums">
                                        {fmt(r.expected)}
                                    </td>
                                    <td className="px-4 py-2">
                                        <input
                                            type="number"
                                            min={0}
                                            step={1000}
                                            className="border rounded px-2 py-1 w-32 text-right"
                                            value={recValue}
                                            onChange={(e) =>
                                                setEdits((p) => ({
                                                    ...p,
                                                    [key]: {
                                                        amount: e.target.value,
                                                        notes: noteValue,
                                                    },
                                                }))
                                            }
                                            onBlur={flush}
                                        />
                                    </td>
                                    <td
                                        className={`px-4 py-2 text-right tabular-nums font-semibold ${
                                            r.variance !== null &&
                                            Math.abs(r.variance) > 0.5
                                                ? "text-red-700"
                                                : "text-emerald-700"
                                        }`}
                                    >
                                        {r.variance === null
                                            ? "—"
                                            : (r.variance > 0 ? "+" : "") +
                                              fmt(r.variance)}
                                    </td>
                                    <td className="px-4 py-2">
                                        <span
                                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                                                r.status === "matched"
                                                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                                    : r.status === "shortfall"
                                                      ? "bg-red-100 text-red-800 border-red-200"
                                                      : r.status === "over"
                                                        ? "bg-purple-100 text-purple-800 border-purple-200"
                                                        : "bg-slate-100 text-slate-700 border-slate-200"
                                            }`}
                                        >
                                            {r.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2">
                                        <input
                                            className="border rounded px-2 py-1 w-full max-w-[260px]"
                                            value={noteValue}
                                            onChange={(e) =>
                                                setEdits((p) => ({
                                                    ...p,
                                                    [key]: {
                                                        amount: recValue,
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
                </table>
            </div>
        </div>
    );
}
