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

    // ... rest unchanged

    // ... rest of the component unchanged ...

    const exportMasterWorkbook = async () => {
        try {
            const [summary, dept, donor, years_, students] = await Promise.all([
                fetchReportSummary(year || undefined),
                fetchReportDepartmentWise(year || undefined),
                fetchReportDonorWise(year || undefined),
                fetchReportYearWise(),
                fetchReportStudentDetail(year ? { academic_year: year } : {}),
            ]);

            // ── Guard against missing data ──
            const studentRows = Array.isArray(students?.data)
                ? students.data
                : [];
            const studentTotal = students?.grand_total?.amount ?? 0;

            if (studentRows.length === 0 && !students?.data) {
                // The endpoint returned an error or bad shape — surface it instead of crashing
                console.error("fetchReportStudentDetail returned:", students);
                toast.error(
                    "Could not fetch student details. Check console (F12) for details.",
                );
                return;
            }

            const sheets = [
                {
                    name: "Summary",
                    headers: [
                        "S.No",
                        "Name of Donor",
                        "Name of Scholarship",
                        "Number of Slots",
                        "Amount PKRs",
                    ],
                    rows: [
                        ...(summary?.rows ?? []).map((r, i) => [
                            i + 1,
                            r.donor,
                            r.scheme,
                            r.slots,
                            r.amount,
                        ]),
                        [
                            "",
                            "Total Amount",
                            "",
                            summary?.grand_total?.slots ?? 0,
                            summary?.grand_total?.amount ?? 0,
                        ],
                    ],
                },
                {
                    name: "By Department",
                    headers: [
                        "Department",
                        "Students",
                        "Scholarships",
                        "Total Amount",
                    ],
                    rows: [
                        ...(dept?.groups ?? []).map((g) => [
                            g.department,
                            g.students,
                            g.total_slots,
                            g.total_amount,
                        ]),
                        [
                            "TOTAL",
                            (dept?.groups ?? []).reduce(
                                (s, g) => s + g.students,
                                0,
                            ),
                            dept?.grand_total?.slots ?? 0,
                            dept?.grand_total?.amount ?? 0,
                        ],
                    ],
                },
                {
                    name: "By Donor",
                    headers: [
                        "Donor",
                        "Students",
                        "Scholarships",
                        "Total Amount",
                    ],
                    rows: [
                        ...(donor?.groups ?? []).map((g) => [
                            g.donor,
                            g.students,
                            g.total_slots,
                            g.total_amount,
                        ]),
                        [
                            "TOTAL",
                            (donor?.groups ?? []).reduce(
                                (s, g) => s + g.students,
                                0,
                            ),
                            donor?.grand_total?.slots ?? 0,
                            donor?.grand_total?.amount ?? 0,
                        ],
                    ],
                },
                {
                    name: "By Year",
                    headers: [
                        "Academic Year",
                        "Students",
                        "Scholarships",
                        "Total Amount",
                    ],
                    rows: [
                        ...(years_?.groups ?? []).map((g) => [
                            g.academic_year,
                            g.students,
                            g.total_slots,
                            g.total_amount,
                        ]),
                        [
                            "TOTAL",
                            (years_?.groups ?? []).reduce(
                                (s, g) => s + g.students,
                                0,
                            ),
                            years_?.grand_total?.slots ?? 0,
                            years_?.grand_total?.amount ?? 0,
                        ],
                    ],
                },
                {
                    name: "All Students",
                    headers: [
                        "S.No",
                        "Name of Student",
                        "Roll No.",
                        "Cheque No",
                        "Dated",
                        "Stipend",
                        "Remarks",
                        "Scheme",
                        "Donor",
                        "Department",
                        "Year",
                    ],
                    rows: [
                        ...studentRows.map((r, i) => [
                            i + 1,
                            r.student_name ?? "",
                            r.student_id ?? "",
                            r.cheque_no ?? "",
                            r.received_date ?? "",
                            r.approved_amount ?? 0,
                            r.notes ?? "",
                            r.scheme ?? "",
                            r.donor ?? "",
                            r.department ?? "",
                            r.academic_year ?? "",
                        ]),
                        [
                            "",
                            "TOTAL",
                            "",
                            "",
                            "",
                            studentTotal,
                            "",
                            "",
                            "",
                            "",
                            "",
                        ],
                    ],
                },
            ];

            downloadExcel(
                safeFilename(
                    `MSR-Master-${year || "all"}-${new Date().toISOString().slice(0, 10)}.xlsx`,
                ),
                sheets,
            );
            toast.success(
                `Master workbook — 5 sheets · ${studentRows.length} students`,
            );
        } catch (err) {
            console.error("exportMasterWorkbook failed:", err);
            toast.error("Export failed — check console (F12)");
        }
    };

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="px-5 py-4 border-b">
                    <h2 className="font-semibold">Reports</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Every tab has Excel export. Year/Dept/Donor tabs: click
                        a row to see the students.
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
            {tab === "year" && (
                <YearView year={year} onViewStudents={setModal} />
            )}
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

// =============================================================
// Shared Excel helper — downloads student list for any filter
// =============================================================
async function downloadStudentsExcel(filters, filename, toast) {
    try {
        const data = await fetchReportStudentDetail(filters);
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
                `${filename}-${new Date().toISOString().slice(0, 10)}.xlsx`,
            ),
            [{ name: "Students", headers, rows }],
        );
        toast.success(`${data.data.length} students downloaded`);
    } catch (err) {
        console.error(err);
        toast.error("Download failed");
    }
}

// =============================================================
// GROUPED — unchanged
// =============================================================
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
                        <th className="text-left px-4 py-2">Name of Donor</th>
                        <th className="text-left px-4 py-2">
                            Name of Scholarship
                        </th>
                        <th className="text-right px-4 py-2 w-28">Slots</th>
                        <th className="text-right px-4 py-2 w-36">
                            Amount (PKR)
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {data.groups.map((g) => (
                        <GroupBlock
                            key={g.funding_group}
                            group={g}
                            counterRef={() => ++counter}
                        />
                    ))}
                </tbody>
                <tfoot>
                    <tr className="bg-purple-900 text-white font-bold text-sm">
                        <td colSpan={3} className="px-4 py-3 text-right">
                            GRAND TOTAL
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                            {fmt(data.grand_total.slots)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                            {fmt(data.grand_total.amount)}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </ReportCard>
    );
}

function GroupBlock({ group, counterRef }) {
    return (
        <>
            <tr className="bg-purple-50 border-t-2 border-purple-200">
                <td
                    colSpan={5}
                    className="px-4 py-2 font-bold text-purple-900 text-sm"
                >
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
                    <td className="px-4 py-2 text-right tabular-nums">
                        {r.slots}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                        {fmt(r.amount)}
                    </td>
                </tr>
            ))}
            <tr className="bg-slate-50 border-t-2 border-slate-300 font-semibold">
                <td colSpan={3} className="px-4 py-2 text-right text-slate-700">
                    Subtotal — {group.funding_group}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                    {group.subtotal.slots}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                    {fmt(group.subtotal.amount)}
                </td>
            </tr>
        </>
    );
}

// =============================================================
// SUMMARY — unchanged
// =============================================================
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
                        "Name of Donor",
                        "Name of Scholarship",
                        "Number of Slots",
                        "Amount PKRs",
                    ],
                    rows: [
                        ...data.rows.map((r, i) => [
                            i + 1,
                            r.donor,
                            r.scheme,
                            r.slots,
                            r.amount,
                        ]),
                        [
                            "",
                            "Total Amount",
                            "",
                            data.grand_total.slots,
                            data.grand_total.amount,
                        ],
                    ],
                },
            ],
        );
        toast.success("Summary downloaded");
    };

    return (
        <>
            <div className="px-5 py-2 bg-white border-b flex justify-end">
                <button
                    onClick={exportSummary}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-1.5 rounded-lg text-xs font-semibold"
                >
                    ⬇ Export Summary (.xlsx)
                </button>
            </div>

            <ReportCard
                title={`Scholarship Summary${year ? " — " + year : " — All Years"}`}
            >
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-100 text-slate-700 text-[11px] uppercase tracking-wide">
                            <th className="text-left px-4 py-2 w-14">S.No</th>
                            <th className="text-left px-4 py-2">
                                Name of Donor
                            </th>
                            <th className="text-left px-4 py-2">
                                Name of Scholarship
                            </th>
                            <th className="text-right px-4 py-2 w-32">
                                Number of Slots
                            </th>
                            <th className="text-right px-4 py-2 w-40">
                                Amount PKRs.
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.rows.map((r, i) => (
                            <tr
                                key={`${r.donor}-${r.scheme}`}
                                className="border-t hover:bg-purple-50/40"
                            >
                                <td className="px-4 py-2 text-slate-500 text-xs">
                                    {i + 1}
                                </td>
                                <td className="px-4 py-2">{r.donor}</td>
                                <td className="px-4 py-2">{r.scheme}</td>
                                <td className="px-4 py-2 text-right tabular-nums">
                                    {r.slots}
                                </td>
                                <td className="px-4 py-2 text-right tabular-nums">
                                    {fmt(r.amount)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-purple-900 text-white font-bold text-sm">
                            <td colSpan={3} className="px-4 py-3 text-right">
                                Total Amount
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">
                                {fmt(data.grand_total.slots)}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">
                                {fmt(data.grand_total.amount)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </ReportCard>
        </>
    );
}

// =============================================================
// STUDENT-WISE — unchanged
// =============================================================
function StudentView({ year }) {
    const { data, isLoading } = useQuery({
        queryKey: ["report-student", year],
        queryFn: () => fetchReportStudentWise(year || undefined),
    });
    const [expanded, setExpanded] = useState(null);

    if (isLoading) return <Loading />;
    if (!data?.groups?.length) return <Empty message="No students." />;

    return (
        <ReportCard title={`Student-wise Report${year ? " — " + year : ""}`}>
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-slate-100 text-slate-700 text-[11px] uppercase tracking-wide">
                        <th className="text-left px-3 py-2 w-12">#</th>
                        <th className="text-left px-3 py-2">Student</th>
                        <th className="text-left px-3 py-2">Roll No.</th>
                        <th className="text-left px-3 py-2">Department</th>
                        <th className="text-left px-3 py-2">Scheme(s)</th>{" "}
                        <th className="text-right px-3 py-2">Total</th>
                        <th className="w-8"></th>
                    </tr>
                </thead>
                <tbody>
                    {data.groups.map((g, i) => (
                        <StudentRow
                            key={g.student_id}
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
                    <tr className="bg-purple-900 text-white font-bold text-sm">
                        <td colSpan={4} className="px-3 py-3 text-right">
                            GRAND TOTAL — {data.grand_total.students} student(s)
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                            {fmt(data.grand_total.slots)}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                            {fmt(data.grand_total.amount)}
                        </td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
        </ReportCard>
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
                <td className="px-3 py-2 text-xs">
                    {(() => {
                        const schemes = [
                            ...new Set(
                                (g.records || [])
                                    .map((r) => r.scheme)
                                    .filter(Boolean),
                            ),
                        ];
                        if (schemes.length === 0)
                            return <span className="text-slate-400">—</span>;
                        return (
                            <div className="flex flex-wrap gap-1">
                                {schemes.map((s) => (
                                    <span
                                        key={s}
                                        className="inline-block bg-purple-100 text-purple-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                    >
                                        {s}
                                    </span>
                                ))}
                                {g.records.length > schemes.length && (
                                    <span className="inline-block bg-slate-200 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                        {g.records.length} records
                                    </span>
                                )}
                            </div>
                        );
                    })()}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold">
                    {fmt(g.total_amount)}
                </td>
                <td className="px-3 py-2 text-center text-purple-700 font-semibold text-xs">
                    {expanded ? "▲" : "▼"}
                </td>
            </tr>
            {expanded && (
                <tr>
                    <td colSpan={7} className="bg-slate-50 px-6 py-3">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-slate-500 uppercase">
                                    <th className="text-left py-1">Scheme</th>
                                    <th className="text-left py-1">Year</th>
                                    <th className="text-left py-1">Donor</th>
                                    <th className="text-left py-1">Cheque</th>
                                    <th className="text-left py-1">Dated</th>
                                    <th className="text-right py-1">Stipend</th>
                                    <th className="text-left py-1">Remarks</th>
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
                                        <td className="py-1 font-mono">
                                            {r.cheque_no || "—"}
                                        </td>
                                        <td className="py-1">
                                            {r.received_date || "—"}
                                        </td>
                                        <td className="py-1 text-right tabular-nums">
                                            {fmt(r.approved_amount)}
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
// YEAR-WISE — NEW: view/download students per year
// =============================================================
function YearView({ year, onViewStudents }) {
    const toast = useToast();
    const { data, isLoading } = useQuery({
        queryKey: ["report-year"],
        queryFn: fetchReportYearWise,
    });

    if (isLoading) return <Loading />;
    if (!data?.groups?.length) return <Empty message="No records." />;

    return (
        <>
            <div className="px-5 py-2 bg-white border-b flex justify-end gap-2">
                <button
                    onClick={() =>
                        downloadStudentsExcel(
                            year ? { academic_year: year } : {},
                            `students-allyears-${year || "all"}`,
                            toast,
                        )
                    }
                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-1.5 rounded-lg text-xs font-semibold"
                >
                    ⬇ Download All Students ({year || "All Years"})
                </button>
            </div>

            <ReportCard
                title="Year-wise Report"
                subtitle="Click a row to view and download that year's students."
            >
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-100 text-slate-700 text-[11px] uppercase tracking-wide">
                            <th className="text-left px-3 py-2">
                                Academic Year
                            </th>
                            <th className="text-right px-3 py-2">Students</th>
                            <th className="text-right px-3 py-2">
                                Scholarships
                            </th>
                            <th className="text-right px-3 py-2">
                                Total Amount
                            </th>
                            <th className="text-center px-3 py-2 w-48">
                                Students
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.groups.map((g) => (
                            <tr
                                key={g.academic_year}
                                className="border-t hover:bg-purple-50/40 cursor-pointer"
                                onClick={() =>
                                    onViewStudents({
                                        title: `Students — ${g.academic_year}`,
                                        filters: {
                                            academic_year: g.academic_year,
                                        },
                                    })
                                }
                            >
                                <td className="px-3 py-2 font-semibold">
                                    {g.academic_year}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums">
                                    {g.students}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums">
                                    {g.total_slots}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums font-semibold">
                                    {fmt(g.total_amount)}
                                </td>
                                <td className="px-3 py-2 text-center">
                                    <button
                                        className="text-purple-700 text-xs font-semibold hover:underline"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onViewStudents({
                                                title: `Students — ${g.academic_year}`,
                                                filters: {
                                                    academic_year:
                                                        g.academic_year,
                                                },
                                            });
                                        }}
                                    >
                                        View & Download →
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-purple-900 text-white font-bold text-sm">
                            <td className="px-3 py-3 text-right">
                                GRAND TOTAL
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums">
                                {data.groups.reduce(
                                    (s, x) => s + x.students,
                                    0,
                                )}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums">
                                {data.grand_total.slots}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums">
                                {fmt(data.grand_total.amount)}
                            </td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </ReportCard>
        </>
    );
}

// =============================================================
// DEPARTMENT-WISE — NEW: view/download students per department
// =============================================================
function DepartmentView({ year, onViewStudents }) {
    const toast = useToast();
    const { data, isLoading } = useQuery({
        queryKey: ["report-department", year],
        queryFn: () => fetchReportDepartmentWise(year || undefined),
    });

    if (isLoading) return <Loading />;
    if (!data?.groups?.length)
        return (
            <Empty message="No records with department info. Add a Department field to each scholarship in Master Register." />
        );

    return (
        <>
            <div className="px-5 py-2 bg-white border-b flex justify-end">
                <button
                    onClick={() =>
                        downloadStudentsExcel(
                            year ? { academic_year: year } : {},
                            `students-bydepartment-${year || "all"}`,
                            toast,
                        )
                    }
                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-1.5 rounded-lg text-xs font-semibold"
                >
                    ⬇ Download All Students ({year || "All Years"})
                </button>
            </div>

            <ReportCard
                title={`Department-wise Report${year ? " — " + year : ""}`}
                subtitle="Click a row to view and download that department's students."
            >
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-100 text-slate-700 text-[11px] uppercase tracking-wide">
                            <th className="text-left px-3 py-2">Department</th>
                            <th className="text-right px-3 py-2">Students</th>
                            <th className="text-right px-3 py-2">
                                Scholarships
                            </th>
                            <th className="text-right px-3 py-2">
                                Total Amount
                            </th>
                            <th className="text-center px-3 py-2 w-48">
                                Students
                            </th>
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
                                <td className="px-3 py-2 text-right tabular-nums">
                                    {g.students}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums">
                                    {g.total_slots}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums font-semibold">
                                    {fmt(g.total_amount)}
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
                                        View & Download →
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-purple-900 text-white font-bold text-sm">
                            <td className="px-3 py-3 text-right">
                                GRAND TOTAL
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums">
                                {data.groups.reduce(
                                    (s, x) => s + x.students,
                                    0,
                                )}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums">
                                {data.grand_total.slots}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums">
                                {fmt(data.grand_total.amount)}
                            </td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </ReportCard>
        </>
    );
}

// =============================================================
// DONOR-WISE — NEW: view/download students per donor
// =============================================================
function DonorView({ year, onViewStudents }) {
    const toast = useToast();
    const { data, isLoading } = useQuery({
        queryKey: ["report-donor", year],
        queryFn: () => fetchReportDonorWise(year || undefined),
    });

    if (isLoading) return <Loading />;
    if (!data?.groups?.length) return <Empty message="No records." />;

    return (
        <>
            <div className="px-5 py-2 bg-white border-b flex justify-end">
                <button
                    onClick={() =>
                        downloadStudentsExcel(
                            year ? { academic_year: year } : {},
                            `students-bydonor-${year || "all"}`,
                            toast,
                        )
                    }
                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-1.5 rounded-lg text-xs font-semibold"
                >
                    ⬇ Download All Students ({year || "All Years"})
                </button>
            </div>

            <ReportCard
                title={`Donor-wise Report${year ? " — " + year : ""}`}
                subtitle="Click a row to view and download that donor's students."
            >
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-100 text-slate-700 text-[11px] uppercase tracking-wide">
                            <th className="text-left px-3 py-2">Donor</th>
                            <th className="text-left px-3 py-2">Schemes</th>
                            <th className="text-right px-3 py-2">Students</th>
                            <th className="text-right px-3 py-2">
                                Scholarships
                            </th>
                            <th className="text-right px-3 py-2">
                                Total Amount
                            </th>
                            <th className="text-center px-3 py-2 w-48">
                                Students
                            </th>
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
                                <td className="px-3 py-2 text-right tabular-nums">
                                    {g.students}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums">
                                    {g.total_slots}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums font-semibold">
                                    {fmt(g.total_amount)}
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
                                        View & Download →
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-purple-900 text-white font-bold text-sm">
                            <td colSpan={2} className="px-3 py-3 text-right">
                                GRAND TOTAL
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums">
                                {data.groups.reduce(
                                    (s, x) => s + x.students,
                                    0,
                                )}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums">
                                {data.grand_total.slots}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums">
                                {fmt(data.grand_total.amount)}
                            </td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </ReportCard>
        </>
    );
}

// =============================================================
// ALL STUDENTS (DETAILED) — unchanged
// =============================================================
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
            safeFilename(`students-all-detailed-${year || "all"}.xlsx`),
            [{ name: "Students", headers, rows }],
        );
        toast.success(`${data.data.length} students downloaded`);
    };

    return (
        <>
            <div className="px-5 py-2 bg-white border-b flex justify-between items-center flex-wrap gap-2">
                <p className="text-xs text-slate-500">
                    {data.data.length} record(s) · PKR{" "}
                    {fmt(data.grand_total.amount)}
                    {year && (
                        <span className="ml-2 text-purple-700 font-semibold">
                            · {year}
                        </span>
                    )}
                </p>
                <button
                    onClick={exportAll}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-1.5 rounded-lg text-xs font-semibold"
                >
                    ⬇ Export All Students (.xlsx)
                </button>
            </div>

            <ReportCard
                title={`All Students (Detailed)${year ? " — " + year : ""}`}
            >
                <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-slate-700 text-[11px] uppercase tracking-wide sticky top-0">
                        <tr>
                            <th className="text-left px-2 py-2 w-10">S.No</th>
                            <th className="text-left px-2 py-2">Roll No.</th>
                            <th className="text-left px-2 py-2">Name</th>
                            <th className="text-left px-2 py-2">Department</th>
                            <th className="text-left px-2 py-2">Scheme</th>
                            <th className="text-left px-2 py-2">Donor</th>
                            <th className="text-left px-2 py-2">Year</th>
                            <th className="text-right px-2 py-2">Amount</th>
                            <th className="text-left px-2 py-2">Cheque</th>
                            <th className="text-left px-2 py-2">Dated</th>
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
                                    {r.department || "—"}
                                </td>
                                <td className="px-2 py-2 text-xs">
                                    {r.scheme}
                                </td>
                                <td className="px-2 py-2 text-xs">{r.donor}</td>
                                <td className="px-2 py-2 text-xs">
                                    {r.academic_year}
                                </td>
                                <td className="px-2 py-2 text-right tabular-nums">
                                    {fmt(r.approved_amount)}
                                </td>
                                <td className="px-2 py-2 font-mono text-xs">
                                    {r.cheque_no || "—"}
                                </td>
                                <td className="px-2 py-2 text-xs">
                                    {r.received_date || "—"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-purple-900 text-white font-bold sticky bottom-0">
                            <td colSpan={7} className="px-2 py-2 text-right">
                                TOTAL
                            </td>
                            <td className="px-2 py-2 text-right tabular-nums">
                                {fmt(data.grand_total.amount)}
                            </td>
                            <td colSpan={2}></td>
                        </tr>
                    </tfoot>
                </table>
            </ReportCard>
        </>
    );
}

// =============================================================
// SHARED
// =============================================================
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
