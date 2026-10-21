import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmContext";

const TABS = [
    { key: "scheme", label: "Schemes" },
    { key: "donor", label: "Donors" },
    { key: "academic_year", label: "Academic Years" },
];

export default function Lookups() {
    const toast = useToast();
    const confirm = useConfirm();
    const qc = useQueryClient();
    const [tab, setTab] = useState("scheme");
    const [newName, setNewName] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState("");

    const { data = [], isLoading } = useQuery({
        queryKey: ["lookups", tab, "admin"],
        queryFn: () =>
            api
                .get("/lookups", {
                    params: { type: tab, include_inactive: 1, with_usage: 1 },
                })
                .then((r) => r.data.data),
    });

    // Fetch all three counts for tab labels
    const { data: allCounts = {} } = useQuery({
        queryKey: ["lookups-counts"],
        queryFn: async () => {
            const [schemes, donors, years] = await Promise.all([
                api
                    .get("/lookups", {
                        params: { type: "scheme", include_inactive: 1 },
                    })
                    .then((r) => r.data.data),
                api
                    .get("/lookups", {
                        params: { type: "donor", include_inactive: 1 },
                    })
                    .then((r) => r.data.data),
                api
                    .get("/lookups", {
                        params: { type: "academic_year", include_inactive: 1 },
                    })
                    .then((r) => r.data.data),
            ]);
            return {
                scheme: schemes.length,
                donor: donors.length,
                academic_year: years.length,
            };
        },
        staleTime: 30_000,
    });

    const invalidate = () => {
        qc.invalidateQueries({ queryKey: ["lookups"] });
    };

    const addMutation = useMutation({
        mutationFn: (name) => api.post("/lookups", { type: tab, name }),
        onSuccess: (_, name) => {
            toast.success(`"${name}" added`);
            setNewName("");
            invalidate();
        },
        onError: (e) => toast.error(e?.response?.data?.message ?? "Add failed"),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, patch }) => api.put(`/lookups/${id}`, patch),
        onSuccess: () => {
            toast.success("Updated");
            setEditingId(null);
            invalidate();
            qc.invalidateQueries({ queryKey: ["scholarships"] });
        },
        onError: (e) =>
            toast.error(e?.response?.data?.message ?? "Update failed"),
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/lookups/${id}`),
        onSuccess: () => {
            toast.success("Deleted");
            invalidate();
        },
        onError: (e) =>
            toast.error(e?.response?.data?.message ?? "Delete failed"),
    });

    const handleAdd = (e) => {
        e.preventDefault();
        const name = newName.trim();
        if (!name) return;
        addMutation.mutate(name);
    };

    const startEdit = (item) => {
        setEditingId(item.id);
        setEditValue(item.name);
    };

    const commitEdit = (item) => {
        const name = editValue.trim();
        if (!name || name === item.name) {
            setEditingId(null);
            return;
        }
        updateMutation.mutate({ id: item.id, patch: { name } });
    };

    const toggleActive = (item) => {
        updateMutation.mutate({ id: item.id, patch: { active: !item.active } });
    };

    const move = (item, direction) => {
        const idx = data.findIndex((x) => x.id === item.id);
        const newIdx = idx + direction;
        if (newIdx < 0 || newIdx >= data.length) return;

        const reordered = [...data];
        [reordered[idx], reordered[newIdx]] = [
            reordered[newIdx],
            reordered[idx],
        ];

        api.post("/lookups/reorder", { order: reordered.map((x) => x.id) })
            .then(() => invalidate())
            .catch(() => toast.error("Reorder failed"));
    };

    const remove = async (item) => {
        if (item.usage_count > 0) {
            const ok = await confirm({
                title: `Delete "${item.name}"?`,
                message: `${item.usage_count} record(s) still use this value.\n\nDeleting it will NOT change those records — the value will just stop appearing in dropdowns.`,
                confirmLabel: "Delete anyway",
                danger: true,
            });
            if (!ok) return;
            deleteMutation.mutate(item.id);
        } else {
            const ok = await confirm({
                title: `Delete "${item.name}"?`,
                message: "This cannot be undone.",
                confirmLabel: "Delete",
                danger: true,
            });
            if (ok) deleteMutation.mutate(item.id);
        }
    };

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="px-5 py-4 border-b">
                    <h2 className="font-semibold">Manage Lookups</h2>
                    <p className="text-xs text-slate-500 mt-1">
                        The values available in every Scheme, Donor, Academic
                        Year, and Funding Group field. Changes apply immediately
                        across all forms.
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200">
                    {TABS.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => {
                                setTab(t.key);
                                setEditingId(null);
                                setNewName("");
                            }}
                            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                                tab === t.key
                                    ? "border-emerald-700 text-emerald-800"
                                    : "border-transparent text-slate-500 hover:text-slate-900"
                            }`}
                        >
                            {t.label}
                            <span className="ml-2 text-xs text-slate-400">
                                ({allCounts[t.key] ?? "…"})
                            </span>
                        </button>
                    ))}
                </div>

                {/* Add new */}
                <form
                    onSubmit={handleAdd}
                    className="px-5 py-3 border-b bg-slate-50 flex gap-2"
                >
                    <input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder={`Add new ${labelFor(tab)}…`}
                        className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-700"
                    />
                    <button
                        type="submit"
                        disabled={!newName.trim() || addMutation.isPending}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                    >
                        {addMutation.isPending ? "Adding…" : "+ Add"}
                    </button>
                </form>

                {/* Table */}
                <div className="overflow-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
                            <tr>
                                <th className="text-left px-4 py-2 w-16">
                                    Order
                                </th>
                                <th className="text-left px-4 py-2">Name</th>
                                <th className="text-left px-4 py-2 w-32">
                                    Used by
                                </th>
                                <th className="text-left px-4 py-2 w-28">
                                    State
                                </th>
                                <th className="text-right px-4 py-2 w-48">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="p-6 text-center text-slate-500"
                                    >
                                        Loading…
                                    </td>
                                </tr>
                            )}
                            {!isLoading && data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="p-6 text-center text-slate-500"
                                    >
                                        Nothing here yet. Add one above.
                                    </td>
                                </tr>
                            )}
                            {data.map((item, i) => (
                                <tr
                                    key={item.id}
                                    className="border-t hover:bg-slate-50/50"
                                >
                                    <td className="px-4 py-2">
                                        <div className="flex flex-col gap-0.5">
                                            <button
                                                onClick={() => move(item, -1)}
                                                disabled={i === 0}
                                                className="text-slate-400 hover:text-slate-700 disabled:opacity-30 text-xs leading-none"
                                            >
                                                ▲
                                            </button>
                                            <button
                                                onClick={() => move(item, 1)}
                                                disabled={i === data.length - 1}
                                                className="text-slate-400 hover:text-slate-700 disabled:opacity-30 text-xs leading-none"
                                            >
                                                ▼
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2">
                                        {editingId === item.id ? (
                                            <input
                                                autoFocus
                                                value={editValue}
                                                onChange={(e) =>
                                                    setEditValue(e.target.value)
                                                }
                                                onBlur={() => commitEdit(item)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter")
                                                        commitEdit(item);
                                                    if (e.key === "Escape")
                                                        setEditingId(null);
                                                }}
                                                className="w-full border border-emerald-400 rounded px-2 py-1 text-sm"
                                            />
                                        ) : (
                                            <span
                                                onDoubleClick={() =>
                                                    startEdit(item)
                                                }
                                                className="cursor-text"
                                                title="Double-click to edit"
                                            >
                                                {item.name}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2">
                                        <span
                                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                                item.usage_count > 0
                                                    ? "bg-blue-100 text-blue-800"
                                                    : "bg-slate-100 text-slate-500"
                                            }`}
                                        >
                                            {item.usage_count} record
                                            {item.usage_count === 1 ? "" : "s"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2">
                                        <button
                                            onClick={() => toggleActive(item)}
                                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                                                item.active
                                                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                                    : "bg-slate-100 text-slate-500 border-slate-200"
                                            }`}
                                        >
                                            {item.active
                                                ? "Active"
                                                : "Inactive"}
                                        </button>
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <div className="flex gap-2 justify-end">
                                            {editingId === item.id ? (
                                                <>
                                                    <button
                                                        onClick={() =>
                                                            commitEdit(item)
                                                        }
                                                        className="text-emerald-700 text-xs font-semibold hover:underline"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            setEditingId(null)
                                                        }
                                                        className="text-slate-500 text-xs font-semibold hover:underline"
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() =>
                                                            startEdit(item)
                                                        }
                                                        className="text-blue-700 text-xs font-semibold hover:underline"
                                                    >
                                                        Rename
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            remove(item)
                                                        }
                                                        className="text-red-700 text-xs font-semibold hover:underline"
                                                    >
                                                        Delete
                                                    </button>
                                                </>
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

function labelFor(type) {
    return (
        { scheme: "scheme", donor: "donor", academic_year: "academic year" }[
            type
        ] || type
    );
}
