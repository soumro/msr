import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    fetchMultiRecordStudents,
    fetchSecondInstallments,
} from "../services/scholarships";
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

const TABS = [
    { key: "records", label: "Multiple Records per Student" },
    { key: "installments", label: "2nd + Installments" },
];

export default function MultiRecordStudents() {
    const [tab, setTab] = useState("records");
    const [year, setYear] = useState("");

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="px-5 py-4 border-b">
                    <h2 className="font-semibold">
                        Who's Getting More Than One?
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Explains why{" "}
                        <strong>Total Records &gt; Beneficiaries</strong> (a
                        student with 2 records counts once as a student, twice
                        as records). Also shows who has a 2nd / 3rd installment
                        pending.
                    </p>
                </div>

                <div className="flex border-b border-slate-200">
                    {TABS.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                                tab === t.key
                                    ? "border-purple-700 text-purple-800"
                                    : "border-transparent text-slate-500 hover:text-slate-900"
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="px-5 py-3 border-b bg-slate-50 flex flex-wrap items-center gap-2">
                    <label className="text-sm font-semibold text-slate-700">
                        Year
                    </label>
                    <select
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                    >
                        <option value="">All years</option>
                        <option value="2025-2026">2025-2026</option>
                        <option value="2024-2025">2024-2025</option>
                        <option value="2023-2024">2023-2024</option>
                        <option value="2026-2027">2026-2027</option>
                    </select>
                    {year && (
                        <button
                            onClick={() => setYear("")}
                            className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline"
                        >
                            Clear year
                        </button>
                    )}
                </div>
            </div>

            {tab === "records" && <RecordsView year={year} />}
            {tab === "installments" && <InstallmentsView year={year} />}
        </div>
    );
}

// =============================================================
// TAB 1 — Students with 2+ scholarship records
// =============================================================
function RecordsView({ year }) {
    const toast = useToast();
    const [expanded, setExpanded] = useState(null);

    const { data, isLoading } = useQuery({
        queryKey: ["multi-record-students", year],
        queryFn: () => fetchMultiRecordStudents(year || undefined),
    });

    const exportCsv = () => {
        if (!data?.students) return;

        const headers = [
            "Roll No.",
            "Student Name",
            "CNIC",
            "Department",
            "Record Count",
            "Scheme",
            "Donor",
            "Year",
            "Amount",
            "Cheque",
            "Status",
        ];
        const rows = [];

        data.students.forEach((s) => {
            s.records.forEach((r) => {
                rows.push([
                    s.student_id,
                    s.student_name ?? "",
                    s.cnic ?? "",
                    s.department ?? "",
                    s.record_count,
                    r.scheme,
                    r.donor,
                    r.academic_year,
                    r.approved_amount,
                    r.cheque_no ?? "",
                    r.payment_status,
                ]);
            });
        });

        const csv = [headers, ...rows]
            .map((row) =>
                row
                    .map((v) => {
                        const str = String(v ?? "");
                        return /[",\n]/.test(str)
                            ? `"${str.replace(/"/g, '""')}"`
                            : str;
                    })
                    .join(","),
            )
            .join("\n");

        const blob = new Blob(["\uFEFF" + csv], {
            type: "text/csv;charset=utf-8;",
        });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `multi-record-students-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        toast.success(`Exported ${rows.length} records`);
    };

    if (isLoading) return <Loading />;
    if (!data?.students?.length) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <p className="text-sm text-slate-500">
                    No students have more than one scholarship record. That
                    means <strong>Beneficiaries</strong> equals{" "}
                    <strong>Total Records</strong>.
                </p>
            </div>
        );
    }

    return (
        <>
            {/* Summary strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat
                    label="Students with 2+ records"
                    value={data.summary.multi_students}
                    tone="purple"
                />
                <Stat
                    label="Extra records"
                    value={`+${data.summary.extra_records}`}
                    tone="gold"
                />
                <Stat
                    label="Total records"
                    value={data.summary.total_records}
                    tone="gray"
                />
                <Stat
                    label="Unique students"
                    value={data.summary.unique_students}
                    tone="gray"
                />
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="px-5 py-3 border-b flex justify-between items-center">
                    <h3 className="font-semibold text-sm">
                        Students with 2+ scholarship records
                        {year && (
                            <span className="text-slate-500 font-normal">
                                {" "}
                                · {year}
                            </span>
                        )}
                    </h3>
                    <button
                        onClick={exportCsv}
                        className="border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-50"
                    >
                        Export CSV
                    </button>
                </div>

                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wide">
                        <tr>
                            <th className="text-left px-3 py-2 w-10"></th>
                            <th className="text-left px-3 py-2">Roll No.</th>
                            <th className="text-left px-3 py-2">Student</th>
                            <th className="text-left px-3 py-2">CNIC</th>
                            <th className="text-left px-3 py-2">Department</th>
                            <th className="text-right px-3 py-2">Records</th>
                            <th className="text-right px-3 py-2">
                                Total Amount
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.students.map((s, i) => (
                            <RowGroup
                                key={s.student_id}
                                student={s}
                                index={i}
                                expanded={expanded === i}
                                onToggle={() =>
                                    setExpanded(expanded === i ? null : i)
                                }
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

function RowGroup({ student, index, expanded, onToggle }) {
    return (
        <>
            <tr
                className="border-t hover:bg-purple-50/40 cursor-pointer"
                onClick={onToggle}
            >
                <td className="px-3 py-2 text-purple-700 font-semibold text-center">
                    {expanded ? "▼" : "▶"}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                    {student.student_id}
                </td>
                <td className="px-3 py-2 font-medium">
                    {student.student_name || "—"}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                    {student.cnic || "—"}
                </td>
                <td className="px-3 py-2 text-xs">
                    {student.department || "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-bold text-purple-800">
                    {student.record_count}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold">
                    {new Intl.NumberFormat("en-PK").format(
                        student.total_amount,
                    )}
                </td>
            </tr>
            {expanded && (
                <tr>
                    <td colSpan={7} className="bg-slate-50 px-6 py-3">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-slate-500 uppercase tracking-wider">
                                    <th className="text-left py-1">#</th>
                                    <th className="text-left py-1">Scheme</th>
                                    <th className="text-left py-1">Donor</th>
                                    <th className="text-left py-1">Year</th>
                                    <th className="text-left py-1">Cheque</th>
                                    <th className="text-right py-1">Amount</th>
                                    <th className="text-left py-1">Status</th>
                                    <th className="text-left py-1">Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {student.records.map((r, ri) => (
                                    <tr
                                        key={r.id}
                                        className="border-t border-slate-200"
                                    >
                                        <td className="py-1 text-slate-500">
                                            {ri + 1}
                                        </td>
                                        <td className="py-1 font-medium">
                                            {r.scheme}
                                        </td>
                                        <td className="py-1">{r.donor}</td>
                                        <td className="py-1">
                                            {r.academic_year}
                                        </td>
                                        <td className="py-1 font-mono">
                                            {r.cheque_no || "—"}
                                        </td>
                                        <td className="py-1 text-right tabular-nums">
                                            {new Intl.NumberFormat(
                                                "en-PK",
                                            ).format(r.approved_amount)}
                                        </td>
                                        <td className="py-1">
                                            <span
                                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                    r.payment_status === "paid"
                                                        ? "bg-emerald-100 text-emerald-800"
                                                        : r.payment_status ===
                                                            "partial"
                                                          ? "bg-blue-100 text-blue-800"
                                                          : r.payment_status ===
                                                              "failed"
                                                            ? "bg-red-100 text-red-800"
                                                            : "bg-amber-100 text-amber-800"
                                                }`}
                                            >
                                                {r.payment_status}
                                            </span>
                                        </td>
                                        <td className="py-1 text-slate-600 max-w-[200px] truncate">
                                            {r.notes || "—"}
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

// =============================================================
// TAB 2 — Students with 2nd+ installments
// =============================================================
function InstallmentsView({ year }) {
    const toast = useToast();
    const [expanded, setExpanded] = useState(null);

    const { data, isLoading } = useQuery({
        queryKey: ["second-installments", year],
        queryFn: () => fetchSecondInstallments(year || undefined),
    });

    const exportCsv = () => {
        if (!data?.rows) return;

        const headers = [
            "Roll No.",
            "Student Name",
            "Scheme",
            "Donor",
            "Year",
            "Installment No.",
            "Amount",
            "Cheque No.",
            "Dated",
            "Status",
            "Notes",
        ];
        const rows = [];

        data.rows.forEach((s) => {
            s.installments.forEach((i) => {
                rows.push([
                    s.student_id,
                    s.student_name ?? "",
                    s.scheme,
                    s.donor,
                    s.academic_year,
                    i.installment_no,
                    i.amount,
                    i.cheque_no ?? "",
                    i.received_date ?? "",
                    i.status,
                    i.notes ?? "",
                ]);
            });
        });

        const csv = [headers, ...rows]
            .map((row) =>
                row
                    .map((v) => {
                        const str = String(v ?? "");
                        return /[",\n]/.test(str)
                            ? `"${str.replace(/"/g, '""')}"`
                            : str;
                    })
                    .join(","),
            )
            .join("\n");

        const blob = new Blob(["\uFEFF" + csv], {
            type: "text/csv;charset=utf-8;",
        });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `installments-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        toast.success(`Exported ${rows.length} installment rows`);
    };

    if (isLoading) return <Loading />;
    if (!data?.rows?.length) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <p className="text-sm text-slate-500">
                    No scholarships have more than one installment. Every
                    scholarship is a single-payment award.
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat
                    label="Scholarships with multi-installments"
                    value={data.summary.scholarships_with_multi_installments}
                    tone="purple"
                />
                <Stat
                    label="Awaiting 2nd payment"
                    value={data.summary.awaiting_2nd_payment}
                    tone="gold"
                />
                <Stat
                    label="Awaiting 3rd payment"
                    value={data.summary.awaiting_3rd_payment}
                    tone="gold"
                />
                <Stat
                    label="Total installments"
                    value={data.summary.total_installments}
                    tone="gray"
                />
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="px-5 py-3 border-b flex justify-between items-center">
                    <h3 className="font-semibold text-sm">
                        Scholarships with 2+ installments
                        {year && (
                            <span className="text-slate-500 font-normal">
                                {" "}
                                · {year}
                            </span>
                        )}
                    </h3>
                    <button
                        onClick={exportCsv}
                        className="border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-50"
                    >
                        Export CSV
                    </button>
                </div>

                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wide">
                        <tr>
                            <th className="text-left px-3 py-2 w-10"></th>
                            <th className="text-left px-3 py-2">Roll No.</th>
                            <th className="text-left px-3 py-2">Student</th>
                            <th className="text-left px-3 py-2">Scheme</th>
                            <th className="text-left px-3 py-2">Year</th>
                            <th className="text-right px-3 py-2">Approved</th>
                            <th className="text-right px-3 py-2">Received</th>
                            <th className="text-center px-3 py-2">
                                Installments
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.rows.map((s, i) => (
                            <InstallmentGroup
                                key={s.scholarship_id}
                                scholarship={s}
                                index={i}
                                expanded={expanded === i}
                                onToggle={() =>
                                    setExpanded(expanded === i ? null : i)
                                }
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

function InstallmentGroup({ scholarship: s, index, expanded, onToggle }) {
    return (
        <>
            <tr
                className="border-t hover:bg-purple-50/40 cursor-pointer"
                onClick={onToggle}
            >
                <td className="px-3 py-2 text-purple-700 font-semibold text-center">
                    {expanded ? "▼" : "▶"}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{s.student_id}</td>
                <td className="px-3 py-2 font-medium">
                    {s.student_name || "—"}
                </td>
                <td className="px-3 py-2 text-xs">{s.scheme}</td>
                <td className="px-3 py-2 text-xs">{s.academic_year}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                    {new Intl.NumberFormat("en-PK").format(s.approved_amount)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold text-emerald-700">
                    {new Intl.NumberFormat("en-PK").format(s.received_amount)}
                </td>
                <td className="px-3 py-2 text-center">
                    <span className="inline-block font-mono text-xs">
                        <span className="font-bold text-slate-800">
                            {s.received_count}
                        </span>
                        <span className="text-slate-400"> / </span>
                        <span className="text-slate-600">
                            {s.installment_count}
                        </span>
                    </span>
                </td>
            </tr>
            {expanded && (
                <tr>
                    <td colSpan={8} className="bg-slate-50 px-6 py-3">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-slate-500 uppercase tracking-wider">
                                    <th className="text-left py-1">#</th>
                                    <th className="text-right py-1">Amount</th>
                                    <th className="text-left py-1">Cheque</th>
                                    <th className="text-left py-1">Dated</th>
                                    <th className="text-left py-1">Status</th>
                                    <th className="text-left py-1">Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {s.installments.map((i) => (
                                    <tr
                                        key={i.id}
                                        className="border-t border-slate-200"
                                    >
                                        <td className="py-1 font-mono font-bold">
                                            {i.installment_no}
                                            {i.installment_no === 2 && (
                                                <span className="ml-1 text-[10px] text-gold-700">
                                                    2nd
                                                </span>
                                            )}
                                            {i.installment_no === 3 && (
                                                <span className="ml-1 text-[10px] text-gold-700">
                                                    3rd
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-1 text-right tabular-nums">
                                            {new Intl.NumberFormat(
                                                "en-PK",
                                            ).format(i.amount)}
                                        </td>
                                        <td className="py-1 font-mono">
                                            {i.cheque_no || "—"}
                                        </td>
                                        <td className="py-1">
                                            {i.received_date || "—"}
                                        </td>
                                        <td className="py-1">
                                            <span
                                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                    i.status === "received"
                                                        ? "bg-emerald-100 text-emerald-800"
                                                        : i.status === "failed"
                                                          ? "bg-red-100 text-red-800"
                                                          : "bg-amber-100 text-amber-800"
                                                }`}
                                            >
                                                {i.status}
                                            </span>
                                        </td>
                                        <td className="py-1 text-slate-600 max-w-[200px] truncate">
                                            {i.notes || "—"}
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

// =============================================================
// Shared
// =============================================================
function Stat({ label, value, tone = "gray" }) {
    const tones = {
        purple: "bg-purple-50 border-purple-200 text-purple-900",
        gold: "bg-gold-50 border-gold-200 text-gold-900",
        gray: "bg-slate-50 border-slate-200 text-slate-800",
    };
    return (
        <div className={`rounded-xl border p-3 ${tones[tone]}`}>
            <p className="text-[10px] uppercase font-bold opacity-75">
                {label}
            </p>
            <p className="text-xl font-extrabold mt-1">{value}</p>
        </div>
    );
}

function Loading() {
    return <p className="p-6 text-sm text-slate-500 text-center">Loading…</p>;
}
