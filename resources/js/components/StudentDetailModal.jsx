import { useQuery } from "@tanstack/react-query";
import { fetchReportStudentDetail } from "../services/scholarships";
import { downloadExcel, safeFilename } from "../services/excel";
import { useToast } from "../context/ToastContext";

const fmt = (n) =>
    new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(
        Number(n) || 0,
    );
const fmtDate = (s) =>
    s
        ? new Date(s).toLocaleDateString("en-PK", {
              year: "numeric",
              month: "short",
              day: "numeric",
          })
        : "—";

export default function StudentDetailModal({ title, filters, onClose }) {
    const toast = useToast();
    const { data, isLoading } = useQuery({
        queryKey: ["report-student-detail", filters],
        queryFn: () => fetchReportStudentDetail(filters),
    });

    const exportExcel = () => {
        if (!data?.data) return;

        const headers = [
            "S.No",
            "Roll No.",
            "Name",
            "Scheme",
            "Donor",
            "Dept",
            "Year",
            "Approved",
            "Received",
            "Status",
        ];
        const rows = data.data.map((r, i) => [
            i + 1,
            r.student_id,
            r.student_name ?? "",
            r.scheme,
            r.donor,
            r.department ?? "",
            r.academic_year,
            r.approved_amount,
            r.received_amount,
            r.payment_status,
        ]);
        rows.push([
            "",
            "TOTAL",
            "",
            "",
            "",
            "",
            "",
            data.grand_total.approved,
            data.grand_total.received,
            "",
        ]);

        downloadExcel(
            safeFilename(
                `${title || "students"}-${new Date().toISOString().slice(0, 10)}.xlsx`,
            ),
            [{ name: "Students", headers, rows }],
        );
        toast.success(`${data.data.length} students exported`);
    };

    return (
        <div
            className="fixed inset-0 bg-slate-900/50 z-[80] flex items-start justify-center p-4 overflow-auto"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-xl shadow-xl w-full max-w-5xl mt-10"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-5 py-3 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <div className="min-w-0">
                        <h3 className="font-semibold truncate">{title}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {isLoading
                                ? "Loading…"
                                : `${data?.data?.length ?? 0} record(s) · Approved PKR ${fmt(data?.grand_total?.approved ?? 0)} · Received PKR ${fmt(data?.grand_total?.received ?? 0)}`}
                        </p>
                    </div>
                    <div className="flex gap-2 items-center">
                        <button
                            onClick={exportExcel}
                            disabled={!data?.data?.length}
                            className="bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-60"
                        >
                            ⬇ Export Excel
                        </button>
                        <button
                            onClick={onClose}
                            className="text-slate-500 hover:text-slate-900 text-xl px-2"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                <div className="overflow-auto max-h-[75vh]">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-100 text-slate-700 text-[11px] uppercase sticky top-0">
                            <tr>
                                <th className="text-left px-2 py-2">S.No</th>
                                <th className="text-left px-2 py-2">Roll</th>
                                <th className="text-left px-2 py-2">Name</th>
                                <th className="text-left px-2 py-2">Scheme</th>
                                <th className="text-left px-2 py-2">Donor</th>
                                <th className="text-left px-2 py-2">Dept</th>
                                <th className="text-left px-2 py-2">Year</th>
                                <th className="text-right px-2 py-2">
                                    Approved
                                </th>
                                <th className="text-right px-2 py-2">
                                    Received
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading && (
                                <tr>
                                    <td
                                        colSpan={9}
                                        className="p-6 text-center text-slate-500"
                                    >
                                        Loading…
                                    </td>
                                </tr>
                            )}
                            {!isLoading && !data?.data?.length && (
                                <tr>
                                    <td
                                        colSpan={9}
                                        className="p-6 text-center text-slate-500"
                                    >
                                        No records.
                                    </td>
                                </tr>
                            )}
                            {data?.data?.map((r) => (
                                <tr
                                    key={r.s_no}
                                    className="border-t hover:bg-purple-50/40 align-top"
                                >
                                    <td className="px-2 py-2 text-xs text-slate-500">
                                        {r.s_no}
                                    </td>
                                    <td className="px-2 py-2 font-mono text-xs">
                                        {r.student_id}
                                    </td>
                                    <td className="px-2 py-2">
                                        {r.student_name || "—"}
                                    </td>
                                    <td className="px-2 py-2 text-xs">
                                        {r.scheme}
                                    </td>
                                    <td className="px-2 py-2 text-xs">
                                        {r.donor}
                                    </td>
                                    <td className="px-2 py-2 text-xs">
                                        {r.department || "—"}
                                    </td>
                                    <td className="px-2 py-2 text-xs">
                                        {r.academic_year}
                                    </td>
                                    <td className="px-2 py-2 text-right tabular-nums">
                                        {fmt(r.approved_amount)}
                                    </td>
                                    <td className="px-2 py-2 text-right tabular-nums font-semibold text-emerald-700">
                                        {fmt(r.received_amount)}
                                        {(r.installments ?? []).length > 0 && (
                                            <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                                                {(r.installments ?? []).map(
                                                    (ins) => (
                                                        <div
                                                            key={
                                                                ins.installment_no
                                                            }
                                                        >
                                                            #
                                                            {ins.installment_no}{" "}
                                                            ·{" "}
                                                            {ins.fiscal_year ??
                                                                "—"}{" "}
                                                            · {ins.status}
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        {data?.data?.length > 0 && (
                            <tfoot>
                                <tr className="bg-purple-900 text-white font-bold sticky bottom-0">
                                    <td
                                        colSpan={7}
                                        className="px-2 py-2 text-right"
                                    >
                                        TOTAL
                                    </td>
                                    <td className="px-2 py-2 text-right">
                                        {fmt(data.grand_total.approved)}
                                    </td>
                                    <td className="px-2 py-2 text-right text-emerald-300">
                                        {fmt(data.grand_total.received)}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
}
