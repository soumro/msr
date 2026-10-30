const fmt = (n) => new Intl.NumberFormat("en-PK").format(Number(n) || 0);

export default function InstallmentSection({
    installments = [],
    onChange,
    approvedAmount,
}) {
    const addRow = () => {
        onChange((prev) => {
            const nextNo =
                prev.reduce(
                    (m, r) => Math.max(m, Number(r.installment_no) || 0),
                    0,
                ) + 1;
            const scheduled = prev.reduce(
                (s, r) => s + Number(r.amount || 0),
                0,
            );
            const suggested = Math.max(
                0,
                (Number(approvedAmount) || 0) - scheduled,
            );
            return [
                ...prev,
                {
                    installment_no: nextNo,
                    amount: suggested || 0,
                    cheque_no: "",
                    received_date: "",
                    status: "pending",
                    notes: "",
                },
            ];
        });
    };

    const updateRow = (idx, key, value) => {
        onChange((prev) =>
            prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)),
        );
    };

    const removeRow = (idx) => {
        if (!confirm("Remove this installment?")) return;
        onChange((prev) =>
            prev
                .filter((_, i) => i !== idx)
                .map((r, i) => ({ ...r, installment_no: i + 1 })),
        );
    };

    const total = installments.reduce((s, r) => s + Number(r.amount || 0), 0);
    const received = installments
        .filter((r) => r.status === "received")
        .reduce((s, r) => s + Number(r.amount || 0), 0);
    const outstanding = Math.max(0, (Number(approvedAmount) || 0) - received);
    const balanced = Math.abs(total - (Number(approvedAmount) || 0)) < 0.5;

    return (
        <div className="border border-slate-300 rounded-lg p-4 bg-slate-50">
            <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-bold text-slate-700">
                    Installments{" "}
                    {installments.length > 0 && (
                        <span className="text-purple-700">
                            ({installments.length})
                        </span>
                    )}
                </h4>
                <button
                    type="button"
                    onClick={addRow}
                    className="text-xs font-semibold bg-purple-700 hover:bg-purple-800 text-white px-3 py-1.5 rounded-lg"
                >
                    + Add Installment
                </button>
            </div>

            {installments.length === 0 && (
                <p className="text-xs text-slate-500 italic py-2">
                    No installments. Click "Add Installment" to record a
                    payment.
                </p>
            )}

            {installments.length > 0 && (
                <div className="overflow-auto">
                    <table className="w-full text-xs border border-slate-200 rounded bg-white">
                        <thead className="bg-slate-100 text-slate-600 uppercase">
                            <tr>
                                <th className="px-2 py-1.5 text-left w-12">
                                    #
                                </th>
                                <th className="px-2 py-1.5 text-right w-28">
                                    Amount
                                </th>
                                <th className="px-2 py-1.5 text-left w-32">
                                    Cheque No.
                                </th>
                                <th className="px-2 py-1.5 text-left w-32">
                                    Received Date
                                </th>
                                <th className="px-2 py-1.5 text-left w-28">
                                    Status
                                </th>
                                <th className="px-2 py-1.5 text-left">Notes</th>
                                <th className="px-2 py-1.5 w-8"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {installments.map((r, i) => (
                                <tr
                                    key={i}
                                    className="border-t border-slate-200"
                                >
                                    <td className="px-2 py-1 text-center text-slate-500 font-mono">
                                        {r.installment_no}
                                    </td>
                                    <td className="px-2 py-1">
                                        <input
                                            type="number"
                                            min={0}
                                            step="any"
                                            className="w-full border border-slate-300 rounded px-2 py-1 text-right tabular-nums"
                                            value={r.amount}
                                            onChange={(e) =>
                                                updateRow(
                                                    i,
                                                    "amount",
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </td>
                                    <td className="px-2 py-1">
                                        <input
                                            type="text"
                                            placeholder="CHQ-001"
                                            className="w-full border border-slate-300 rounded px-2 py-1 font-mono"
                                            value={r.cheque_no ?? ""}
                                            onChange={(e) =>
                                                updateRow(
                                                    i,
                                                    "cheque_no",
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </td>
                                    <td className="px-2 py-1">
                                        <input
                                            type="date"
                                            className="w-full border border-slate-300 rounded px-2 py-1"
                                            value={r.received_date ?? ""}
                                            onChange={(e) =>
                                                updateRow(
                                                    i,
                                                    "received_date",
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </td>
                                    <td className="px-2 py-1">
                                        <select
                                            className="w-full border border-slate-300 rounded px-2 py-1"
                                            value={r.status}
                                            onChange={(e) =>
                                                updateRow(
                                                    i,
                                                    "status",
                                                    e.target.value,
                                                )
                                            }
                                        >
                                            <option value="pending">
                                                Pending
                                            </option>
                                            <option value="received">
                                                Received
                                            </option>
                                            <option value="failed">
                                                Failed
                                            </option>
                                        </select>
                                    </td>
                                    <td className="px-2 py-1">
                                        <input
                                            type="text"
                                            className="w-full border border-slate-300 rounded px-2 py-1"
                                            value={r.notes ?? ""}
                                            onChange={(e) =>
                                                updateRow(
                                                    i,
                                                    "notes",
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </td>
                                    <td className="px-2 py-1 text-center">
                                        <button
                                            type="button"
                                            onClick={() => removeRow(i)}
                                            className="text-red-600 hover:text-red-800 text-base font-bold leading-none"
                                        >
                                            ×
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className="bg-white rounded border border-slate-200 px-3 py-2">
                    <div className="text-slate-500 uppercase text-[10px] font-bold">
                        Approved
                    </div>
                    <div className="font-bold text-slate-800">
                        {fmt(approvedAmount)}
                    </div>
                </div>
                <div className="bg-white rounded border border-slate-200 px-3 py-2">
                    <div className="text-slate-500 uppercase text-[10px] font-bold">
                        Scheduled
                    </div>
                    <div
                        className={`font-bold ${balanced ? "text-emerald-700" : "text-amber-700"}`}
                    >
                        {fmt(total)}{" "}
                        {!balanced && <span className="text-[10px]">⚠</span>}
                    </div>
                </div>
                <div className="bg-white rounded border border-slate-200 px-3 py-2">
                    <div className="text-slate-500 uppercase text-[10px] font-bold">
                        Received
                    </div>
                    <div className="font-bold text-emerald-700">
                        {fmt(received)}
                    </div>
                </div>
            </div>

            <div className="mt-2 text-xs text-slate-600">
                Outstanding: <strong>{fmt(outstanding)}</strong>
            </div>
        </div>
    );
}
