const PAY = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    partial: "bg-blue-100 text-blue-800 border-blue-200",
    paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
    failed: "bg-red-100 text-red-800 border-red-200",
};
const REN = {
    not_due: "bg-slate-100 text-slate-700 border-slate-200",
    due: "bg-amber-100 text-amber-800 border-amber-200",
    submitted: "bg-blue-100 text-blue-800 border-blue-200",
    approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
};
const APP = {
    draft: "bg-slate-100 text-slate-700 border-slate-200",
    submitted: "bg-blue-100 text-blue-800 border-blue-200",
    under_review: "bg-purple-100 text-purple-800 border-purple-200",
    approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
};
const ELI = {
    pending: "bg-slate-100 text-slate-700 border-slate-200",
    eligible: "bg-emerald-100 text-emerald-800 border-emerald-200",
    ineligible: "bg-red-100 text-red-800 border-red-200",
};
const DUP = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    escalated: "bg-purple-100 text-purple-800 border-purple-200",
    cleared: "bg-emerald-100 text-emerald-800 border-emerald-200",
    confirmed_duplicate: "bg-red-100 text-red-800 border-red-200",
};

const MAPS = {
    payment: PAY,
    renewal: REN,
    application: APP,
    eligibility: ELI,
    duplicate: DUP,
};

export default function StatusBadge({ kind, value }) {
    const cls =
        MAPS[kind][value] ?? "bg-slate-100 text-slate-700 border-slate-200";
    const label = value
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    return (
        <span
            className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full border ${cls}`}
        >
            {label}
        </span>
    );
}
