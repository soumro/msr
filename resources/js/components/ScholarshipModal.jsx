import { useEffect, useState } from "react";
import {
    fetchScholarship,
    createScholarship,
    updateScholarship,
    replaceAllInstallments,
} from "../services/scholarships";
import LookupSelect from "./LookupSelect";
import InstallmentSection from "./InstallmentSection";
import { useToast } from "../context/ToastContext";

const empty = {
    student_id: "",
    student_name: "",
    cnic: "",
    scheme: "",
    category: "fresh",
    academic_year: "",
    donor: "",
    funding_group: "",
    approved_amount: 0,
    payment_status: "pending",
    renewal_status: "not_due",
    notes: "",
};

function formatCnic(v) {
    const d = v.replace(/\D/g, "").slice(0, 13);
    if (d.length <= 5) return d;
    if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`;
    return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
}

export default function ScholarshipModal({ scholarshipId, onClose, onSaved }) {
    const toast = useToast();
    const [form, setForm] = useState(empty);
    const [installments, setInstallments] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (scholarshipId) {
            fetchScholarship(scholarshipId)
                .then((r) => {
                    setForm(r);
                    setInstallments(
                        (r.installments ?? []).map((i) => ({
                            installment_no: i.installment_no,
                            amount: Number(i.amount),
                            cheque_no: i.cheque_no ?? "",
                            received_date: i.received_date ?? "",
                            status: i.status,
                            notes: i.notes ?? "",
                        })),
                    );
                })
                .catch(() => {});
        } else {
            setForm(empty);
            setInstallments([]);
        }
    }, [scholarshipId]);

    useEffect(() => {
        const handler = (e) => {
            if (e.key === "Escape") onClose();
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                document.getElementById("scholarship-form")?.requestSubmit();
            }
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [onClose]);

    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            let scholarship;
            if (scholarshipId) {
                scholarship = await updateScholarship(scholarshipId, form);
            } else {
                scholarship = await createScholarship(form);
            }

            // Save installments (replace all)
            const rows = installments
                .filter((r) => Number(r.amount) > 0)
                .map((r, i) => ({
                    installment_no: i + 1,
                    amount: Number(r.amount),
                    cheque_no: r.cheque_no || null,
                    received_date: r.received_date || null,
                    status: r.status,
                    notes: r.notes || null,
                }));

            if (rows.length > 0 || scholarshipId) {
                await replaceAllInstallments(scholarship.id, rows);
            }

            toast.success(scholarshipId ? "Record updated" : "Record added");
            onSaved();
        } catch (err) {
            const msg =
                err?.response?.data?.message ??
                Object.values(err?.response?.data?.errors ?? {})
                    .flat()
                    .join("\n") ??
                "Save failed.";
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-slate-900/50 z-50 flex items-start justify-center p-4 overflow-auto"
            onClick={onClose}
        >
            <form
                id="scholarship-form"
                onSubmit={submit}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-xl shadow-xl w-full max-w-3xl mt-10"
            >
                <div className="px-5 py-3 border-b flex justify-between items-center">
                    <h3 className="font-semibold">
                        {scholarshipId
                            ? `Edit Record #${scholarshipId}`
                            : "Add Scholarship Record"}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-500 hover:text-slate-900 text-xl leading-none"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <F label="Student ID" required>
                        <input
                            className="inp"
                            required
                            autoFocus
                            value={form.student_id}
                            onChange={(e) => set("student_id", e.target.value)}
                        />
                    </F>
                    <F label="Student Name">
                        <input
                            className="inp"
                            value={form.student_name ?? ""}
                            onChange={(e) =>
                                set("student_name", e.target.value)
                            }
                        />
                    </F>
                    <F label="CNIC">
                        <input
                            className="inp font-mono"
                            placeholder="35202-1234567-1"
                            value={form.cnic ?? ""}
                            onChange={(e) =>
                                set("cnic", formatCnic(e.target.value))
                            }
                        />
                    </F>
                    <F label="Scheme" required>
                        <LookupSelect
                            type="scheme"
                            required
                            value={form.scheme}
                            onChange={(v) => set("scheme", v)}
                        />
                    </F>
                    <F label="Category" required>
                        <div className="flex gap-2">
                            {["fresh", "renewal"].map((c) => (
                                <label
                                    key={c}
                                    className={`flex-1 border rounded-lg px-3 py-2 text-sm cursor-pointer flex items-center gap-2 transition-colors ${
                                        form.category === c
                                            ? "border-emerald-700 bg-emerald-50 text-emerald-900 font-semibold"
                                            : "border-slate-300 hover:bg-slate-50"
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        checked={form.category === c}
                                        onChange={() => set("category", c)}
                                        className="accent-emerald-700"
                                    />
                                    {c === "fresh" ? "Fresh" : "Renewal"}
                                </label>
                            ))}
                        </div>
                    </F>
                    <F label="Academic Year" required>
                        <LookupSelect
                            type="academic_year"
                            required
                            value={form.academic_year}
                            onChange={(v) => set("academic_year", v)}
                        />
                    </F>
                    <F label="Donor" required>
                        <LookupSelect
                            type="donor"
                            required
                            value={form.donor}
                            onChange={(v) => set("donor", v)}
                        />
                    </F>
                    <F label="Funding Group">
                        <LookupSelect
                            type="funding_group"
                            value={form.funding_group ?? ""}
                            onChange={(v) => set("funding_group", v)}
                        />
                    </F>
                    <F
                        label="Approved Amount (PKR)"
                        required
                        help="Total sanctioned for this scholarship across all installments."
                    >
                        <input
                            type="number"
                            min={0}
                            step={1000}
                            className="inp"
                            required
                            value={form.approved_amount}
                            onChange={(e) =>
                                set("approved_amount", Number(e.target.value))
                            }
                        />
                    </F>
                    <F label="Renewal Status" required>
                        <select
                            className="inp"
                            value={form.renewal_status}
                            onChange={(e) =>
                                set("renewal_status", e.target.value)
                            }
                        >
                            {[
                                "not_due",
                                "due",
                                "submitted",
                                "approved",
                                "rejected",
                            ].map((s) => (
                                <option key={s}>{s}</option>
                            ))}
                        </select>
                    </F>
                </div>

                <div className="px-5 pb-5">
                    <InstallmentSection
                        installments={installments}
                        approvedAmount={form.approved_amount}
                        onChange={setInstallments}
                    />
                </div>

                <div className="px-5 py-3 border-t flex justify-between items-center bg-slate-50 rounded-b-xl">
                    <span className="text-xs text-slate-500">
                        <kbd className="px-1.5 py-0.5 bg-white border rounded text-[10px]">
                            Esc
                        </kbd>{" "}
                        close
                        {" · "}
                        <kbd className="px-1.5 py-0.5 bg-white border rounded text-[10px]">
                            ⌘/Ctrl + ⏎
                        </kbd>{" "}
                        save
                    </span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="border px-4 py-2 rounded-lg text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
                        >
                            {saving ? "Saving…" : "Save"}
                        </button>
                    </div>
                </div>
            </form>

            <style>{`
        .inp{width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:8px 10px;font-size:14px}
        .inp:focus{outline:none;border-color:#0b5d3b;box-shadow:0 0 0 3px rgba(11,93,59,.12)}
      `}</style>
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
