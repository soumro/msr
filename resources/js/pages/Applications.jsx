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
            toast.success("Application deleted");
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
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="px-5 py-4 border-b flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold mr-2">Application Tracking</h2>
                    <span className="text-xs text-slate-500">
                        {data?.total ?? 0} applications
                        {isFetching && (
                            <span className="ml-2 text-emerald-600">
                                updating…
                            </span>
                        )}
                    </span>
                    <div className="flex-1" />
                    <button
                        className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                        onClick={() => {
                            setEditing(null);
                            setOpen(true);
                        }}
                    >
                        + New Application
                    </button>
                </div>

                <div className="px-5 py-3 border-b flex flex-wrap gap-2 bg-slate-50">
                    <input
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-[220px]"
                        placeholder="Search student, CNIC…"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                    />
                    <select
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                        value={status}
                        onChange={(e) => {
                            setStatus(e.target.value);
                            setPage(1);
                        }}
                    >
                        <option value="">All statuses</option>
                        <option value="draft">Draft</option>
                        <option value="submitted">Submitted</option>
                        <option value="under_review">Under review</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                    <select
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                        value={eligibility}
                        onChange={(e) => {
                            setEligibility(e.target.value);
                            setPage(1);
                        }}
                    >
                        <option value="">All eligibility</option>
                        <option value="pending">Pending</option>
                        <option value="eligible">Eligible</option>
                        <option value="ineligible">Ineligible</option>
                    </select>
                    <button
                        className="border border-slate-300 px-3 py-2 rounded-lg text-sm hover:bg-slate-100"
                        onClick={() => {
                            setSearch("");
                            setStatus("");
                            setEligibility("");
                            setPage(1);
                        }}
                    >
                        Clear
                    </button>
                </div>

                <div className="overflow-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
                            <tr>
                                {[
                                    "Student ID",
                                    "Student",
                                    "CNIC",
                                    "Scheme",
                                    "Year",
                                    "Eligibility",
                                    "Status",
                                    "Rejection Reason",
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
                        <tbody className={isFetching ? "opacity-60" : ""}>
                            {isLoading && (
                                <tr>
                                    <td
                                        colSpan={9}
                                        className="p-6 text-center text-slate-500"
                                    >
                                        Loading…
                                    </td>
                                </tr>
                            )}
                            {!isLoading && data?.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={9}
                                        className="p-6 text-center text-slate-500"
                                    >
                                        No applications.
                                    </td>
                                </tr>
                            )}
                            {data?.data.map((app) => (
                                <tr key={app.id} className="border-t">
                                    <td className="px-4 py-2 font-mono">
                                        {app.student_id}
                                    </td>
                                    <td className="px-4 py-2">
                                        {app.student_name}
                                    </td>
                                    <td className="px-4 py-2 font-mono text-xs">
                                        {app.cnic ?? "—"}
                                    </td>
                                    <td className="px-4 py-2">{app.scheme}</td>
                                    <td className="px-4 py-2">
                                        {app.academic_year}
                                    </td>
                                    <td className="px-4 py-2">
                                        <StatusBadge
                                            kind="eligibility"
                                            value={app.eligibility}
                                        />
                                    </td>
                                    <td className="px-4 py-2">
                                        <StatusBadge
                                            kind="application"
                                            value={app.status}
                                        />
                                    </td>
                                    <td
                                        className="px-4 py-2 text-xs text-slate-500 max-w-[240px] truncate"
                                        title={app.rejection_reason ?? ""}
                                    >
                                        {app.rejection_reason ?? "—"}
                                    </td>
                                    <td className="px-4 py-2">
                                        <div className="flex gap-2 items-center flex-wrap">
                                            {app.status === "approved" &&
                                                !app.scholarship_id && (
                                                    <button
                                                        className="text-emerald-700 text-xs font-semibold hover:underline"
                                                        onClick={async () => {
                                                            const ok =
                                                                await confirm({
                                                                    title: "Promote to scholarship?",
                                                                    message: `Create a scholarship record for ${app.student_name} (${app.scheme}, ${app.academic_year})?`,
                                                                    confirmLabel:
                                                                        "Promote",
                                                                });
                                                            if (ok)
                                                                promote.mutate(
                                                                    app.id,
                                                                );
                                                        }}
                                                    >
                                                        Promote →
                                                    </button>
                                                )}
                                            {app.scholarship_id && (
                                                <span className="text-[11px] text-slate-400 font-mono">
                                                    → #{app.scholarship_id}
                                                </span>
                                            )}
                                            <button
                                                className="text-blue-700 text-xs font-semibold hover:underline"
                                                onClick={() => {
                                                    setEditing(app.id);
                                                    setOpen(true);
                                                }}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="text-red-700 text-xs font-semibold hover:underline"
                                                onClick={async () => {
                                                    const ok = await confirm({
                                                        title: "Delete this application?",
                                                        message:
                                                            "This cannot be undone.",
                                                        confirmLabel: "Delete",
                                                        danger: true,
                                                    });
                                                    if (ok) del.mutate(app.id);
                                                }}
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

                <Pagination
                    meta={data}
                    onPageChange={setPage}
                    onPerPageChange={(n) => {
                        setPerPage(n);
                        setPage(1);
                    }}
                />
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
