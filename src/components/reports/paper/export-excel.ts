import type { CompanyProfile } from "@/hooks/useCompanyProfile";
import {
  columnTotal, formatCell, isNumericFormat,
  type ReportBlock, type ReportMeta,
} from "./types";

/** Excel forbids these in sheet names and caps them at 31 characters. */
function sheetName(title: string, used: Set<string>) {
  const base = title.replace(/[[\]:*?/\\]/g, " ").slice(0, 28).trim() || "Sheet";
  let name = base;
  for (let i = 2; used.has(name); i++) name = `${base} ${i}`;
  used.add(name);
  return name;
}

/**
 * One sheet per section, each opening with the same heading block as the paper
 * document so a forwarded spreadsheet still says what it is.
 */
export async function exportReportToExcel(
  meta: ReportMeta,
  blocks: ReportBlock[],
  opts: { company: CompanyProfile | null; documentNo: string; preparedBy: string; generatedAt: string }
) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const used = new Set<string>();

  const heading = (section: string): (string | number)[][] => [
    [opts.company?.legalName || opts.company?.name || ""],
    [meta.title.toUpperCase()],
    [`Section: ${section}`],
    [`Period: ${meta.period}`],
    ...(meta.filters ?? []).map((f) => [f]),
    [`Document no.: ${opts.documentNo}`, "", `Prepared by: ${opts.preparedBy}`, "", `Generated: ${opts.generatedAt}`],
    [],
  ];

  blocks.forEach((block, i) => {
    const section = `${i + 1}. ${block.title}`;
    let body: (string | number)[][] = [];

    if (block.kind === "table") {
      const numbered = block.numbered !== false;
      body.push([...(numbered ? ["#"] : []), ...block.columns.map((c) => c.header)]);
      block.rows.forEach((row, r) => {
        body.push([
          ...(numbered ? [r + 1] : []),
          ...block.columns.map((c) => {
            const v = c.value(row);
            // Keep numbers numeric so Excel can sum them.
            return isNumericFormat(c.format) && typeof v === "number" ? v : formatCell(v, c.format);
          }),
        ]);
      });
      if (block.columns.some((c) => c.total) && block.rows.length) {
        body.push([
          ...(numbered ? [""] : []),
          ...block.columns.map((c, ci) => (c.total ? columnTotal(c, block.rows) : ci === 0 ? "TOTAL" : "")),
        ]);
      }
      if (!block.rows.length) body.push([block.emptyText ?? "No records in this period."]);
    } else if (block.kind === "keyFigures") {
      body = [["Measure", "Value"], ...block.items.map((it) => [
        it.label,
        isNumericFormat(it.format) && typeof it.value === "number" ? it.value : formatCell(it.value, it.format),
      ])];
    } else if (block.kind === "statement") {
      body.push(["Code", "Account", "Amount"]);
      for (const g of block.groups) {
        body.push(["", g.heading.toUpperCase(), ""]);
        g.lines.forEach((l) => body.push([l.code ?? "", l.label, l.amount]));
        body.push(["", g.totalLabel, g.total], []);
      }
      if (block.result) body.push(["", block.result.label, block.result.amount]);
    } else if (block.kind === "note") {
      body = [[block.text]];
    } else {
      return; // figures (charts) have no tabular form
    }

    const ws = XLSX.utils.aoa_to_sheet([...heading(section), ...body]);
    ws["!cols"] = [{ wch: 8 }, { wch: 36 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws, sheetName(block.title, used));
  });

  if (wb.SheetNames.length === 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(heading("Report")), "Report");
  }
  XLSX.writeFile(wb, `${opts.documentNo}.xlsx`);
}
