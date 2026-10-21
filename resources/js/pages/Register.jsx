import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    fetchScholarships,
    deleteScholarship,
    bulkUpdateScholarships,
} from "../services/scholarships";
import ScholarshipModal from "../components/ScholarshipModal";
import StatusBadge from "../components/StatusBadge";
import Pagination from "../components/Pagination";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmContext";

const fmt = (n) => new Intl.NumberFormat("en-PK").format(n);
const fmtDate = (s) =>
    s
        ? new Date(s).toLocaleDateString("en-PK", {
              year: "numeric",
              month: "short",
              day: "numeric",
          })
        : "—";

const CATEGORY_BADGE = {
    fresh: "bg-blue-100 text-blue-800 border-blue-200",
    renewal: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export default function Register() {
    const toast = useToast();
    const confirm = useConfirm();
    const qc = useQueryClient();

    const [search, setSearch] = useState("");
    const [filters, setFilters] = useState({});
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(25);
    const [editing, setEditing] = useState(null);
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState(new Set());

    // Whenever filters, search, or pagination changes, clear selection
    useEffect(() => {
        setSelected(new Set());
    }, [search, filters, page, perPage]);

    const { data, isLoading, isFetching } = useQuery({
        queryKey: ["scholarships", { search, ...filters, page, perPage }],
        queryFn: () =>
            fetchScholarships({ search, ...filters, page, per_page: perPage }),
        keepPreviousData: true,
    });

    const del = useMutation({
        mutationFn: deleteScholarship,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["scholarships"] });
            qc.invalidateQueries({ queryKey: ["dashboard"] });
            qc.invalidateQueries({ queryKey: ["duplicates"] });
            toast.success("Record deleted");
        },
        onError: () => toast.error("Delete failed"),
    });

    const bulkMutation = useMutation({
        mutationFn: ({ ids, patch }) => bulkUpdateScholarships(ids, patch),
        onSuccess: (res) => {
            qc.invalidateQueries({ queryKey: ["scholarships"] });
            qc.invalidateQueries({ queryKey: ["dashboard"] });
            qc.invalidateQueries({ queryKey: ["duplicates"] });
            setSelected(new Set());
            toast.success(`Updated ${res.updated} record(s)`);
        },
        onError: (e) =>
            toast.error(e?.response?.data?.message ?? "Bulk update failed"),
    });

    const doBulk = async (patch) => {
        if (!selected.size) return;
        const description = Object.entries(patch)
            .map(([k, v]) => `${k.replace(/_/g, " ")} → ${v}`)
            .join(", ");
        const ok = await confirm({
            title: `Update ${selected.size} record(s)?`,
            message: `Apply: ${description}`,
            confirmLabel: "Yes, update",
        });
        if (ok) bulkMutation.mutate({ ids: [...selected], patch });
    };

    const applyFilter = (patch) => {
        setFilters((f) => ({ ...f, ...patch }));
        setPage(1);
    };

    const toggleRow = (id) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        const rows = data?.data ?? [];
        if (selected.size === rows.length) setSelected(new Set());
        else setSelected(new Set(rows.map((r) => r.id)));
    };

    const allSelected =
        (data?.data?.length ?? 0) > 0 && selected.size === data.data.length;

    const exportCsv = () => {
        const headers = [
            "Student ID",
            "Student",
            "CNIC",
            "Scheme",
            "Category",
            "Year",
            "Donor",
            "Approved",
            "Cheque No.",
            "Received Date",
            "Payment",
            "Renewal",
        ];
        const rows = (data?.data ?? []).map((s) => [
            s.student_id,
            s.student_name ?? "",
            s.cnic ?? "",
            s.scheme,
            s.category,
            s.academic_year,
            s.donor,
            s.approved_amount,
            s.cheque_no ?? "",
            s.received_date ?? "",
            s.payment_status,
            s.renewal_status,
        ]);
        const csv = [headers, ...rows]
            .map((r) =>
                r
                    .map((v) => {
                        const str = String(v ?? "");
                        return /[",\n]/.test(str)
                            ? `"${str.replace(/"/g, '""')}"`
                            : str;
                    })
                    .join(","),
            )
            .join("\n");
        const blob = new Blob(["\uFEFF" + csv], {
            type: "text/csv;charset=utf-8;",
        });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `master-register-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        toast.success(`Exported ${rows.length} rows`);
    };

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                {/* --- Header bar --- */}
                <div className="px-5 py-4 border-b flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold mr-2">
                        Master Scholarship Register
                    </h2>
                    <span className="text-xs text-slate-500">
                        {data?.total ?? 0} records
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
                        + Add Record
                    </button>
                    <button
                        className="border border-slate-300 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50"
                        onClick={exportCsv}
                    >
                        Export CSV
                    </button>
                </div>

                {/* --- Bulk action bar (only shows when rows are selected) --- */}
                {selected.size > 0 && (
                    <div className="px-5 py-3 border-b bg-emerald-50 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-emerald-900">
                            {selected.size} record
                            {selected.size === 1 ? "" : "s"} selected
                        </span>
                        <div className="flex-1" />

                        {/* Set payment status */}
                        <select
                            className="border border-slate-300 rounded-lg px-2 py-1 text-xs bg-white"
                            defaultValue=""
                            onChange={(e) => {
                                const v = e.target.value;
                                if (v) {
                                    doBulk({ payment_status: v });
                                    e.target.value = "";
                                }
                            }}
                        >
                            <option value="">Set payment status…</option>
                            <option value="pending">→ Pending</option>
                            <option value="partial">→ Partial</option>
                            <option value="paid">→ Paid</option>
                            <option value="failed">→ Failed</option>
                        </select>

                        {/* Set renewal status */}
                        <select
                            className="border border-slate-300 rounded-lg px-2 py-1 text-xs bg-white"
                            defaultValue=""
                            onChange={(e) => {
                                const v = e.target.value;
                                if (v) {
                                    doBulk({ renewal_status: v });
                                    e.target.value = "";
                                }
                            }}
                        >
                            <option value="">Set renewal status…</option>
                            <option value="not_due">→ Not due</option>
                            <option value="due">→ Due</option>
                            <option value="submitted">→ Submitted</option>
                            <option value="approved">→ Approved</option>
                            <option value="rejected">→ Rejected</option>
                        </select>

                        {/* Set category */}
                        <select
                            className="border border-slate-300 rounded-lg px-2 py-1 text-xs bg-white"
                            defaultValue=""
                            onChange={(e) => {
                                const v = e.target.value;
                                if (v) {
                                    doBulk({ category: v });
                                    e.target.value = "";
                                }
                            }}
                        >
                            <option value="">Set category…</option>
                            <option value="fresh">→ Fresh</option>
                            <option value="renewal">→ Renewal</option>
                        </select>

                        <button
                            className="text-xs text-slate-600 hover:text-slate-900 font-semibold"
                            onClick={() => setSelected(new Set())}
                        >
                            Cancel selection
                        </button>
                    </div>
                )}

                {/* --- Filters --- */}
                <div className="px-5 py-3 border-b flex flex-wrap gap-2 bg-slate-50">
                    <input
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-[240px]"
                        placeholder="Search student ID, name, CNIC, scheme, cheque no…"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                    />
                    <select
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                        value={filters.category ?? ""}
                        onChange={(e) =>
                            applyFilter({ category: e.target.value })
                        }
                    >
                        <option value="">All categories</option>
                        <option value="fresh">Fresh</option>
                        <option value="renewal">Renewal</option>
                    </select>
                    <select
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                        value={filters.payment_status ?? ""}
                        onChange={(e) =>
                            applyFilter({ payment_status: e.target.value })
                        }
                    >
                        <option value="">All payment</option>
                        <option value="pending">Pending</option>
                        <option value="partial">Partial</option>
                        <option value="paid">Paid</option>
                        <option value="failed">Failed</option>
                    </select>
                    <select
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                        value={filters.renewal_status ?? ""}
                        onChange={(e) =>
                            applyFilter({ renewal_status: e.target.value })
                        }
                    >
                        <option value="">All renewal</option>
                        <option value="not_due">Not due</option>
                        <option value="due">Due</option>
                        <option value="submitted">Submitted</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                    <input
                        type="date"
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                        value={filters.received_from ?? ""}
                        onChange={(e) =>
                            applyFilter({ received_from: e.target.value })
                        }
                        title="Received from"
                    />
                    <input
                        type="date"
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                        value={filters.received_to ?? ""}
                        onChange={(e) =>
                            applyFilter({ received_to: e.target.value })
                        }
                        title="Received to"
                    />
                    <button
                        className="border border-slate-300 px-3 py-2 rounded-lg text-sm hover:bg-slate-100"
                        onClick={() => {
                            setSearch("");
                            setFilters({});
                            setPage(1);
                        }}
                    >
                        Clear
                    </button>
                </div>

                {/* --- Table --- */}
                <div className="overflow-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
                            <tr>
                                <th className="px-3 py-2 w-8">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={toggleAll}
                                    />
                                </th>
                                {[
                                    "Student ID",
                                    "Student",
                                    "CNIC",
                                    "Scheme",
                                    "Category",
                                    "Year",
                                    "Donor",
                                    "Approved",
                                    "Cheque No.",
                                    "Received",
                                    "Payment",
                                    "Renewal",
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
                                        colSpan={14}
                                        className="p-6 text-center text-slate-500"
                                    >
                                        Loading…
                                    </td>
                                </tr>
                            )}
                            {!isLoading && data?.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={14}
                                        className="p-6 text-center text-slate-500"
                                    >
                                        No records match the filters.
                                    </td>
                                </tr>
                            )}
                            {data?.data.map((s) => {
                                const isSelected = selected.has(s.id);
                                const rowBg = isSelected
                                    ? "bg-emerald-50"
                                    : s.flagged
                                      ? "bg-amber-50/60"
                                      : "";
                                return (
                                    <tr
                                        key={s.id}
                                        className={`border-t ${rowBg}`}
                                    >
                                        <td className="px-3 py-2">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleRow(s.id)}
                                            />
                                        </td>
                                        <td className="px-4 py-2 font-mono">
                                            {s.student_id}
                                            {s.flagged && (
                                                <span className="ml-2 text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                                                    DUP
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2">
                                            {s.student_name}
                                        </td>
                                        <td className="px-4 py-2 font-mono text-xs">
                                            {s.cnic ?? "—"}
                                        </td>
                                        <td className="px-4 py-2">
                                            <span
                                                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${CATEGORY_BADGE[s.category]}`}
                                            >
                                                {s.category}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2">
                                            {s.academic_year}
                                        </td>
                                        <td className="px-4 py-2">{s.donor}</td>
                                        <td className="px-4 py-2 text-right tabular-nums">
                                            {fmt(s.approved_amount)}
                                        </td>
                                        <td className="px-4 py-2 font-mono text-xs">
                                            {s.cheque_no || (
                                                <span className="text-slate-400">
                                                    —
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-xs">
                                            {s.received_date ? (
                                                <span className="text-slate-700">
                                                    {fmtDate(s.received_date)}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">
                                                    —
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2">
                                            <StatusBadge
                                                kind="payment"
                                                value={s.payment_status}
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <StatusBadge
                                                kind="renewal"
                                                value={s.renewal_status}
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="flex gap-2">
                                                <button
                                                    className="text-blue-700 text-xs font-semibold hover:underline"
                                                    onClick={() => {
                                                        setEditing(s.id);
                                                        setOpen(true);
                                                    }}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className="text-red-700 text-xs font-semibold hover:underline"
                                                    onClick={async () => {
                                                        const ok =
                                                            await confirm({
                                                                title: `Delete record for ${s.student_name}?`,
                                                                message:
                                                                    "This cannot be undone.",
                                                                confirmLabel:
                                                                    "Delete",
                                                                danger: true,
                                                            });
                                                        if (ok)
                                                            del.mutate(s.id);
                                                    }}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
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
                <ScholarshipModal
                    scholarshipId={editing}
                    onClose={() => setOpen(false)}
                    onSaved={() => {
                        setOpen(false);
                        qc.invalidateQueries({ queryKey: ["scholarships"] });
                        qc.invalidateQueries({ queryKey: ["dashboard"] });
                        qc.invalidateQueries({ queryKey: ["duplicates"] });
                    }}
                />
            )}
        </div>
    );
}
