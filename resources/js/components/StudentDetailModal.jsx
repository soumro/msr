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
            "Name of the Student",
            "Roll No.",
            "Cheque No",
            "Dated",
            "Scholarship Stipend",
            "Remarks",
            "Scheme",
            "Donor",
            "Department",
            "Year",
        ];

        const rows = data.data.map((r, i) => [
            i + 1,
            r.student_name ?? "",
            r.student_id ?? "",
            r.cheque_no ?? "",
            r.received_date ?? "",
            r.approved_amount,
            r.notes ?? "",
            r.scheme ?? "",
            r.donor ?? "",
            r.department ?? "",
            r.academic_year ?? "",
        ]);

        rows.push([
            "",
            "TOTAL",
            "",
            "",
            "",
            data.grand_total.amount,
            "",
            "",
            "",
            "",
            "",
        ]);

        downloadExcel(
            safeFilename(
                `${title || "students"}-${new Date().toISOString().slice(0, 10)}.xlsx`,
            ),
            [{ name: "Students", headers, rows }],
        );
        toast.success(`${data.data.length} students downloaded`);
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
                                : `${data?.data?.length ?? 0} student(s) · PKR ${fmt(data?.grand_total?.amount ?? 0)}`}
                        </p>
                    </div>
                    <div className="flex gap-2 items-center">
                        <button
                            onClick={exportExcel}
                            disabled={!data?.data?.length}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-60 whitespace-nowrap"
                        >
                            ⬇ Export Excel
                        </button>
                        <button
                            onClick={onClose}
                            className="text-slate-500 hover:text-slate-900 text-xl leading-none px-2"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                <div className="overflow-auto max-h-[70vh]">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-100 text-slate-700 text-[11px] uppercase tracking-wide sticky top-0">
                            <tr>
                                <th className="text-left px-2 py-2 w-10">
                                    S.No
                                </th>
                                <th className="text-left px-2 py-2">Name</th>
                                <th className="text-left px-2 py-2">
                                    Roll No.
                                </th>
                                <th className="text-left px-2 py-2">
                                    Cheque No
                                </th>
                                <th className="text-left px-2 py-2">Dated</th>
                                <th className="text-right px-2 py-2">
                                    Stipend
                                </th>
                                <th className="text-left px-2 py-2">Remarks</th>
                                <th className="text-left px-2 py-2">Scheme</th>
                                <th className="text-left px-2 py-2">Donor</th>
                                <th className="text-left px-2 py-2">Year</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading && (
                                <tr>
                                    <td
                                        colSpan={10}
                                        className="p-6 text-center text-slate-500"
                                    >
                                        Loading…
                                    </td>
                                </tr>
                            )}
                            {!isLoading && !data?.data?.length && (
                                <tr>
                                    <td
                                        colSpan={10}
                                        className="p-6 text-center text-slate-500"
                                    >
                                        No students.
                                    </td>
                                </tr>
                            )}
                            {data?.data?.map((r) => (
                                <tr
                                    key={r.s_no}
                                    className="border-t hover:bg-purple-50/40"
                                >
                                    <td className="px-2 py-2 text-xs text-slate-500">
                                        {r.s_no}
                                    </td>
                                    <td className="px-2 py-2 font-medium">
                                        {r.student_name || "—"}
                                    </td>
                                    <td className="px-2 py-2 font-mono text-xs">
                                        {r.student_id || "—"}
                                    </td>
                                    <td className="px-2 py-2 font-mono text-xs">
                                        {r.cheque_no || "—"}
                                    </td>
                                    <td className="px-2 py-2 text-xs whitespace-nowrap">
                                        {fmtDate(r.received_date)}
                                    </td>
                                    <td className="px-2 py-2 text-right tabular-nums">
                                        {fmt(r.approved_amount)}
                                    </td>
                                    <td
                                        className="px-2 py-2 text-xs text-slate-600 max-w-[200px] truncate"
                                        title={r.notes ?? ""}
                                    >
                                        {r.notes || "—"}
                                    </td>
                                    <td className="px-2 py-2 text-xs">
                                        {r.scheme}
                                    </td>
                                    <td className="px-2 py-2 text-xs">
                                        {r.donor}
                                    </td>
                                    <td className="px-2 py-2 text-xs">
                                        {r.academic_year}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        {data?.data?.length > 0 && (
                            <tfoot>
                                <tr className="bg-purple-900 text-white font-bold sticky bottom-0">
                                    <td
                                        colSpan={5}
                                        className="px-2 py-2 text-right"
                                    >
                                        TOTAL
                                    </td>
                                    <td className="px-2 py-2 text-right tabular-nums">
                                        {fmt(data.grand_total.amount)}
                                    </td>
                                    <td colSpan={4}></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
}
