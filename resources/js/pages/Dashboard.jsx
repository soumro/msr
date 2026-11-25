import { useQuery } from "@tanstack/react-query";
import { fetchDashboard } from "../services/scholarships";
import { LineChart, DonutChart, HorizontalBars } from "../components/Charts";
import StatusBadge from "../components/StatusBadge";

const fmt = (n) =>
    new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(
        Number(n) || 0,
    );

const YEAR_PALETTE = [
    "#7c3aed",
    "#f59e0b",
    "#10b981",
    "#3b82f6",
    "#ec4899",
    "#8b5cf6",
    "#14b8a6",
    "#f97316",
];

const ACCENT_BORDER = {
    purple: "border-l-purple-500",
    indigo: "border-l-indigo-500",
    violet: "border-l-violet-500",
    emerald: "border-l-emerald-500",
    amber: "border-l-amber-500",
    rose: "border-l-rose-500",
    slate: "border-l-slate-400",
};

export default function Dashboard() {
    const { data, isLoading, error } = useQuery({
        queryKey: ["dashboard"],
        queryFn: fetchDashboard,
    });

    if (isLoading) return <DashboardSkeleton />;
    if (error) return <ErrorState />;

    const fy = data.current_fiscal_year;
    const prevFy = data.previous_fiscal_year;
    const fyStart = data.fiscal_year_start;
    const fyEnd = data.fiscal_year_end;

    const startD = new Date(fyStart);
    const endD = new Date(fyEnd);
    const nowD = new Date();
    const totalDays = Math.max(1, Math.ceil((endD - startD) / 86400000));
    const elapsedDays = Math.max(0, Math.ceil((nowD - startD) / 86400000));
    const remainingDays = Math.max(0, totalDays - elapsedDays);
    const fyProgress = Math.min(100, (elapsedDays / totalDays) * 100);

    const fyCards = [
        {
            label: "Approved",
            value: "PKR " + fmt(data.fy_approved ?? 0),
            sub: (data.fy_records ?? 0) + " scholarship records",
            accent: "from-purple-600 to-purple-800",
            icon: "💰",
        },
        {
            label: "Outstanding",
            value: "PKR " + fmt(data.fy_pending ?? 0),
            sub: "Awaiting installment release",
            accent: "from-amber-500 to-orange-600",
            icon: "⏳",
        },
        {
            label: "Cash In",
            value: "PKR " + fmt(data.fy_received ?? 0),
            sub: "Installments received this FY",
            accent: "from-emerald-600 to-teal-700",
            icon: "📥",
        },
        {
            label: "Renewals",
            value: data.fy_renewals_due ?? 0,
            sub: "Due or submitted",
            accent: "from-rose-500 to-red-600",
            icon: "🔄",
        },
    ];

    const globalCards = [
        {
            label: "Total Approved",
            value: "PKR " + fmt(data.total_approved),
            sub: "All years · all schemes",
            icon: "📚",
            color: "purple",
        },
        {
            label: "Beneficiaries",
            value: fmt(data.beneficiaries),
            sub: "Unique students",
            icon: "👥",
            color: "indigo",
        },
        {
            label: "Total Records",
            value: fmt(data.total_records ?? 0),
            sub: "Scholarship entries",
            icon: "📊",
            color: "violet",
        },
        {
            label: "Disbursed",
            value: "PKR " + fmt(data.total_disbursed),
            sub: "Fully paid records",
            icon: "💵",
            color: "emerald",
        },
        {
            label: "Pending",
            value: "PKR " + fmt(data.pending_amount),
            sub: "Awaiting release",
            icon: "📌",
            color: "amber",
        },
        {
            label: `${prevFy || "Prev"} Cash In`,
            value: "PKR " + fmt(data.previous_fy_received_by_date ?? 0),
            sub: "Previous fiscal year",
            icon: "📥",
            color: "slate",
        },
        {
            label: "Duplicate Flags",
            value: fmt(data.duplicate_flags),
            sub: "Pending review",
            icon: "🚩",
            color: data.duplicate_flags > 0 ? "rose" : "emerald",
        },
        {
            label: "Cheques Missing",
            value: fmt(data.cheques_missing ?? 0),
            sub: "Paid · no cheque number",
            icon: "🧾",
            color: (data.cheques_missing ?? 0) > 0 ? "amber" : "emerald",
        },
    ];

    const yearSegments = (data.by_year ?? []).map((y, i) => ({
        label: y.year,
        value: y.amount,
        color: YEAR_PALETTE[i % YEAR_PALETTE.length],
    }));

    const totals = (data.by_year ?? []).reduce(
        (s, y) => ({
            beneficiaries: s.beneficiaries + y.beneficiaries,
            records: s.records + y.records,
            amount: s.amount + y.amount,
            received: s.received + (y.received_by_date ?? 0),
        }),
        { beneficiaries: 0, records: 0, amount: 0, received: 0 },
    );

    const maxYearAmount = Math.max(
        1,
        ...(data.by_year ?? []).map((y) => y.amount),
    );

    return (
        <div className="space-y-6">
            {/* ============== SECTION 1: FY BANNER ============== */}
            <div className="relative bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 text-white rounded-2xl shadow-xl overflow-hidden">
                <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/5 rounded-full pointer-events-none" />
                <div className="absolute -bottom-32 -left-24 w-80 h-80 bg-white/5 rounded-full pointer-events-none" />

                <div className="relative px-6 py-6">
                    <div className="flex flex-wrap items-start gap-6">
                        <div className="flex-1 min-w-[280px]">
                            <span className="inline-block text-[10px] uppercase tracking-widest font-extrabold bg-white/15 px-2.5 py-1 rounded-full mb-2">
                                Current Fiscal Year
                            </span>
                            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                                {fy}
                            </h1>
                            <p className="text-sm text-white/70 mt-1.5">
                                {new Date(fyStart).toLocaleDateString("en-PK", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                })}
                                <span className="mx-2 text-white/40">→</span>
                                {new Date(fyEnd).toLocaleDateString("en-PK", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                })}
                            </p>
                        </div>
                        <div className="flex gap-8">
                            <div>
                                <p className="text-[10px] uppercase tracking-widest font-bold text-white/60 mb-1">
                                    Elapsed
                                </p>
                                <p className="text-2xl font-extrabold tabular-nums">
                                    {elapsedDays}
                                    <span className="text-xs font-normal text-white/50 ml-1">
                                        days
                                    </span>
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-widest font-bold text-white/60 mb-1">
                                    Remaining
                                </p>
                                <p className="text-2xl font-extrabold text-amber-300 tabular-nums">
                                    {remainingDays}
                                    <span className="text-xs font-normal text-white/50 ml-1">
                                        days
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6">
                        <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold text-white/70 mb-1.5">
                            <span>FY Progress</span>
                            <span>{fyProgress.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-amber-300 to-amber-500 rounded-full transition-all"
                                style={{ width: `${fyProgress}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ============== SECTION 2: FY KPIs ============== */}
            <div>
                <SectionHeader
                    title={`This Fiscal Year — ${fy}`}
                    subtitle="Metrics specific to the current period"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {fyCards.map((c) => (
                        <div
                            key={c.label}
                            className={`relative bg-gradient-to-br ${c.accent} rounded-2xl p-5 text-white shadow-lg hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-200 overflow-hidden`}
                        >
                            <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full pointer-events-none" />
                            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-white/5 rounded-full pointer-events-none" />
                            <div className="relative">
                                <div className="text-3xl mb-3">{c.icon}</div>
                                <p className="text-[10px] uppercase tracking-widest font-extrabold opacity-90">
                                    {c.label}
                                </p>
                                <p className="text-2xl font-extrabold mt-1 tracking-tight tabular-nums">
                                    {c.value}
                                </p>
                                <p className="text-[11px] opacity-80 mt-1">
                                    {c.sub}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ============== SECTION 3: OVERVIEW ============== */}
            <div>
                <SectionHeader
                    title="Overview"
                    subtitle="All-time totals across every scheme and academic year"
                />
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {globalCards.map((c) => (
                        <div
                            key={c.label}
                            className={`bg-white rounded-xl border border-slate-200 border-l-4 ${ACCENT_BORDER[c.color]} p-4 hover:shadow-md transition-shadow relative overflow-hidden`}
                        >
                            <div className="absolute -top-2 -right-2 text-5xl opacity-[0.05] select-none pointer-events-none">
                                {c.icon}
                            </div>
                            <div className="relative">
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <span className="text-[13px]">
                                        {c.icon}
                                    </span>
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                                        {c.label}
                                    </p>
                                </div>
                                <p className="text-lg sm:text-xl font-extrabold text-slate-800 tabular-nums leading-tight">
                                    {c.value}
                                </p>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                    {c.sub}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ============== SECTION 4: YEAR-WISE TABLE ============== */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                    <div>
                        <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">
                            Year-Wise Summary
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                            Approved by scholarship year · Received by
                            installment date (July–June)
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">
                            Cycles
                        </p>
                        <p className="text-xl font-extrabold text-slate-800">
                            {(data.by_year ?? []).length}
                        </p>
                    </div>
                </div>

                {(data.by_year ?? []).length === 0 ? (
                    <EmptyState
                        icon="📊"
                        title="No scholarship records yet"
                        message="Add or import scholarships to see year-wise summaries here."
                    />
                ) : (
                    <div className="overflow-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase tracking-wider">
                                <tr>
                                    <th className="text-left px-5 py-3">
                                        Fiscal Year
                                    </th>
                                    <th className="text-right px-5 py-3">
                                        Students
                                    </th>
                                    <th className="text-right px-5 py-3">
                                        Records
                                    </th>
                                    <th className="text-right px-5 py-3 w-1/3">
                                        Approved
                                    </th>
                                    <th className="text-right px-5 py-3">
                                        Received
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {(data.by_year ?? []).map((y) => {
                                    const barPct =
                                        (y.amount / maxYearAmount) * 100;
                                    return (
                                        <tr
                                            key={y.year}
                                            className={`border-t border-slate-100 transition-colors ${y.is_current ? "bg-purple-50/50" : "hover:bg-slate-50/60"}`}
                                        >
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-slate-800">
                                                        {y.year}
                                                    </span>
                                                    {y.is_current && (
                                                        <span className="text-[9px] font-bold bg-purple-600 text-white px-1.5 py-0.5 rounded-full">
                                                            CURRENT
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-right tabular-nums text-slate-700">
                                                {fmt(y.beneficiaries)}
                                            </td>
                                            <td className="px-5 py-3 text-right tabular-nums text-slate-700">
                                                {fmt(y.records)}
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center justify-end gap-3">
                                                    <div className="flex-1 max-w-[200px] h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-purple-500 to-purple-700 rounded-full"
                                                            style={{
                                                                width: `${barPct}%`,
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-sm font-bold text-purple-800 tabular-nums whitespace-nowrap min-w-[90px] text-right">
                                                        {fmt(y.amount)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-right tabular-nums font-semibold text-emerald-700">
                                                {fmt(y.received_by_date ?? 0)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="bg-gradient-to-r from-purple-900 to-purple-800 text-white font-bold">
                                    <td
                                        className="px-5 py-3.5 text-right"
                                        colSpan={3}
                                    >
                                        TOTAL
                                    </td>
                                    <td className="px-5 py-3.5 text-right tabular-nums">
                                        {fmt(totals.amount)}
                                    </td>
                                    <td className="px-5 py-3.5 text-right tabular-nums text-emerald-300">
                                        {fmt(totals.received)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {/* ============== SECTION 5: DISTRIBUTION ============== */}
            <div>
                <SectionHeader
                    title="Distribution"
                    subtitle="Where the money comes from and when"
                />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <Card
                        title="By Scheme"
                        subtitle={`${Object.keys(data.by_scheme ?? {}).length} active schemes`}
                    >
                        <HorizontalBars
                            data={Object.entries(data.by_scheme ?? {})
                                .map(([label, value]) => ({ label, value }))
                                .sort((a, b) => b.value - a.value)
                                .slice(0, 8)}
                            color="purple"
                        />
                    </Card>
                    <Card
                        title="By Donor"
                        subtitle={`${Object.keys(data.by_donor ?? {}).length} active donors`}
                    >
                        <HorizontalBars
                            data={Object.entries(data.by_donor ?? {})
                                .map(([label, value]) => ({ label, value }))
                                .sort((a, b) => b.value - a.value)
                                .slice(0, 8)}
                            color="amber"
                        />
                    </Card>
                    <Card
                        title="Fiscal Year Split"
                        subtitle="Approved amount per FY"
                    >
                        {yearSegments.length > 0 ? (
                            <DonutChart segments={yearSegments} />
                        ) : (
                            <EmptyState
                                small
                                icon="🍩"
                                title="No data"
                                message="Import scholarships first."
                            />
                        )}
                    </Card>
                </div>
            </div>

            {/* ============== SECTION 6: MONTHLY TREND ============== */}
            <Card
                title="Monthly Received Amount"
                subtitle="Rolling 12-month cash inflow from installments"
            >
                <LineChart data={data.monthly_received ?? []} />
            </Card>

            {/* ============== SECTION 7: RENEWALS ============== */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                    <div>
                        <h3 className="font-extrabold text-slate-900 text-sm tracking-tight flex items-center gap-2">
                            Renewals Due
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                                {(data.renewals ?? []).length}
                            </span>
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                            Students awaiting renewal approval or payment
                        </p>
                    </div>
                </div>

                {(data.renewals ?? []).length === 0 ? (
                    <EmptyState
                        icon="✓"
                        title="All caught up"
                        message="No renewals currently pending."
                        tone="green"
                    />
                ) : (
                    <div className="overflow-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase tracking-wider">
                                <tr>
                                    <th className="text-left px-5 py-2.5">
                                        Student
                                    </th>
                                    <th className="text-left px-5 py-2.5">
                                        Scheme
                                    </th>
                                    <th className="text-left px-5 py-2.5">
                                        Year
                                    </th>
                                    <th className="text-left px-5 py-2.5">
                                        Status
                                    </th>
                                    <th className="text-right px-5 py-2.5">
                                        Amount
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {(data.renewals ?? []).slice(0, 10).map((r) => (
                                    <tr
                                        key={r.id}
                                        className="border-t border-slate-100 hover:bg-slate-50/60"
                                    >
                                        <td className="px-5 py-2.5">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-800 truncate max-w-[200px]">
                                                    {r.student_name}
                                                </span>
                                                <span className="text-[10px] text-slate-500 font-mono">
                                                    {r.student_id}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-2.5 text-xs text-slate-700">
                                            {r.scheme}
                                        </td>
                                        <td className="px-5 py-2.5 text-xs text-slate-600">
                                            {r.academic_year}
                                        </td>
                                        <td className="px-5 py-2.5">
                                            <StatusBadge
                                                kind="renewal"
                                                value={r.renewal_status}
                                            />
                                        </td>
                                        <td className="px-5 py-2.5 text-right tabular-nums font-semibold text-slate-800">
                                            {fmt(r.approved_amount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {(data.renewals ?? []).length > 10 && (
                            <div className="px-5 py-2.5 text-center text-xs text-slate-500 border-t bg-slate-50">
                                Showing 10 of {data.renewals.length} renewals
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================================
// Shared helpers
// ============================================================

function SectionHeader({ title, subtitle }) {
    return (
        <div className="mb-3">
            <h2 className="text-[11px] font-extrabold text-slate-900 uppercase tracking-widest">
                {title}
            </h2>
            {subtitle && (
                <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>
            )}
        </div>
    );
}

function Card({ title, subtitle, children }) {
    return (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100">
                <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">
                    {title}
                </h3>
                {subtitle && (
                    <p className="text-[11px] text-slate-500 mt-0.5">
                        {subtitle}
                    </p>
                )}
            </div>
            <div className="p-4">{children}</div>
        </section>
    );
}

function EmptyState({ icon, title, message, tone = "gray", small = false }) {
    const toneCls =
        tone === "green"
            ? "text-emerald-600 bg-emerald-50"
            : "text-slate-400 bg-slate-50";
    const sizeCls = small ? "w-10 h-10 text-xl" : "w-14 h-14 text-2xl";
    const padCls = small ? "py-6" : "py-12";

    return (
        <div className={`${padCls} text-center px-6`}>
            <div
                className={`${sizeCls} mx-auto rounded-full ${toneCls} grid place-items-center mb-3`}
            >
                {icon}
            </div>
            <p className="text-sm font-semibold text-slate-700">{title}</p>
            <p className="text-[11px] text-slate-500 mt-1">{message}</p>
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="h-48 bg-slate-200 rounded-2xl" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-36 bg-slate-200 rounded-2xl" />
                ))}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="h-24 bg-slate-200 rounded-xl" />
                ))}
            </div>
            <div className="h-64 bg-slate-200 rounded-2xl" />
        </div>
    );
}

function ErrorState() {
    return (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-10 text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <p className="font-semibold text-rose-800">
                Could not load dashboard
            </p>
            <p className="text-xs text-rose-600 mt-1">
                Check the browser console or refresh the page.
            </p>
        </div>
    );
}
