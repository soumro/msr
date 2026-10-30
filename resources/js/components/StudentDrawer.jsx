import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    fetchScholarshipNotes,
    addScholarshipNote,
    deleteScholarshipNote,
    fetchScholarshipDocuments,
    uploadScholarshipDocument,
    deleteScholarshipDocument,
    documentDownloadUrl,
    fetchScholarshipRelated,
    fetchScholarshipHistory,
} from "../services/scholarships";
import StatusBadge from "./StatusBadge";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmContext";

const fmt = (n) => new Intl.NumberFormat("en-PK").format(Number(n) || 0);
const fmtDate = (s) =>
    s
        ? new Date(s).toLocaleDateString("en-PK", {
              year: "numeric",
              month: "short",
              day: "numeric",
          })
        : "—";
const fmtDateTime = (s) =>
    s
        ? new Date(s).toLocaleString("en-PK", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
          })
        : "—";
const fmtBytes = (n) => {
    n = Number(n) || 0;
    if (n >= 1048576) return (n / 1048576).toFixed(1) + " MB";
    if (n >= 1024) return (n / 1024).toFixed(0) + " KB";
    return n + " B";
};

const TABS = [
    { key: "overview", label: "Overview" },
    { key: "notes", label: "Notes" },
    { key: "documents", label: "Documents" },
    { key: "history", label: "History" },
    { key: "related", label: "Related" },
];

// ─────────────────────────────────────────────────────────────
// MAIN DRAWER — note the onRollOver prop
// ─────────────────────────────────────────────────────────────
export default function StudentDrawer({
    scholarship,
    onClose,
    onEdit,
    onRollOver,
}) {
    const [tab, setTab] = useState("overview");

    if (!scholarship) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/40 z-[60]" onClick={onClose}>
            <div
                className="absolute top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-5 py-4 border-b bg-purple-900 text-white flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                        <h2 className="font-semibold truncate">
                            {scholarship.student_name ?? scholarship.student_id}
                        </h2>
                        <p className="text-xs text-white/70 truncate">
                            <span className="font-mono">
                                {scholarship.student_id}
                            </span>
                            {scholarship.cnic && (
                                <span className="ml-2 font-mono">
                                    {scholarship.cnic}
                                </span>
                            )}
                        </p>
                    </div>

                    {/* Roll Over button — only renders if parent passed onRollOver */}
                    {typeof onRollOver === "function" && (
                        <button
                            onClick={() => onRollOver()}
                            className="bg-purple-600 hover:bg-purple-500 border border-purple-400 text-white px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap"
                            title="Copy this record to next/previous year"
                        >
                            Roll Over
                        </button>
                    )}

                    <button
                        onClick={() => onEdit(scholarship.id)}
                        className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap"
                    >
                        Edit
                    </button>

                    <button
                        onClick={onClose}
                        className="text-white/70 hover:text-white text-2xl leading-none px-1"
                    >
                        ×
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 bg-white">
                    {TABS.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                                tab === t.key
                                    ? "border-purple-700 text-purple-800"
                                    : "border-transparent text-slate-500 hover:text-slate-900"
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                    {tab === "overview" && (
                        <OverviewTab scholarship={scholarship} />
                    )}
                    {tab === "notes" && (
                        <NotesTab scholarshipId={scholarship.id} />
                    )}
                    {tab === "documents" && (
                        <DocumentsTab scholarshipId={scholarship.id} />
                    )}
                    {tab === "history" && (
                        <HistoryTab scholarshipId={scholarship.id} />
                    )}
                    {tab === "related" && (
                        <RelatedTab scholarship={scholarship} onEdit={onEdit} />
                    )}
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// OVERVIEW
// ─────────────────────────────────────────────────────────────
function OverviewTab({ scholarship: s }) {
    const fields = [
        ["Student ID", s.student_id],
        ["Student Name", s.student_name],
        ["CNIC", s.cnic],
        ["Scheme", s.scheme],
        ["Category", s.category],
        ["Academic Year", s.academic_year],
        ["Donor", s.donor],
        ["Funding Group", s.funding_group],
        ["Department", s.department],
        ["Approved Amount", `PKR ${fmt(s.approved_amount)}`],
        ["Payment Status", s.payment_status, "badge-payment"],
        ["Renewal Status", s.renewal_status, "badge-renewal"],
    ];

    return (
        <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {fields.map(([label, value, badge]) => (
                    <div key={label}>
                        <div className="text-[11px] uppercase tracking-wide text-slate-500 font-bold">
                            {label}
                        </div>
                        <div className="mt-0.5">
                            {badge === "badge-payment" ? (
                                <StatusBadge kind="payment" value={value} />
                            ) : badge === "badge-renewal" ? (
                                <StatusBadge kind="renewal" value={value} />
                            ) : (
                                value || (
                                    <span className="text-slate-400">—</span>
                                )
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {s.notes && (
                <div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-500 font-bold mb-1">
                        Record Notes
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded p-3 text-sm whitespace-pre-wrap">
                        {s.notes}
                    </div>
                </div>
            )}

            <div>
                <h4 className="text-sm font-bold text-slate-700 mb-2">
                    Installments
                </h4>
                {!s.installments || s.installments.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">
                        No installments recorded.
                    </p>
                ) : (
                    <div className="overflow-auto border border-slate-200 rounded">
                        <table className="w-full text-xs">
                            <thead className="bg-slate-50 text-slate-500 uppercase">
                                <tr>
                                    <th className="text-left px-3 py-1.5">#</th>
                                    <th className="text-right px-3 py-1.5">
                                        Amount
                                    </th>
                                    <th className="text-left px-3 py-1.5">
                                        Cheque
                                    </th>
                                    <th className="text-left px-3 py-1.5">
                                        Received
                                    </th>
                                    <th className="text-left px-3 py-1.5">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {s.installments.map((i) => (
                                    <tr key={i.id} className="border-t">
                                        <td className="px-3 py-1.5 font-mono">
                                            {i.installment_no}
                                        </td>
                                        <td className="px-3 py-1.5 text-right tabular-nums">
                                            {fmt(i.amount)}
                                        </td>
                                        <td className="px-3 py-1.5 font-mono">
                                            {i.cheque_no || "—"}
                                        </td>
                                        <td className="px-3 py-1.5 text-xs">
                                            {fmtDate(i.received_date)}
                                        </td>
                                        <td className="px-3 py-1.5">
                                            <span
                                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                    i.status === "received"
                                                        ? "bg-emerald-100 text-emerald-800"
                                                        : i.status === "failed"
                                                          ? "bg-red-100 text-red-800"
                                                          : "bg-amber-100 text-amber-800"
                                                }`}
                                            >
                                                {i.status}
                                            </span>
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

// ─────────────────────────────────────────────────────────────
// NOTES
// ─────────────────────────────────────────────────────────────
function NotesTab({ scholarshipId }) {
    const toast = useToast();
    const confirm = useConfirm();
    const qc = useQueryClient();
    const [body, setBody] = useState("");

    const { data: notes = [], isLoading } = useQuery({
        queryKey: ["scholarship-notes", scholarshipId],
        queryFn: () => fetchScholarshipNotes(scholarshipId),
    });

    const addMutation = useMutation({
        mutationFn: (text) => addScholarshipNote(scholarshipId, text),
        onSuccess: () => {
            setBody("");
            qc.invalidateQueries({
                queryKey: ["scholarship-notes", scholarshipId],
            });
            toast.success("Note added");
        },
        onError: (e) =>
            toast.error(e?.response?.data?.message ?? "Could not add note"),
    });

    const delMutation = useMutation({
        mutationFn: (noteId) => deleteScholarshipNote(scholarshipId, noteId),
        onSuccess: () => {
            qc.invalidateQueries({
                queryKey: ["scholarship-notes", scholarshipId],
            });
            toast.success("Note deleted");
        },
        onError: () => toast.error("Could not delete"),
    });

    const submit = (e) => {
        e.preventDefault();
        if (!body.trim()) return;
        addMutation.mutate(body.trim());
    };

    return (
        <div className="p-5 space-y-4">
            <form
                onSubmit={submit}
                className="bg-slate-50 border border-slate-200 rounded-lg p-3"
            >
                <textarea
                    rows={3}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Add a management comment about this student / scholarship…"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-700"
                />
                <div className="flex justify-end mt-2">
                    <button
                        type="submit"
                        disabled={!body.trim() || addMutation.isPending}
                        className="bg-purple-700 hover:bg-purple-800 text-white px-4 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-60"
                    >
                        {addMutation.isPending ? "Adding…" : "Add Note"}
                    </button>
                </div>
            </form>

            {isLoading && (
                <p className="text-xs text-slate-500">Loading notes…</p>
            )}
            {!isLoading && notes.length === 0 && (
                <p className="text-xs text-slate-500 italic text-center py-4">
                    No notes yet.
                </p>
            )}

            <div className="space-y-2">
                {notes.map((n) => (
                    <div
                        key={n.id}
                        className="bg-white border border-slate-200 rounded-lg p-3 text-sm"
                    >
                        <div className="flex justify-between items-start gap-2 mb-1">
                            <div className="text-xs text-slate-500">
                                <strong className="text-slate-700">
                                    {n.user_email ?? "system"}
                                </strong>
                                <span className="mx-1">·</span>
                                {fmtDateTime(n.created_at)}
                            </div>
                            <button
                                onClick={async () => {
                                    const ok = await confirm({
                                        title: "Delete note?",
                                        message: "This cannot be undone.",
                                        confirmLabel: "Delete",
                                        danger: true,
                                    });
                                    if (ok) delMutation.mutate(n.id);
                                }}
                                className="text-red-600 hover:text-red-800 text-xs font-semibold"
                            >
                                Delete
                            </button>
                        </div>
                        <div className="whitespace-pre-wrap text-slate-800">
                            {n.body}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// DOCUMENTS
// ─────────────────────────────────────────────────────────────
const DOC_CATEGORIES = [
    { value: "approval", label: "Approval Letter" },
    { value: "disbursement", label: "Disbursement / Cheque" },
    { value: "id_card", label: "ID Card / CNIC" },
    { value: "transcript", label: "Transcript" },
    { value: "income_certificate", label: "Income Certificate" },
    { value: "other", label: "Other" },
];

function DocumentsTab({ scholarshipId }) {
    const toast = useToast();
    const confirm = useConfirm();
    const qc = useQueryClient();
    const [file, setFile] = useState(null);
    const [category, setCategory] = useState("other");
    const [description, setDescription] = useState("");
    const [uploading, setUploading] = useState(false);

    const { data: docs = [], isLoading } = useQuery({
        queryKey: ["scholarship-documents", scholarshipId],
        queryFn: () => fetchScholarshipDocuments(scholarshipId),
    });

    const delMutation = useMutation({
        mutationFn: (docId) => deleteScholarshipDocument(scholarshipId, docId),
        onSuccess: () => {
            qc.invalidateQueries({
                queryKey: ["scholarship-documents", scholarshipId],
            });
            toast.success("Document deleted");
        },
        onError: () => toast.error("Could not delete"),
    });

    const submit = async (e) => {
        e.preventDefault();
        if (!file) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("category", category);
            if (description.trim())
                fd.append("description", description.trim());
            await uploadScholarshipDocument(scholarshipId, fd);
            setFile(null);
            setDescription("");
            setCategory("other");
            e.target.reset();
            qc.invalidateQueries({
                queryKey: ["scholarship-documents", scholarshipId],
            });
            toast.success("Document uploaded");
        } catch (err) {
            toast.error(err?.response?.data?.message ?? "Upload failed");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="p-5 space-y-4">
            <form
                onSubmit={submit}
                className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2"
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                        <label className="block text-[11px] uppercase text-slate-600 font-bold mb-1">
                            File
                        </label>
                        <input
                            type="file"
                            onChange={(e) => setFile(e.target.files[0] || null)}
                            className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-purple-700 file:text-white file:text-xs file:font-semibold hover:file:bg-purple-800"
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] uppercase text-slate-600 font-bold mb-1">
                            Category
                        </label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs"
                        >
                            {DOC_CATEGORIES.map((c) => (
                                <option key={c.value} value={c.value}>
                                    {c.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-[11px] uppercase text-slate-600 font-bold mb-1">
                        Description (optional)
                    </label>
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g. Signed approval from PMLTC dated 15-Sep-2025"
                        className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs"
                    />
                </div>
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={!file || uploading}
                        className="bg-purple-700 hover:bg-purple-800 text-white px-4 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-60"
                    >
                        {uploading ? "Uploading…" : "Upload Document"}
                    </button>
                </div>
            </form>

            {isLoading && (
                <p className="text-xs text-slate-500">Loading documents…</p>
            )}
            {!isLoading && docs.length === 0 && (
                <p className="text-xs text-slate-500 italic text-center py-4">
                    No documents uploaded yet.
                </p>
            )}

            <div className="space-y-2">
                {docs.map((d) => (
                    <div
                        key={d.id}
                        className="bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-3"
                    >
                        <div className="w-9 h-9 rounded-lg bg-slate-100 grid place-items-center text-slate-500 text-lg font-bold">
                            {d.mime_type?.includes("pdf")
                                ? "📄"
                                : d.mime_type?.startsWith("image/")
                                  ? "🖼️"
                                  : "📎"}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold truncate">
                                {d.original_name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                                <span className="uppercase font-bold">
                                    {d.category.replace(/_/g, " ")}
                                </span>
                                <span className="mx-1">·</span>
                                {fmtBytes(d.size_bytes)}
                                <span className="mx-1">·</span>
                                {fmtDateTime(d.created_at)}
                            </div>
                            {d.description && (
                                <div className="text-xs text-slate-600 mt-0.5 truncate">
                                    {d.description}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col gap-1 items-end whitespace-nowrap">
                            <a
                                href={documentDownloadUrl(scholarshipId, d.id)}
                                className="text-blue-700 text-xs font-semibold hover:underline"
                            >
                                Download
                            </a>
                            <button
                                onClick={async () => {
                                    const ok = await confirm({
                                        title: `Delete "${d.original_name}"?`,
                                        message:
                                            "File will be permanently removed.",
                                        confirmLabel: "Delete",
                                        danger: true,
                                    });
                                    if (ok) delMutation.mutate(d.id);
                                }}
                                className="text-red-600 text-xs font-semibold hover:underline"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// HISTORY
// ─────────────────────────────────────────────────────────────
function HistoryTab({ scholarshipId }) {
    const { data: logs = [], isLoading } = useQuery({
        queryKey: ["scholarship-history", scholarshipId],
        queryFn: () => fetchScholarshipHistory(scholarshipId),
    });

    const ACTION_TONE = {
        created: "bg-emerald-100 text-emerald-800",
        updated: "bg-blue-100 text-blue-800",
        deleted: "bg-red-100 text-red-800",
        bulk_updated: "bg-amber-100 text-amber-800",
        rolled_over: "bg-purple-100 text-purple-800",
    };

    return (
        <div className="p-5">
            {isLoading && (
                <p className="text-xs text-slate-500">Loading history…</p>
            )}
            {!isLoading && logs.length === 0 && (
                <p className="text-xs text-slate-500 italic text-center py-4">
                    No history yet.
                </p>
            )}
            <ol className="relative border-l-2 border-slate-200 ml-2">
                {logs.map((log) => {
                    const changes = diffOf(log);
                    return (
                        <li key={log.id} className="mb-4 ml-4">
                            <div className="absolute -left-[7px] w-3 h-3 bg-purple-700 rounded-full mt-1.5 border-2 border-white"></div>
                            <div className="text-xs text-slate-500">
                                {fmtDateTime(log.created_at)} ·{" "}
                                {log.user_email ?? "system"}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ACTION_TONE[log.action] ?? "bg-slate-100"}`}
                                >
                                    {log.action}
                                </span>
                                {log.description && (
                                    <span className="text-xs text-slate-600">
                                        {log.description}
                                    </span>
                                )}
                            </div>
                            {changes.length > 0 && (
                                <div className="mt-1.5 bg-slate-50 border border-slate-200 rounded p-2 text-[11px] font-mono space-y-0.5">
                                    {changes.map((c, i) => (
                                        <div
                                            key={i}
                                            className="flex flex-wrap gap-1"
                                        >
                                            <span className="text-slate-500">
                                                {c.field}:
                                            </span>
                                            <span className="text-red-600 line-through">
                                                {String(c.old ?? "∅")}
                                            </span>
                                            <span>→</span>
                                            <span className="text-emerald-700">
                                                {String(c.new ?? "∅")}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}

function diffOf(log) {
    if (!log.old_values || !log.new_values) return [];
    const fields = new Set([
        ...Object.keys(log.old_values),
        ...Object.keys(log.new_values),
    ]);
    return [...fields]
        .map((f) => ({
            field: f,
            old: log.old_values[f],
            new: log.new_values[f],
        }))
        .filter((c) => JSON.stringify(c.old) !== JSON.stringify(c.new));
}

// ─────────────────────────────────────────────────────────────
// RELATED
// ─────────────────────────────────────────────────────────────
function RelatedTab({ scholarship, onEdit }) {
    const { data: related = [], isLoading } = useQuery({
        queryKey: ["scholarship-related", scholarship.id],
        queryFn: () => fetchScholarshipRelated(scholarship.id),
    });

    return (
        <div className="p-5 space-y-3">
            <p className="text-xs text-slate-500">
                All other scholarship records for the same student (matched by
                CNIC or Student ID).
            </p>

            {isLoading && <p className="text-xs text-slate-500">Loading…</p>}
            {!isLoading && related.length === 0 && (
                <p className="text-xs text-slate-500 italic text-center py-4">
                    No other scholarships on record for this student.
                </p>
            )}

            {related.map((r) => (
                <div
                    key={r.id}
                    className="bg-white border border-slate-200 rounded-lg p-3"
                >
                    <div className="flex justify-between items-start gap-2 flex-wrap mb-1">
                        <div>
                            <div className="text-sm font-semibold">
                                {r.scheme}{" "}
                                <span className="text-xs text-slate-500 font-normal">
                                    ({r.academic_year})
                                </span>
                            </div>
                            <div className="text-xs text-slate-500">
                                {r.donor} ·{" "}
                                <span className="capitalize">{r.category}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-bold tabular-nums">
                                PKR {fmt(r.approved_amount)}
                            </div>
                            <StatusBadge
                                kind="payment"
                                value={r.payment_status}
                            />
                        </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                        <button
                            onClick={() => onEdit(r.id)}
                            className="text-blue-700 text-xs font-semibold hover:underline"
                        >
                            Open →
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
