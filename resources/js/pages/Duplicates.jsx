import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchDuplicates, reviewDuplicate } from "../services/scholarships";
import StatusBadge from "../components/StatusBadge";

const fmt = (n) => new Intl.NumberFormat("en-PK").format(n);

export default function Duplicates() {
    const qc = useQueryClient();
    const { data, isLoading } = useQuery({
        queryKey: ["duplicates"],
        queryFn: fetchDuplicates,
    });

    const review = useMutation({
        mutationFn: ({ id, status, note }) => reviewDuplicate(id, status, note),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["duplicates"] });
            qc.invalidateQueries({ queryKey: ["dashboard"] });
            qc.invalidateQueries({ queryKey: ["scholarships"] });
        },
    });

    if (isLoading)
        return <p className="text-slate-500">Loading duplicate flags…</p>;

    return (
        <div className="space-y-3">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h2 className="font-semibold">Duplicate-Aid Flags</h2>
                <p className="text-xs text-slate-500 mt-1">
                    Same student (CNIC or Student ID) under more than one scheme
                    in the same academic year.
                </p>
            </div>

            {(!data || data.length === 0) && (
                <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500">
                    No duplicate-aid flags. Every student appears under a single
                    scheme per academic year.
                </div>
            )}

            {data?.map((f) => (
                <div
                    key={f.id}
                    className={`bg-white rounded-xl border border-slate-200 shadow-sm border-l-4 p-5 ${
                        f.review_status === "cleared"
                            ? "border-l-emerald-600"
                            : f.review_status === "confirmed_duplicate"
                              ? "border-l-red-600"
                              : f.review_status === "escalated"
                                ? "border-l-purple-600"
                                : "border-l-amber-500"
                    }`}
                >
                    <div className="flex justify-between items-start flex-wrap gap-2">
                        <div>
                            <p className="font-semibold">
                                {f.person_key} — {f.academic_year}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {f.schemes.length} schemes · Combined PKR{" "}
                                {fmt(f.total_amount)}
                            </p>
                        </div>
                        <StatusBadge kind="duplicate" value={f.review_status} />
                    </div>

                    <div className="mt-3 overflow-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
                                <tr>
                                    <th className="text-left px-3 py-2">
                                        Student ID
                                    </th>
                                    <th className="text-left px-3 py-2">
                                        Scheme
                                    </th>
                                    <th className="text-left px-3 py-2">
                                        Donor
                                    </th>
                                    <th className="text-right px-3 py-2">
                                        Approved
                                    </th>
                                    <th className="text-left px-3 py-2">
                                        Cheque No.
                                    </th>
                                    <th className="text-left px-3 py-2">
                                        Received
                                    </th>
                                    <th className="text-left px-3 py-2">
                                        Payment
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {f.rows.map((r) => (
                                    <tr key={r.id} className="border-t">
                                        <td className="px-3 py-2 font-mono">
                                            {r.student_id}
                                        </td>
                                        <td className="px-3 py-2">
                                            {r.scheme}
                                        </td>
                                        <td className="px-3 py-2">{r.donor}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">
                                            {fmt(r.approved_amount)}
                                        </td>
                                        <td className="px-3 py-2 font-mono text-xs">
                                            {r.cheque_no || "—"}
                                        </td>
                                        <td className="px-3 py-2 text-xs">
                                            {r.received_date || "—"}
                                        </td>
                                        <td className="px-3 py-2">
                                            <StatusBadge
                                                kind="payment"
                                                value={r.payment_status}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {f.committee_note && (
                        <p className="text-xs mt-2 text-slate-600">
                            <strong>Committee note:</strong> {f.committee_note}
                        </p>
                    )}

                    <div className="flex flex-wrap gap-2 mt-3">
                        {[
                            "pending",
                            "cleared",
                            "escalated",
                            "confirmed_duplicate",
                        ].map((st) => (
                            <button
                                key={st}
                                className="text-xs border rounded px-3 py-1.5 hover:bg-slate-50 font-semibold"
                                onClick={() => {
                                    const note =
                                        st !== "pending"
                                            ? (prompt(
                                                  "Committee note (optional):",
                                              ) ?? "")
                                            : "";
                                    review.mutate({
                                        id: f.id,
                                        status: st,
                                        note,
                                    });
                                }}
                            >
                                {st.replace(/_/g, " ")}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
