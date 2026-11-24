import { useState, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    fetchAuditDistribution,
    fetchAuditFundReconciliation,
    fetchAuditBankForwarding,
} from "../services/scholarships";
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

const TABS = [
    { key: "distribution", label: "Distribution Register" },
    { key: "reconciliation", label: "Fund Reconciliation" },
    { key: "bank", label: "Bank Forwarding List" },
];

export default function AuditReports() {
    const [tab, setTab] = useState("distribution");
    const [scheme, setScheme] = useState("");
    const [year, setYear] = useState("");

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="px-5 py-4 border-b">
                    <h2 className="font-semibold">Audit Reports</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Distribution Register · Fund Reconciliation · Bank
                        Forwarding — matches your audit-ready Excel.
                    </p>
                </div>

                <div className="flex border-b border-slate-200 overflow-x-auto">
                    {TABS.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
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
                    <input
                        type="text"
                        placeholder="Scheme (optional)"
                        value={scheme}
                        onChange={(e) => setScheme(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-52"
                    />
                    <input
                        type="text"
                        placeholder="Year e.g. 2025-26"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-40"
                    />
                    {(scheme || year) && (
                        <button
                            onClick={() => {
                                setScheme("");
                                setYear("");
                            }}
                            className="text-xs font-semibold text-slate-600 underline"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {tab === "distribution" && (
                <DistributionTab scheme={scheme} year={year} />
            )}
            {tab === "reconciliation" && <ReconciliationTab year={year} />}
            {tab === "bank" && <BankTab scheme={scheme} year={year} />}
        </div>
    );
}

// ============================================================
// DISTRIBUTION REGISTER — the main audit report
// ============================================================
function DistributionTab({ scheme, year }) {
    const toast = useToast();
    const { data, isLoading } = useQuery({
        queryKey: ["audit-distribution", scheme, year],
        queryFn: () =>
            fetchAuditDistribution({
                scheme: scheme || undefined,
                academic_year: year || undefined,
            }),
    });

    const exportExcel = () => {
        if (!data) return;

        // Multi-row header matching your Excel layout
        const headerRow1 = [
            "STUDENT & SCHOLARSHIP DETAILS",
            "",
            "",
            "",
            "",
            "",
            "",
            "1ST INSTALLMENT",
            "",
            "",
            "2ND INSTALLMENT",
            "",
            "",
            "3RD INSTALLMENT",
            "",
            "",
            "4TH INSTALLMENT",
            "",
            "",
            "GROSS",
            "RECOVERY",
            "",
            "",
            "NET PAID",
            "AUDIT",
        ];
        const headerRow2 = [
            "S.No",
            "Name",
            "Father's Name",
            "Roll No.",
            "CNIC",
            "Scholarship",
            "Year",
            "Chq No",
            "Stipend",
            "Dated",
            "Chq No",
            "Stipend",
            "Dated",
            "Chq No",
            "Stipend",
            "Dated",
            "Chq No",
            "Stipend",
            "Dated",
            "Total Gross",
            "Recovery Chq",
            "Recovered",
            "Recovery Date",
            "Net Retained",
            "Cheque Status",
            "Receiver Sign",
        ];

        const rows = data.rows.map((r) => [
            r.s_no,
            r.student_name,
            r.father_name ?? "",
            r.roll_no,
            r.cnic ?? "",
            r.scholarship,
            r.academic_year,
            r.inst_1?.cheque_no ?? "",
            r.inst_1?.amount ?? "",
            r.inst_1?.dated ?? "",
            r.inst_2?.cheque_no ?? "",
            r.inst_2?.amount ?? "",
            r.inst_2?.dated ?? "",
            r.inst_3?.cheque_no ?? "",
            r.inst_3?.amount ?? "",
            r.inst_3?.dated ?? "",
            r.inst_4?.cheque_no ?? "",
            r.inst_4?.amount ?? "",
            r.inst_4?.dated ?? "",
            r.gross_paid,
            r.recovery_cheque_no ?? "",
            r.recovered_amount,
            r.recovery_date ?? "",
            r.net_retained,
            r.cheque_status,
            r.receiver_sign ?? "",
        ]);

        const totalsRow = [
            "GRAND TOTAL",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            data.grand_total.inst_1,
            "",
            "",
            data.grand_total.inst_2,
            "",
            "",
            data.grand_total.inst_3,
            "",
            "",
            data.grand_total.inst_4,
            "",
            data.grand_total.gross_paid,
            "",
            data.grand_total.recovered,
            "",
            data.grand_total.net_retained,
            "",
            "",
        ];

        // Summary sheets appended
        const summaryByProgram = [
            ["SUMMARY BY SCHOLARSHIP PROGRAM"],
            ["Program", "Students", "Gross Paid", "Recovered", "Net Retained"],
            ...data.summary_by_program.map((p) => [
                p.program,
                p.students,
                p.gross_paid,
                p.recovered,
                p.net_retained,
            ]),
        ];

        const summaryByYear = [
            ["YEAR-WISE DISTRIBUTION SUMMARY"],
            [
                "Year",
                "Students",
                "1st",
                "2nd",
                "3rd",
                "4th",
                "Gross",
                "Recovered",
                "Net",
            ],
            ...data.summary_by_year.map((y) => [
                y.year,
                y.students,
                y.inst_1,
                y.inst_2,
                y.inst_3,
                y.inst_4,
                y.gross_paid,
                y.recovered,
                y.net_retained,
            ]),
        ];

        // Build 3 sheets
        const XLSX = window.XLSX || null; // use dynamic import in downloadExcel helper
        const sheets = [
            {
                name: "Distribution Register",
                headers: headerRow2,
                rows: [...rows, totalsRow],
                headerRows: [headerRow1, headerRow2],
            },
            {
                name: "By Program",
                headers: [
                    "Program",
                    "Students",
                    "Gross Paid",
                    "Recovered",
                    "Net Retained",
                ],
                rows: data.summary_by_program.map((p) => [
                    p.program,
                    p.students,
                    p.gross_paid,
                    p.recovered,
                    p.net_retained,
                ]),
            },
            {
                name: "By Year",
                headers: [
                    "Year",
                    "Students",
                    "1st Inst",
                    "2nd Inst",
                    "3rd Inst",
                    "4th Inst",
                    "Gross",
                    "Recovered",
                    "Net",
                ],
                rows: data.summary_by_year.map((y) => [
                    y.year,
                    y.students,
                    y.inst_1,
                    y.inst_2,
                    y.inst_3,
                    y.inst_4,
                    y.gross_paid,
                    y.recovered,
                    y.net_retained,
                ]),
            },
            {
                name: "By Cheque Status",
                headers: ["Status", "Count", "Gross Amount"],
                rows: data.summary_by_status.map((s) => [
                    s.status,
                    s.count,
                    s.gross_amount,
                ]),
            },
        ];

        downloadExcel(
            safeFilename(
                `Distribution-Register-${scheme || "all"}-${year || "all"}.xlsx`,
            ),
            sheets,
        );
        toast.success("Distribution Register exported");
    };

    if (isLoading)
        return (
            <p className="p-6 text-sm text-slate-500 text-center">Loading…</p>
        );
    if (!data?.rows?.length)
        return (
            <p className="p-6 text-sm text-slate-500 text-center">
                No records match the filters.
            </p>
        );

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <button
                    onClick={exportExcel}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                >
                    ⬇ Export Excel (matches layout)
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-auto">
                <table className="w-full text-xs min-w-[2200px]">
                    <thead>
                        <tr className="bg-purple-900 text-white">
                            <th colSpan={7} className="px-2 py-1 text-left">
                                STUDENT & SCHOLARSHIP DETAILS
                            </th>
                            <th colSpan={3} className="px-2 py-1">
                                1ST INST
                            </th>
                            <th colSpan={3} className="px-2 py-1">
                                2ND INST
                            </th>
                            <th colSpan={3} className="px-2 py-1">
                                3RD INST
                            </th>
                            <th colSpan={3} className="px-2 py-1">
                                4TH INST
                            </th>
                            <th className="px-2 py-1">GROSS</th>
                            <th colSpan={3} className="px-2 py-1">
                                RECOVERY
                            </th>
                            <th className="px-2 py-1">NET</th>
                            <th className="px-2 py-1">AUDIT</th>
                        </tr>
                        <tr className="bg-slate-100 text-slate-700 text-[10px] uppercase">
                            {[
                                "S.No",
                                "Name",
                                "Father",
                                "Roll",
                                "CNIC",
                                "Scholarship",
                                "Year",
                                "Chq",
                                "Stipend",
                                "Dated",
                                "Chq",
                                "Stipend",
                                "Dated",
                                "Chq",
                                "Stipend",
                                "Dated",
                                "Chq",
                                "Stipend",
                                "Dated",
                                "Gross",
                                "Rec Chq",
                                "Recovered",
                                "Rec Date",
                                "Net",
                                "Status",
                                "Sign",
                            ].map((h, i) => (
                                <th
                                    key={`h-${i}`}
                                    className="px-2 py-1 text-left whitespace-nowrap"
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.rows.map((r) => (
                            <tr
                                key={r.id}
                                className="border-t hover:bg-purple-50/40"
                            >
                                <td className="px-2 py-1 text-slate-500">
                                    {r.s_no}
                                </td>
                                <td className="px-2 py-1 font-medium">
                                    {r.student_name || "—"}
                                </td>
                                <td className="px-2 py-1 text-xs">
                                    {r.father_name || "—"}
                                </td>
                                <td className="px-2 py-1 font-mono text-[11px]">
                                    {r.roll_no}
                                </td>
                                <td className="px-2 py-1 font-mono text-[11px]">
                                    {r.cnic || "—"}
                                </td>
                                <td className="px-2 py-1 text-xs">
                                    {r.scholarship}
                                </td>
                                <td className="px-2 py-1 text-xs whitespace-nowrap">
                                    {r.academic_year}
                                </td>

                                {[r.inst_1, r.inst_2, r.inst_3, r.inst_4].map(
                                    (i, idx) => (
                                        <Fragment key={`inst-${idx}`}>
                                            <td className="px-2 py-1 font-mono text-[10px]">
                                                {i?.cheque_no || "—"}
                                            </td>
                                            <td className="px-2 py-1 text-right tabular-nums">
                                                {i?.amount
                                                    ? fmt(i.amount)
                                                    : "—"}
                                            </td>
                                            <td className="px-2 py-1 text-[10px] whitespace-nowrap">
                                                {i?.dated || "—"}
                                            </td>
                                        </Fragment>
                                    ),
                                )}

                                <td className="px-2 py-1 text-right tabular-nums font-semibold">
                                    {fmt(r.gross_paid)}
                                </td>
                                <td className="px-2 py-1 font-mono text-[10px]">
                                    {r.recovery_cheque_no || "—"}
                                </td>
                                <td className="px-2 py-1 text-right tabular-nums text-rose-700">
                                    {fmt(r.recovered_amount)}
                                </td>
                                <td className="px-2 py-1 text-[10px] whitespace-nowrap">
                                    {r.recovery_date || "—"}
                                </td>
                                <td className="px-2 py-1 text-right tabular-nums font-semibold text-emerald-700">
                                    {fmt(r.net_retained)}
                                </td>
                                <td className="px-2 py-1 text-[10px]">
                                    <span
                                        className={`font-bold px-1.5 py-0.5 rounded ${
                                            r.cheque_status === "cleared"
                                                ? "bg-emerald-100 text-emerald-800"
                                                : r.cheque_status === "issued"
                                                  ? "bg-blue-100 text-blue-800"
                                                  : r.cheque_status ===
                                                      "cancelled"
                                                    ? "bg-rose-100 text-rose-800"
                                                    : r.cheque_status ===
                                                        "stale"
                                                      ? "bg-amber-100 text-amber-800"
                                                      : "bg-slate-100 text-slate-700"
                                        }`}
                                    >
                                        {r.cheque_status}
                                    </span>
                                </td>
                                <td className="px-2 py-1 text-[10px] text-slate-500">
                                    {r.receiver_sign || "—"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-purple-900 text-white font-bold">
                            <td colSpan={7} className="px-2 py-2 text-right">
                                GRAND TOTAL
                            </td>
                            <td></td>
                            <td className="px-2 py-2 text-right">
                                {fmt(data.grand_total.inst_1)}
                            </td>
                            <td></td>
                            <td></td>
                            <td className="px-2 py-2 text-right">
                                {fmt(data.grand_total.inst_2)}
                            </td>
                            <td></td>
                            <td></td>
                            <td className="px-2 py-2 text-right">
                                {fmt(data.grand_total.inst_3)}
                            </td>
                            <td></td>
                            <td></td>
                            <td className="px-2 py-2 text-right">
                                {fmt(data.grand_total.inst_4)}
                            </td>
                            <td></td>
                            <td className="px-2 py-2 text-right">
                                {fmt(data.grand_total.gross_paid)}
                            </td>
                            <td></td>
                            <td className="px-2 py-2 text-right">
                                {fmt(data.grand_total.recovered)}
                            </td>
                            <td></td>
                            <td className="px-2 py-2 text-right text-emerald-300">
                                {fmt(data.grand_total.net_retained)}
                            </td>
                            <td colSpan={2}></td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Summary sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <SummaryCard title="Summary by Scholarship Program">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-[11px] uppercase text-slate-600">
                            <tr>
                                <th className="text-left px-3 py-1">Program</th>
                                <th className="text-right px-3 py-1">
                                    Students
                                </th>
                                <th className="text-right px-3 py-1">Gross</th>
                                <th className="text-right px-3 py-1">
                                    Recovered
                                </th>
                                <th className="text-right px-3 py-1">Net</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.summary_by_program.map((p) => (
                                <tr key={p.program} className="border-t">
                                    <td className="px-3 py-1">{p.program}</td>
                                    <td className="px-3 py-1 text-right">
                                        {p.students}
                                    </td>
                                    <td className="px-3 py-1 text-right">
                                        {fmt(p.gross_paid)}
                                    </td>
                                    <td className="px-3 py-1 text-right">
                                        {fmt(p.recovered)}
                                    </td>
                                    <td className="px-3 py-1 text-right font-semibold">
                                        {fmt(p.net_retained)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </SummaryCard>

                <SummaryCard title="Cheque Clearance & Audit Status">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-[11px] uppercase text-slate-600">
                            <tr>
                                <th className="text-left px-3 py-1">Status</th>
                                <th className="text-right px-3 py-1">Count</th>
                                <th className="text-right px-3 py-1">Gross</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.summary_by_status.map((s) => (
                                <tr key={s.status} className="border-t">
                                    <td className="px-3 py-1 capitalize">
                                        {s.status}
                                    </td>
                                    <td className="px-3 py-1 text-right">
                                        {s.count}
                                    </td>
                                    <td className="px-3 py-1 text-right">
                                        {fmt(s.gross_amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </SummaryCard>
            </div>
        </div>
    );
}

function SummaryCard({ title, children }) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-2 border-b bg-slate-50">
                <h3 className="font-semibold text-sm">{title}</h3>
            </div>
            <div>{children}</div>
        </div>
    );
}

// ============================================================
// FUND RECONCILIATION — simplified
// ============================================================
function ReconciliationTab({ year }) {
    const toast = useToast();
    const { data, isLoading } = useQuery({
        queryKey: ["audit-reconciliation", year],
        queryFn: () =>
            fetchAuditFundReconciliation({ academic_year: year || undefined }),
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
                        "Inst",
                        "Received",
                        "Distributed",
                        "Recovered",
                        "Refunded",
                        "Net Unspent",
                        "Status",
                    ],
                    rows: [
                        ...data.rows.map((r) => [
                            r.s_no,
                            r.cheque_no,
                            r.date_received,
                            r.scholarship_program,
                            r.academic_year,
                            r.installment_no,
                            r.collective_amount,
                            r.distributed,
                            r.recovered,
                            r.refunded_to_donor,
                            r.net_unspent,
                            r.status,
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
                        ],
                    ],
                },
            ],
        );
        toast.success("Exported");
    };

    if (isLoading)
        return (
            <p className="p-6 text-sm text-slate-500 text-center">Loading…</p>
        );

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500">
                    Enter collective/donor cheques first (via app or DB) to see
                    reconciliation.
                </p>
                <button
                    onClick={exportExcel}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                >
                    ⬇ Export
                </button>
            </div>

            {!data?.rows?.length ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
                    No collective cheques recorded yet. Add them via API or
                    admin panel to see reconciliation.
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-100 text-slate-700 text-[11px] uppercase">
                            <tr>
                                {[
                                    "S.No",
                                    "Collective Chq",
                                    "Date",
                                    "Program",
                                    "Year",
                                    "Inst",
                                    "Received",
                                    "Distributed",
                                    "Recovered",
                                    "Refunded",
                                    "Net Unspent",
                                    "Status",
                                ].map((h) => (
                                    <th key={h} className="px-2 py-2 text-left">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.rows.map((r) => (
                                <tr key={r.id} className="border-t">
                                    <td className="px-2 py-2">{r.s_no}</td>
                                    <td className="px-2 py-2 font-mono">
                                        {r.cheque_no}
                                    </td>
                                    <td className="px-2 py-2 text-xs">
                                        {r.date_received || "—"}
                                    </td>
                                    <td className="px-2 py-2">
                                        {r.scholarship_program}
                                    </td>
                                    <td className="px-2 py-2">
                                        {r.academic_year}
                                    </td>
                                    <td className="px-2 py-2">
                                        {r.installment_no}
                                    </td>
                                    <td className="px-2 py-2 text-right">
                                        {fmt(r.collective_amount)}
                                    </td>
                                    <td className="px-2 py-2 text-right">
                                        {fmt(r.distributed)}
                                    </td>
                                    <td className="px-2 py-2 text-right">
                                        {fmt(r.recovered)}
                                    </td>
                                    <td className="px-2 py-2 text-right">
                                        {fmt(r.refunded_to_donor)}
                                    </td>
                                    <td
                                        className={`px-2 py-2 text-right font-semibold ${Math.abs(r.net_unspent) < 0.5 ? "text-emerald-700" : "text-rose-700"}`}
                                    >
                                        {fmt(r.net_unspent)}
                                    </td>
                                    <td className="px-2 py-2 text-xs">
                                        {r.status}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-purple-900 text-white font-bold">
                                <td
                                    colSpan={6}
                                    className="px-2 py-2 text-right"
                                >
                                    TOTAL
                                </td>
                                <td className="px-2 py-2 text-right">
                                    {fmt(data.grand_total.collective)}
                                </td>
                                <td className="px-2 py-2 text-right">
                                    {fmt(data.grand_total.distributed)}
                                </td>
                                <td className="px-2 py-2 text-right">
                                    {fmt(data.grand_total.recovered)}
                                </td>
                                <td className="px-2 py-2 text-right">
                                    {fmt(data.grand_total.refunded)}
                                </td>
                                <td className="px-2 py-2 text-right">
                                    {fmt(data.grand_total.net_unspent)}
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
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
            fetchAuditBankForwarding({
                scheme: scheme || undefined,
                academic_year: year || undefined,
            }),
    });

    const exportExcel = () => {
        if (!data) return;
        downloadExcel(
            safeFilename(
                `Bank-Forwarding-${scheme || "all"}-${year || "all"}.xlsx`,
            ),
            [
                {
                    name: "Bank Forwarding",
                    headers: [
                        "S.No",
                        "Name",
                        "Father",
                        "CNIC",
                        "Roll",
                        "Scholarship",
                        "Cheque No",
                        "Cheque Amount",
                    ],
                    rows: [
                        ...data.rows.map((r) => [
                            r.s_no,
                            r.student_name,
                            r.father_name,
                            r.cnic,
                            r.roll_no,
                            r.scholarship,
                            r.cheque_no,
                            r.cheque_amount,
                        ]),
                        [
                            "TOTAL",
                            "",
                            "",
                            "",
                            "",
                            "",
                            "",
                            data.grand_total.amount,
                        ],
                    ],
                },
            ],
        );
        toast.success("Exported");
    };

    if (isLoading)
        return (
            <p className="p-6 text-sm text-slate-500 text-center">Loading…</p>
        );
    if (!data?.rows?.length)
        return (
            <p className="p-6 text-sm text-slate-500 text-center">
                No records.
            </p>
        );

    return (
        <div className="space-y-4">
            <div className="flex justify-end gap-2">
                <button
                    onClick={() => window.print()}
                    className="border border-slate-300 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50"
                >
                    🖨 Print
                </button>
                <button
                    onClick={exportExcel}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                >
                    ⬇ Export
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-auto">
                <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-slate-700 text-[11px] uppercase">
                        <tr>
                            {[
                                "S.No",
                                "Name of Student",
                                "Father's Name",
                                "CNIC / B-Form",
                                "Roll No.",
                                "Scholarship",
                                "Cheque No",
                                "Cheque Amount",
                            ].map((h) => (
                                <th key={h} className="px-3 py-2 text-left">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.rows.map((r) => (
                            <tr key={r.s_no} className="border-t">
                                <td className="px-3 py-2">{r.s_no}</td>
                                <td className="px-3 py-2 font-medium">
                                    {r.student_name}
                                </td>
                                <td className="px-3 py-2">
                                    {r.father_name || "—"}
                                </td>
                                <td className="px-3 py-2 font-mono text-xs">
                                    {r.cnic || "—"}
                                </td>
                                <td className="px-3 py-2 font-mono text-xs">
                                    {r.roll_no}
                                </td>
                                <td className="px-3 py-2 text-xs">
                                    {r.scholarship}
                                </td>
                                <td className="px-3 py-2 font-mono text-xs">
                                    {r.cheque_no || "—"}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums font-semibold">
                                    {fmt(r.cheque_amount)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-purple-900 text-white font-bold">
                            <td colSpan={7} className="px-3 py-2 text-right">
                                TOTAL BANK SCHEDULE AMOUNT
                            </td>
                            <td className="px-3 py-2 text-right">
                                {fmt(data.grand_total.amount)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
