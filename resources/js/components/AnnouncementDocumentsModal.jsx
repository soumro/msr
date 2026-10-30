import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    fetchAnnouncementDocuments,
    uploadAnnouncementDocument,
    deleteAnnouncementDocument,
    announcementDocumentDownloadUrl,
} from "../services/scholarships";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmContext";

const fmtBytes = (n) => {
    n = Number(n) || 0;
    if (n >= 1048576) return (n / 1048576).toFixed(1) + " MB";
    if (n >= 1024) return (n / 1024).toFixed(0) + " KB";
    return n + " B";
};

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

export default function AnnouncementDocumentsModal({ announcement, onClose }) {
    const toast = useToast();
    const confirm = useConfirm();
    const qc = useQueryClient();

    const [file, setFile] = useState(null);
    const [description, setDescription] = useState("");
    const [uploading, setUploading] = useState(false);

    const { data: docs = [], isLoading } = useQuery({
        queryKey: ["announcement-documents", announcement.id],
        queryFn: () => fetchAnnouncementDocuments(announcement.id),
    });

    const delMutation = useMutation({
        mutationFn: (docId) =>
            deleteAnnouncementDocument(announcement.id, docId),
        onSuccess: () => {
            qc.invalidateQueries({
                queryKey: ["announcement-documents", announcement.id],
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
            if (description.trim())
                fd.append("description", description.trim());
            await uploadAnnouncementDocument(announcement.id, fd);
            setFile(null);
            setDescription("");
            e.target.reset();
            qc.invalidateQueries({
                queryKey: ["announcement-documents", announcement.id],
            });
            toast.success("Document uploaded");
        } catch (err) {
            toast.error(err?.response?.data?.message ?? "Upload failed");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-slate-900/50 z-[70] flex items-start justify-center p-4 overflow-auto"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-xl shadow-xl w-full max-w-2xl mt-10"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-5 py-3 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <div>
                        <h3 className="font-semibold">Documents</h3>
                        <p className="text-xs text-slate-500 mt-0.5 truncate max-w-lg">
                            {announcement.title}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-slate-900 text-xl leading-none"
                    >
                        ✕
                    </button>
                </div>

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
                                    onChange={(e) =>
                                        setFile(e.target.files[0] || null)
                                    }
                                    className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-700 file:text-white file:text-xs file:font-semibold hover:file:bg-emerald-800"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] uppercase text-slate-600 font-bold mb-1">
                                    Description
                                </label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) =>
                                        setDescription(e.target.value)
                                    }
                                    placeholder="e.g. Application form, Interview shortlist"
                                    className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={!file || uploading}
                                className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-60"
                            >
                                {uploading ? "Uploading…" : "Upload Document"}
                            </button>
                        </div>
                    </form>

                    {isLoading && (
                        <p className="text-xs text-slate-500">
                            Loading documents…
                        </p>
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
                                          : d.mime_type?.includes("excel") ||
                                              d.mime_type?.includes(
                                                  "spreadsheet",
                                              )
                                            ? "📊"
                                            : "📎"}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold truncate">
                                        {d.original_name}
                                    </div>
                                    <div className="text-[11px] text-slate-500">
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
                                        href={announcementDocumentDownloadUrl(
                                            announcement.id,
                                            d.id,
                                        )}
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
            </div>
        </div>
    );
}
