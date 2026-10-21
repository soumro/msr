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

const fmt = (n) => new Intl.NumberFormat("en-PK").format(n);
const STATUS_TONE = {
    due: "border-l-amber-500",
    submitted: "border-l-blue-500",
    approved: "border-l-emerald-600",
    rejected: "border-l-red-600",
    not_due: "border-l-slate-400",
};

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
            toast.success("Renewal status updated");
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
        setSelected((s) => {
            const n = new Set(s);
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

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {[
                    {
                        key: "due",
                        label: "Awaiting Student",
                        accent: "border-l-amber-500",
                    },
                    {
                        key: "submitted",
                        label: "Awaiting Committee",
                        accent: "border-l-blue-500",
                    },
                    {
                        key: "approved",
                        label: "Approved",
                        accent: "border-l-emerald-600",
                    },
                    {
                        key: "rejected",
                        label: "Rejected",
                        accent: "border-l-red-600",
                    },
                ].map((k) => (
                    <div
                        key={k.key}
                        className={`bg-white rounded-xl border border-slate-200 shadow-sm p-4 border-l-4 ${k.accent} cursor-pointer hover:bg-slate-50/50`}
                        onClick={() =>
                            setStatusFilter(statusFilter === k.key ? "" : k.key)
                        }
                    >
                        <p className="text-[11px] uppercase tracking-wide text-slate-500 font-bold">
                            {k.label}
                        </p>
                        <p className="text-2xl font-bold mt-1">
                            {counts[k.key]}
                        </p>
                        {statusFilter === k.key && (
                            <p className="text-[11px] text-emerald-700 mt-1 font-semibold">
                                Filtered →
                            </p>
                        )}
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="px-5 py-4 border-b flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold mr-2">Renewal Workflow</h2>
                    <span className="text-xs text-slate-500">
                        {data?.data.length ?? 0} record
                        {data?.data.length === 1 ? "" : "s"}
                    </span>
                    <div className="flex-1" />
                    {selected.size > 0 && (
                        <>
                            <span className="text-xs text-slate-500">
                                {selected.size} selected
                            </span>
                            <button
                                onClick={() => doBulk("submitted")}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
                            >
                                Mark Submitted
                            </button>
                            <button
                                onClick={() => doBulk("approved")}
                                className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
                            >
                                Approve
                            </button>
                            <button
                                onClick={() => doBulk("rejected")}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
                            >
                                Reject
                            </button>
                        </>
                    )}
                </div>
                <div className="px-5 py-3 border-b flex flex-wrap gap-2 bg-slate-50">
                    <input
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-[240px]"
                        placeholder="Search student, CNIC, scheme, donor…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <select
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">
                            Awaiting action (due + submitted)
                        </option>
                        <option value="due">Due only</option>
                        <option value="submitted">Submitted only</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="not_due">Not due</option>
                    </select>
                </div>
                <div className="overflow-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
                            <tr>
                                <th className="px-3 py-2 w-8">
                                    <input
                                        type="checkbox"
                                        checked={
                                            data?.data.length > 0 &&
                                            selected.size === data.data.length
                                        }
                                        onChange={toggleAll}
                                    />
                                </th>
                                {[
                                    "Student ID",
                                    "Student",
                                    "CNIC",
                                    "Scheme",
                                    "Year",
                                    "Donor",
                                    "Approved",
                                    "Status",
                                    "Actions",
                                ].map((h) => (
                                    <th
                                        key={h}
                                        className="text-left px-4 py-2 whitespace-nowrap"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading && (
                                <tr>
                                    <td
                                        colSpan={10}
                                        className="p-6 text-center text-slate-500"
                                    >
                                        Loading…
                                    </td>
                                </tr>
                            )}
                            {!isLoading && data?.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={10}
                                        className="p-6 text-center text-slate-500"
                                    >
                                        No renewals match the filters.
                                    </td>
                                </tr>
                            )}
                            {data?.data.map((r) => (
                                <tr
                                    key={r.id}
                                    className={`border-t border-l-4 ${STATUS_TONE[r.renewal_status]}`}
                                >
                                    <td className="px-3 py-2">
                                        <input
                                            type="checkbox"
                                            checked={selected.has(r.id)}
                                            onChange={() => toggleSelect(r.id)}
                                        />
                                    </td>
                                    <td className="px-4 py-2 font-mono">
                                        {r.student_id}
                                    </td>
                                    <td className="px-4 py-2">
                                        {r.student_name}
                                    </td>
                                    <td className="px-4 py-2 font-mono text-xs">
                                        {r.cnic ?? "—"}
                                    </td>
                                    <td className="px-4 py-2">{r.scheme}</td>
                                    <td className="px-4 py-2">
                                        {r.academic_year}
                                    </td>
                                    <td className="px-4 py-2">{r.donor}</td>
                                    <td className="px-4 py-2 text-right tabular-nums">
                                        {fmt(r.approved_amount)}
                                    </td>
                                    <td className="px-4 py-2">
                                        <StatusBadge
                                            kind="renewal"
                                            value={r.renewal_status}
                                        />
                                    </td>
                                    <td className="px-4 py-2">
                                        <div className="flex gap-1 flex-wrap">
                                            {r.renewal_status === "due" && (
                                                <button
                                                    onClick={() =>
                                                        advanceOne(
                                                            r,
                                                            "submitted",
                                                        )
                                                    }
                                                    className="text-xs font-semibold text-blue-700 hover:underline"
                                                >
                                                    Mark Submitted
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
                                                        className="text-xs font-semibold text-emerald-700 hover:underline"
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
                                                        className="text-xs font-semibold text-red-700 hover:underline"
                                                    >
                                                        Reject
                                                    </button>
                                                </>
                                            )}
                                            {(r.renewal_status === "approved" ||
                                                r.renewal_status ===
                                                    "rejected") && (
                                                <button
                                                    onClick={() =>
                                                        advanceOne(r, "due")
                                                    }
                                                    className="text-xs font-semibold text-slate-600 hover:underline"
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
            </div>
        </div>
    );
}
