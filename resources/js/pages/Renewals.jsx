import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    fetchRenewals,
    updateRenewalStatus,
    bulkRenewalStatus,
} from "../services/scholarships";
import StatusBadge from "../components/StatusBadge";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmContext";

const fmt = (n) => new Intl.NumberFormat("en-PK").format(Number(n) || 0);

const STATUS_TONE = {
    due: "border-l-amber-500",
    submitted: "border-l-blue-500",
    approved: "border-l-emerald-600",
    rejected: "border-l-red-600",
    not_due: "border-l-slate-400",
};

const KPI_DATA = [
    { key: "due", label: "Awaiting Student", accent: "amber", icon: "⏳" },
    {
        key: "submitted",
        label: "Awaiting Committee",
        accent: "blue",
        icon: "📨",
    },
    { key: "approved", label: "Approved", accent: "emerald", icon: "✓" },
    { key: "rejected", label: "Rejected", accent: "rose", icon: "✕" },
];

export default function Renewals() {
    const toast = useToast();
    const confirm = useConfirm();
    const qc = useQueryClient();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [selected, setSelected] = useState(new Set());

    const { data, isLoading } = useQuery({
        queryKey: ["renewals", { search, statusFilter }],
        queryFn: () => fetchRenewals({ search, status: statusFilter }),
    });

    const advance = useMutation({
        mutationFn: ({ id, status, note }) =>
            updateRenewalStatus(id, status, note),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["renewals"] });
            qc.invalidateQueries({ queryKey: ["dashboard"] });
            toast.success("Renewal updated");
        },
        onError: (e) =>
            toast.error(e?.response?.data?.message ?? "Update failed"),
    });

    const bulk = useMutation({
        mutationFn: ({ ids, status }) => bulkRenewalStatus(ids, status),
        onSuccess: (res) => {
            qc.invalidateQueries({ queryKey: ["renewals"] });
            qc.invalidateQueries({ queryKey: ["dashboard"] });
            setSelected(new Set());
            toast.success(`Updated ${res.updated} records`);
        },
        onError: (e) =>
            toast.error(e?.response?.data?.message ?? "Bulk update failed"),
    });

    const toggleSelect = (id) =>
        setSelected((prev) => {
            const n = new Set(prev);
            n.has(id) ? n.delete(id) : n.add(id);
            return n;
        });

    const toggleAll = () => {
        if (!data?.data) return;
        if (selected.size === data.data.length) setSelected(new Set());
        else setSelected(new Set(data.data.map((r) => r.id)));
    };

    const doBulk = async (status) => {
        if (!selected.size) return;
        const ok = await confirm({
            title: `Mark ${selected.size} renewal(s) as ${status}?`,
            message: "This updates all selected records at once.",
            confirmLabel: "Yes, update",
            danger: status === "rejected",
        });
        if (ok) bulk.mutate({ ids: [...selected], status });
    };

    const advanceOne = async (row, nextStatus) => {
        let note = "";
        if (nextStatus === "rejected") {
            note = prompt("Reason for rejection (required):") || "";
            if (!note.trim()) {
                toast.error("Rejection reason is required");
                return;
            }
        }
        advance.mutate({ id: row.id, status: nextStatus, note });
    };

    const counts = data?.counts ?? {
        due: 0,
        submitted: 0,
        approved: 0,
        rejected: 0,
    };
    const allSelected =
        (data?.data?.length ?? 0) > 0 && selected.size === data.data.length;

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    Renewal Workflow
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    Review, approve, or reject student renewal applications
                </p>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {KPI_DATA.map((k) => {
                    const accent = k.accent;
                    const toneMap = {
                        amber: {
                            bg: "from-amber-50 to-white",
                            border: "border-amber-200",
                            text: "text-amber-900",
                        },
                        blue: {
                            bg: "from-blue-50 to-white",
                            border: "border-blue-200",
                            text: "text-blue-900",
                        },
                        emerald: {
                            bg: "from-emerald-50 to-white",
                            border: "border-emerald-200",
                            text: "text-emerald-900",
                        },
                        rose: {
                            bg: "from-rose-50 to-white",
                            border: "border-rose-200",
                            text: "text-rose-900",
                        },
                    };
                    const t = toneMap[accent];
                    const active = statusFilter === k.key;
                    return (
                        <button
                            key={k.key}
                            onClick={() => setStatusFilter(active ? "" : k.key)}
                            className={`bg-gradient-to-br ${t.bg} border ${t.border} rounded-xl p-4 text-left hover:shadow-md transition-all ${active ? "ring-2 ring-purple-500" : ""}`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xl">{k.icon}</span>
                                <p
                                    className={`text-2xl font-extrabold ${t.text} tabular-nums`}
                                >
                                    {counts[k.key] ?? 0}
                                </p>
                            </div>
                            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                                {k.label}
                            </p>
                            {active && (
                                <p className="text-[10px] text-purple-700 font-bold mt-1">
                                    Filtered →
                                </p>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Bulk actions */}
            {selected.size > 0 && (
                <div className="bg-gradient-to-r from-purple-700 to-purple-600 text-white rounded-xl shadow-lg px-4 py-3 flex flex-wrap items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-white/20 grid place-items-center text-xs font-extrabold">
                        {selected.size}
                    </span>
                    <span className="text-sm font-bold">
                        {selected.size === 1 ? "record" : "records"} selected
                    </span>
                    <div className="flex-1"></div>
                    <button
                        onClick={() => doBulk("submitted")}
                        className="bg-white/15 hover:bg-white/25 border border-white/30 text-white rounded-lg px-3 py-1.5 text-xs font-bold"
                    >
                        Mark Submitted
                    </button>
                    <button
                        onClick={() => doBulk("approved")}
                        className="bg-white/15 hover:bg-white/25 border border-white/30 text-white rounded-lg px-3 py-1.5 text-xs font-bold"
                    >
                        Approve
                    </button>
                    <button
                        onClick={() => doBulk("rejected")}
                        className="bg-rose-500 hover:bg-rose-600 text-white rounded-lg px-3 py-1.5 text-xs font-bold"
                    >
                        Reject
                    </button>
                    <button
                        onClick={() => setSelected(new Set())}
                        className="text-xs text-white/70 hover:text-white underline"
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* Filters + Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 flex flex-wrap items-center gap-2 border-b border-slate-100">
                    <input
                        type="search"
                        placeholder="Search student, CNIC, scheme, donor…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 min-w-[220px] border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/15"
                    />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                    >
                        <option value="">All statuses</option>
                        <option value="due">Due only</option>
                        <option value="submitted">Submitted only</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="not_due">Not due</option>
                    </select>
                </div>

                {isLoading ? (
                    <div className="p-8 text-center text-sm text-slate-500">
                        Loading…
                    </div>
                ) : !data?.data?.length ? (
                    <div className="py-16 text-center">
                        <div className="w-16 h-16 mx-auto rounded-full bg-slate-50 grid place-items-center text-3xl mb-4">
                            ✓
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">
                            No renewals match filters
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                            All caught up — or try clearing the filters.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase tracking-wider">
                                <tr>
                                    <th className="px-3 py-2.5 w-10">
                                        <input
                                            type="checkbox"
                                            checked={allSelected}
                                            onChange={toggleAll}
                                            className="w-4 h-4 rounded border-slate-300 text-purple-600"
                                        />
                                    </th>
                                    {[
                                        "Student",
                                        "Roll",
                                        "Scheme",
                                        "Year",
                                        "Donor",
                                        "Approved",
                                        "Status",
                                        "Actions",
                                    ].map((h) => (
                                        <th
                                            key={h}
                                            className="text-left px-4 py-2.5"
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.data.map((r) => (
                                    <tr
                                        key={r.id}
                                        className={`border-t border-slate-100 border-l-4 ${STATUS_TONE[r.renewal_status]} hover:bg-slate-50/70`}
                                    >
                                        <td className="px-3 py-2.5">
                                            <input
                                                type="checkbox"
                                                checked={selected.has(r.id)}
                                                onChange={() =>
                                                    toggleSelect(r.id)
                                                }
                                                className="w-4 h-4 rounded border-slate-300 text-purple-600"
                                            />
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="font-semibold text-slate-800">
                                                {r.student_name}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5 font-mono text-xs text-slate-600">
                                            {r.student_id}
                                        </td>
                                        <td className="px-4 py-2.5 text-xs">
                                            {r.scheme}
                                        </td>
                                        <td className="px-4 py-2.5 text-xs text-slate-600">
                                            {r.academic_year}
                                        </td>
                                        <td className="px-4 py-2.5 text-xs text-slate-600">
                                            {r.donor}
                                        </td>
                                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold">
                                            {fmt(r.approved_amount)}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <StatusBadge
                                                kind="renewal"
                                                value={r.renewal_status}
                                            />
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex gap-1 flex-wrap">
                                                {r.renewal_status === "due" && (
                                                    <button
                                                        onClick={() =>
                                                            advanceOne(
                                                                r,
                                                                "submitted",
                                                            )
                                                        }
                                                        className="text-xs font-bold text-blue-700 hover:bg-blue-50 px-2 py-1 rounded"
                                                    >
                                                        Submit
                                                    </button>
                                                )}
                                                {r.renewal_status ===
                                                    "submitted" && (
                                                    <>
                                                        <button
                                                            onClick={() =>
                                                                advanceOne(
                                                                    r,
                                                                    "approved",
                                                                )
                                                            }
                                                            className="text-xs font-bold text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                advanceOne(
                                                                    r,
                                                                    "rejected",
                                                                )
                                                            }
                                                            className="text-xs font-bold text-rose-700 hover:bg-rose-50 px-2 py-1 rounded"
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                                {(r.renewal_status ===
                                                    "approved" ||
                                                    r.renewal_status ===
                                                        "rejected") && (
                                                    <button
                                                        onClick={() =>
                                                            advanceOne(r, "due")
                                                        }
                                                        className="text-xs font-bold text-slate-600 hover:bg-slate-100 px-2 py-1 rounded"
                                                    >
                                                        Reopen
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
