const fmtShort = (n) => {
    n = Number(n) || 0;
    if (n >= 10000000) return (n / 10000000).toFixed(2) + " Cr";
    if (n >= 100000) return (n / 100000).toFixed(2) + " Lac";
    if (n >= 1000) return (n / 1000).toFixed(0) + "k";
    return String(n);
};
const fmtFull = (n) =>
    new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(
        Number(n) || 0,
    );

// ============================================================
// LINE CHART — monthly trend
// ============================================================
export function LineChart({ data }) {
    if (!data?.length) {
        return (
            <p className="text-xs text-slate-500 text-center py-8">
                No data yet.
            </p>
        );
    }

    const max = Math.max(1, ...data.map((d) => d.value));
    const w = 100,
        h = 40;

    const points = data.map((d, i) => ({
        x: (i / Math.max(1, data.length - 1)) * w,
        y: h - (d.value / max) * h,
        ...d,
    }));

    const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
    const areaPath = `0,${h} ${polyline} ${w},${h}`;
    const peakIdx = data.reduce(
        (best, d, i) => (d.value > data[best].value ? i : best),
        0,
    );
    const lastIdx = data.length - 1;

    return (
        <div>
            <div className="relative" style={{ height: 200 }}>
                <svg
                    viewBox={`0 0 ${w} ${h}`}
                    preserveAspectRatio="none"
                    className="w-full h-full"
                >
                    <defs>
                        <linearGradient
                            id="lineFillGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                        >
                            <stop
                                offset="0%"
                                stopColor="#7c3aed"
                                stopOpacity="0.25"
                            />
                            <stop
                                offset="100%"
                                stopColor="#7c3aed"
                                stopOpacity="0"
                            />
                        </linearGradient>
                    </defs>

                    {[0.25, 0.5, 0.75].map((frac, i) => (
                        <line
                            key={i}
                            x1="0"
                            y1={h * frac}
                            x2={w}
                            y2={h * frac}
                            stroke="#e2e8f0"
                            strokeWidth="0.15"
                            strokeDasharray="1,1"
                            vectorEffect="non-scaling-stroke"
                        />
                    ))}

                    <polygon points={areaPath} fill="url(#lineFillGrad)" />

                    <polyline
                        points={polyline}
                        fill="none"
                        stroke="#7c3aed"
                        strokeWidth="0.5"
                        vectorEffect="non-scaling-stroke"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                    />

                    <circle
                        cx={points[peakIdx].x}
                        cy={points[peakIdx].y}
                        r="0.8"
                        fill="#f59e0b"
                        stroke="#fff"
                        strokeWidth="0.2"
                        vectorEffect="non-scaling-stroke"
                    />

                    <circle
                        cx={points[lastIdx].x}
                        cy={points[lastIdx].y}
                        r="0.8"
                        fill="#7c3aed"
                        stroke="#fff"
                        strokeWidth="0.2"
                        vectorEffect="non-scaling-stroke"
                    />
                </svg>
            </div>

            <div className="flex justify-between text-[10px] text-slate-500 mt-2 px-0.5">
                {data.map((d, i) => (
                    <span
                        key={i}
                        className={
                            i === lastIdx ? "font-bold text-purple-700" : ""
                        }
                    >
                        {d.label}
                    </span>
                ))}
            </div>

            <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 text-[11px]">
                <div>
                    <span className="text-slate-500">Peak: </span>
                    <span className="font-bold text-amber-700">
                        {data[peakIdx].label} · {fmtFull(data[peakIdx].value)}
                    </span>
                </div>
                <div>
                    <span className="text-slate-500">Latest: </span>
                    <span className="font-bold text-purple-700">
                        {data[lastIdx].label} · {fmtFull(data[lastIdx].value)}
                    </span>
                </div>
            </div>
        </div>
    );
}

// ============================================================
// DONUT CHART — fiscal year split
// ============================================================
export function DonutChart({ segments, size = 160 }) {
    if (!segments?.length) {
        return (
            <p className="text-xs text-slate-500 text-center py-8">
                No data yet.
            </p>
        );
    }

    const total = segments.reduce((s, x) => s + x.value, 0);
    if (total === 0) {
        return (
            <p className="text-xs text-slate-500 text-center py-8">
                No records.
            </p>
        );
    }

    const r = 35,
        cx = 50,
        cy = 50;
    const circ = 2 * Math.PI * r;

    let offset = 0;
    const arcs = segments.map((seg) => {
        const pct = seg.value / total;
        const dash = pct * circ;
        const arc = {
            color: seg.color,
            dasharray: `${dash} ${circ - dash}`,
            dashoffset: -offset,
            pct,
            label: seg.label,
            value: seg.value,
        };
        offset += dash;
        return arc;
    });

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative" style={{ width: size, height: size }}>
                <svg viewBox="0 0 100 100" width={size} height={size}>
                    <circle
                        cx={cx}
                        cy={cy}
                        r={r}
                        fill="none"
                        stroke="#f1f5f9"
                        strokeWidth="13"
                    />
                    {arcs.map((a, i) => (
                        <circle
                            key={i}
                            cx={cx}
                            cy={cy}
                            r={r}
                            fill="none"
                            stroke={a.color}
                            strokeWidth="13"
                            strokeDasharray={a.dasharray}
                            strokeDashoffset={a.dashoffset}
                            transform={`rotate(-90 ${cx} ${cy})`}
                        />
                    ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[9px] uppercase tracking-widest font-bold text-slate-400">
                        Total
                    </span>
                    <span className="text-base font-extrabold text-slate-800">
                        {fmtShort(total)}
                    </span>
                </div>
            </div>

            <div className="w-full space-y-1.5">
                {arcs.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                        <span
                            className="w-2.5 h-2.5 rounded-sm shrink-0"
                            style={{ background: a.color }}
                        />
                        <span className="flex-1 truncate text-slate-700">
                            {a.label}
                        </span>
                        <span className="font-bold text-slate-900 tabular-nums">
                            {(a.pct * 100).toFixed(1)}%
                        </span>
                        <span className="text-slate-500 tabular-nums text-[11px] w-16 text-right">
                            {fmtShort(a.value)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================================
// HORIZONTAL BARS — scheme/donor breakdown
// ============================================================
const BAR_GRADIENT = {
    purple: "from-purple-500 to-purple-700",
    amber: "from-amber-500 to-orange-600",
    emerald: "from-emerald-500 to-teal-600",
    blue: "from-blue-500 to-indigo-600",
    rose: "from-rose-500 to-red-600",
};

export function HorizontalBars({ data, color = "purple" }) {
    if (!data?.length) {
        return (
            <p className="text-xs text-slate-500 text-center py-6">
                No data yet.
            </p>
        );
    }

    const max = Math.max(1, ...data.map((d) => d.value));
    const grad = BAR_GRADIENT[color] || BAR_GRADIENT.purple;

    return (
        <div className="space-y-2.5">
            {data.map((d) => (
                <div key={d.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                        <span
                            className="font-medium text-slate-700 truncate pr-2"
                            title={d.label}
                        >
                            {d.label}
                        </span>
                        <span className="font-bold text-slate-800 tabular-nums shrink-0">
                            {fmtShort(d.value)}
                        </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                            className={`h-full rounded-full bg-gradient-to-r ${grad}`}
                            style={{ width: `${(d.value / max) * 100}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}
