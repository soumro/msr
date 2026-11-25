import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    fetchApplications,
    deleteApplication,
    promoteApplication,
} from "../services/scholarships";
import StatusBadge from "../components/StatusBadge";
import ApplicationModal from "../components/ApplicationModal";
import Pagination from "../components/Pagination";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmContext";

export default function Applications() {
    const toast = useToast();
    const confirm = useConfirm();
    const qc = useQueryClient();
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [eligibility, setEligibility] = useState("");
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(25);
    const [editing, setEditing] = useState(null);
    const [open, setOpen] = useState(false);

    const { data, isLoading, isFetching } = useQuery({
        queryKey: [
            "applications",
            { search, status, eligibility, page, perPage },
        ],
        queryFn: () =>
            fetchApplications({
                search,
                status,
                eligibility,
                page,
                per_page: perPage,
            }),
        keepPreviousData: true,
    });

    const del = useMutation({
        mutationFn: deleteApplication,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["applications"] });
            toast.success("Deleted");
        },
        onError: () => toast.error("Delete failed"),
    });

    const promote = useMutation({
        mutationFn: promoteApplication,
        onSuccess: (res) => {
            qc.invalidateQueries({ queryKey: ["applications"] });
            qc.invalidateQueries({ queryKey: ["scholarships"] });
            qc.invalidateQueries({ queryKey: ["dashboard"] });
            toast.success(`Promoted to scholarship #${res.scholarship.id}`);
        },
        onError: (e) =>
            toast.error(e?.response?.data?.message ?? "Promote failed"),
    });

    return (
        <div className="space-y-4">
            <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                        Application Tracking
                    </h1>
                    <span className="text-[11px] font-bold bg-purple-100 text-purple-800 px-2.5 py-1 rounded-full">
                        {data?.total ?? 0} applications
                    </span>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                    Manage student applications from intake through committee
                    decisions
                </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 flex flex-wrap items-center gap-2 border-b border-slate-100">
                    <input
                        type="search"
                        placeholder="Search student, CNIC…"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        className="flex-1 min-w-[220px] border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-600"
                    />
                    <select
                        value={status}
                        onChange={(e) => {
                            setStatus(e.target.value);
                            setPage(1);
                        }}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                    >
                        <option value="">All statuses</option>
                        <option value="draft">Draft</option>
                        <option value="submitted">Submitted</option>
                        <option value="under_review">Under review</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                    <select
                        value={eligibility}
                        onChange={(e) => {
                            setEligibility(e.target.value);
                            setPage(1);
                        }}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                    >
                        <option value="">All eligibility</option>
                        <option value="pending">Pending</option>
                        <option value="eligible">Eligible</option>
                        <option value="ineligible">Ineligible</option>
                    </select>
                    <button
                        onClick={() => {
                            setEditing(null);
                            setOpen(true);
                        }}
                        className="bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-lg text-sm font-bold ml-auto"
                    >
                        + New Application
                    </button>
                </div>

                {isLoading ? (
                    <div className="p-8 text-center text-sm text-slate-500">
                        Loading…
                    </div>
                ) : !data?.data?.length ? (
                    <div className="py-16 text-center">
                        <div className="w-16 h-16 mx-auto rounded-full bg-slate-50 grid place-items-center text-3xl mb-4">
                            📝
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">
                            No applications
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                            Create your first application to get started.
                        </p>
                    </div>
                ) : (
                    <div
                        className={`overflow-auto ${isFetching ? "opacity-60" : ""}`}
                    >
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase tracking-wider">
                                <tr>
                                    {[
                                        "Student",
                                        "Roll",
                                        "CNIC",
                                        "Scheme",
                                        "Year",
                                        "Eligibility",
                                        "Status",
                                        "Reason",
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
                                {data.data.map((a) => (
                                    <tr
                                        key={a.id}
                                        className="border-t border-slate-100 hover:bg-slate-50/70"
                                    >
                                        <td className="px-4 py-2.5 font-semibold text-slate-800">
                                            {a.student_name || "—"}
                                        </td>
                                        <td className="px-4 py-2.5 font-mono text-xs">
                                            {a.student_id}
                                        </td>
                                        <td className="px-4 py-2.5 font-mono text-xs">
                                            {a.cnic || "—"}
                                        </td>
                                        <td className="px-4 py-2.5 text-xs">
                                            {a.scheme}
                                        </td>
                                        <td className="px-4 py-2.5 text-xs text-slate-600">
                                            {a.academic_year}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <StatusBadge
                                                kind="eligibility"
                                                value={a.eligibility}
                                            />
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <StatusBadge
                                                kind="application"
                                                value={a.status}
                                            />
                                        </td>
                                        <td
                                            className="px-4 py-2.5 text-xs text-slate-500 max-w-[200px] truncate"
                                            title={a.rejection_reason ?? ""}
                                        >
                                            {a.rejection_reason || "—"}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex gap-1 flex-wrap">
                                                {a.status === "approved" &&
                                                    !a.scholarship_id && (
                                                        <button
                                                            onClick={async () => {
                                                                const ok =
                                                                    await confirm(
                                                                        {
                                                                            title: "Promote to scholarship?",
                                                                            message: `Create a scholarship record for ${a.student_name}?`,
                                                                            confirmLabel:
                                                                                "Promote",
                                                                        },
                                                                    );
                                                                if (ok)
                                                                    promote.mutate(
                                                                        a.id,
                                                                    );
                                                            }}
                                                            className="text-xs font-bold text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded"
                                                        >
                                                            Promote →
                                                        </button>
                                                    )}
                                                {a.scholarship_id && (
                                                    <span className="text-[10px] font-mono text-slate-400">
                                                        → #{a.scholarship_id}
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        setEditing(a.id);
                                                        setOpen(true);
                                                    }}
                                                    className="text-xs font-bold text-blue-700 hover:bg-blue-50 px-2 py-1 rounded"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        const ok =
                                                            await confirm({
                                                                title: "Delete application?",
                                                                message:
                                                                    "This cannot be undone.",
                                                                confirmLabel:
                                                                    "Delete",
                                                                danger: true,
                                                            });
                                                        if (ok)
                                                            del.mutate(a.id);
                                                    }}
                                                    className="text-xs font-bold text-rose-700 hover:bg-rose-50 px-2 py-1 rounded"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {data && data.data?.length > 0 && (
                    <Pagination
                        meta={data}
                        onPageChange={setPage}
                        onPerPageChange={(n) => {
                            setPerPage(n);
                            setPage(1);
                        }}
                    />
                )}
            </div>

            {open && (
                <ApplicationModal
                    applicationId={editing}
                    onClose={() => setOpen(false)}
                    onSaved={() => {
                        setOpen(false);
                        qc.invalidateQueries({ queryKey: ["applications"] });
                    }}
                />
            )}
        </div>
    );
}
