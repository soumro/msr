import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchYearEndReport } from "../services/scholarships";
import { useToast } from "../context/ToastContext";

const fmt = (n) =>
    new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(n);

export default function YearEndReport() {
    const toast = useToast();
    const [year, setYear] = useState("");
    const { data, isLoading } = useQuery({
        queryKey: ["report-year-end", year],
        queryFn: () => fetchYearEndReport(year || undefined),
    });

    useEffect(() => {
        if (data?.academic_year && !year) setYear(data.academic_year);
    }, [data, year]);

    const exportCsv = () => {
        if (!data) return;
        const lines = [];
        lines.push(`Year-End Summary,${data.academic_year}`, "");
        lines.push(
            "S.No,Name of Donor,Name of Scholarship,Group,Number of Slots,Amount (PKR)",
        );
        let serial = 0;
        data.groups.forEach((g) => {
            g.rows.forEach((r) => {
                serial += 1;
                lines.push(
                    [
                        serial,
                        r.donor,
                        r.scheme,
                        g.funding_group,
                        r.slots,
                        r.amount,
                    ]
                        .map(csvCell)
                        .join(","),
                );
            });
            lines.push(
                [
                    "",
                    "Subtotal",
                    g.funding_group,
                    "",
                    g.subtotal.slots,
                    g.subtotal.amount,
                ].join(","),
            );
            lines.push("");
        });
        lines.push(
            [
                "",
                "GRAND TOTAL",
                "",
                "",
                data.grand_total.slots,
                data.grand_total.amount,
            ].join(","),
        );
        const blob = new Blob(["\uFEFF" + lines.join("\n")], {
            type: "text/csv;charset=utf-8;",
        });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `year-end-summary-${data.academic_year}.csv`;
        a.click();
        toast.success("Report exported");
    };

    if (isLoading) return <p className="text-slate-500">Loading report…</p>;
    if (!data || !data.academic_year) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500">
                No scholarship records yet. Add records on the Master Register
                to see the year-end summary here.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm no-print">
                <div className="px-5 py-4 flex flex-wrap items-center gap-3">
                    <div>
                        <h2 className="font-semibold">
                            Year-End Summary Report
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Grouped by funding source → donor → scheme.
                        </p>
                    </div>
                    <div className="flex-1" />
                    <label className="text-sm font-semibold text-slate-700">
                        Year
                    </label>
                    <select
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                    >
                        {data.years.map((y) => (
                            <option key={y} value={y}>
                                {y}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={exportCsv}
                        className="border border-slate-300 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50"
                    >
                        Export CSV
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                    >
                        Print / PDF
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm print-report">
                <div className="px-6 py-6 border-b">
                    <h1 className="text-xl font-bold text-slate-900">
                        Year-End Scholarship Summary
                    </h1>
                    <p className="text-sm text-slate-600 mt-1">
                        Academic Year: <strong>{data.academic_year}</strong> ·
                        Generated on{" "}
                        {new Date().toLocaleDateString("en-PK", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                        })}
                    </p>
                </div>
                <div className="overflow-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-100 text-slate-700 text-[11px] uppercase tracking-wide">
                                <th className="text-left px-4 py-2 w-14">
                                    S.No
                                </th>
                                <th className="text-left px-4 py-2">
                                    Name of Donor
                                </th>
                                <th className="text-left px-4 py-2">
                                    Name of Scholarship
                                </th>
                                <th className="text-right px-4 py-2 w-28">
                                    Slots
                                </th>
                                <th className="text-right px-4 py-2 w-36">
                                    Amount (PKR)
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.groups.map((g, gi) => {
                                const startSerial = data.groups
                                    .slice(0, gi)
                                    .reduce((s, x) => s + x.rows.length, 0);
                                return (
                                    <GroupBlock
                                        key={g.funding_group}
                                        group={g}
                                        startSerial={startSerial}
                                    />
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="bg-emerald-900 text-white font-bold text-sm">
                                <td
                                    colSpan={3}
                                    className="px-4 py-3 text-right"
                                >
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
                </div>
            </div>

            <style>{`
        @media print {
          .no-print { display: none !important; }
          header, nav { display: none !important; }
          main { padding: 0 !important; max-width: none !important; }
          .print-report { border: none !important; box-shadow: none !important; border-radius: 0 !important; }
          body { background: white !important; }
          @page { margin: 15mm; size: A4; }
        }
      `}</style>
        </div>
    );
}

function GroupBlock({ group, startSerial }) {
    const fmt = (n) => new Intl.NumberFormat("en-PK").format(n);
    return (
        <>
            <tr className="bg-emerald-50 border-t-2 border-emerald-200">
                <td
                    colSpan={5}
                    className="px-4 py-2 font-bold text-emerald-900 text-sm"
                >
                    {group.funding_group}
                </td>
            </tr>
            {group.rows.map((r, i) => (
                <tr
                    key={`${group.funding_group}-${i}`}
                    className="border-t border-slate-100 hover:bg-slate-50"
                >
                    <td className="px-4 py-2 text-slate-500 text-xs">
                        {startSerial + i + 1}
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

function csvCell(v) {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
