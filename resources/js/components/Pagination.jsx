export default function Pagination({ meta, onPageChange, onPerPageChange }) {
    if (!meta || meta.last_page <= 1) {
        return meta ? (
            <div className="px-5 py-3 border-t flex items-center justify-between text-xs text-slate-500 bg-slate-50">
                <span>
                    {meta.total} record{meta.total === 1 ? "" : "s"}
                </span>
                {onPerPageChange && (
                    <PerPage meta={meta} onPerPageChange={onPerPageChange} />
                )}
            </div>
        ) : null;
    }

    const { current_page, last_page, total, per_page, from, to } = meta;

    // Build a compact page range: 1 … 4 5 [6] 7 8 … 20
    const pages = buildRange(current_page, last_page);

    return (
        <div className="px-5 py-3 border-t flex flex-wrap items-center justify-between gap-3 text-sm bg-slate-50">
            <div className="text-xs text-slate-500">
                Showing <strong>{from}</strong>–<strong>{to}</strong> of{" "}
                <strong>{total}</strong>
                {onPerPageChange && (
                    <span className="ml-4 inline-flex items-center gap-1">
                        ·{" "}
                        <PerPage
                            meta={{ per_page }}
                            onPerPageChange={onPerPageChange}
                        />
                    </span>
                )}
            </div>

            <div className="flex items-center gap-1">
                <button
                    disabled={current_page <= 1}
                    onClick={() => onPageChange(current_page - 1)}
                    className="border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 hover:bg-white"
                >
                    ‹ Prev
                </button>

                {pages.map((p, i) =>
                    p === "…" ? (
                        <span
                            key={`gap-${i}`}
                            className="px-2 text-slate-400 select-none"
                        >
                            …
                        </span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => onPageChange(p)}
                            className={`min-w-[34px] px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                p === current_page
                                    ? "bg-emerald-700 text-white border-emerald-700"
                                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                            }`}
                        >
                            {p}
                        </button>
                    ),
                )}

                <button
                    disabled={current_page >= last_page}
                    onClick={() => onPageChange(current_page + 1)}
                    className="border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 hover:bg-white"
                >
                    Next ›
                </button>
            </div>
        </div>
    );
}

function PerPage({ meta, onPerPageChange }) {
    return (
        <>
            <span>Show</span>
            <select
                value={meta.per_page}
                onChange={(e) => onPerPageChange(Number(e.target.value))}
                className="border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white"
            >
                {[10, 25, 50, 100].map((n) => (
                    <option key={n} value={n}>
                        {n}
                    </option>
                ))}
            </select>
            <span>per page</span>
        </>
    );
}

/**
 * Returns an array of page numbers and '…' separators, e.g.
 * [1, '…', 4, 5, 6, 7, 8, '…', 20]
 */
function buildRange(current, last, delta = 1) {
    if (last <= 7) {
        return Array.from({ length: last }, (_, i) => i + 1);
    }

    const range = [];
    const left = Math.max(2, current - delta);
    const right = Math.min(last - 1, current + delta);

    range.push(1);
    if (left > 2) range.push("…");
    for (let i = left; i <= right; i++) range.push(i);
    if (right < last - 1) range.push("…");
    range.push(last);

    return range;
}
