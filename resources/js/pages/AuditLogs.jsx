import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import Pagination from "../components/Pagination";

const ACTION_TONE = {
    created: "bg-emerald-100 text-emerald-800",
    updated: "bg-blue-100 text-blue-800",
    deleted: "bg-red-100 text-red-800",
    promoted: "bg-purple-100 text-purple-800",
    bulk_updated: "bg-amber-100 text-amber-800",
};

const fmtDate = (s) =>
    new Date(s).toLocaleString("en-PK", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

export default function AuditLogs() {
    const [search, setSearch] = useState("");
    const [action, setAction] = useState("");
    const [modelType, setModelType] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(50);
    const [expanded, setExpanded] = useState(null);

    const { data, isLoading } = useQuery({
        queryKey: [
            "audit-logs",
            { search, action, modelType, from, to, page, perPage },
        ],
        queryFn: () =>
            api
                .get("/audit-logs", {
                    params: {
                        search,
                        action,
                        model_type: modelType,
                        from,
                        to,
                        page,
                        per_page: perPage,
                    },
                })
                .then((r) => r.data),
        keepPreviousData: true,
        retry: false,
    });

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="px-5 py-4 border-b">
                    <h2 className="font-semibold">Audit Log</h2>
                    <p className="text-xs text-slate-500 mt-1">
                        Every create, update, and delete — who did it, when,
                        from where, and what changed.
                    </p>
                </div>

                <div className="px-5 py-3 border-b flex flex-wrap gap-2 bg-slate-50">
                    <input
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]"
                        placeholder="Search user email, model, description…"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                    />
                    <select
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                        value={action}
                        onChange={(e) => {
                            setAction(e.target.value);
                            setPage(1);
                        }}
                    >
                        <option value="">All actions</option>
                        <option value="created">Created</option>
                        <option value="updated">Updated</option>
                        <option value="deleted">Deleted</option>
                        <option value="promoted">Promoted</option>
                        <option value="bulk_updated">Bulk updated</option>
                    </select>
                    <select
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                        value={modelType}
                        onChange={(e) => {
                            setModelType(e.target.value);
                            setPage(1);
                        }}
                    >
                        <option value="">All models</option>
                        <option value="Scholarship">Scholarship</option>
                        <option value="Application">Application</option>
                        <option value="Announcement">Announcement</option>
                    </select>
                    <input
                        type="date"
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                        value={from}
                        onChange={(e) => {
                            setFrom(e.target.value);
                            setPage(1);
                        }}
                        title="From"
                    />
                    <input
                        type="date"
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                        value={to}
                        onChange={(e) => {
                            setTo(e.target.value);
                            setPage(1);
                        }}
                        title="To"
                    />
                    <button
                        className="border border-slate-300 px-3 py-2 rounded-lg text-sm hover:bg-slate-100"
                        onClick={() => {
                            setSearch("");
                            setAction("");
                            setModelType("");
                            setFrom("");
                            setTo("");
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
                                    "When",
                                    "User",
                                    "Action",
                                    "Model",
                                    "Record",
                                    "IP",
                                    "Details",
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
                                        colSpan={7}
                                        className="p-6 text-center text-slate-500"
                                    >
                                        Loading…
                                    </td>
                                </tr>
                            )}
                            {!isLoading &&
                                (!data || data.data.length === 0) && (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="p-6 text-center text-slate-500"
                                        >
                                            No audit entries yet. Edit a
                                            scholarship, application, or
                                            announcement to see entries appear.
                                        </td>
                                    </tr>
                                )}
                            {data?.data.map((log) => {
                                const changes = diffOf(log);
                                return (
                                    <tr
                                        key={log.id}
                                        className="border-t align-top"
                                    >
                                        <td className="px-4 py-2 text-xs whitespace-nowrap">
                                            {fmtDate(log.created_at)}
                                        </td>
                                        <td className="px-4 py-2 text-xs">
                                            {log.user_email ?? "system"}
                                        </td>
                                        <td className="px-4 py-2">
                                            <span
                                                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${ACTION_TONE[log.action] ?? "bg-slate-100 text-slate-700"}`}
                                            >
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-xs font-mono">
                                            {log.model_type.split("\\").pop()}
                                        </td>
                                        <td className="px-4 py-2 text-xs font-mono">
                                            #{log.model_id ?? "—"}
                                        </td>
                                        <td className="px-4 py-2 text-xs text-slate-500">
                                            {log.ip_address ?? "—"}
                                        </td>
                                        <td className="px-4 py-2">
                                            {changes.length > 0 ? (
                                                <>
                                                    <button
                                                        className="text-blue-700 text-xs font-semibold hover:underline"
                                                        onClick={() =>
                                                            setExpanded(
                                                                expanded ===
                                                                    log.id
                                                                    ? null
                                                                    : log.id,
                                                            )
                                                        }
                                                    >
                                                        {changes.length} change
                                                        {changes.length === 1
                                                            ? ""
                                                            : "s"}{" "}
                                                        {expanded === log.id
                                                            ? "▲"
                                                            : "▼"}
                                                    </button>
                                                    {expanded === log.id && (
                                                        <div className="mt-2 bg-slate-50 rounded p-2 border border-slate-200 text-xs font-mono space-y-1">
                                                            {changes.map(
                                                                (c, i) => (
                                                                    <div
                                                                        key={i}
                                                                        className="flex gap-2 flex-wrap"
                                                                    >
                                                                        <span className="text-slate-500 min-w-[100px]">
                                                                            {
                                                                                c.field
                                                                            }
                                                                            :
                                                                        </span>
                                                                        <span className="text-red-600 line-through">
                                                                            {String(
                                                                                c.old ??
                                                                                    "∅",
                                                                            )}
                                                                        </span>
                                                                        <span>
                                                                            →
                                                                        </span>
                                                                        <span className="text-emerald-700">
                                                                            {String(
                                                                                c.new ??
                                                                                    "∅",
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                ),
                                                            )}
                                                        </div>
                                                    )}
                                                </>
                                            ) : log.description ? (
                                                <span className="text-xs text-slate-600">
                                                    {log.description}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-400">
                                                    —
                                                </span>
                                            )}
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
