import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    fetchScholarships,
    deleteScholarship,
    bulkUpdateScholarships,
} from "../services/scholarships";
import ScholarshipModal from "../components/ScholarshipModal";
import RollOverModal from "../components/RollOverModal";
import StudentDrawer from "../components/StudentDrawer";
import StatusBadge from "../components/StatusBadge";
import Pagination from "../components/Pagination";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmContext";

const fmt = (n) =>
    new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(
        Number(n) || 0,
    );

const CATEGORY_BADGE = {
    fresh: "bg-blue-50 text-blue-700 border-blue-200",
    renewal: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function Register() {
    const toast = useToast();
    const confirm = useConfirm();
    const qc = useQueryClient();

    const [search, setSearch] = useState("");
    const [filters, setFilters] = useState({});
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(25);
    const [selected, setSelected] = useState(new Set());
    const [editingId, setEditingId] = useState(null);
    const [openEdit, setOpenEdit] = useState(false);
    const [rollOverTarget, setRollOverTarget] = useState(null);
    const [drawerScholarship, setDrawerScholarship] = useState(null);

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
            qc.invalidateQueries({ queryKey: ["reconciliation"] });
            setDrawerScholarship(null);
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

    const openEditModal = (id = null) => {
        setEditingId(id);
        setOpenEdit(true);
    };

    const afterSave = () => {
        setOpenEdit(false);
        setEditingId(null);
        qc.invalidateQueries({ queryKey: ["scholarships"] });
        qc.invalidateQueries({ queryKey: ["dashboard"] });
        qc.invalidateQueries({ queryKey: ["duplicates"] });
        qc.invalidateQueries({ queryKey: ["reconciliation"] });
        if (drawerScholarship) {
            qc.invalidateQueries({ queryKey: ["scholarship-notes"] });
            qc.invalidateQueries({ queryKey: ["scholarship-documents"] });
            qc.invalidateQueries({ queryKey: ["scholarship-history"] });
        }
    };

    const hasFilters = search || Object.keys(filters).length > 0;
    const totalCount = data?.total ?? 0;
    const pageCount = data?.data?.length ?? 0;

    return (
        <div className="space-y-4">
            {/* ==================== HEADER ==================== */}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-[240px]">
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                            Master Scholarship Register
                        </h1>
                        <span className="text-[11px] font-bold bg-purple-100 text-purple-800 px-2.5 py-1 rounded-full">
                            {totalCount.toLocaleString()}{" "}
                            {totalCount === 1 ? "record" : "records"}
                        </span>
                        {hasFilters && (
                            <span className="text-[11px] font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full flex items-center gap-1">
                                Filtered · showing {pageCount}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                        Complete scholarship record for every student · click
                        any row to open details
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={exportCsv}
                        className="border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5"
                    >
                        <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Export CSV
                    </button>
                    <button
                        onClick={() => openEditModal(null)}
                        className="bg-purple-700 hover:bg-purple-800 text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-1.5"
                    >
                        <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add Record
                    </button>
                </div>
            </div>

            {/* ==================== BULK ACTION BAR ==================== */}
            {selected.size > 0 && (
                <div className="bg-gradient-to-r from-purple-700 to-purple-600 text-white rounded-xl shadow-lg px-4 py-3 flex flex-wrap items-center gap-3 animate-[slideDown_.15s_ease-out]">
                    <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-white/20 grid place-items-center text-xs font-extrabold">
                            {selected.size}
                        </span>
                        <span className="text-sm font-bold">
                            {selected.size === 1 ? "record" : "records"}{" "}
                            selected
                        </span>
                    </div>

                    <div className="flex-1"></div>

                    <div className="flex flex-wrap gap-2">
                        <select
                            onChange={(e) => {
                                if (e.target.value) {
                                    doBulk({ payment_status: e.target.value });
                                    e.target.value = "";
                                }
                            }}
                            className="bg-white/15 hover:bg-white/20 border border-white/30 text-white rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer"
                            defaultValue=""
                        >
                            <option value="" className="text-slate-800">
                                Set Payment Status…
                            </option>
                            <option value="pending" className="text-slate-800">
                                → Pending
                            </option>
                            <option value="partial" className="text-slate-800">
                                → Partial
                            </option>
                            <option value="paid" className="text-slate-800">
                                → Paid
                            </option>
                            <option value="failed" className="text-slate-800">
                                → Failed
                            </option>
                        </select>

                        <select
                            onChange={(e) => {
                                if (e.target.value) {
                                    doBulk({ renewal_status: e.target.value });
                                    e.target.value = "";
                                }
                            }}
                            className="bg-white/15 hover:bg-white/20 border border-white/30 text-white rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer"
                            defaultValue=""
                        >
                            <option value="" className="text-slate-800">
                                Set Renewal Status…
                            </option>
                            <option value="not_due" className="text-slate-800">
                                → Not Due
                            </option>
                            <option value="due" className="text-slate-800">
                                → Due
                            </option>
                            <option
                                value="submitted"
                                className="text-slate-800"
                            >
                                → Submitted
                            </option>
                            <option value="approved" className="text-slate-800">
                                → Approved
                            </option>
                            <option value="rejected" className="text-slate-800">
                                → Rejected
                            </option>
                        </select>

                        <select
                            onChange={(e) => {
                                if (e.target.value) {
                                    doBulk({ category: e.target.value });
                                    e.target.value = "";
                                }
                            }}
                            className="bg-white/15 hover:bg-white/20 border border-white/30 text-white rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer"
                            defaultValue=""
                        >
                            <option value="" className="text-slate-800">
                                Set Category…
                            </option>
                            <option value="fresh" className="text-slate-800">
                                → Fresh
                            </option>
                            <option value="renewal" className="text-slate-800">
                                → Renewal
                            </option>
                        </select>

                        <button
                            onClick={() => setSelected(new Set())}
                            className="bg-white/10 hover:bg-white/20 border border-white/30 text-white rounded-lg px-3 py-1.5 text-xs font-semibold"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* ==================== FILTERS ==================== */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="px-4 py-3 flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[240px]">
                        <svg
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            type="search"
                            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/15"
                            placeholder="Search student ID, name, CNIC, scheme, cheque no…"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                        />
                    </div>

                    <select
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
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
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
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
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
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
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                        value={filters.received_from ?? ""}
                        onChange={(e) =>
                            applyFilter({ received_from: e.target.value })
                        }
                        title="Received from date"
                    />
                    <input
                        type="date"
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                        value={filters.received_to ?? ""}
                        onChange={(e) =>
                            applyFilter({ received_to: e.target.value })
                        }
                        title="Received to date"
                    />

                    {hasFilters && (
                        <button
                            onClick={() => {
                                setSearch("");
                                setFilters({});
                                setPage(1);
                            }}
                            className="text-xs font-bold text-slate-500 hover:text-slate-900 underline px-2"
                        >
                            Clear all
                        </button>
                    )}
                </div>
            </div>

            {/* ==================== TABLE ==================== */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {isLoading ? (
                    <TableSkeleton />
                ) : !data?.data?.length ? (
                    <EmptyState
                        hasFilters={hasFilters}
                        onClear={() => {
                            setSearch("");
                            setFilters({});
                        }}
                        onAdd={() => openEditModal(null)}
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[900px]">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-4 py-3 w-10">
                                        <input
                                            type="checkbox"
                                            checked={allSelected}
                                            onChange={toggleAll}
                                            className="w-4 h-4 rounded border-slate-300 text-purple-600 cursor-pointer"
                                        />
                                    </th>
                                    <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-extrabold text-slate-500 whitespace-nowrap">
                                        Student ID
                                    </th>
                                    <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-extrabold text-slate-500 whitespace-nowrap">
                                        Student
                                    </th>
                                    <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-extrabold text-slate-500 whitespace-nowrap hidden lg:table-cell">
                                        Scheme
                                    </th>
                                    <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-extrabold text-slate-500 whitespace-nowrap hidden xl:table-cell">
                                        Category
                                    </th>
                                    <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-extrabold text-slate-500 whitespace-nowrap">
                                        Year
                                    </th>
                                    <th className="text-right px-4 py-3 text-[11px] uppercase tracking-wider font-extrabold text-slate-500 whitespace-nowrap">
                                        Approved
                                    </th>
                                    <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-extrabold text-slate-500 whitespace-nowrap">
                                        Payment
                                    </th>
                                    <th className="text-center px-4 py-3 text-[11px] uppercase tracking-wider font-extrabold text-slate-500 whitespace-nowrap hidden md:table-cell">
                                        Installments
                                    </th>
                                    <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-extrabold text-slate-500 whitespace-nowrap hidden lg:table-cell">
                                        Renewal
                                    </th>
                                    <th className="text-right px-4 py-3 text-[11px] uppercase tracking-wider font-extrabold text-slate-500 whitespace-nowrap w-[140px]">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody
                                className={
                                    isFetching
                                        ? "opacity-60 transition-opacity"
                                        : "transition-opacity"
                                }
                            >
                                {data.data.map((s) => {
                                    const isSelected = selected.has(s.id);
                                    const paidCount =
                                        s.installments?.filter(
                                            (i) => i.status === "received",
                                        ).length ?? 0;
                                    const totalCount =
                                        s.installments?.length ?? 0;
                                    const pct =
                                        totalCount > 0
                                            ? (paidCount / totalCount) * 100
                                            : 0;

                                    return (
                                        <tr
                                            key={s.id}
                                            onClick={(e) => {
                                                if (
                                                    e.target.closest(
                                                        "button, input, select, a",
                                                    )
                                                )
                                                    return;
                                                setDrawerScholarship(s);
                                            }}
                                            className={`group border-t border-slate-100 cursor-pointer transition-colors ${
                                                isSelected
                                                    ? "bg-purple-50"
                                                    : s.flagged
                                                      ? "bg-amber-50/40 hover:bg-amber-50/70"
                                                      : "hover:bg-slate-50/70"
                                            }`}
                                        >
                                            <td
                                                className="px-4 py-3"
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() =>
                                                        toggleRow(s.id)
                                                    }
                                                    className="w-4 h-4 rounded border-slate-300 text-purple-600 cursor-pointer"
                                                />
                                            </td>

                                            <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-slate-800 font-semibold">
                                                        {s.student_id}
                                                    </span>
                                                    {s.flagged && (
                                                        <span
                                                            className="text-[9px] font-extrabold bg-amber-500 text-white px-1.5 py-0.5 rounded-full"
                                                            title="Duplicate-aid flag"
                                                        >
                                                            DUP
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-4 py-3 max-w-[180px]">
                                                <div
                                                    className="truncate font-medium text-slate-800"
                                                    title={s.student_name ?? ""}
                                                >
                                                    {s.student_name ?? (
                                                        <span className="text-slate-400">
                                                            —
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] font-mono text-slate-400 truncate">
                                                    {s.cnic ?? "—"}
                                                </div>
                                            </td>

                                            <td
                                                className="px-4 py-3 text-xs text-slate-700 max-w-[130px] truncate hidden lg:table-cell"
                                                title={s.scheme}
                                            >
                                                {s.scheme}
                                            </td>

                                            <td className="px-4 py-3 hidden xl:table-cell">
                                                <span
                                                    className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${CATEGORY_BADGE[s.category]}`}
                                                >
                                                    {s.category}
                                                </span>
                                            </td>

                                            <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                                                {s.academic_year}
                                            </td>

                                            <td className="px-4 py-3 text-right tabular-nums font-bold text-slate-800 whitespace-nowrap">
                                                {fmt(s.approved_amount)}
                                            </td>

                                            <td className="px-4 py-3">
                                                <StatusBadge
                                                    kind="payment"
                                                    value={s.payment_status}
                                                />
                                            </td>

                                            <td className="px-4 py-3 hidden md:table-cell">
                                                {totalCount > 0 ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all ${
                                                                    pct === 100
                                                                        ? "bg-emerald-500"
                                                                        : pct >=
                                                                            50
                                                                          ? "bg-amber-500"
                                                                          : "bg-slate-300"
                                                                }`}
                                                                style={{
                                                                    width: `${pct}%`,
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="text-[11px] font-mono font-bold text-slate-600 tabular-nums">
                                                            {paidCount}/
                                                            {totalCount}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300 text-xs">
                                                        —
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-4 py-3 hidden lg:table-cell">
                                                <StatusBadge
                                                    kind="renewal"
                                                    value={s.renewal_status}
                                                />
                                            </td>

                                            <td
                                                className="px-4 py-3 text-right"
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        className="text-blue-700 hover:bg-blue-50 text-xs font-bold px-2 py-1 rounded"
                                                        onClick={() =>
                                                            openEditModal(s.id)
                                                        }
                                                        title="Edit"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        className="text-purple-700 hover:bg-purple-50 text-xs font-bold px-2 py-1 rounded"
                                                        onClick={() =>
                                                            setRollOverTarget(s)
                                                        }
                                                        title="Roll over to next/previous year"
                                                    >
                                                        Roll
                                                    </button>
                                                    <button
                                                        className="text-rose-700 hover:bg-rose-50 text-xs font-bold px-2 py-1 rounded"
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
                                                                del.mutate(
                                                                    s.id,
                                                                );
                                                        }}
                                                        title="Delete"
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

            {/* ==================== MODALS ==================== */}
            {openEdit && (
                <ScholarshipModal
                    scholarshipId={editingId}
                    onClose={() => {
                        setOpenEdit(false);
                        setEditingId(null);
                    }}
                    onSaved={afterSave}
                />
            )}

            {rollOverTarget && (
                <RollOverModal
                    scholarship={rollOverTarget}
                    onClose={() => setRollOverTarget(null)}
                    onRolledOver={() => {
                        qc.invalidateQueries({ queryKey: ["scholarships"] });
                        qc.invalidateQueries({ queryKey: ["dashboard"] });
                        qc.invalidateQueries({ queryKey: ["duplicates"] });
                    }}
                />
            )}

            {drawerScholarship && (
                <StudentDrawer
                    scholarship={drawerScholarship}
                    onClose={() => setDrawerScholarship(null)}
                    onEdit={(id) => {
                        setDrawerScholarship(null);
                        openEditModal(id);
                    }}
                    onRollOver={() => {
                        const target = drawerScholarship;
                        setDrawerScholarship(null);
                        if (target) setRollOverTarget(target);
                    }}
                />
            )}
        </div>
    );
}

// ============================================================
// Empty state
// ============================================================
function EmptyState({ hasFilters, onClear, onAdd }) {
    return (
        <div className="py-16 px-6 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-purple-50 grid place-items-center text-3xl mb-4">
                {hasFilters ? "🔍" : "📋"}
            </div>
            <h3 className="text-lg font-bold text-slate-800">
                {hasFilters ? "No matching records" : "No records yet"}
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                {hasFilters
                    ? "Try adjusting your search or filters, or clear them to see all records."
                    : "Add your first scholarship record or import a CSV to get started."}
            </p>
            <div className="flex justify-center gap-2 mt-5">
                {hasFilters && (
                    <button
                        onClick={onClear}
                        className="border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold"
                    >
                        Clear filters
                    </button>
                )}
                {!hasFilters && (
                    <button
                        onClick={onAdd}
                        className="bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-lg text-sm font-bold"
                    >
                        + Add First Record
                    </button>
                )}
            </div>
        </div>
    );
}

// ============================================================
// Skeleton
// ============================================================
function TableSkeleton() {
    return (
        <div className="animate-pulse">
            <div className="bg-slate-50 border-b px-4 py-3 flex gap-4">
                <div className="w-4 h-4 bg-slate-200 rounded"></div>
                <div className="h-3 bg-slate-200 rounded w-24"></div>
                <div className="h-3 bg-slate-200 rounded w-32"></div>
                <div className="h-3 bg-slate-200 rounded w-24"></div>
                <div className="h-3 bg-slate-200 rounded w-16"></div>
            </div>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                    key={i}
                    className="border-t px-4 py-3 flex gap-4 items-center"
                >
                    <div className="w-4 h-4 bg-slate-100 rounded"></div>
                    <div className="h-3 bg-slate-100 rounded w-24"></div>
                    <div className="h-3 bg-slate-100 rounded w-32"></div>
                    <div className="h-3 bg-slate-100 rounded w-24"></div>
                    <div className="h-3 bg-slate-100 rounded w-20"></div>
                    <div className="h-6 bg-slate-100 rounded-full w-16"></div>
                    <div className="h-3 bg-slate-100 rounded w-24 ml-auto"></div>
                </div>
            ))}
        </div>
    );
}
