import { useQuery } from "@tanstack/react-query";
import { fetchDashboard } from "../services/scholarships";

const fmt = (n) =>
    new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(n);

export default function Dashboard() {
    const { data, isLoading, error } = useQuery({
        queryKey: ["dashboard"],
        queryFn: fetchDashboard,
    });

    if (isLoading) return <p className="text-slate-500">Loading dashboard…</p>;
    if (error) return <p className="text-red-600">Failed to load dashboard.</p>;

    const cards = [
        {
            label: "Total Approved",
            value: fmt(data.total_approved),
            sub: "All schemes",
            accent: "border-emerald-600",
        },
        {
            label: "Beneficiaries",
            value: data.beneficiaries,
            sub: "Distinct students",
            accent: "border-blue-600",
        },
        {
            label: "Disbursed",
            value: fmt(data.total_disbursed),
            sub: "Paid records",
            accent: "border-emerald-600",
        },
        {
            label: "Pending",
            value: fmt(data.pending_amount),
            sub: "Awaiting release",
            accent: "border-amber-600",
        },
        {
            label: "Fresh",
            value: data.fresh_count,
            sub: fmt(data.fresh_amount) + " approved",
            accent: "border-blue-600",
        },
        {
            label: "Renewals",
            value: data.renewal_count,
            sub: fmt(data.renewal_amount) + " approved",
            accent: "border-emerald-600",
        },
        {
            label: "Received This Month",
            value: fmt(data.received_this_month ?? 0),
            sub: "From received dates",
            accent: "border-emerald-600",
        },
        {
            label: "Renewals Due",
            value: data.renewals_due,
            sub: "Due or submitted",
            accent: "border-blue-600",
        },
        {
            label: "Duplicate Flags",
            value: data.duplicate_flags,
            sub: "Awaiting committee",
            accent: data.duplicate_flags
                ? "border-red-600"
                : "border-emerald-600",
        },
        {
            label: "Cheques Missing",
            value: data.cheques_missing ?? 0,
            sub: "Paid but no cheque no.",
            accent:
                (data.cheques_missing ?? 0)
                    ? "border-amber-600"
                    : "border-emerald-600",
        },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {cards.map((c) => (
                    <div
                        key={c.label}
                        className={`bg-white rounded-xl border border-slate-200 shadow-sm p-4 border-l-4 ${c.accent}`}
                    >
                        <p className="text-[11px] uppercase tracking-wide text-slate-500 font-bold">
                            {c.label}
                        </p>
                        <p className="text-2xl font-bold mt-1">{c.value}</p>
                        <p className="text-xs text-slate-500 mt-1">{c.sub}</p>
                    </div>
                ))}
            </div>

            <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="font-semibold mb-3">Scheme-wise Distribution</h3>
                <BarList data={data.by_scheme} />
            </section>

            <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="font-semibold mb-3">Donor-wise Distribution</h3>
                <BarList data={data.by_donor} />
            </section>

            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b">
                    <h3 className="font-semibold">Renewals Due</h3>
                </div>
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
                        <tr>
                            {[
                                "Student ID",
                                "Student",
                                "Scheme",
                                "Year",
                                "Status",
                                "Approved",
                            ].map((h) => (
                                <th key={h} className="text-left px-4 py-2">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.renewals.length === 0 && (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="p-6 text-center text-slate-500"
                                >
                                    No renewals due.
                                </td>
                            </tr>
                        )}
                        {data.renewals.map((r) => (
                            <tr key={r.id} className="border-t">
                                <td className="px-4 py-2 font-mono">
                                    {r.student_id}
                                </td>
                                <td className="px-4 py-2">{r.student_name}</td>
                                <td className="px-4 py-2">{r.scheme}</td>
                                <td className="px-4 py-2">{r.academic_year}</td>
                                <td className="px-4 py-2">
                                    {r.renewal_status}
                                </td>
                                <td className="px-4 py-2 text-right tabular-nums">
                                    {fmt(r.approved_amount)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
        </div>
    );
}

function BarList({ data }) {
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return <p className="text-slate-500">No data yet.</p>;
    const max = Math.max(...entries.map((e) => e[1])) || 1;

    return (
        <div className="space-y-2">
            {entries.map(([label, value]) => (
                <div
                    key={label}
                    className="grid grid-cols-[200px_1fr_130px] gap-3 items-center text-sm"
                >
                    <span className="font-medium truncate">{label}</span>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-emerald-700 to-emerald-500"
                            style={{ width: `${(value / max) * 100}%` }}
                        />
                    </div>
                    <span className="text-right tabular-nums">
                        {fmt(value)}
                    </span>
                </div>
            ))}
        </div>
    );
}
