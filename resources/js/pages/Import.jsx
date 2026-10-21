import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    downloadImportTemplate,
    downloadSheetTemplate,
    validateImport,
    commitImport,
    validateSheet,
    commitSheet,
    fetchImportHistory,
} from "../services/scholarships";
import LookupSelect from "../components/LookupSelect";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmContext";

const fmtDate = (s) =>
    s
        ? new Date(s).toLocaleDateString("en-PK", {
              year: "numeric",
              month: "short",
              day: "numeric",
          })
        : "—";

export default function Import() {
    const [mode, setMode] = useState("sheet");
    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="px-5 py-4 border-b">
                    <h2 className="font-semibold">Bulk Import</h2>
                    <p className="text-xs text-slate-500 mt-1">
                        Choose the format that matches your source file.
                    </p>
                </div>
                <div className="flex border-b border-slate-200">
                    <TabBtn
                        active={mode === "sheet"}
                        onClick={() => setMode("sheet")}
                    >
                        📋 Scholarship Sheet (recommended)
                    </TabBtn>
                    <TabBtn
                        active={mode === "full"}
                        onClick={() => setMode("full")}
                    >
                        🗂️ Full Format (advanced)
                    </TabBtn>
                </div>
                {mode === "sheet" && <SheetImporter />}
                {mode === "full" && <FullImporter />}
            </div>
            <ImportHistory />
        </div>
    );
}

function TabBtn({ active, onClick, children }) {
    return (
        <button
            onClick={onClick}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${active ? "border-emerald-700 text-emerald-800" : "border-transparent text-slate-500 hover:text-slate-900"}`}
        >
            {children}
        </button>
    );
}

function SheetImporter() {
    const toast = useToast();
    const confirm = useConfirm();
    const qc = useQueryClient();
    const [context, setContext] = useState({
        scheme: "",
        donor: "",
        academic_year: "",
        category: "renewal",
        funding_group: "",
    });
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [result, setResult] = useState(null);
    const [busy, setBusy] = useState(false);
    const [step, setStep] = useState("context");

    const contextValid =
        context.scheme.trim() &&
        context.donor.trim() &&
        context.academic_year.trim() &&
        context.category;
    const set = (k, v) => setContext((c) => ({ ...c, [k]: v }));

    const handleFile = async (f) => {
        if (!contextValid) {
            toast.error("Fill in scheme, donor, and academic year first.");
            return;
        }
        setFile(f);
        setBusy(true);
        try {
            const res = await validateSheet(f, context);
            setPreview(res);
            setStep("preview");
        } catch (err) {
            toast.error(err?.response?.data?.message ?? "Validation failed.");
        } finally {
            setBusy(false);
        }
    };

    const handleCommit = async () => {
        const ok = await confirm({
            title: "Import this roster?",
            message: `${preview.valid_count} valid row(s) will be created under "${context.scheme}" for ${context.academic_year}.`,
            confirmLabel: "Import now",
        });
        if (!ok) return;
        setBusy(true);
        try {
            const res = await commitSheet(file, context);
            setResult(res);
            setStep("done");
            qc.invalidateQueries({ queryKey: ["scholarships"] });
            qc.invalidateQueries({ queryKey: ["dashboard"] });
            qc.invalidateQueries({ queryKey: ["duplicates"] });
            qc.invalidateQueries({ queryKey: ["import-history"] });
            toast.success(`Imported ${res.imported} records`);
        } catch (err) {
            toast.error(err?.response?.data?.message ?? "Import failed.");
        } finally {
            setBusy(false);
        }
    };

    const reset = (keep = false) => {
        setFile(null);
        setPreview(null);
        setResult(null);
        setStep("context");
        if (!keep)
            setContext({
                scheme: "",
                donor: "",
                academic_year: "",
                category: "renewal",
                funding_group: "",
            });
    };

    return (
        <div className="p-6 space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="font-semibold">
                    {step === "context" && "1. Set the scholarship context"}
                    {step === "preview" && "2. Review & confirm"}
                    {step === "done" && "3. Import complete"}
                </h3>
                <button
                    onClick={downloadSheetTemplate}
                    className="border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                    Download Template
                </button>
            </div>

            {step === "context" && (
                <>
                    <p className="text-xs text-slate-500">
                        The CSV contains student rows only. Values below are
                        applied to every row.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <F label="Scheme" required>
                            <LookupSelect
                                type="scheme"
                                required
                                value={context.scheme}
                                onChange={(v) => set("scheme", v)}
                            />
                        </F>
                        <F label="Donor" required>
                            <LookupSelect
                                type="donor"
                                required
                                value={context.donor}
                                onChange={(v) => set("donor", v)}
                            />
                        </F>
                        <F label="Academic Year" required>
                            <LookupSelect
                                type="academic_year"
                                required
                                value={context.academic_year}
                                onChange={(v) => set("academic_year", v)}
                            />
                        </F>
                        <F label="Funding Group">
                            <LookupSelect
                                type="funding_group"
                                value={context.funding_group}
                                onChange={(v) => set("funding_group", v)}
                            />
                        </F>
                        <F
                            label="Category"
                            required
                            help="Fresh = new applicants. Renewal = continuing students."
                        >
                            <div className="flex gap-2">
                                {["fresh", "renewal"].map((c) => (
                                    <label
                                        key={c}
                                        className={`flex-1 border rounded-lg px-3 py-2 text-sm cursor-pointer flex items-center gap-2 ${context.category === c ? "border-emerald-700 bg-emerald-50 text-emerald-900 font-semibold" : "border-slate-300 hover:bg-slate-50"}`}
                                    >
                                        <input
                                            type="radio"
                                            name="cat"
                                            checked={context.category === c}
                                            onChange={() => set("category", c)}
                                            className="accent-emerald-700"
                                        />
                                        {c === "fresh" ? "Fresh" : "Renewal"}
                                    </label>
                                ))}
                            </div>
                        </F>
                    </div>
                    <label
                        className={`block border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${contextValid ? "border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/30" : "border-slate-200 bg-slate-50 cursor-not-allowed opacity-60"}`}
                    >
                        <input
                            type="file"
                            accept=".csv,text/csv"
                            className="hidden"
                            disabled={!contextValid}
                            onChange={(e) =>
                                e.target.files[0] &&
                                handleFile(e.target.files[0])
                            }
                        />
                        <div className="text-4xl mb-2">📄</div>
                        <p className="font-semibold text-slate-700">
                            {busy
                                ? "Validating…"
                                : contextValid
                                  ? "Click to upload CSV"
                                  : "Complete context above first"}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            S No. · Name · Roll No. · Cheque No · Dated ·
                            Stipend · Remarks
                        </p>
                    </label>
                </>
            )}

            {step === "preview" && preview && (
                <>
                    <div className="bg-slate-50 rounded-lg px-4 py-3 border border-slate-200 text-sm">
                        <span className="text-slate-500">Importing under:</span>{" "}
                        <strong className="ml-1">
                            {preview.context.scheme}
                        </strong>{" "}
                        · {preview.context.donor} ·{" "}
                        {preview.context.academic_year} ·{" "}
                        <span
                            className={`font-semibold ${preview.context.category === "fresh" ? "text-blue-700" : "text-emerald-700"}`}
                        >
                            {preview.context.category}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                            <p className="text-[11px] uppercase text-emerald-700 font-bold">
                                Valid
                            </p>
                            <p className="text-2xl font-bold text-emerald-800">
                                {preview.valid_count}
                            </p>
                        </div>
                        <div
                            className={`rounded-lg p-3 border ${preview.invalid_count ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"}`}
                        >
                            <p
                                className={`text-[11px] uppercase font-bold ${preview.invalid_count ? "text-red-700" : "text-slate-500"}`}
                            >
                                Invalid
                            </p>
                            <p
                                className={`text-2xl font-bold ${preview.invalid_count ? "text-red-800" : ""}`}
                            >
                                {preview.invalid_count}
                            </p>
                        </div>
                    </div>
                    <div className="overflow-auto border border-slate-200 rounded-lg max-h-96">
                        <table className="w-full text-xs">
                            <thead className="bg-slate-50 text-slate-600 uppercase sticky top-0">
                                <tr>
                                    {[
                                        "S No.",
                                        "Name",
                                        "Roll No.",
                                        "Cheque",
                                        "Dated",
                                        "Amount",
                                        "Status",
                                    ].map((h) => (
                                        <th
                                            key={h}
                                            className="text-left px-2 py-1.5"
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {preview.rows.map((r, i) => (
                                    <tr
                                        key={i}
                                        className={`border-t ${r._errors?.length ? "bg-red-50" : ""}`}
                                    >
                                        <td className="px-2 py-1.5 text-slate-500">
                                            {r.s_no ?? "—"}
                                        </td>
                                        <td className="px-2 py-1.5">
                                            {r.student_name ?? "—"}
                                        </td>
                                        <td className="px-2 py-1.5 font-mono">
                                            {r.student_id}
                                        </td>
                                        <td className="px-2 py-1.5 font-mono">
                                            {r.cheque_no ?? "—"}
                                        </td>
                                        <td className="px-2 py-1.5">
                                            {r.received_date ?? "—"}
                                        </td>
                                        <td className="px-2 py-1.5 text-right tabular-nums">
                                            {r.approved_amount != null
                                                ? new Intl.NumberFormat(
                                                      "en-PK",
                                                  ).format(r.approved_amount)
                                                : "—"}
                                        </td>
                                        <td className="px-2 py-1.5">
                                            {r._errors?.length ? (
                                                <span className="text-red-700 text-[11px]">
                                                    ❌ {r._errors[0]}
                                                </span>
                                            ) : (
                                                <span className="text-emerald-700 text-[11px]">
                                                    ✓ {r.payment_status}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => reset(true)}
                            className="border px-4 py-2 rounded-lg text-sm"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleCommit}
                            disabled={busy || preview.valid_count === 0}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
                        >
                            {busy
                                ? "Importing…"
                                : `Import ${preview.valid_count} row(s)`}
                        </button>
                    </div>
                </>
            )}

            {step === "done" && result && (
                <div className="text-center py-6">
                    <div className="text-5xl mb-3">✅</div>
                    <h3 className="text-lg font-bold text-emerald-800">
                        Import Complete
                    </h3>
                    <div className="grid grid-cols-3 gap-3 mt-6 max-w-md mx-auto">
                        <Stat
                            label="Imported"
                            value={result.imported}
                            tone="green"
                        />
                        <Stat
                            label="Skipped"
                            value={result.skipped}
                            tone="gray"
                        />
                        <Stat
                            label="Failed"
                            value={result.failed}
                            tone={result.failed ? "red" : "gray"}
                        />
                    </div>
                    <div className="flex justify-center gap-2 mt-6">
                        <button
                            onClick={() => reset(true)}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                        >
                            Import another (same context)
                        </button>
                        <button
                            onClick={() => reset(false)}
                            className="border border-slate-300 px-4 py-2 rounded-lg text-sm font-semibold"
                        >
                            Start fresh
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function FullImporter() {
    const toast = useToast();
    const confirm = useConfirm();
    const qc = useQueryClient();
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [result, setResult] = useState(null);
    const [busy, setBusy] = useState(false);
    const [step, setStep] = useState("upload");

    const handleFile = async (f) => {
        setFile(f);
        setBusy(true);
        try {
            const res = await validateImport(f);
            setPreview(res);
            setStep("preview");
        } catch (err) {
            toast.error(err?.response?.data?.message ?? "Validation failed.");
        } finally {
            setBusy(false);
        }
    };

    const handleCommit = async () => {
        const ok = await confirm({
            title: "Import records?",
            message: `${preview.valid} valid row(s) will be imported.`,
            confirmLabel: "Import now",
        });
        if (!ok) return;
        setBusy(true);
        try {
            const res = await commitImport(file, true);
            setResult(res);
            setStep("done");
            qc.invalidateQueries({ queryKey: ["scholarships"] });
            qc.invalidateQueries({ queryKey: ["dashboard"] });
            qc.invalidateQueries({ queryKey: ["duplicates"] });
            qc.invalidateQueries({ queryKey: ["import-history"] });
            toast.success(`Imported ${res.imported} records`);
        } catch (err) {
            toast.error(err?.response?.data?.message ?? "Import failed.");
        } finally {
            setBusy(false);
        }
    };

    const reset = () => {
        setFile(null);
        setPreview(null);
        setResult(null);
        setStep("upload");
    };

    return (
        <div className="p-6 space-y-4">
            <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500">
                    Advanced mode — each row carries its own scheme, donor,
                    year, etc.
                </p>
                <button
                    onClick={downloadImportTemplate}
                    className="border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                    Download Template
                </button>
            </div>
            {step === "upload" && (
                <label className="block border-2 border-dashed border-slate-300 rounded-xl p-10 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/30 transition-colors">
                    <input
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        onChange={(e) =>
                            e.target.files[0] && handleFile(e.target.files[0])
                        }
                    />
                    <div className="text-4xl mb-2">🗂️</div>
                    <p className="font-semibold text-slate-700">
                        {busy ? "Validating…" : "Click to upload 13-column CSV"}
                    </p>
                </label>
            )}
            {step === "preview" && preview && (
                <>
                    <div className="grid grid-cols-3 gap-3">
                        <Stat label="Total" value={preview.total} tone="gray" />
                        <Stat
                            label="Valid"
                            value={preview.valid}
                            tone="green"
                        />
                        <Stat
                            label="Invalid"
                            value={preview.errors.length}
                            tone={preview.errors.length ? "red" : "gray"}
                        />
                    </div>
                    {preview.errors.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-40 overflow-auto">
                            <p className="text-xs font-bold text-red-800 mb-1">
                                Errors:
                            </p>
                            <ul className="text-xs text-red-700 space-y-0.5">
                                {preview.errors.map((e, i) => (
                                    <li key={i}>• {e}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={reset}
                            className="border px-4 py-2 rounded-lg text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCommit}
                            disabled={busy || preview.valid === 0}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
                        >
                            {busy ? "Importing…" : `Import ${preview.valid}`}
                        </button>
                    </div>
                </>
            )}
            {step === "done" && result && (
                <div className="text-center py-6">
                    <div className="text-5xl mb-3">✅</div>
                    <h3 className="text-lg font-bold text-emerald-800">
                        Import Complete
                    </h3>
                    <div className="grid grid-cols-3 gap-3 mt-6 max-w-md mx-auto">
                        <Stat
                            label="Imported"
                            value={result.imported}
                            tone="green"
                        />
                        <Stat
                            label="Skipped"
                            value={result.skipped}
                            tone="gray"
                        />
                        <Stat
                            label="Failed"
                            value={result.failed}
                            tone={result.failed ? "red" : "gray"}
                        />
                    </div>
                    <button
                        onClick={reset}
                        className="mt-6 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                    >
                        Import another
                    </button>
                </div>
            )}
        </div>
    );
}

function ImportHistory() {
    const { data: history = [] } = useQuery({
        queryKey: ["import-history"],
        queryFn: fetchImportHistory,
    });
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-5 py-4 border-b">
                <h3 className="font-semibold">Import History</h3>
            </div>
            <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
                    <tr>
                        {[
                            "File",
                            "When",
                            "Total",
                            "Imported",
                            "Skipped",
                            "Failed",
                        ].map((h) => (
                            <th key={h} className="text-left px-4 py-2">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {history.length === 0 && (
                        <tr>
                            <td
                                colSpan={6}
                                className="p-6 text-center text-slate-500"
                            >
                                No imports yet.
                            </td>
                        </tr>
                    )}
                    {history.map((h) => (
                        <tr key={h.id} className="border-t">
                            <td className="px-4 py-2 font-mono text-xs">
                                {h.filename}
                            </td>
                            <td className="px-4 py-2 text-xs">
                                {fmtDate(h.created_at)}
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums">
                                {h.total_rows}
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums text-emerald-700 font-semibold">
                                {h.imported}
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums">
                                {h.skipped}
                            </td>
                            <td
                                className={`px-4 py-2 text-right tabular-nums ${h.failed ? "text-red-700 font-semibold" : ""}`}
                            >
                                {h.failed}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Stat({ label, value, tone = "gray" }) {
    const tones = {
        green: "bg-emerald-50 border-emerald-200 text-emerald-800",
        red: "bg-red-50 border-red-200 text-red-800",
        gray: "bg-slate-50 border-slate-200 text-slate-800",
    };
    const cls = tones[tone] || tones.gray;
    return (
        <div className={`rounded-lg p-3 border ${cls}`}>
            <p className="text-[11px] uppercase font-bold opacity-80">
                {label}
            </p>
            <p className="text-2xl font-bold">{value}</p>
        </div>
    );
}

function F({ label, required, help, children }) {
    return (
        <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
                {label} {required && <span className="text-red-600">*</span>}
            </label>
            {children}
            {help && <p className="text-[11px] text-slate-500 mt-1">{help}</p>}
        </div>
    );
}
