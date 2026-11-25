import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import { downloadExcel, safeFilename } from "../services/excel";
import { useToast } from "../context/ToastContext";

const fmt = (n) =>
    new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(
        Number(n) || 0,
    );

const TABS = [
    { key: "flat", label: "Distribution Register", icon: "📋" },
    { key: "summary", label: "Executive Summary", icon: "📊" },
    { key: "reconciliation", label: "Fund Reconciliation", icon: "💰" },
    { key: "bank", label: "Bank Forwarding", icon: "🏦" },
];

export default function AuditReports() {
    const [tab, setTab] = useState("flat");
    const [scheme, setScheme] = useState("");
    const [year, setYear] = useState("");

    const hasFilters = scheme || year;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                        Audit Reports
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Distribution register · Executive summary · Donor
                        reconciliation · Bank forwarding schedule
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex overflow-x-auto border-b border-slate-200">
                    {TABS.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`px-5 py-3.5 text-sm font-bold whitespace-nowrap flex items-center gap-2 transition-colors ${
                                tab === t.key
                                    ? "text-purple-800 bg-purple-50/60 border-b-2 border-purple-600"
                                    : "text-slate-500 border-b-2 border-transparent hover:text-purple-700 hover:bg-purple-50/30"
                            }`}
                        >
                            <span className="text-base">{t.icon}</span>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Filters */}
                <div className="px-4 py-3 flex flex-wrap items-center gap-2 bg-slate-50/60">
                    <input
                        type="text"
                        placeholder="Scheme (e.g. SEEF)"
                        value={scheme}
                        onChange={(e) => setScheme(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-44 focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/15"
                    />
                    <input
                        type="text"
                        placeholder="Year (2025-26, 2025-2026, 25-26)"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-56 focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/15"
                    />
                    {hasFilters && (
                        <button
                            onClick={() => {
                                setScheme("");
                                setYear("");
                            }}
                            className="text-xs font-bold text-slate-500 hover:text-slate-900 underline"
                        >
                            Clear filters
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            {tab === "flat" && <FlatTab scheme={scheme} year={year} />}
            {tab === "summary" && <SummaryTab year={year} />}
            {tab === "reconciliation" && <ReconTab year={year} />}
            {tab === "bank" && <BankTab scheme={scheme} year={year} />}
        </div>
    );
}

// ============================================================
// FLAT DISTRIBUTION REGISTER (matches Excel 1_Master_Register)
// ============================================================
function FlatTab({ scheme, year }) {
    const toast = useToast();
    const { data, isLoading } = useQuery({
        queryKey: ["audit-flat", scheme, year],
        queryFn: () =>
            api
                .get("/audit/distribution-flat", {
                    params: {
                        scheme: scheme || undefined,
                        academic_year: year || undefined,
                    },
                })
                .then((r) => r.data),
    });

    const exportExcel = () => {
        if (!data) return;
        downloadExcel(
            safeFilename(
                `Distribution-Register-${scheme || "all"}-${year || "all"}.xlsx`,
            ),
            [
                {
                    name: "Distribution Register",
                    headers: [
                        "S.No",
                        "Name",
                        "Father",
                        "Roll",
                        "CNIC/B-Form",
                        "Scholarship",
                        "Year",
                        "Installment",
                        "Category",
                        "Cheque No.",
                        "Cheque Date",
                        "Gross Amount",
                        "Recovered",
                        "Net Retained",
                        "Status",
                        "Remarks",
                    ],
                    rows: [
                        ...data.rows.map((r) => [
                            r.s_no,
                            r.student_name,
                            r.father_name ?? "",
                            r.roll_no,
                            r.cnic ?? "",
                            r.scholarship,
                            r.academic_year,
                            r.installment,
                            r.category,
                            r.cheque_no ?? "",
                            r.cheque_date ?? "",
                            r.gross_amount,
                            r.recovered,
                            r.net_retained,
                            r.cheque_status,
                            r.remarks ?? "",
                        ]),
                        [
                            "",
                            "TOTAL",
                            "",
                            "",
                            "",
                            "",
                            "",
                            "",
                            "",
                            "",
                            "",
                            data.kpis.total_gross,
                            data.kpis.total_recovered,
                            data.kpis.net_retained,
                            "",
                            "",
                        ],
                    ],
                },
                {
                    name: "KPIs",
                    headers: ["Metric", "Value"],
                    rows: [
                        ["Total Cheques", data.kpis.total_cheques],
                        ["Unique Students", data.kpis.unique_students],
                        ["Fresh (1st Installment)", data.kpis.fresh_pkr],
                        ["Renewal (2nd-4th)", data.kpis.renewal_pkr],
                        ["Total Gross", data.kpis.total_gross],
                        ["Total Recovered", data.kpis.total_recovered],
                        ["Net Retained", data.kpis.net_retained],
                    ],
                },
            ],
        );
        toast.success("Distribution Register exported");
    };

    if (isLoading) return <TableSkeleton rows={8} />;
    if (!data?.rows?.length)
        return (
            <EmptyState
                icon="📋"
                title="No records match filters"
                message="Try adjusting the scheme or year filter."
            />
        );

    const k = data.kpis;

    return (
        <div className="space-y-4">
            {/* KPI strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
                <KPI label="Total Cheques" value={k.total_cheques} />
                <KPI label="Unique Students" value={k.unique_students} />
                <KPI
                    label="Fresh"
                    value={"PKR " + fmt(k.fresh_pkr)}
                    tone="purple"
                />
                <KPI
                    label="Renewal"
                    value={"PKR " + fmt(k.renewal_pkr)}
                    tone="blue"
                />
                <KPI
                    label="Gross Paid"
                    value={"PKR " + fmt(k.total_gross)}
                    tone="green"
                />
                <KPI
                    label="Recovered"
                    value={"PKR " + fmt(k.total_recovered)}
                    tone="rose"
                />
                <KPI
                    label="Net Retained"
                    value={"PKR " + fmt(k.net_retained)}
                    tone="emerald"
                />
            </div>

            {/* Export button */}
            <div className="flex justify-end">
                <button
                    onClick={exportExcel}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-1.5"
                >
                    <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Export Excel
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-auto max-h-[70vh]">
                    <table className="w-full text-xs">
                        <thead className="bg-purple-900 text-white sticky top-0 z-10">
                            <tr>
                                {[
                                    "S.No",
                                    "Name",
                                    "Father",
                                    "Roll",
                                    "CNIC",
                                    "Scholarship",
                                    "Year",
                                    "Installment",
                                    "Category",
                                    "Cheque",
                                    "Date",
                                    "Gross",
                                    "Recovered",
                                    "Net",
                                    "Status",
                                    "Remarks",
                                ].map((h) => (
                                    <th
                                        key={h}
                                        className="px-2 py-2.5 text-left text-[10px] uppercase tracking-wider font-extrabold whitespace-nowrap"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.rows.map((r, i) => (
                                <tr
                                    key={i}
                                    className="border-t border-slate-100 hover:bg-purple-50/40"
                                >
                                    <td className="px-2 py-2 text-slate-500">
                                        {r.s_no}
                                    </td>
                                    <td
                                        className="px-2 py-2 font-medium text-slate-800 max-w-[140px] truncate"
                                        title={r.student_name}
                                    >
                                        {r.student_name}
                                    </td>
                                    <td
                                        className="px-2 py-2 text-slate-600 max-w-[120px] truncate"
                                        title={r.father_name}
                                    >
                                        {r.father_name || "—"}
                                    </td>
                                    <td className="px-2 py-2 font-mono text-[10px]">
                                        {r.roll_no}
                                    </td>
                                    <td className="px-2 py-2 font-mono text-[10px]">
                                        {r.cnic || "—"}
                                    </td>
                                    <td
                                        className="px-2 py-2 text-slate-700 max-w-[100px] truncate"
                                        title={r.scholarship}
                                    >
                                        {r.scholarship}
                                    </td>
                                    <td className="px-2 py-2 text-slate-600 whitespace-nowrap">
                                        {r.academic_year}
                                    </td>
                                    <td className="px-2 py-2 text-slate-600 whitespace-nowrap">
                                        {r.installment}
                                    </td>
                                    <td className="px-2 py-2">
                                        <span
                                            className={`inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                                                r.category === "Fresh"
                                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                            }`}
                                        >
                                            {r.category}
                                        </span>
                                    </td>
                                    <td className="px-2 py-2 font-mono text-[10px]">
                                        {r.cheque_no || "—"}
                                    </td>
                                    <td className="px-2 py-2 text-[10px] text-slate-600 whitespace-nowrap">
                                        {r.cheque_date || "—"}
                                    </td>
                                    <td className="px-2 py-2 text-right tabular-nums font-bold text-slate-800">
                                        {fmt(r.gross_amount)}
                                    </td>
                                    <td className="px-2 py-2 text-right tabular-nums text-rose-700">
                                        {r.recovered > 0
                                            ? fmt(r.recovered)
                                            : "—"}
                                    </td>
                                    <td className="px-2 py-2 text-right tabular-nums font-bold text-emerald-700">
                                        {fmt(r.net_retained)}
                                    </td>
                                    <td className="px-2 py-2">
                                        <span
                                            className={`inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                                                r.cheque_status === "cleared"
                                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                    : r.cheque_status ===
                                                        "issued"
                                                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                                                      : r.cheque_status ===
                                                          "cancelled"
                                                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                                                        : "bg-amber-50 text-amber-700 border border-amber-200"
                                            }`}
                                        >
                                            {r.cheque_status}
                                        </span>
                                    </td>
                                    <td
                                        className="px-2 py-2 text-[10px] text-slate-600 max-w-[150px] truncate"
                                        title={r.remarks}
                                    >
                                        {r.remarks || "—"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-purple-900 text-white sticky bottom-0">
                            <tr>
                                <td
                                    colSpan={11}
                                    className="px-2 py-3 text-right font-extrabold"
                                >
                                    TOTAL
                                </td>
                                <td className="px-2 py-3 text-right tabular-nums font-extrabold">
                                    {fmt(k.total_gross)}
                                </td>
                                <td className="px-2 py-3 text-right tabular-nums font-extrabold">
                                    {fmt(k.total_recovered)}
                                </td>
                                <td className="px-2 py-3 text-right tabular-nums font-extrabold text-emerald-300">
                                    {fmt(k.net_retained)}
                                </td>
                                <td colSpan={2}></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ============================================================
// EXECUTIVE SUMMARY (matches Excel 2_Executive_Summary)
// ============================================================
function SummaryTab({ year }) {
    const toast = useToast();
    const { data, isLoading } = useQuery({
        queryKey: ["audit-summary", year],
        queryFn: () =>
            api
                .get("/audit/executive-summary", {
                    params: { academic_year: year || undefined },
                })
                .then((r) => r.data),
    });

    const exportExcel = () => {
        if (!data) return;
        downloadExcel(safeFilename(`Executive-Summary-${year || "all"}.xlsx`), [
            {
                name: "By Program",
                headers: [
                    "Scholarship Program",
                    "Cheques",
                    "Fresh",
                    "Renewal",
                    "Net Retained",
                ],
                rows: [
                    ...data.by_program.map((p) => [
                        p.program,
                        p.cheques,
                        p.fresh,
                        p.renewal,
                        p.net,
                    ]),
                    [
                        "TOTAL",
                        data.by_program.reduce((s, p) => s + p.cheques, 0),
                        data.by_program.reduce((s, p) => s + p.fresh, 0),
                        data.by_program.reduce((s, p) => s + p.renewal, 0),
                        data.by_program.reduce((s, p) => s + p.net, 0),
                    ],
                ],
            },
            {
                name: "By Year",
                headers: [
                    "Academic Year",
                    "Cheques",
                    "1st Inst",
                    "2nd Inst",
                    "3rd Inst",
                    "4th Inst",
                    "Gross",
                    "Recovered",
                    "Net",
                ],
                rows: [
                    ...data.by_year.map((y) => [
                        y.year,
                        y.cheques,
                        y.inst_1st,
                        y.inst_2nd,
                        y.inst_3rd,
                        y.inst_4th,
                        y.gross,
                        y.recovered,
                        y.net,
                    ]),
                ],
            },
        ]);
        toast.success("Executive Summary exported");
    };

    if (isLoading) return <TableSkeleton rows={6} />;
    if (!data)
        return (
            <EmptyState
                icon="📊"
                title="No summary data"
                message="Add scholarships to see summaries."
            />
        );

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex gap-3">
                    <StatPill
                        label="Unique Students"
                        value={data.unique_students}
                    />
                    <StatPill
                        label="Total Cheques"
                        value={data.total_cheques}
                    />
                </div>
                <button
                    onClick={exportExcel}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5"
                >
                    <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Export
                </button>
            </div>

            <Card title="Summary by Scholarship Program">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase tracking-wider">
                        <tr>
                            <th className="text-left px-4 py-2.5">Program</th>
                            <th className="text-right px-4 py-2.5">Cheques</th>
                            <th className="text-right px-4 py-2.5">Fresh</th>
                            <th className="text-right px-4 py-2.5">Renewal</th>
                            <th className="text-right px-4 py-2.5">
                                Net Retained
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.by_program.map((p) => (
                            <tr
                                key={p.program}
                                className="border-t border-slate-100 hover:bg-purple-50/40"
                            >
                                <td className="px-4 py-2.5 font-semibold text-slate-800">
                                    {p.program}
                                </td>
                                <td className="px-4 py-2.5 text-right tabular-nums">
                                    {p.cheques}
                                </td>
                                <td className="px-4 py-2.5 text-right tabular-nums text-purple-700 font-semibold">
                                    {fmt(p.fresh)}
                                </td>
                                <td className="px-4 py-2.5 text-right tabular-nums text-blue-700 font-semibold">
                                    {fmt(p.renewal)}
                                </td>
                                <td className="px-4 py-2.5 text-right tabular-nums text-emerald-700 font-bold">
                                    {fmt(p.net)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-purple-900 text-white font-bold">
                        <tr>
                            <td className="px-4 py-3">TOTAL</td>
                            <td className="px-4 py-3 text-right tabular-nums">
                                {fmt(
                                    data.by_program.reduce(
                                        (s, p) => s + p.cheques,
                                        0,
                                    ),
                                )}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">
                                {fmt(
                                    data.by_program.reduce(
                                        (s, p) => s + p.fresh,
                                        0,
                                    ),
                                )}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">
                                {fmt(
                                    data.by_program.reduce(
                                        (s, p) => s + p.renewal,
                                        0,
                                    ),
                                )}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-emerald-300">
                                {fmt(
                                    data.by_program.reduce(
                                        (s, p) => s + p.net,
                                        0,
                                    ),
                                )}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </Card>

            <Card title="Year-wise & Installment Distribution">
                <div className="overflow-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase tracking-wider">
                            <tr>
                                <th className="text-left px-3 py-2.5">
                                    Academic Year
                                </th>
                                <th className="text-right px-3 py-2.5">
                                    Cheques
                                </th>
                                <th className="text-right px-3 py-2.5">1st</th>
                                <th className="text-right px-3 py-2.5">2nd</th>
                                <th className="text-right px-3 py-2.5">3rd</th>
                                <th className="text-right px-3 py-2.5">4th</th>
                                <th className="text-right px-3 py-2.5">
                                    Gross
                                </th>
                                <th className="text-right px-3 py-2.5">
                                    Recovered
                                </th>
                                <th className="text-right px-3 py-2.5">Net</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.by_year.map((y) => (
                                <tr
                                    key={y.year}
                                    className="border-t border-slate-100 hover:bg-purple-50/40"
                                >
                                    <td className="px-3 py-2.5 font-semibold text-slate-800">
                                        {y.year}
                                    </td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">
                                        {y.cheques}
                                    </td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">
                                        {fmt(y.inst_1st)}
                                    </td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">
                                        {fmt(y.inst_2nd)}
                                    </td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">
                                        {fmt(y.inst_3rd)}
                                    </td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">
                                        {fmt(y.inst_4th)}
                                    </td>
                                    <td className="px-3 py-2.5 text-right tabular-nums font-bold text-purple-800">
                                        {fmt(y.gross)}
                                    </td>
                                    <td className="px-3 py-2.5 text-right tabular-nums text-rose-700">
                                        {fmt(y.recovered)}
                                    </td>
                                    <td className="px-3 py-2.5 text-right tabular-nums font-bold text-emerald-700">
                                        {fmt(y.net)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

// ============================================================
// FUND RECONCILIATION (matches Excel 3_Donor_Reconciliation)
// ============================================================
function ReconTab({ year }) {
    const toast = useToast();
    const { data, isLoading } = useQuery({
        queryKey: ["audit-recon", year],
        queryFn: () =>
            api
                .get("/audit/fund-reconciliation", {
                    params: { academic_year: year || undefined },
                })
                .then((r) => r.data),
    });

    const exportExcel = () => {
        if (!data) return;
        downloadExcel(
            safeFilename(`Fund-Reconciliation-${year || "all"}.xlsx`),
            [
                {
                    name: "Reconciliation",
                    headers: [
                        "S.No",
                        "Collective Chq",
                        "Date",
                        "Program",
                        "Year",
                        "Installment",
                        "Received",
                        "Distributed",
                        "Recovered",
                        "Refunded",
                        "Net Unspent",
                        "Status",
                        "Notes",
                    ],
                    rows: [
                        ...data.rows.map((r) => [
                            r.s_no,
                            r.cheque_no,
                            r.date_received ?? "",
                            r.scholarship_program,
                            r.academic_year,
                            r.installment_no,
                            r.collective_amount,
                            r.distributed,
                            r.recovered,
                            r.refunded_to_donor,
                            r.net_unspent,
                            r.status,
                            r.notes ?? "",
                        ]),
                        [
                            "TOTAL",
                            "",
                            "",
                            "",
                            "",
                            "",
                            data.grand_total.collective,
                            data.grand_total.distributed,
                            data.grand_total.recovered,
                            data.grand_total.refunded,
                            data.grand_total.net_unspent,
                            "",
                            "",
                        ],
                    ],
                },
            ],
        );
        toast.success("Reconciliation exported");
    };

    if (isLoading) return <TableSkeleton rows={5} />;
    if (!data?.rows?.length) {
        return (
            <EmptyState
                icon="💰"
                title="No collective cheques recorded"
                message="Add collective cheques from Donor Reconciliation to see matching."
            />
        );
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
                <KPI
                    label="Funds Received"
                    value={"PKR " + fmt(data.grand_total.collective)}
                    tone="green"
                />
                <KPI
                    label="Distributed"
                    value={"PKR " + fmt(data.grand_total.distributed)}
                    tone="purple"
                />
                <KPI
                    label="Recovered"
                    value={"PKR " + fmt(data.grand_total.recovered)}
                    tone="rose"
                />
                <KPI
                    label="Refunded to Donor"
                    value={"PKR " + fmt(data.grand_total.refunded)}
                />
                <KPI
                    label="Net Unspent"
                    value={"PKR " + fmt(data.grand_total.net_unspent)}
                    tone={
                        data.grand_total.net_unspent > 0 ? "amber" : "emerald"
                    }
                />
            </div>

            <div className="flex justify-end">
                <button
                    onClick={exportExcel}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5"
                >
                    <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Export
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-auto">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase tracking-wider">
                        <tr>
                            <th className="text-left px-3 py-2.5">S.No</th>
                            <th className="text-left px-3 py-2.5">
                                Cheque No.
                            </th>
                            <th className="text-left px-3 py-2.5">Date</th>
                            <th className="text-left px-3 py-2.5">Program</th>
                            <th className="text-left px-3 py-2.5">Year</th>
                            <th className="text-left px-3 py-2.5">
                                Installment
                            </th>
                            <th className="text-right px-3 py-2.5">Received</th>
                            <th className="text-right px-3 py-2.5">
                                Distributed
                            </th>
                            <th className="text-right px-3 py-2.5">
                                Recovered
                            </th>
                            <th className="text-right px-3 py-2.5">
                                Net Unspent
                            </th>
                            <th className="text-left px-3 py-2.5">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.rows.map((r) => (
                            <tr
                                key={r.id}
                                className="border-t border-slate-100 hover:bg-purple-50/40"
                            >
                                <td className="px-3 py-2.5 text-slate-500">
                                    {r.s_no}
                                </td>
                                <td className="px-3 py-2.5 font-mono text-xs font-semibold">
                                    {r.cheque_no}
                                </td>
                                <td className="px-3 py-2.5 text-xs text-slate-600">
                                    {r.date_received || "—"}
                                </td>
                                <td className="px-3 py-2.5">
                                    {r.scholarship_program}
                                </td>
                                <td className="px-3 py-2.5 text-xs">
                                    {r.academic_year}
                                </td>
                                <td className="px-3 py-2.5 text-xs">
                                    {r.installment_no}
                                </td>
                                <td className="px-3 py-2.5 text-right tabular-nums font-semibold">
                                    {fmt(r.collective_amount)}
                                </td>
                                <td className="px-3 py-2.5 text-right tabular-nums">
                                    {fmt(r.distributed)}
                                </td>
                                <td className="px-3 py-2.5 text-right tabular-nums text-rose-700">
                                    {fmt(r.recovered)}
                                </td>
                                <td
                                    className={`px-3 py-2.5 text-right tabular-nums font-bold ${
                                        Math.abs(r.net_unspent) < 0.5
                                            ? "text-emerald-700"
                                            : "text-amber-700"
                                    }`}
                                >
                                    {fmt(r.net_unspent)}
                                </td>
                                <td className="px-3 py-2.5">
                                    <span
                                        className={`inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                                            r.status === "Reconciled"
                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                : r.status ===
                                                    "Unspent / Refund Due"
                                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                                        }`}
                                    >
                                        {r.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-purple-900 text-white font-bold">
                        <tr>
                            <td colSpan={6} className="px-3 py-3 text-right">
                                TOTAL
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums">
                                {fmt(data.grand_total.collective)}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums">
                                {fmt(data.grand_total.distributed)}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums">
                                {fmt(data.grand_total.recovered)}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums text-emerald-300">
                                {fmt(data.grand_total.net_unspent)}
                            </td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}

// ============================================================
// BANK FORWARDING LIST
// ============================================================
function BankTab({ scheme, year }) {
    const toast = useToast();
    const { data, isLoading } = useQuery({
        queryKey: ["audit-bank", scheme, year],
        queryFn: () =>
            api
                .get("/audit/bank-forwarding", {
                    params: {
                        scheme: scheme || undefined,
                        academic_year: year || undefined,
                    },
                })
                .then((r) => r.data),
    });

    const exportExcel = () => {
        if (!data) return;
        downloadExcel(safeFilename(`Bank-Forwarding-${scheme || "all"}.xlsx`), [
            {
                name: "Bank Schedule",
                headers: [
                    "S.No",
                    "Name",
                    "Father",
                    "CNIC",
                    "Roll",
                    "Scholarship",
                    "Cheque No",
                    "Amount",
                ],
                rows: [
                    ...data.rows.map((r) => [
                        r.s_no,
                        r.student_name,
                        r.father_name ?? "",
                        r.cnic ?? "",
                        r.roll_no,
                        r.scholarship,
                        r.cheque_no ?? "",
                        r.cheque_amount,
                    ]),
                    ["TOTAL", "", "", "", "", "", "", data.grand_total.amount],
                ],
            },
        ]);
        toast.success("Bank Schedule exported");
    };

    if (isLoading) return <TableSkeleton rows={8} />;
    if (!data?.rows?.length)
        return (
            <EmptyState
                icon="🏦"
                title="No bank schedule"
                message="Add scholarship records first."
            />
        );

    return (
        <div className="space-y-4">
            <div className="flex justify-end gap-2">
                <button
                    onClick={() => window.print()}
                    className="border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5"
                >
                    <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <polyline points="6 9 6 2 18 2 18 9" />
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                        <rect x="6" y="14" width="12" height="8" />
                    </svg>
                    Print
                </button>
                <button
                    onClick={exportExcel}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5"
                >
                    <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Export
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-auto print:shadow-none">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase tracking-wider">
                        <tr>
                            {[
                                "S.No",
                                "Name of Student",
                                "Father's Name",
                                "CNIC / B-Form",
                                "Roll No.",
                                "Scholarship",
                                "Cheque No.",
                                "Cheque Amount",
                            ].map((h) => (
                                <th key={h} className="text-left px-4 py-2.5">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.rows.map((r) => (
                            <tr
                                key={r.s_no}
                                className="border-t border-slate-100 hover:bg-purple-50/40"
                            >
                                <td className="px-4 py-2.5 text-slate-500">
                                    {r.s_no}
                                </td>
                                <td className="px-4 py-2.5 font-semibold text-slate-800">
                                    {r.student_name}
                                </td>
                                <td className="px-4 py-2.5 text-slate-600">
                                    {r.father_name || "—"}
                                </td>
                                <td className="px-4 py-2.5 font-mono text-xs">
                                    {r.cnic || "—"}
                                </td>
                                <td className="px-4 py-2.5 font-mono text-xs">
                                    {r.roll_no}
                                </td>
                                <td className="px-4 py-2.5 text-xs">
                                    {r.scholarship}
                                </td>
                                <td className="px-4 py-2.5 font-mono text-xs">
                                    {r.cheque_no || "—"}
                                </td>
                                <td className="px-4 py-2.5 text-right tabular-nums font-bold">
                                    {fmt(r.cheque_amount)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-purple-900 text-white font-bold">
                        <tr>
                            <td colSpan={7} className="px-4 py-3 text-right">
                                TOTAL BANK SCHEDULE
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">
                                {fmt(data.grand_total.amount)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}

// ============================================================
// SHARED COMPONENTS
// ============================================================
function Card({ title, children }) {
    return (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
                <h3 className="font-extrabold text-slate-900 text-sm">
                    {title}
                </h3>
            </div>
            <div className="overflow-auto">{children}</div>
        </section>
    );
}

function KPI({ label, value, tone = "slate" }) {
    const tones = {
        slate: "bg-slate-50 border-slate-200",
        purple: "bg-purple-50 border-purple-200",
        blue: "bg-blue-50 border-blue-200",
        green: "bg-emerald-50 border-emerald-200",
        emerald: "bg-emerald-50 border-emerald-200",
        rose: "bg-rose-50 border-rose-200",
        amber: "bg-amber-50 border-amber-200",
    };
    return (
        <div className={`rounded-lg border px-3 py-2 ${tones[tone]}`}>
            <p className="text-[9px] uppercase tracking-widest font-extrabold text-slate-500">
                {label}
            </p>
            <p className="text-sm font-extrabold text-slate-800 mt-0.5 tabular-nums">
                {value}
            </p>
        </div>
    );
}

function StatPill({ label, value }) {
    return (
        <div className="bg-white rounded-lg border border-slate-200 px-3 py-1.5 flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-500">
                {label}
            </span>
            <span className="text-sm font-extrabold text-slate-800">
                {value}
            </span>
        </div>
    );
}

function EmptyState({ icon, title, message }) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-slate-50 grid place-items-center text-3xl mb-4">
                {icon}
            </div>
            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                {message}
            </p>
        </div>
    );
}

function TableSkeleton({ rows = 6 }) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 animate-pulse">
            <div className="h-4 bg-slate-100 rounded w-1/4 mb-4"></div>
            {Array.from({ length: rows }).map((_, i) => (
                <div
                    key={i}
                    className="border-t border-slate-100 py-3 flex gap-4"
                >
                    <div className="h-3 bg-slate-100 rounded w-16"></div>
                    <div className="h-3 bg-slate-100 rounded flex-1"></div>
                    <div className="h-3 bg-slate-100 rounded w-24"></div>
                    <div className="h-3 bg-slate-100 rounded w-20"></div>
                </div>
            ))}
        </div>
    );
}
