import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    fetchAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
} from "../services/scholarships";
import AnnouncementDocumentsModal from "../components/AnnouncementDocumentsModal";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmContext";

const CAT = {
    announcement: "bg-blue-50 text-blue-700 border-blue-200",
    deadline: "bg-amber-50 text-amber-700 border-amber-200",
    guidance: "bg-purple-50 text-purple-700 border-purple-200",
    renewal: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const fmtDate = (s) =>
    s
        ? new Date(s).toLocaleDateString("en-PK", {
              year: "numeric",
              month: "short",
              day: "numeric",
          })
        : "—";

export default function Support() {
    const toast = useToast();
    const confirm = useConfirm();
    const qc = useQueryClient();
    const [category, setCategory] = useState("");
    const [published, setPublished] = useState("");
    const [editing, setEditing] = useState(null);
    const [open, setOpen] = useState(false);
    const [docsFor, setDocsFor] = useState(null);

    const { data = [], isLoading } = useQuery({
        queryKey: ["announcements", { category, published }],
        queryFn: () =>
            fetchAnnouncements({
                category,
                ...(published && {
                    published: published === "published" ? "1" : "0",
                }),
            }),
    });

    const del = useMutation({
        mutationFn: deleteAnnouncement,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["announcements"] });
            toast.success("Deleted");
        },
    });

    const save = useMutation({
        mutationFn: (a) =>
            a.id ? updateAnnouncement(a.id, a) : createAnnouncement(a),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["announcements"] });
            setOpen(false);
            setEditing(null);
            toast.success("Saved");
        },
        onError: (e) =>
            toast.error(e?.response?.data?.message ?? "Save failed"),
    });

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    Student Support
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    Announcements, deadlines, guidance, and renewal information
                </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 flex flex-wrap items-center gap-2 border-b border-slate-100">
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                    >
                        <option value="">All categories</option>
                        <option value="announcement">Announcement</option>
                        <option value="deadline">Deadline</option>
                        <option value="guidance">Application Guidance</option>
                        <option value="renewal">Renewal Information</option>
                    </select>
                    <select
                        value={published}
                        onChange={(e) => setPublished(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                    >
                        <option value="">All</option>
                        <option value="published">Published</option>
                        <option value="draft">Unpublished</option>
                    </select>
                    <button
                        onClick={() => {
                            setEditing(null);
                            setOpen(true);
                        }}
                        className="ml-auto bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-lg text-sm font-bold"
                    >
                        + Add Item
                    </button>
                </div>

                {isLoading ? (
                    <div className="p-8 text-center text-sm text-slate-500">
                        Loading…
                    </div>
                ) : data.length === 0 ? (
                    <div className="py-16 text-center">
                        <div className="w-16 h-16 mx-auto rounded-full bg-slate-50 grid place-items-center text-3xl mb-4">
                            🎓
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">
                            No content yet
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                            Add announcements, deadlines, or guidance for
                            students.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase tracking-wider">
                                <tr>
                                    {[
                                        "Title",
                                        "Category",
                                        "Deadline",
                                        "State",
                                        "Documents",
                                        "Content",
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
                                {data.map((a) => (
                                    <tr
                                        key={a.id}
                                        className="border-t border-slate-100 hover:bg-slate-50/70 align-top"
                                    >
                                        <td className="px-4 py-2.5 font-semibold text-slate-800 max-w-[240px]">
                                            {a.title}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span
                                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${CAT[a.category]}`}
                                            >
                                                {a.category}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">
                                            {a.deadline
                                                ? fmtDate(a.deadline)
                                                : "—"}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span
                                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                                                    a.published
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                        : "bg-slate-100 text-slate-600 border-slate-200"
                                                }`}
                                            >
                                                {a.published
                                                    ? "Published"
                                                    : "Draft"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <button
                                                onClick={() => setDocsFor(a)}
                                                className="text-xs font-bold text-purple-700 hover:bg-purple-50 px-2 py-1 rounded"
                                            >
                                                📎 Manage
                                            </button>
                                        </td>
                                        <td className="px-4 py-2.5 max-w-[300px] text-xs text-slate-600">
                                            {a.body.slice(0, 100)}
                                            {a.body.length > 100 ? "…" : ""}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => {
                                                        setEditing(a);
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
                                                                title: "Delete?",
                                                                message:
                                                                    "Also deletes attached documents.",
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
            </div>

            {open && (
                <AnnouncementModal
                    initial={editing}
                    onClose={() => {
                        setOpen(false);
                        setEditing(null);
                    }}
                    onSave={(a) => save.mutate(a)}
                />
            )}
            {docsFor && (
                <AnnouncementDocumentsModal
                    announcement={docsFor}
                    onClose={() => setDocsFor(null)}
                />
            )}
        </div>
    );
}

function AnnouncementModal({ initial, onClose, onSave }) {
    const [form, setForm] = useState(
        initial ?? {
            title: "",
            category: "announcement",
            deadline: "",
            published: true,
            body: "",
        },
    );
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    return (
        <div
            className="fixed inset-0 bg-slate-900/50 z-50 flex items-start justify-center p-4 overflow-auto"
            onClick={onClose}
        >
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    onSave({ ...form, deadline: form.deadline || null });
                }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mt-10 overflow-hidden"
            >
                <div className="px-5 py-3.5 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">
                        {initial ? "Edit Item" : "Add Student Support Item"}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-900 text-xl leading-none px-2"
                    >
                        ✕
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    <F label="Title *">
                        <input
                            required
                            value={form.title}
                            onChange={(e) => set("title", e.target.value)}
                            className="inp"
                        />
                    </F>
                    <div className="grid grid-cols-2 gap-4">
                        <F label="Category *">
                            <select
                                value={form.category}
                                onChange={(e) =>
                                    set("category", e.target.value)
                                }
                                className="inp"
                            >
                                <option value="announcement">
                                    Announcement
                                </option>
                                <option value="deadline">Deadline</option>
                                <option value="guidance">
                                    Application Guidance
                                </option>
                                <option value="renewal">
                                    Renewal Information
                                </option>
                            </select>
                        </F>
                        <F label="Deadline">
                            <input
                                type="date"
                                value={form.deadline ?? ""}
                                onChange={(e) =>
                                    set("deadline", e.target.value)
                                }
                                className="inp"
                            />
                        </F>
                    </div>
                    <F label="Content *">
                        <textarea
                            rows={5}
                            required
                            value={form.body}
                            onChange={(e) => set("body", e.target.value)}
                            className="inp"
                        />
                    </F>
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={!!form.published}
                            onChange={(e) => set("published", e.target.checked)}
                        />{" "}
                        Published to students
                    </label>
                </div>
                <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="border border-slate-300 px-4 py-2 rounded-lg text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-lg text-sm font-bold"
                    >
                        Save
                    </button>
                </div>
                <style>{`.inp{width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:8px 10px;font-size:14px;outline:none}.inp:focus{border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,58,237,.15)}`}</style>
            </form>
        </div>
    );
}

function F({ label, children }) {
    return (
        <div>
            <label className="block text-[11px] uppercase tracking-wider font-bold text-slate-600 mb-1">
                {label}
            </label>
            {children}
        </div>
    );
}
