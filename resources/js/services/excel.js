import * as XLSX from "xlsx";

export function downloadExcel(filename, sheets) {
    const wb = XLSX.utils.book_new();

    sheets.forEach(({ name, headers, rows }) => {
        const aoa = [headers, ...rows];
        const ws = XLSX.utils.aoa_to_sheet(aoa);

        ws["!cols"] = headers.map((h, i) => {
            const maxLen = Math.max(
                String(h).length,
                ...rows.slice(0, 100).map((r) => String(r[i] ?? "").length),
            );
            return { wch: Math.min(50, Math.max(10, maxLen + 2)) };
        });

        ws["!freeze"] = { xSplit: 0, ySplit: 1 };

        XLSX.utils.book_append_sheet(wb, ws, name);
    });

    XLSX.writeFile(wb, filename);
}

export function safeFilename(s) {
    return (
        String(s ?? "")
            .replace(/[\\/:*?"<>|]/g, "_")
            .trim() || "report"
    );
}
