import * as XLSX from "xlsx";

/**
 * Download an .xlsx file with one or more sheets.
 *
 * @param {string} filename
 * @param {Array<{
 *   name: string,
 *   headers: string[],
 *   rows: any[][],
 *   headerRows?: string[][]   // optional — for multi-row headers
 * }>} sheets
 */
export function downloadExcel(filename, sheets) {
    const wb = XLSX.utils.book_new();

    sheets.forEach(({ name, headers, rows, headerRows }) => {
        const headerBlock = headerRows ?? [headers];
        const aoa = [...headerBlock, ...rows];
        const ws = XLSX.utils.aoa_to_sheet(aoa);

        // Auto column widths
        ws["!cols"] = headers.map((h, i) => {
            const maxLen = Math.max(
                String(h).length,
                ...rows.slice(0, 100).map((r) => String(r[i] ?? "").length),
            );
            return { wch: Math.min(50, Math.max(10, maxLen + 2)) };
        });

        // Freeze header rows
        ws["!freeze"] = { xSplit: 0, ySplit: headerBlock.length };

        // Multi-header merges (only when headerRows provided)
        if (headerRows && headerRows.length > 1) {
            ws["!merges"] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, // STUDENT & SCHOLARSHIP
                { s: { r: 0, c: 7 }, e: { r: 0, c: 9 } }, // 1ST INST
                { s: { r: 0, c: 10 }, e: { r: 0, c: 12 } }, // 2ND INST
                { s: { r: 0, c: 13 }, e: { r: 0, c: 15 } }, // 3RD INST
                { s: { r: 0, c: 16 }, e: { r: 0, c: 18 } }, // 4TH INST
                { s: { r: 0, c: 20 }, e: { r: 0, c: 22 } }, // RECOVERY
                { s: { r: 0, c: 19 }, e: { r: 1, c: 19 } }, // GROSS (vertical)
                { s: { r: 0, c: 23 }, e: { r: 1, c: 23 } }, // NET (vertical)
                { s: { r: 0, c: 24 }, e: { r: 1, c: 24 } }, // AUDIT (vertical)
            ];
        }

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
