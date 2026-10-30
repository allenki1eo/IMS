"use client";
import { useState } from "react";
import { FileSpreadsheet, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCompanyProfile, type CompanyProfile } from "@/hooks/useCompanyProfile";
import { exportReportToExcel } from "./export-excel";
import {
  columnTotal, documentNumber, formatCell, formatMoney, formatPaperDate, isNumericFormat,
  type KeyFiguresBlock, type NoteBlock, type ReportBlock, type ReportMeta,
  type StatementBlock, type TableBlock,
} from "./types";

interface ReportDocumentProps {
  meta: ReportMeta;
  blocks: ReportBlock[];
  /** Signature roles; pass [] to omit the sign-off block. */
  signatories?: string[];
  className?: string;
}

const DEFAULT_SIGNATORIES = ["Prepared by", "Reviewed by", "Approved by"];

/**
 * A report rendered as an A4 business document: letterhead, title block,
 * numbered sections, and a sign-off block. Prints cleanly (see `.paper` in
 * globals.css) and exports the same structure to Excel.
 */
export function ReportDocument({ meta, blocks, signatories = DEFAULT_SIGNATORIES, className }: ReportDocumentProps) {
  const { user } = useCurrentUser();
  const { company } = useCompanyProfile();
  // Stamped once per mount; pages remount the document for each generated report.
  const [generatedAt] = useState(() => new Date());
  const docNo = documentNumber(meta.code, generatedAt);
  const preparedBy = user?.fullName ?? "—";
  const generatedLabel = `${formatPaperDate(generatedAt)}, ${generatedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
  const [exporting, setExporting] = useState(false);

  const onExcel = async () => {
    setExporting(true);
    try {
      await exportReportToExcel(meta, blocks, { company, documentNo: docNo, preparedBy, generatedAt: generatedLabel });
    } catch {
      toast.error("Could not create the Excel file");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Document <span className="font-mono text-foreground">{docNo}</span>
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onExcel} disabled={exporting}>
            <FileSpreadsheet /> {exporting ? "Exporting…" : "Excel"}
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer /> Print / Save PDF
          </Button>
        </div>
      </div>

      <article className="paper mx-auto w-full max-w-[210mm] rounded-sm px-5 py-6 shadow-sm ring-1 ring-black/5 sm:px-[14mm] sm:py-[12mm]">
        <Letterhead company={company} />

        {/* Title block */}
        <div className="mt-6 border-b pb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Report</p>
          <h1 className="mt-1 text-xl font-bold uppercase tracking-wide sm:text-2xl">{meta.title}</h1>
          {meta.subtitle && <p className="mt-1 text-sm text-muted-foreground">{meta.subtitle}</p>}
          <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-1.5 text-[12px] sm:grid-cols-2">
            <MetaRow label="Document no." value={<span className="font-mono">{docNo}</span>} />
            <MetaRow label="Period" value={meta.period} />
            <MetaRow label="Prepared by" value={preparedBy} />
            <MetaRow label="Generated" value={generatedLabel} />
            {meta.currency && <MetaRow label="Currency" value={meta.currency} />}
            {meta.filters?.map((f) => {
              const [label, ...rest] = f.split(":");
              return <MetaRow key={f} label={rest.length ? label : "Filter"} value={rest.length ? rest.join(":").trim() : f} />;
            })}
          </dl>
        </div>

        {blocks.map((block, i) => (
          <section key={`${i}-${block.title}`} className="mt-7 break-inside-avoid-page">
            <h2 className="flex items-baseline gap-2 border-b border-foreground/80 pb-1 text-[13px] font-bold uppercase tracking-wide">
              <span className="tabular-nums">{i + 1}.</span>
              {block.title}
            </h2>
            {"description" in block && block.description && (
              <p className="mt-1.5 text-[12px] text-muted-foreground">{block.description}</p>
            )}
            <div className="mt-3">
              <Block block={block} />
            </div>
          </section>
        ))}

        {signatories.length > 0 && (
          <div className="signatures mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {signatories.map((role, i) => (
              <div key={role} className="text-[11px]">
                <p className="font-semibold uppercase tracking-wide">{role}</p>
                <p className="mt-6 border-b border-foreground/60 pb-1">{i === 0 ? preparedBy : " "}</p>
                <p className="mt-1 text-muted-foreground">Name</p>
                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div>
                    <p className="border-b border-foreground/60 pb-1">&nbsp;</p>
                    <p className="mt-1 text-muted-foreground">Signature</p>
                  </div>
                  <div>
                    <p className="border-b border-foreground/60 pb-1">&nbsp;</p>
                    <p className="mt-1 text-muted-foreground">Date</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Not <footer>: the app's print CSS hides header/footer chrome. */}
        <div role="contentinfo" className="doc-footer mt-10 border-t pt-3 text-center text-[10px] text-muted-foreground">
          <p>
            Generated from {company?.legalName || company?.name || "IMS"} records on {generatedLabel}. Figures reflect data at the time of
            generation.
          </p>
          <p className="mt-1 font-medium uppercase tracking-[0.2em]">— End of report —</p>
        </div>
      </article>
    </div>
  );
}

/* ─────────────── Letterhead ─────────────── */

function Letterhead({ company }: { company: CompanyProfile | null }) {
  const name = company?.legalName || company?.name || " ";
  const address = [company?.address, company?.city, company?.country].filter(Boolean).join(", ");
  const contact = [company?.phone, company?.email, company?.website].filter(Boolean).join("  ·  ");
  const ids = [
    company?.taxNumber && `TIN ${company.taxNumber}`,
    company?.registrationNumber && `Reg. No. ${company.registrationNumber}`,
  ].filter(Boolean).join("  ·  ");
  const logo = company?.logoPath && /^(https?:|\/|data:)/.test(company.logoPath) ? company.logoPath : null;

  return (
    <div role="banner" className="flex items-start gap-4 border-b-[3px] border-double border-foreground pb-4">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary company logo URL
        <img src={logo} alt="" className="h-14 w-14 shrink-0 object-contain" />
      ) : (
        <div className="monogram flex h-14 w-14 shrink-0 items-center justify-center rounded-sm bg-foreground text-xl font-bold text-background">
          {name.trim().charAt(0)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-lg font-bold uppercase leading-tight tracking-wide sm:text-xl">{name}</p>
        {address && <p className="mt-1 text-[11px] text-muted-foreground">{address}</p>}
        {contact && <p className="text-[11px] text-muted-foreground">{contact}</p>}
        {ids && <p className="text-[11px] font-medium">{ids}</p>}
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-24 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 font-medium">{value}</dd>
    </div>
  );
}

/* ─────────────── Blocks ─────────────── */

function Block({ block }: { block: ReportBlock }) {
  switch (block.kind) {
    case "table":
      return <PaperTable block={block} />;
    case "keyFigures":
      return <KeyFigures block={block} />;
    case "statement":
      return <Statement block={block} />;
    case "note":
      return <Note block={block} />;
    case "figure":
      return (
        <figure>
          <div className="text-foreground">{block.node}</div>
          {block.caption && <figcaption className="mt-1 text-center text-[11px] italic text-muted-foreground">{block.caption}</figcaption>}
        </figure>
      );
  }
}

function PaperTable({ block }: { block: TableBlock }) {
  const numbered = block.numbered !== false;
  const hasTotals = block.columns.some((c) => c.total) && block.rows.length > 0;
  const cols = numbered ? block.columns.length + 1 : block.columns.length;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[11.5px]">
        <thead>
          <tr className="border-y border-foreground">
            {numbered && <th className="w-8 px-1.5 py-1.5 text-left font-semibold">#</th>}
            {block.columns.map((c) => (
              <th
                key={c.header}
                style={c.width ? { width: c.width } : undefined}
                className={cn(
                  "px-1.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-wide",
                  isNumericFormat(c.format) ? "text-right" : "text-left"
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.length === 0 && (
            <tr>
              <td colSpan={cols} className="px-1.5 py-4 text-center italic text-muted-foreground">
                {block.emptyText ?? "No records in this period."}
              </td>
            </tr>
          )}
          {block.rows.map((row, r) => (
            <tr key={r} className="border-b border-border break-inside-avoid">
              {numbered && <td className="px-1.5 py-1 align-top tabular-nums text-muted-foreground">{r + 1}</td>}
              {block.columns.map((c) => (
                <td
                  key={c.header}
                  className={cn(
                    "px-1.5 py-1 align-top",
                    isNumericFormat(c.format) && "text-right tabular-nums",
                    c.format === "code" && "font-mono text-[10.5px]"
                  )}
                >
                  {formatCell(c.value(row), c.format)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {hasTotals && (
          <tfoot>
            <tr className="total border-t border-foreground font-semibold">
              {numbered && <td />}
              {block.columns.map((c, i) => (
                <td
                  key={c.header}
                  className={cn("px-1.5 py-1.5", isNumericFormat(c.format) && "text-right tabular-nums", c.total && "border-b-[3px] border-double border-foreground")}
                >
                  {c.total ? formatCell(columnTotal(c, block.rows), c.format) : i === 0 ? `Total (${block.rows.length})` : ""}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

function KeyFigures({ block }: { block: KeyFiguresBlock }) {
  return (
    <dl className="grid grid-cols-1 text-[12px] sm:grid-cols-2 sm:gap-x-10">
      {block.items.map((it) => (
        <div key={it.label} className="flex items-baseline justify-between gap-4 border-b border-border py-1.5">
          <dt className="text-muted-foreground">{it.label}</dt>
          <dd className="font-semibold tabular-nums">{formatCell(it.value, it.format ?? (typeof it.value === "number" ? "number" : "text"))}</dd>
        </div>
      ))}
    </dl>
  );
}

function Statement({ block }: { block: StatementBlock }) {
  return (
    <div className="text-[12px]">
      {block.groups.map((g) => (
        <div key={g.heading} className="mb-4 break-inside-avoid">
          <p className="mb-1 font-semibold uppercase tracking-wide">{g.heading}</p>
          {g.lines.length === 0 && <p className="py-1 pl-4 italic text-muted-foreground">{g.emptyText ?? "None in this period."}</p>}
          {g.lines.map((l, i) => (
            <div key={`${l.code}-${i}`} className="flex items-baseline gap-3 py-0.5 pl-4">
              {l.code && <span className="w-16 shrink-0 font-mono text-[10.5px] text-muted-foreground">{l.code}</span>}
              <span className="flex-1">{l.label}</span>
              <span className="tabular-nums">{formatMoney(l.amount)}</span>
            </div>
          ))}
          <div className="mt-1 flex items-baseline justify-between border-t border-foreground/70 pl-4 pt-1 font-semibold">
            <span>{g.totalLabel}</span>
            <span className="tabular-nums">{formatMoney(g.total)}</span>
          </div>
        </div>
      ))}
      {block.result && (
        <div
          className={cn(
            "mt-2 flex items-baseline justify-between border-y-[3px] border-double border-foreground py-1.5 text-[13px] font-bold uppercase tracking-wide",
            block.result.tone === "negative" && "text-destructive"
          )}
        >
          <span>{block.result.label}</span>
          <span className="tabular-nums">{formatMoney(block.result.amount)}</span>
        </div>
      )}
    </div>
  );
}

const NOTE_TONES: Record<NonNullable<NoteBlock["tone"]>, string> = {
  info: "border-info text-foreground",
  warning: "border-warning text-foreground",
  success: "border-success text-foreground",
  destructive: "border-destructive text-destructive",
};

function Note({ block }: { block: NoteBlock }) {
  return (
    <p className={cn("border-l-[3px] py-1 pl-3 text-[12px]", NOTE_TONES[block.tone ?? "info"])}>{block.text}</p>
  );
}
