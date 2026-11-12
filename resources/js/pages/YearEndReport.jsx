import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    fetchDashboard,
    fetchYearEndReport,
    fetchReportStudentWise,
    fetchReportYearWise,
    fetchReportDepartmentWise,
    fetchReportSummary,
    fetchReportDonorWise,
    fetchReportStudentDetail,
} from "../services/scholarships";
import { downloadExcel, safeFilename } from "../services/excel";
import StudentDetailModal from "../components/StudentDetailModal";
import { useToast } from "../context/ToastContext";

const fmt = (n) =>
    new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(
        Number(n) || 0,
    );

const TABS = [
    { key: "grouped", label: "Grouped (Funding)" },
    { key: "summary", label: "Scholarship Summary" },
    { key: "student", label: "Student-wise" },
    { key: "year", label: "Year-wise" },
    { key: "department", label: "Department-wise" },
    { key: "donor", label: "Donor-wise" },
    { key: "all", label: "All Students (Detailed)" },
];

export default function YearEndReport() {
    const toast = useToast();
    const [tab, setTab] = useState("grouped");
    const [year, setYear] = useState("");
    const [modal, setModal] = useState(null);

    const { data: dashCtx } = useQuery({
        queryKey: ["dashboard"],
        queryFn: fetchDashboard,
    });
    const currentFy = dashCtx?.current_fiscal_year ?? "";

    useEffect(() => {
        if (currentFy && !year) setYear(currentFy);
    }, [currentFy, year]);

    const { data: meta } = useQuery({
        queryKey: ["report-meta", year],
        queryFn: () => fetchYearEndReport(year || undefined),
    });
    const years = meta?.years ?? [];

    const exportMasterWorkbook = async () => {
        try {
            const [summary, dept, donor, years_, students] = await Promise.all([
                fetchReportSummary(year || undefined),
                fetchReportDepartmentWise(year || undefined),
                fetchReportDonorWise(year || undefined),
                fetchReportYearWise(),
                fetchReportStudentDetail(year ? { academic_year: year } : {}),
            ]);

            const sheets = [
                {
                    name: "Summary",
                    headers: [
                        "S.No",
                        "Name of Donor",
                        "Name of Scholarship",
                        "Slots",
                        "Approved",
                        "Received",
                    ],
                    rows: [
                        ...(summary.rows ?? []).map((r, i) => [
                            i + 1,
                            r.donor,
                            r.scheme,
                            r.slots,
                            r.approved,
                            r.received,
                        ]),
                        [
                            "",
                            "TOTAL",
                            "",
                            summary.grand_total.slots,
                            summary.grand_total.approved,
                            summary.grand_total.received,
                        ],
                    ],
                },
                {
                    name: "By Department",
                    headers: [
                        "Department",
                        "Students",
                        "Slots",
                        "Approved",
                        "Received",
                    ],
                    rows: [
                        ...(dept.groups ?? []).map((g) => [
                            g.department,
                            g.students,
                            g.slots,
                            g.approved,
                            g.received,
                        ]),
                        [
                            "TOTAL",
                            dept.grand_total.students,
                            dept.grand_total.slots,
                            dept.grand_total.approved,
                            dept.grand_total.received,
                        ],
                    ],
                },
                {
                    name: "By Donor",
                    headers: [
                        "Donor",
                        "Students",
                        "Slots",
                        "Approved",
                        "Received",
                    ],
                    rows: [
                        ...(donor.groups ?? []).map((g) => [
                            g.donor,
                            g.students,
                            g.slots,
                            g.approved,
                            g.received,
                        ]),
                        [
                            "TOTAL",
                            donor.grand_total.students,
                            donor.grand_total.slots,
                            donor.grand_total.approved,
                            donor.grand_total.received,
                        ],
                    ],
                },
                {
                    name: "By Year",
                    headers: [
                        "Fiscal Year",
                        "Students",
                        "Records",
                        "Approved",
                        "Received",
                    ],
                    rows: [
                        ...(years_.groups ?? []).map((g) => [
                            g.academic_year,
                            g.students,
                            g.records,
                            g.approved,
                            g.received,
                        ]),
                        [
                            "TOTAL",
                            years_.grand_total.students,
                            years_.grand_total.records,
                            years_.grand_total.approved,
                            years_.grand_total.received,
                        ],
                    ],
                },
                {
                    name: "All Students",
                    headers: [
                        "S.No",
                        "Roll No.",
                        "Name",
                        "Scheme",
                        "Donor",
                        "Department",
                        "Year",
                        "Approved",
                        "Received",
                        "Status",
                        "Notes",
                    ],
                    rows: [
                        ...(students.data ?? []).map((r, i) => [
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
                            r.notes ?? "",
                        ]),
                        [
                            "",
                            "TOTAL",
                            "",
                            "",
                            "",
                            "",
                            "",
                            students.grand_total.approved,
                            students.grand_total.received,
                            "",
                            "",
                        ],
                    ],
                },
                {
                    name: "Installments by FY",
                    headers: [
                        "S.No",
                        "Roll No.",
                        "Name",
                        "Scheme",
                        "Installment #",
                        "Amount",
                        "Cheque",
                        "Dated",
                        "Fiscal Year",
                        "Status",
                    ],
                    rows: (() => {
                        const out = [];
                        let i = 1;
                        (students.data ?? []).forEach((r) => {
                            (r.installments ?? []).forEach((ins) => {
                                out.push([
                                    i++,
                                    r.student_id,
                                    r.student_name ?? "",
                                    r.scheme,
                                    ins.installment_no,
                                    ins.amount,
                                    ins.cheque_no ?? "",
                                    ins.received_date ?? "",
                                    ins.fiscal_year ?? "",
                                    ins.status,
                                ]);
                            });
                        });
                        const total = (students.data ?? []).reduce(
                            (s, r) =>
                                s +
                                (r.installments ?? []).reduce(
                                    (ss, i2) => ss + Number(i2.amount),
                                    0,
                                ),
                            0,
                        );
                        out.push([
                            "",
                            "TOTAL",
                            "",
                            "",
                            "",
                            total,
                            "",
                            "",
                            "",
                            "",
                        ]);
                        return out;
                    })(),
                },
            ];

            downloadExcel(
                safeFilename(
                    `MSR-Master-${year || "all"}-${new Date().toISOString().slice(0, 10)}.xlsx`,
                ),
                sheets,
            );
            toast.success("Master workbook — 6 sheets");
        } catch (err) {
            console.error(err);
            toast.error("Export failed");
        }
    };

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="px-5 py-4 border-b">
                    <h2 className="font-semibold">Reports</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Approved = scholarship commitments. Received =
                        installments landed within fiscal year (Jul–Jun).
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
                    <label className="text-sm font-semibold text-slate-700">
                        Year
                    </label>
                    <select
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                    >
                        <option value="">All years</option>
                        {years.map((y) => (
                            <option key={y} value={y}>
                                {y}
                            </option>
                        ))}
                    </select>
                    <div className="flex-1" />
                    <button
                        onClick={exportMasterWorkbook}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                    >
                        ⬇ Master Summary (.xlsx)
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="border border-slate-300 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-100"
                    >
                        Print / PDF
                    </button>
                </div>
            </div>

            {tab === "grouped" && <GroupedView year={year} />}
            {tab === "summary" && <SummaryView year={year} />}
            {tab === "student" && <StudentView year={year} />}
            {tab === "year" && <YearView />}
            {tab === "department" && (
                <DepartmentView year={year} onViewStudents={setModal} />
            )}
            {tab === "donor" && (
                <DonorView year={year} onViewStudents={setModal} />
            )}
            {tab === "all" && <AllStudentsView year={year} />}

            {modal && (
                <StudentDetailModal
                    title={modal.title}
                    filters={modal.filters}
                    onClose={() => setModal(null)}
                />
            )}
        </div>
    );
}

// ── GROUPED ──
function GroupedView({ year }) {
    const { data, isLoading } = useQuery({
        queryKey: ["report-grouped", year],
        queryFn: () => fetchYearEndReport(year || undefined),
    });

    if (isLoading) return <Loading />;
    if (!data?.academic_year)
        return <Empty message="No scholarship records yet." />;

    let counter = 0;
    return (
        <ReportCard title={`Grouped Summary — ${data.academic_year}`}>
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-slate-100 text-slate-700 text-[11px] uppercase tracking-wide">
                        <th className="text-left px-4 py-2 w-14">S.No</th>
                        <th className="text-left px-4 py-2">Donor</th>
                        <th className="text-left px-4 py-2">Scholarship</th>
                        <th className="text-right px-4 py-2">Slots</th>
                        <th className="text-right px-4 py-2">Approved</th>
                        <th className="text-right px-4 py-2">Received</th>
                    </tr>
                </thead>
                <tbody>
                    {data.groups.map((g) => (
                        <GroupRows
                            key={g.funding_group}
                            group={g}
                            counterRef={() => ++counter}
                        />
                    ))}
                </tbody>
                <tfoot>
                    <tr className="bg-purple-900 text-white font-bold">
                        <td colSpan={3} className="px-4 py-3 text-right">
                            GRAND TOTAL
                        </td>
                        <td className="px-4 py-3 text-right">
                            {fmt(data.grand_total.slots)}
                        </td>
                        <td className="px-4 py-3 text-right">
                            {fmt(data.grand_total.approved)}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-300">
                            {fmt(data.grand_total.received)}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </ReportCard>
    );
}

function GroupRows({ group, counterRef }) {
    return (
        <>
            <tr className="bg-purple-50 border-t-2 border-purple-200">
                <td colSpan={6} className="px-4 py-2 font-bold text-purple-900">
                    {group.funding_group}
                </td>
            </tr>
            {group.rows.map((r, i) => (
                <tr key={i} className="border-t hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-500 text-xs">
                        {counterRef()}
                    </td>
                    <td className="px-4 py-2">{r.donor}</td>
                    <td className="px-4 py-2">{r.scheme}</td>
                    <td className="px-4 py-2 text-right">{r.slots}</td>
                    <td className="px-4 py-2 text-right">{fmt(r.approved)}</td>
                    <td className="px-4 py-2 text-right text-emerald-700">
                        {fmt(r.received)}
                    </td>
                </tr>
            ))}
            <tr className="bg-slate-50 border-t-2 border-slate-300 font-semibold">
                <td colSpan={3} className="px-4 py-2 text-right text-slate-700">
                    Subtotal — {group.funding_group}
                </td>
                <td className="px-4 py-2 text-right">{group.subtotal.slots}</td>
                <td className="px-4 py-2 text-right">
                    {fmt(group.subtotal.approved)}
                </td>
                <td className="px-4 py-2 text-right text-emerald-700">
                    {fmt(group.subtotal.received)}
                </td>
            </tr>
        </>
    );
}

// ── SUMMARY ──
function SummaryView({ year }) {
    const toast = useToast();
    const { data, isLoading } = useQuery({
        queryKey: ["report-summary", year],
        queryFn: () => fetchReportSummary(year || undefined),
    });

    if (isLoading) return <Loading />;
    if (!data?.rows?.length) return <Empty message="No records." />;

    const exportSummary = () => {
        downloadExcel(
            safeFilename(`scholarship-summary-${year || "all"}.xlsx`),
            [
                {
                    name: "Summary",
                    headers: [
                        "S.No",
                        "Donor",
                        "Scholarship",
                        "Slots",
                        "Approved",
                        "Received",
                    ],
                    rows: [
                        ...data.rows.map((r, i) => [
                            i + 1,
                            r.donor,
                            r.scheme,
                            r.slots,
                            r.approved,
                            r.received,
                        ]),
                        [
                            "",
                            "TOTAL",
                            "",
                            data.grand_total.slots,
                            data.grand_total.approved,
                            data.grand_total.received,
                        ],
                    ],
                },
            ],
        );
        toast.success("Summary exported");
    };

    return (
        <>
            <div className="px-5 py-2 bg-white border-b flex justify-end">
                <button
                    onClick={exportSummary}
                    className="bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold"
                >
                    ⬇ Export Summary (.xlsx)
                </button>
            </div>
            <ReportCard
                title={`Scholarship Summary${year ? " — " + year : " — All Years"}`}
            >
                <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-slate-700 text-[11px] uppercase">
                        <tr>
                            <th className="text-left px-4 py-2">S.No</th>
                            <th className="text-left px-4 py-2">Donor</th>
                            <th className="text-left px-4 py-2">Scholarship</th>
                            <th className="text-right px-4 py-2">Slots</th>
                            <th className="text-right px-4 py-2">Approved</th>
                            <th className="text-right px-4 py-2">Received</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.rows.map((r, i) => (
                            <tr
                                key={`${r.donor}-${r.scheme}`}
                                className="border-t hover:bg-purple-50/40"
                            >
                                <td className="px-4 py-2 text-xs text-slate-500">
                                    {i + 1}
                                </td>
                                <td className="px-4 py-2">{r.donor}</td>
                                <td className="px-4 py-2">{r.scheme}</td>
                                <td className="px-4 py-2 text-right">
                                    {r.slots}
                                </td>
                                <td className="px-4 py-2 text-right">
                                    {fmt(r.approved)}
                                </td>
                                <td className="px-4 py-2 text-right text-emerald-700">
                                    {fmt(r.received)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-purple-900 text-white font-bold">
                            <td colSpan={3} className="px-4 py-3 text-right">
                                TOTAL
                            </td>
                            <td className="px-4 py-3 text-right">
                                {fmt(data.grand_total.slots)}
                            </td>
                            <td className="px-4 py-3 text-right">
                                {fmt(data.grand_total.approved)}
                            </td>
                            <td className="px-4 py-3 text-right text-emerald-300">
                                {fmt(data.grand_total.received)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </ReportCard>
        </>
    );
}

// ── STUDENT-WISE ──
function StudentView({ year }) {
    const toast = useToast();
    const { data, isLoading } = useQuery({
        queryKey: ["report-student", year],
        queryFn: () => fetchReportStudentWise(year || undefined),
    });
    const [expanded, setExpanded] = useState(null);

    if (isLoading) return <Loading />;
    if (!data?.groups?.length) return <Empty message="No students." />;

    const exportAll = () => {
        const headers = [
            "S.No",
            "Roll No.",
            "Name",
            "Scheme",
            "Year",
            "Donor",
            "Approved",
            "Received",
            "Status",
        ];
        const rows = [];
        let i = 1;
        data.groups.forEach((g) => {
            g.records.forEach((r) => {
                rows.push([
                    i++,
                    r.student_id,
                    g.student_name ?? "",
                    r.scheme,
                    r.academic_year,
                    r.donor,
                    r.approved_amount,
                    r.received_amount,
                    r.payment_status,
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
            data.grand_total.approved,
            data.grand_total.received,
            "",
        ]);
        downloadExcel(safeFilename(`students-${year || "all"}.xlsx`), [
            { name: "Students", headers, rows },
        ]);
        toast.success(`Exported ${i - 1} rows`);
    };

    return (
        <>
            <div className="px-5 py-2 bg-white border-b flex justify-end">
                <button
                    onClick={exportAll}
                    className="bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold"
                >
                    ⬇ Export (.xlsx)
                </button>
            </div>
            <ReportCard
                title={`Student-wise Report${year ? " — " + year : ""}`}
            >
                <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-slate-700 text-[11px] uppercase">
                        <tr>
                            <th className="text-left px-3 py-2 w-12">#</th>
                            <th className="text-left px-3 py-2">Student</th>
                            <th className="text-left px-3 py-2">Roll</th>
                            <th className="text-left px-3 py-2">Dept</th>
                            <th className="text-right px-3 py-2">Records</th>
                            <th className="text-right px-3 py-2">Approved</th>
                            <th className="text-right px-3 py-2">Received</th>
                            <th className="w-8"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.groups.map((g, i) => (
                            <StudentRow
                                key={g.student_id || i}
                                group={g}
                                index={i}
                                expanded={expanded === i}
                                onToggle={() =>
                                    setExpanded(expanded === i ? null : i)
                                }
                            />
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-purple-900 text-white font-bold">
                            <td colSpan={4} className="px-3 py-3 text-right">
                                TOTAL — {data.grand_total.students} student(s)
                            </td>
                            <td className="px-3 py-3 text-right">
                                {fmt(data.grand_total.slots)}
                            </td>
                            <td className="px-3 py-3 text-right">
                                {fmt(data.grand_total.approved)}
                            </td>
                            <td className="px-3 py-3 text-right text-emerald-300">
                                {fmt(data.grand_total.received)}
                            </td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </ReportCard>
        </>
    );
}

function StudentRow({ group: g, index, expanded, onToggle }) {
    return (
        <>
            <tr
                className="border-t hover:bg-purple-50/40 cursor-pointer"
                onClick={onToggle}
            >
                <td className="px-3 py-2 text-slate-500 text-xs">
                    {index + 1}
                </td>
                <td className="px-3 py-2 font-semibold">
                    {g.student_name || "—"}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                    {g.student_id || "—"}
                </td>
                <td className="px-3 py-2 text-xs">{g.department || "—"}</td>
                <td className="px-3 py-2 text-right">{g.total_slots}</td>
                <td className="px-3 py-2 text-right">
                    {fmt(g.total_approved)}
                </td>
                <td className="px-3 py-2 text-right text-emerald-700 font-semibold">
                    {fmt(g.total_received)}
                </td>
                <td className="px-3 py-2 text-center text-purple-700 text-xs">
                    {expanded ? "▲" : "▼"}
                </td>
            </tr>
            {expanded && (
                <tr>
                    <td colSpan={8} className="bg-slate-50 px-6 py-3">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-slate-500 uppercase">
                                    <th className="text-left py-1">Scheme</th>
                                    <th className="text-left py-1">Year</th>
                                    <th className="text-left py-1">Donor</th>
                                    <th className="text-right py-1">
                                        Approved
                                    </th>
                                    <th className="text-right py-1">
                                        Received
                                    </th>
                                    <th className="text-left py-1">
                                        Installments
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {g.records.map((r) => (
                                    <tr
                                        key={r.id}
                                        className="border-t border-slate-200"
                                    >
                                        <td className="py-1">{r.scheme}</td>
                                        <td className="py-1">
                                            {r.academic_year}
                                        </td>
                                        <td className="py-1">{r.donor}</td>
                                        <td className="py-1 text-right">
                                            {fmt(r.approved_amount)}
                                        </td>
                                        <td className="py-1 text-right text-emerald-700">
                                            {fmt(r.received_amount)}
                                        </td>
                                        <td className="py-1">
                                            {(r.installments ?? []).map(
                                                (ins) => (
                                                    <div
                                                        key={ins.installment_no}
                                                        className="text-[11px] text-slate-600"
                                                    >
                                                        #{ins.installment_no} —{" "}
                                                        {fmt(ins.amount)} —{" "}
                                                        {ins.received_date ||
                                                            "pending"}
                                                        {ins.fiscal_year && (
                                                            <span className="ml-1 text-purple-700">
                                                                (
                                                                {
                                                                    ins.fiscal_year
                                                                }
                                                                )
                                                            </span>
                                                        )}
                                                    </div>
                                                ),
                                            )}
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

// ── YEAR-WISE ──
function YearView() {
    const toast = useToast();
    const { data, isLoading } = useQuery({
        queryKey: ["report-year"],
        queryFn: fetchReportYearWise,
    });

    if (isLoading) return <Loading />;
    if (!data?.groups?.length) return <Empty message="No records." />;

    const exportYear = () => {
        downloadExcel(
            safeFilename(
                `year-wise-${new Date().toISOString().slice(0, 10)}.xlsx`,
            ),
            [
                {
                    name: "By Year",
                    headers: [
                        "Fiscal Year",
                        "Students",
                        "Records",
                        "Approved",
                        "Received",
                    ],
                    rows: [
                        ...data.groups.map((g) => [
                            g.academic_year,
                            g.students,
                            g.records,
                            g.approved,
                            g.received,
                        ]),
                        [
                            "TOTAL",
                            data.grand_total.students,
                            data.grand_total.records,
                            data.grand_total.approved,
                            data.grand_total.received,
                        ],
                    ],
                },
            ],
        );
        toast.success("Exported");
    };

    return (
        <>
            <div className="px-5 py-2 bg-white border-b flex justify-end">
                <button
                    onClick={exportYear}
                    className="bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold"
                >
                    ⬇ Export (.xlsx)
                </button>
            </div>
            <ReportCard
                title="Year-wise Report"
                subtitle="Approved = commitments by year. Received = installments landed in that fiscal year."
            >
                <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-slate-700 text-[11px] uppercase">
                        <tr>
                            <th className="text-left px-3 py-2">Fiscal Year</th>
                            <th className="text-right px-3 py-2">Students</th>
                            <th className="text-right px-3 py-2">Records</th>
                            <th className="text-right px-3 py-2">Approved</th>
                            <th className="text-right px-3 py-2">Received</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.groups.map((g) => (
                            <tr
                                key={g.academic_year}
                                className={`border-t hover:bg-purple-50/40 ${g.is_current ? "bg-purple-50" : ""}`}
                            >
                                <td className="px-3 py-2 font-semibold whitespace-nowrap">
                                    {g.academic_year}
                                    {g.is_current && (
                                        <span className="ml-2 text-[9px] font-bold bg-purple-600 text-white px-1.5 py-0.5 rounded-full">
                                            CURRENT
                                        </span>
                                    )}
                                </td>
                                <td className="px-3 py-2 text-right">
                                    {g.students}
                                </td>
                                <td className="px-3 py-2 text-right">
                                    {g.records}
                                </td>
                                <td className="px-3 py-2 text-right font-bold text-purple-800">
                                    {fmt(g.approved)}
                                </td>
                                <td className="px-3 py-2 text-right font-bold text-emerald-700">
                                    {fmt(g.received)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-purple-900 text-white font-bold">
                            <td className="px-3 py-3 text-right">TOTAL</td>
                            <td className="px-3 py-3 text-right">
                                {data.grand_total.students}
                            </td>
                            <td className="px-3 py-3 text-right">
                                {data.grand_total.records}
                            </td>
                            <td className="px-3 py-3 text-right">
                                {fmt(data.grand_total.approved)}
                            </td>
                            <td className="px-3 py-3 text-right text-emerald-300">
                                {fmt(data.grand_total.received)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </ReportCard>
        </>
    );
}

// ── DEPARTMENT-WISE ──
function DepartmentView({ year, onViewStudents }) {
    const toast = useToast();
    const { data, isLoading } = useQuery({
        queryKey: ["report-department", year],
        queryFn: () => fetchReportDepartmentWise(year || undefined),
    });

    if (isLoading) return <Loading />;
    if (!data?.groups?.length)
        return <Empty message="No records with department info." />;

    const exportDept = () => {
        downloadExcel(safeFilename(`department-wise-${year || "all"}.xlsx`), [
            {
                name: "By Department",
                headers: [
                    "Department",
                    "Students",
                    "Slots",
                    "Approved",
                    "Received",
                ],
                rows: [
                    ...data.groups.map((g) => [
                        g.department,
                        g.students,
                        g.slots,
                        g.approved,
                        g.received,
                    ]),
                    [
                        "TOTAL",
                        data.grand_total.students,
                        data.grand_total.slots,
                        data.grand_total.approved,
                        data.grand_total.received,
                    ],
                ],
            },
        ]);
        toast.success("Exported");
    };

    return (
        <>
            <div className="px-5 py-2 bg-white border-b flex justify-end">
                <button
                    onClick={exportDept}
                    className="bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold"
                >
                    ⬇ Export (.xlsx)
                </button>
            </div>
            <ReportCard
                title={`Department-wise${year ? " — " + year : ""}`}
                subtitle="Click a row to view + download students."
            >
                <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-slate-700 text-[11px] uppercase">
                        <tr>
                            <th className="text-left px-3 py-2">Department</th>
                            <th className="text-right px-3 py-2">Students</th>
                            <th className="text-right px-3 py-2">Slots</th>
                            <th className="text-right px-3 py-2">Approved</th>
                            <th className="text-right px-3 py-2">Received</th>
                            <th className="text-center px-3 py-2">Students</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.groups.map((g) => (
                            <tr
                                key={g.department}
                                className="border-t hover:bg-purple-50/40 cursor-pointer"
                                onClick={() =>
                                    onViewStudents({
                                        title: `Students — ${g.department}`,
                                        filters: {
                                            academic_year: data.academic_year,
                                            department:
                                                g.department === "Unassigned"
                                                    ? ""
                                                    : g.department,
                                        },
                                    })
                                }
                            >
                                <td className="px-3 py-2 font-semibold">
                                    {g.department}
                                </td>
                                <td className="px-3 py-2 text-right">
                                    {g.students}
                                </td>
                                <td className="px-3 py-2 text-right">
                                    {g.slots}
                                </td>
                                <td className="px-3 py-2 text-right font-semibold">
                                    {fmt(g.approved)}
                                </td>
                                <td className="px-3 py-2 text-right font-semibold text-emerald-700">
                                    {fmt(g.received)}
                                </td>
                                <td className="px-3 py-2 text-center">
                                    <button
                                        className="text-purple-700 text-xs font-semibold hover:underline"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onViewStudents({
                                                title: `Students — ${g.department}`,
                                                filters: {
                                                    academic_year:
                                                        data.academic_year,
                                                    department:
                                                        g.department ===
                                                        "Unassigned"
                                                            ? ""
                                                            : g.department,
                                                },
                                            });
                                        }}
                                    >
                                        View →
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-purple-900 text-white font-bold">
                            <td className="px-3 py-3 text-right">TOTAL</td>
                            <td className="px-3 py-3 text-right">
                                {data.grand_total.students}
                            </td>
                            <td className="px-3 py-3 text-right">
                                {data.grand_total.slots}
                            </td>
                            <td className="px-3 py-3 text-right">
                                {fmt(data.grand_total.approved)}
                            </td>
                            <td className="px-3 py-3 text-right text-emerald-300">
                                {fmt(data.grand_total.received)}
                            </td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </ReportCard>
        </>
    );
}

// ── DONOR-WISE ──
function DonorView({ year, onViewStudents }) {
    const toast = useToast();
    const { data, isLoading } = useQuery({
        queryKey: ["report-donor", year],
        queryFn: () => fetchReportDonorWise(year || undefined),
    });

    if (isLoading) return <Loading />;
    if (!data?.groups?.length) return <Empty message="No records." />;

    const exportDonor = () => {
        downloadExcel(safeFilename(`donor-wise-${year || "all"}.xlsx`), [
            {
                name: "By Donor",
                headers: ["Donor", "Students", "Slots", "Approved", "Received"],
                rows: [
                    ...data.groups.map((g) => [
                        g.donor,
                        g.students,
                        g.slots,
                        g.approved,
                        g.received,
                    ]),
                    [
                        "TOTAL",
                        data.grand_total.students,
                        data.grand_total.slots,
                        data.grand_total.approved,
                        data.grand_total.received,
                    ],
                ],
            },
        ]);
        toast.success("Exported");
    };

    return (
        <>
            <div className="px-5 py-2 bg-white border-b flex justify-end">
                <button
                    onClick={exportDonor}
                    className="bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold"
                >
                    ⬇ Export (.xlsx)
                </button>
            </div>
            <ReportCard
                title={`Donor-wise${year ? " — " + year : ""}`}
                subtitle="Click a row to view students."
            >
                <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-slate-700 text-[11px] uppercase">
                        <tr>
                            <th className="text-left px-3 py-2">Donor</th>
                            <th className="text-left px-3 py-2">Schemes</th>
                            <th className="text-right px-3 py-2">Students</th>
                            <th className="text-right px-3 py-2">Slots</th>
                            <th className="text-right px-3 py-2">Approved</th>
                            <th className="text-right px-3 py-2">Received</th>
                            <th className="text-center px-3 py-2">Students</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.groups.map((g) => (
                            <tr
                                key={g.donor}
                                className="border-t hover:bg-purple-50/40 cursor-pointer"
                                onClick={() =>
                                    onViewStudents({
                                        title: `Students — ${g.donor}`,
                                        filters: {
                                            academic_year: data.academic_year,
                                            donor: g.donor,
                                        },
                                    })
                                }
                            >
                                <td className="px-3 py-2 font-semibold">
                                    {g.donor}
                                </td>
                                <td className="px-3 py-2 text-xs text-slate-600">
                                    {(g.schemes || []).join(", ") || "—"}
                                </td>
                                <td className="px-3 py-2 text-right">
                                    {g.students}
                                </td>
                                <td className="px-3 py-2 text-right">
                                    {g.slots}
                                </td>
                                <td className="px-3 py-2 text-right font-semibold">
                                    {fmt(g.approved)}
                                </td>
                                <td className="px-3 py-2 text-right font-semibold text-emerald-700">
                                    {fmt(g.received)}
                                </td>
                                <td className="px-3 py-2 text-center">
                                    <button
                                        className="text-purple-700 text-xs font-semibold hover:underline"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onViewStudents({
                                                title: `Students — ${g.donor}`,
                                                filters: {
                                                    academic_year:
                                                        data.academic_year,
                                                    donor: g.donor,
                                                },
                                            });
                                        }}
                                    >
                                        View →
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-purple-900 text-white font-bold">
                            <td colSpan={2} className="px-3 py-3 text-right">
                                TOTAL
                            </td>
                            <td className="px-3 py-3 text-right">
                                {data.grand_total.students}
                            </td>
                            <td className="px-3 py-3 text-right">
                                {data.grand_total.slots}
                            </td>
                            <td className="px-3 py-3 text-right">
                                {fmt(data.grand_total.approved)}
                            </td>
                            <td className="px-3 py-3 text-right text-emerald-300">
                                {fmt(data.grand_total.received)}
                            </td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </ReportCard>
        </>
    );
}

// ── ALL STUDENTS (DETAILED) ──
function AllStudentsView({ year }) {
    const toast = useToast();
    const { data, isLoading } = useQuery({
        queryKey: ["report-all-students", year],
        queryFn: () =>
            fetchReportStudentDetail(year ? { academic_year: year } : {}),
    });

    if (isLoading) return <Loading />;
    if (!data?.data?.length) return <Empty message="No students." />;

    const exportAll = () => {
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
        downloadExcel(safeFilename(`students-detailed-${year || "all"}.xlsx`), [
            { name: "Students", headers, rows },
        ]);
        toast.success("Exported");
    };

    return (
        <>
            <div className="px-5 py-2 bg-white border-b flex justify-between items-center">
                <p className="text-xs text-slate-500">
                    {data.data.length} records · Approved PKR{" "}
                    {fmt(data.grand_total.approved)} · Received PKR{" "}
                    {fmt(data.grand_total.received)}
                </p>
                <button
                    onClick={exportAll}
                    className="bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold"
                >
                    ⬇ Export (.xlsx)
                </button>
            </div>
            <ReportCard
                title={`All Students (Detailed)${year ? " — " + year : ""}`}
            >
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
                            <th className="text-right px-2 py-2">Approved</th>
                            <th className="text-right px-2 py-2">Received</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.data.map((r) => (
                            <tr
                                key={r.s_no}
                                className="border-t hover:bg-purple-50/40"
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
                                <td className="px-2 py-2 text-xs">{r.donor}</td>
                                <td className="px-2 py-2 text-xs">
                                    {r.department || "—"}
                                </td>
                                <td className="px-2 py-2 text-xs">
                                    {r.academic_year}
                                </td>
                                <td className="px-2 py-2 text-right font-semibold">
                                    {fmt(r.approved_amount)}
                                </td>
                                <td className="px-2 py-2 text-right font-semibold text-emerald-700">
                                    {fmt(r.received_amount)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-purple-900 text-white font-bold sticky bottom-0">
                            <td colSpan={7} className="px-2 py-2 text-right">
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
                </table>
            </ReportCard>
        </>
    );
}

// ── SHARED ──
function ReportCard({ title, subtitle, children }) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm print-report">
            <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                    {subtitle ||
                        `Generated ${new Date().toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" })}`}
                </p>
            </div>
            <div className="overflow-auto">{children}</div>
            <style>{`
        @media print {
          header, nav, aside, .no-print { display: none !important; }
          main { padding: 0 !important; max-width: none !important; }
          .print-report { border: none !important; box-shadow: none !important; }
          @page { margin: 15mm; size: A4; }
        }
      `}</style>
        </div>
    );
}

function Loading() {
    return <p className="p-6 text-sm text-slate-500 text-center">Loading…</p>;
}
function Empty({ message }) {
    return <p className="p-6 text-sm text-slate-500 text-center">{message}</p>;
}
