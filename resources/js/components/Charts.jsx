const fmtShort = (n) => {
    n = Number(n) || 0;
    if (n >= 10000000) return (n / 10000000).toFixed(1) + " Cr";
    if (n >= 100000) return (n / 100000).toFixed(1) + " L";
    if (n >= 1000) return (n / 1000).toFixed(0) + "k";
    return String(n);
};

export function LineChart({ data, height = 220, color = "#0b5d3b" }) {
    if (!data?.length)
        return <p className="text-sm text-slate-500">No data yet.</p>;
    const max = Math.max(...data.map((d) => d.value)) || 1;
    const w = 100,
        h = 40;
    const points = data
        .map((d, i) => {
            const x = (i / (data.length - 1)) * w;
            const y = h - (d.value / max) * h;
            return `${x},${y}`;
        })
        .join(" ");
    const areaPoints = `0,${h} ${points} ${w},${h}`;
    return (
        <div style={{ height }}>
            <svg
                viewBox={`0 0 ${w} ${h}`}
                preserveAspectRatio="none"
                style={{ width: "100%", height: "100%" }}
            >
                <defs>
                    <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>
                <polygon points={areaPoints} fill="url(#lineFill)" />
                <polyline
                    points={points}
                    fill="none"
                    stroke={color}
                    strokeWidth="0.6"
                    vectorEffect="non-scaling-stroke"
                />
            </svg>
            <div className="flex justify-between text-[10px] text-slate-500 mt-1 px-1">
                {data.map((d, i) => (
                    <span
                        key={i}
                        className={
                            i === data.length - 1
                                ? "font-bold text-slate-700"
                                : ""
                        }
                    >
                        {d.label}
                    </span>
                ))}
            </div>
        </div>
    );
}

export function DonutChart({ segments, size = 180 }) {
    const total = segments.reduce((s, x) => s + x.value, 0) || 1;
    const r = 40,
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
        <div className="flex items-center gap-4">
            <svg viewBox="0 0 100 100" width={size} height={size}>
                <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="18"
                />
                {arcs.map((a, i) => (
                    <circle
                        key={i}
                        cx={cx}
                        cy={cy}
                        r={r}
                        fill="none"
                        stroke={a.color}
                        strokeWidth="18"
                        strokeDasharray={a.dasharray}
                        strokeDashoffset={a.dashoffset}
                        transform={`rotate(-90 ${cx} ${cy})`}
                    />
                ))}
            </svg>
            <div className="space-y-1.5">
                {arcs.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                        <span
                            className="w-3 h-3 rounded-sm"
                            style={{ background: a.color }}
                        />
                        <span className="capitalize">{a.label}</span>
                        <span className="font-semibold tabular-nums">
                            {(a.pct * 100).toFixed(1)}%
                        </span>
                        <span className="text-xs text-slate-500">
                            {fmtShort(a.value)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function HorizontalBars({ data, color = "#0b5d3b" }) {
    if (!data?.length)
        return <p className="text-sm text-slate-500">No data yet.</p>;
    const max = Math.max(...data.map((d) => d.value)) || 1;
    return (
        <div className="space-y-2">
            {data.map((d) => (
                <div
                    key={d.label}
                    className="grid grid-cols-[180px_1fr_120px] gap-3 items-center text-sm"
                >
                    <span className="font-medium truncate" title={d.label}>
                        {d.label}
                    </span>
                    <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                            className="h-full rounded-full"
                            style={{
                                width: `${(d.value / max) * 100}%`,
                                background: color,
                            }}
                        />
                    </div>
                    <span className="text-right tabular-nums font-semibold">
                        {fmtShort(d.value)}
                    </span>
                </div>
            ))}
        </div>
    );
}
