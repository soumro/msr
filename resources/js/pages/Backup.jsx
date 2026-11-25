import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    fetchBackupList,
    deleteBackupFile,
    restoreFromBackup,
    triggerBackupDownload,
    backupDownloadUrl,
} from "../services/scholarships";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmContext";

const fmtBytes = (n) => {
    n = Number(n) || 0;
    if (n >= 1048576) return (n / 1048576).toFixed(1) + " MB";
    if (n >= 1024) return (n / 1024).toFixed(0) + " KB";
    return n + " B";
};
const fmtDate = (unix) =>
    unix
        ? new Date(unix * 1000).toLocaleString("en-PK", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
          })
        : "—";

export default function Backup() {
    const toast = useToast();
    const confirm = useConfirm();
    const qc = useQueryClient();

    const { data: backups = [], isLoading } = useQuery({
        queryKey: ["backups"],
        queryFn: fetchBackupList,
        staleTime: 10_000,
    });

    const del = useMutation({
        mutationFn: deleteBackupFile,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["backups"] });
            toast.success("Backup deleted");
        },
        onError: () => toast.error("Could not delete"),
    });

    return (
        <div className="space-y-4 max-w-4xl mx-auto">
            {/* Info banner */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl px-5 py-3 text-sm text-purple-900">
                <strong>Backups</strong> capture the full state of your data —
                scholarships, installments, users, lookups, settings,
                announcements, documents metadata. Use <em>JSON</em> for
                reliability. Use <em>SQL</em> for a native MySQL dump (requires
                mysqldump on the server).
            </div>

            {/* Create backup */}
            <Card
                title="Create Backup"
                subtitle="Downloads immediately and saves a copy on the server."
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                        onClick={() => {
                            triggerBackupDownload("json");
                            toast.success("Downloading JSON backup…");
                        }}
                        className="bg-purple-700 hover:bg-purple-800 text-white px-5 py-4 rounded-xl text-sm font-semibold flex items-center gap-3 text-left"
                    >
                        <span className="text-2xl">📦</span>
                        <div>
                            <div className="font-bold">JSON Backup</div>
                            <div className="text-[11px] font-normal text-white/70">
                                Complete data · Works everywhere · Restorable
                            </div>
                        </div>
                    </button>

                    <button
                        onClick={() => {
                            triggerBackupDownload("sql");
                            toast.success("Downloading SQL dump…");
                        }}
                        className="bg-slate-700 hover:bg-slate-800 text-white px-5 py-4 rounded-xl text-sm font-semibold flex items-center gap-3 text-left"
                    >
                        <span className="text-2xl">🗄️</span>
                        <div>
                            <div className="font-bold">SQL Dump</div>
                            <div className="text-[11px] font-normal text-white/70">
                                Native MySQL dump · Needs mysqldump
                            </div>
                        </div>
                    </button>
                </div>
            </Card>

            {/* Existing backups */}
            <Card
                title="Existing Backups"
                subtitle={`${backups.length} file(s) on disk`}
            >
                {isLoading ? (
                    <p className="text-sm text-slate-500">Loading…</p>
                ) : backups.length === 0 ? (
                    <p className="text-sm text-slate-500 italic text-center py-4">
                        No backups yet. Create one above.
                    </p>
                ) : (
                    <div className="overflow-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wide">
                                <tr>
                                    <th className="text-left px-3 py-2">
                                        File
                                    </th>
                                    <th className="text-left px-3 py-2">
                                        Type
                                    </th>
                                    <th className="text-right px-3 py-2">
                                        Size
                                    </th>
                                    <th className="text-left px-3 py-2">
                                        Created
                                    </th>
                                    <th className="text-right px-3 py-2">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {backups.map((b) => (
                                    <tr
                                        key={b.name}
                                        className="border-t hover:bg-slate-50/50"
                                    >
                                        <td className="px-3 py-2 font-mono text-xs break-all">
                                            {b.name}
                                        </td>
                                        <td className="px-3 py-2">
                                            <span
                                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                    b.type === "json"
                                                        ? "bg-purple-100 text-purple-800"
                                                        : "bg-slate-200 text-slate-700"
                                                }`}
                                            >
                                                {b.type.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums text-xs">
                                            {fmtBytes(b.size)}
                                        </td>
                                        <td className="px-3 py-2 text-xs whitespace-nowrap">
                                            {fmtDate(b.created)}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <div className="flex gap-2 justify-end">
                                                <a
                                                    href={backupDownloadUrl(
                                                        b.name,
                                                    )}
                                                    className="text-blue-700 text-xs font-semibold hover:underline"
                                                >
                                                    Download
                                                </a>
                                                <button
                                                    onClick={async () => {
                                                        const ok =
                                                            await confirm({
                                                                title: `Delete ${b.name}?`,
                                                                message:
                                                                    "The file will be permanently removed from the server.",
                                                                confirmLabel:
                                                                    "Delete",
                                                                danger: true,
                                                            });
                                                        if (ok)
                                                            del.mutate(b.name);
                                                    }}
                                                    className="text-red-600 text-xs font-semibold hover:underline"
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
            </Card>

            {/* Restore */}
            <RestoreCard />
        </div>
    );
}

// ============================================================
// Restore card — upload a JSON file
// ============================================================
function RestoreCard() {
    const toast = useToast();
    const confirm = useConfirm();
    const qc = useQueryClient();

    const [file, setFile] = useState(null);
    const [restoreUsers, setRestoreUsers] = useState(false);
    const [wipeCurrent, setWipeCurrent] = useState(true);
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        if (!file) return;

        const ok = await confirm({
            title: "Restore from backup?",
            message: wipeCurrent
                ? "This will DELETE all current data and replace it with the backup.\n\nThis cannot be undone. Continue?"
                : "This will ADD records from the backup on top of existing data. Duplicates may occur. Continue?",
            confirmLabel: "Restore now",
            danger: true,
        });

        if (!ok) return;

        setBusy(true);
        try {
            const res = await restoreFromBackup(file, {
                restore_users: restoreUsers,
                wipe_current: wipeCurrent,
            });
            const summary = Object.entries(res.stats ?? {})
                .map(([t, s]) => `${t}: ${s.inserted ?? 0} rows`)
                .join(", ");
            toast.success(`Restore complete — ${summary}`);
            setFile(null);
            e.target.reset();
            qc.invalidateQueries();
        } catch (err) {
            const msg = err?.response?.data?.message ?? "Restore failed";
            toast.error(msg);
        } finally {
            setBusy(false);
        }
    };

    return (
        // Replace the existing top of each page's return statement with:
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    Restore from Backup
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    Upload a <strong>.json</strong> backup previously created by
                    this app. You can choose to wipe existing data first, or
                    merge the backup with current data.
                </p>
            </div>

            {/* existing content wrapped in: */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* content */}
                <Card
                    title="Restore from Backup"
                    subtitle="Upload a .json backup previously created by this app."
                >
                    <form onSubmit={submit} className="space-y-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Backup file (.json)
                            </label>
                            <input
                                type="file"
                                accept=".json,application/json"
                                onChange={(e) =>
                                    setFile(e.target.files[0] || null)
                                }
                                className="w-full text-xs file:mr-2 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-700 file:text-white file:text-xs file:font-semibold hover:file:bg-purple-800"
                            />
                        </div>

                        <div className="space-y-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <label className="flex items-start gap-2 text-xs text-amber-900 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={wipeCurrent}
                                    onChange={(e) =>
                                        setWipeCurrent(e.target.checked)
                                    }
                                    className="mt-0.5 accent-amber-600"
                                />
                                <span>
                                    <strong>Wipe existing data first</strong> —
                                    recommended for full restore. Uncheck to
                                    merge (rows are inserted alongside current
                                    data — potential duplicates).
                                </span>
                            </label>

                            <label className="flex items-start gap-2 text-xs text-amber-900 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={restoreUsers}
                                    onChange={(e) =>
                                        setRestoreUsers(e.target.checked)
                                    }
                                    className="mt-0.5 accent-amber-600"
                                />
                                <span>
                                    <strong>Restore users too</strong> — leave
                                    off to keep your current login credentials.
                                    Only turn on if you want the exact users
                                    from the backup (and know their passwords).
                                </span>
                            </label>
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={!file || busy}
                                className="bg-purple-700 hover:bg-purple-800 text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
                            >
                                {busy ? "Restoring…" : "Restore Backup"}
                            </button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
}

function Card({ title, subtitle, children }) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-5 py-3 border-b">
                <h3 className="font-semibold text-slate-800">{title}</h3>
                {subtitle && (
                    <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
                )}
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}
