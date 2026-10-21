import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    fetchAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
} from "../services/scholarships";

const CAT = {
    announcement: "bg-blue-100 text-blue-800 border-blue-200",
    deadline: "bg-amber-100 text-amber-800 border-amber-200",
    guidance: "bg-purple-100 text-purple-800 border-purple-200",
    renewal: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export default function Support() {
    const qc = useQueryClient();
    const [category, setCategory] = useState("");
    const [published, setPublished] = useState("");
    const [editing, setEditing] = useState(null);
    const [open, setOpen] = useState(false);

    const { data, isLoading } = useQuery({
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
        onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
    });

    const save = useMutation({
        mutationFn: (a) =>
            a.id ? updateAnnouncement(a.id, a) : createAnnouncement(a),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["announcements"] });
            setOpen(false);
            setEditing(null);
        },
    });

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="px-5 py-4 border-b flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold mr-2">
                        Student Support Content
                    </h2>
                    <div className="flex-1" />
                    <button
                        className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                        onClick={() => {
                            setEditing(null);
                            setOpen(true);
                        }}
                    >
                        + Add Item
                    </button>
                </div>

                <div className="px-5 py-3 border-b flex flex-wrap gap-2 bg-slate-50">
                    <select
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                    >
                        <option value="">All categories</option>
                        <option value="announcement">Announcement</option>
                        <option value="deadline">Deadline</option>
                        <option value="guidance">Application Guidance</option>
                        <option value="renewal">Renewal Information</option>
                    </select>
                    <select
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                        value={published}
                        onChange={(e) => setPublished(e.target.value)}
                    >
                        <option value="">All</option>
                        <option value="published">Published</option>
                        <option value="draft">Unpublished</option>
                    </select>
                </div>

                <div className="overflow-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
                            <tr>
                                {[
                                    "Title",
                                    "Category",
                                    "Deadline",
                                    "State",
                                    "Content",
                                    "Actions",
                                ].map((h) => (
                                    <th key={h} className="text-left px-4 py-2">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="p-6 text-center text-slate-500"
                                    >
                                        Loading…
                                    </td>
                                </tr>
                            )}
                            {data?.map((a) => (
                                <tr key={a.id} className="border-t align-top">
                                    <td className="px-4 py-2 font-semibold">
                                        {a.title}
                                    </td>
                                    <td className="px-4 py-2">
                                        <span
                                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${CAT[a.category]}`}
                                        >
                                            {a.category}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 font-mono text-xs">
                                        {a.deadline ?? "—"}
                                    </td>
                                    <td className="px-4 py-2">
                                        <span
                                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                                                a.published
                                                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                                    : "bg-slate-100 text-slate-700 border-slate-200"
                                            }`}
                                        >
                                            {a.published
                                                ? "Published"
                                                : "Draft"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 max-w-[340px] text-xs text-slate-600">
                                        {a.body.slice(0, 140)}
                                        {a.body.length > 140 ? "…" : ""}
                                    </td>
                                    <td className="px-4 py-2">
                                        <div className="flex gap-2">
                                            <button
                                                className="text-blue-700 text-xs font-semibold hover:underline"
                                                onClick={() => {
                                                    setEditing(a);
                                                    setOpen(true);
                                                }}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="text-red-700 text-xs font-semibold hover:underline"
                                                onClick={() =>
                                                    confirm(
                                                        "Delete this item?",
                                                    ) && del.mutate(a.id)
                                                }
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
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-start justify-center p-4 overflow-auto">
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    onSave(form);
                }}
                className="bg-white rounded-xl shadow-xl w-full max-w-2xl mt-10"
            >
                <div className="px-5 py-3 border-b flex justify-between items-center">
                    <h3 className="font-semibold">
                        {initial ? "Edit Item" : "Add Student Support Item"}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-500 hover:text-slate-900"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold mb-1">
                            Title *
                        </label>
                        <input
                            className="w-full border rounded-lg px-3 py-2"
                            required
                            value={form.title}
                            onChange={(e) => set("title", e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold mb-1">
                                Category *
                            </label>
                            <select
                                className="w-full border rounded-lg px-3 py-2"
                                value={form.category}
                                onChange={(e) =>
                                    set("category", e.target.value)
                                }
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
                        </div>
                        <div>
                            <label className="block text-xs font-semibold mb-1">
                                Deadline
                            </label>
                            <input
                                type="date"
                                className="w-full border rounded-lg px-3 py-2"
                                value={form.deadline ?? ""}
                                onChange={(e) =>
                                    set("deadline", e.target.value)
                                }
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold mb-1">
                            Content *
                        </label>
                        <textarea
                            rows={5}
                            className="w-full border rounded-lg px-3 py-2"
                            required
                            value={form.body}
                            onChange={(e) => set("body", e.target.value)}
                        />
                    </div>

                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={!!form.published}
                            onChange={(e) => set("published", e.target.checked)}
                        />
                        Published to students
                    </label>
                </div>

                <div className="px-5 py-3 border-t flex justify-end gap-2 bg-slate-50 rounded-b-xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="border px-4 py-2 rounded-lg text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                    >
                        Save
                    </button>
                </div>
            </form>
        </div>
    );
}
