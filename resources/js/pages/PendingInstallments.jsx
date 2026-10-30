import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPendingInstallments } from "../services/scholarships";
import { downloadExcel, safeFilename } from "../services/excel";
import { useToast } from "../context/ToastContext";

const fmt = (n) =>
    new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(
        Number(n) || 0,
    );

export default function PendingInstallments() {
    const toast = useToast();
    const [year, setYear] = useState("");
    const [donor, setDonor] = useState("");
    const [scheme, setScheme] = useState("");
    const [expanded, setExpanded] = useState(null);

    const { data, isLoading } = useQuery({
        queryKey: ["pending-installments", { year, donor, scheme }],
        queryFn: () =>
            fetchPendingInstallments({
                academic_year: year || undefined,
                donor: donor || undefined,
                scheme: scheme || undefined,
            }),
    });

    const exportExcel = () => {
        if (!data?.data) return;
        const headers = [
            "S.No",
            "Roll No.",
            "Name",
            "CNIC",
            "Department",
            "Scheme",
            "Donor",
            "Year",
            "Installment #",
            "Pending Amount",
            "Cheque",
            "Notes",
        ];
        const rows = [];
        let i = 1;
        data.data.forEach((s) => {
            s.installments.forEach((inst) => {
                rows.push([
                    i++,
                    s.student_id,
                    s.student_name ?? "",
                    s.cnic ?? "",
                    s.department ?? "",
                    inst.scheme,
                    inst.donor,
                    inst.academic_year,
                    inst.installment_no,
                    inst.amount,
                    inst.cheque_no ?? "",
                    inst.notes ?? "",
                ]);
            });
        });
        rows.push([
            "",
            "TOTAL",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            data.summary.total_pending_amount,
            "",
            "",
        ]);

        downloadExcel(
            safeFilename(
                `pending-installments-${new Date().toISOString().slice(0, 10)}.xlsx`,
            ),
            [{ name: "Pending", headers, rows }],
        );
        toast.success(
            `Exported ${data.summary.total_pending_records} pending installments`,
        );
    };

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="px-5 py-4 border-b">
                    <h2 className="font-semibold">Pending Installments</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Every student with unpaid installments — who owes what
                        and how much.
                    </p>
                </div>

                <div className="px-5 py-3 border-b bg-slate-50 flex flex-wrap items-center gap-2">
                    <select
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                    >
                        <option value="">All years</option>
                        {(data?.filters?.years ?? []).map((y) => (
                            <option key={y} value={y}>
                                {y}
                            </option>
                        ))}
                    </select>

                    <select
                        value={donor}
                        onChange={(e) => setDonor(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                    >
                        <option value="">All donors</option>
                        {(data?.filters?.donors ?? []).map((d) => (
                            <option key={d} value={d}>
                                {d}
                            </option>
                        ))}
                    </select>

                    <select
                        value={scheme}
                        onChange={(e) => setScheme(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                    >
                        <option value="">All schemes</option>
                        {(data?.filters?.schemes ?? []).map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>

                    {(year || donor || scheme) && (
                        <button
                            onClick={() => {
                                setYear("");
                                setDonor("");
                                setScheme("");
                            }}
                            className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline"
                        >
                            Clear filters
                        </button>
                    )}

                    <div className="flex-1" />

                    <button
                        onClick={exportExcel}
                        disabled={!data?.data?.length}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
                    >
                        ⬇ Export Excel
                    </button>
                </div>
            </div>

            {isLoading && (
                <p className="p-6 text-sm text-slate-500 text-center">
                    Loading…
                </p>
            )}

            {!isLoading && data && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                            <p className="text-[10px] uppercase font-bold text-amber-700">
                                Students with pending
                            </p>
                            <p className="text-2xl font-extrabold text-amber-900 mt-1">
                                {data.summary.students_with_pending}
                            </p>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                            <p className="text-[10px] uppercase font-bold text-purple-700">
                                Pending records
                            </p>
                            <p className="text-2xl font-extrabold text-purple-900 mt-1">
                                {data.summary.total_pending_records}
                            </p>
                        </div>
                        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                            <p className="text-[10px] uppercase font-bold text-rose-700">
                                Total pending amount
                            </p>
                            <p className="text-2xl font-extrabold text-rose-900 mt-1">
                                PKR {fmt(data.summary.total_pending_amount)}
                            </p>
                        </div>
                    </div>

                    {data.data.length === 0 ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                            <p className="text-sm text-slate-500">
                                No pending installments. Every installment has
                                been received or failed.
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-100 text-slate-700 text-[11px] uppercase tracking-wide">
                                    <tr>
                                        <th className="text-left px-3 py-2 w-10"></th>
                                        <th className="text-left px-3 py-2">
                                            Roll No.
                                        </th>
                                        <th className="text-left px-3 py-2">
                                            Student
                                        </th>
                                        <th className="text-left px-3 py-2">
                                            Department
                                        </th>
                                        <th className="text-right px-3 py-2">
                                            Pending #
                                        </th>
                                        <th className="text-right px-3 py-2">
                                            Pending Amount
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.data.map((s, i) => (
                                        <StudentPendingRow
                                            key={s.student_id}
                                            student={s}
                                            index={i}
                                            expanded={expanded === i}
                                            onToggle={() =>
                                                setExpanded(
                                                    expanded === i ? null : i,
                                                )
                                            }
                                        />
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-purple-900 text-white font-bold">
                                        <td
                                            colSpan={5}
                                            className="px-3 py-3 text-right"
                                        >
                                            TOTAL
                                        </td>
                                        <td className="px-3 py-3 text-right tabular-nums">
                                            {fmt(
                                                data.summary
                                                    .total_pending_amount,
                                            )}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function StudentPendingRow({ student, index, expanded, onToggle }) {
    return (
        <>
            <tr
                className="border-t hover:bg-purple-50/40 cursor-pointer"
                onClick={onToggle}
            >
                <td className="px-3 py-2 text-center text-purple-700 font-semibold">
                    {expanded ? "▼" : "▶"}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                    {student.student_id}
                </td>
                <td className="px-3 py-2 font-medium">
                    {student.student_name || "—"}
                </td>
                <td className="px-3 py-2 text-xs">
                    {student.department || "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-bold">
                    {student.pending_count}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-bold text-rose-700">
                    {fmt(student.pending_amount)}
                </td>
            </tr>
            {expanded && (
                <tr>
                    <td colSpan={6} className="bg-slate-50 px-6 py-3">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-slate-500 uppercase">
                                    <th className="text-left py-1">
                                        Installment
                                    </th>
                                    <th className="text-left py-1">Scheme</th>
                                    <th className="text-left py-1">Donor</th>
                                    <th className="text-left py-1">Year</th>
                                    <th className="text-right py-1">Amount</th>
                                    <th className="text-left py-1">Cheque</th>
                                    <th className="text-left py-1">Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {student.installments.map((inst) => (
                                    <tr
                                        key={inst.id}
                                        className="border-t border-slate-200"
                                    >
                                        <td className="py-1 font-mono font-bold">
                                            #{inst.installment_no}
                                        </td>
                                        <td className="py-1">{inst.scheme}</td>
                                        <td className="py-1">{inst.donor}</td>
                                        <td className="py-1">
                                            {inst.academic_year}
                                        </td>
                                        <td className="py-1 text-right tabular-nums font-semibold text-rose-700">
                                            {fmt(inst.amount)}
                                        </td>
                                        <td className="py-1 font-mono">
                                            {inst.cheque_no || "—"}
                                        </td>
                                        <td className="py-1 text-slate-600">
                                            {inst.notes || "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </td>
                </tr>
            )}
        </>
    );
}
