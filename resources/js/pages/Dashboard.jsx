import { useQuery } from "@tanstack/react-query";
import { fetchDashboard } from "../services/scholarships";
import { LineChart, DonutChart, HorizontalBars } from "../components/Charts";

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

export default function Dashboard() {
    const { data, isLoading, error } = useQuery({
        queryKey: ["dashboard"],
        queryFn: fetchDashboard,
    });

    if (isLoading) return <Loading />;
    if (error)
        return <p className="text-rose-600">Failed to load dashboard.</p>;

    const fy = data.current_fiscal_year;
    const prevFy = data.previous_fiscal_year;
    const fyStart = data.fiscal_year_start;
    const fyEnd = data.fiscal_year_end;

    // ── FY section — approval + outstanding (by scholarship tag) ──
    const fyCards = [
        {
            label: `${fy} Approved`,
            value: "PKR " + fmt(data.fy_approved ?? 0),
            sub: `${data.fy_records ?? 0} records`,
            accent: "from-purple-600 to-purple-800",
            icon: "💰",
        },
        {
            label: `${fy} Outstanding`,
            value: "PKR " + fmt(data.fy_pending ?? 0),
            sub: "Pending installments",
            accent: "from-amber-500 to-orange-600",
            icon: "⏳",
        },
        {
            label: `${fy} Renewals`,
            value: data.fy_renewals_due ?? 0,
            sub: "Due or submitted",
            accent: "from-rose-500 to-red-600",
            icon: "🔄",
        },
        {
            label: `${fy} Flags`,
            value: data.fy_duplicate_flags ?? 0,
            sub: "Duplicate aid pending",
            accent:
                (data.fy_duplicate_flags ?? 0)
                    ? "from-red-500 to-rose-700"
                    : "from-emerald-500 to-teal-600",
            icon: "🚩",
        },
    ];

    // ── All-time overview — cash-in replaces "received this month" ──
    const globalCards = [
        {
            label: "Total Approved",
            value: "PKR " + fmt(data.total_approved),
            sub: "All schemes · all years",
            accent: "from-indigo-600 to-purple-700",
            icon: "📚",
        },
        {
            label: "Total Records",
            value: fmt(data.total_records ?? 0),
            sub: "Scholarship entries",
            accent: "from-violet-500 to-purple-600",
            icon: "📊",
        },
        {
            label: "Beneficiaries",
            value: fmt(data.beneficiaries),
            sub: "Unique students",
            accent: "from-fuchsia-600 to-purple-700",
            icon: "👥",
        },
        {
            label: "Disbursed",
            value: "PKR " + fmt(data.total_disbursed),
            sub: "All years · paid",
            accent: "from-emerald-600 to-teal-700",
            icon: "💵",
        },
        {
            label: `${fy} Cash In`,
            value: "PKR " + fmt(data.fy_received_by_date ?? 0),
            sub: "Received in this FY",
            accent: "from-emerald-600 to-green-700",
            icon: "📥",
        },
        {
            label: `${prevFy} Cash In`,
            value: "PKR " + fmt(data.previous_fy_received_by_date ?? 0),
            sub: "Received in previous FY",
            accent: "from-slate-500 to-slate-700",
            icon: "📥",
        },
        {
            label: "Pending Payments",
            value: "PKR " + fmt(data.pending_amount),
            sub: "Awaiting release",
            accent: "from-amber-500 to-yellow-600",
            icon: "📌",
        },
        {
            label: "Duplicate Flags",
            value: fmt(data.duplicate_flags),
            sub: "All years · pending",
            accent: data.duplicate_flags
                ? "from-rose-500 to-red-600"
                : "from-emerald-500 to-teal-600",
            icon: "🚩",
        },
        {
            label: "Cheques Missing",
            value: fmt(data.cheques_missing ?? 0),
            sub: "Paid without cheque no.",
            accent:
                (data.cheques_missing ?? 0)
                    ? "from-orange-500 to-amber-600"
                    : "from-emerald-500 to-teal-600",
            icon: "🧾",
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

    return (
        <div className="space-y-6">
            {/* ── Fiscal year banner ── */}
            <div className="bg-gradient-to-r from-purple-900 to-purple-700 text-white rounded-2xl shadow-lg p-5">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="text-3xl">📅</div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] uppercase tracking-widest font-bold opacity-80">
                            Current Fiscal Year
                        </p>
                        <h2 className="text-2xl font-extrabold tracking-tight">
                            {fy}
                        </h2>
                        <p className="text-xs text-white/70 mt-0.5">
                            {new Date(fyStart).toLocaleDateString("en-PK", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                            })}
                            {" → "}
                            {new Date(fyEnd).toLocaleDateString("en-PK", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                            })}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[11px] uppercase tracking-widest font-bold opacity-80">
                            Months
                        </p>
                        <p className="text-xs font-mono mt-1">
                            {(data.fiscal_year_months ?? []).join(" · ")}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Current FY KPI cards ── */}
            <div>
                <h3 className="text-sm font-bold text-purple-900 uppercase tracking-wide mb-2">
                    This Fiscal Year — {fy}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {fyCards.map((c) => (
                        <div
                            key={c.label}
                            className={`bg-gradient-to-br ${c.accent} rounded-2xl p-4 text-white shadow-lg relative overflow-hidden`}
                        >
                            <div className="absolute top-2 right-3 text-3xl opacity-20">
                                {c.icon}
                            </div>
                            <p className="text-[10px] uppercase tracking-widest font-extrabold opacity-90">
                                {c.label}
                            </p>
                            <p className="text-2xl font-extrabold mt-2 tracking-tight">
                                {c.value}
                            </p>
                            <p className="text-[11px] opacity-80 mt-1">
                                {c.sub}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── All-time overview — includes Current + Previous FY Cash In ── */}
            <div>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">
                    Overview — All Time
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {globalCards.map((c) => (
                        <div
                            key={c.label}
                            className={`bg-gradient-to-br ${c.accent} rounded-xl p-3 text-white shadow relative overflow-hidden`}
                        >
                            <div className="absolute top-1 right-2 text-2xl opacity-20">
                                {c.icon}
                            </div>
                            <p className="text-[10px] uppercase tracking-widest font-extrabold opacity-90">
                                {c.label}
                            </p>
                            <p className="text-xl font-extrabold mt-1">
                                {c.value}
                            </p>
                            <p className="text-[10px] opacity-80 mt-0.5">
                                {c.sub}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Year-Wise Summary — with Received-by-Date column ── */}
            <Card
                title="Year-Wise Summary"
                subtitle="Approved by scholarship year; Received by actual installment date (July–June)."
            >
                {(data.by_year ?? []).length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-6">
                        No records yet.
                    </p>
                ) : (
                    <div className="overflow-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wide">
                                <tr>
                                    <th className="text-left px-3 py-2">
                                        Fiscal Year
                                    </th>
                                    <th className="text-right px-3 py-2">
                                        Beneficiaries
                                    </th>
                                    <th className="text-right px-3 py-2">
                                        Records
                                    </th>
                                    <th className="text-right px-3 py-2">
                                        Approved
                                    </th>
                                    <th className="text-right px-3 py-2 text-emerald-700">
                                        Received
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {(data.by_year ?? []).map((y) => (
                                    <tr
                                        key={y.year}
                                        className={`border-t hover:bg-purple-50/40 ${y.is_current ? "bg-purple-50" : ""}`}
                                    >
                                        <td className="px-3 py-2 font-semibold whitespace-nowrap">
                                            {y.year}
                                            {y.is_current && (
                                                <span className="ml-2 text-[9px] font-bold bg-purple-600 text-white px-1.5 py-0.5 rounded-full">
                                                    CURRENT
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums">
                                            {fmt(y.beneficiaries)}
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums">
                                            {fmt(y.records)}
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums font-bold text-purple-800">
                                            {fmt(y.amount)}
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums font-bold text-emerald-700">
                                            {fmt(y.received_by_date ?? 0)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-purple-900 text-white font-bold">
                                    <td className="px-3 py-2 text-right">
                                        TOTAL
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums">
                                        {fmt(totals.beneficiaries)}
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums">
                                        {fmt(totals.records)}
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums">
                                        {fmt(totals.amount)}
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums text-emerald-300">
                                        {fmt(totals.received)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </Card>

            {/* ── Scheme / Donor / Year donut ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card title="Scheme-wise Distribution">
                    <HorizontalBars
                        data={Object.entries(data.by_scheme ?? {})
                            .map(([label, value]) => ({ label, value }))
                            .sort((a, b) => b.value - a.value)
                            .slice(0, 8)}
                    />
                </Card>
                <Card title="Donor-wise Distribution">
                    <HorizontalBars
                        data={Object.entries(data.by_donor ?? {})
                            .map(([label, value]) => ({ label, value }))
                            .sort((a, b) => b.value - a.value)
                            .slice(0, 8)}
                    />
                </Card>
                <Card title="Fiscal Year Donut">
                    {yearSegments.length > 0 ? (
                        <DonutChart segments={yearSegments} />
                    ) : (
                        <p className="text-sm text-slate-500 text-center py-8">
                            No records yet.
                        </p>
                    )}
                </Card>
            </div>

            <Card title="Monthly Received Amount (Last 12 Months)">
                <LineChart data={data.monthly_received ?? []} />
            </Card>

            <Card title="Renewals Due">
                <table className="w-full text-sm">
                    <thead className="text-slate-500 text-[10px] uppercase tracking-wider">
                        <tr>
                            <th className="text-left py-2">Student</th>
                            <th className="text-left py-2">Scheme</th>
                            <th className="text-left py-2">Year</th>
                            <th className="text-right py-2">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(data.renewals ?? []).slice(0, 10).map((r) => (
                            <tr
                                key={r.id}
                                className="border-t border-slate-100 hover:bg-purple-50/40"
                            >
                                <td className="py-2 font-medium truncate max-w-[150px]">
                                    {r.student_name}
                                </td>
                                <td className="py-2 text-slate-600 text-xs">
                                    {r.scheme}
                                </td>
                                <td className="py-2 text-slate-600 text-xs">
                                    {r.academic_year}
                                </td>
                                <td className="py-2 text-right tabular-nums">
                                    {fmt(r.approved_amount)}
                                </td>
                            </tr>
                        ))}
                        {(data.renewals ?? []).length === 0 && (
                            <tr>
                                <td
                                    colSpan={4}
                                    className="py-6 text-center text-slate-500 text-xs"
                                >
                                    No renewals due.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </Card>
        </div>
    );
}

function Card({ title, subtitle, children }) {
    return (
        <section className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-white">
                <h3 className="font-extrabold text-purple-950 text-sm tracking-tight">
                    {title}
                </h3>
                {subtitle && (
                    <p className="text-[11px] text-slate-500 mt-0.5">
                        {subtitle}
                    </p>
                )}
            </div>
            <div className="p-5">{children}</div>
        </section>
    );
}

function Loading() {
    return (
        <div className="flex items-center justify-center py-20">
            <div className="text-center">
                <div className="w-12 h-12 mx-auto rounded-full border-4 border-purple-100 border-t-purple-600 animate-spin"></div>
                <p className="text-sm text-slate-500 mt-4">
                    Loading dashboard…
                </p>
            </div>
        </div>
    );
}
