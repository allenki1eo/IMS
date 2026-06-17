import { NextRequest } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, handleError } from "@/lib/response";

// Lot number patterns — ordered most-specific first to avoid double-counting
const LOT_PATTERNS: RegExp[] = [
  // Explicit keyword prefix: "LOT 001", "LOT-001", "Lot#001"
  /\bLOT[#\-\s]?\d{2,6}\b/gi,
  // Generic letter prefix + digits: ABC-001, L-001, GIN123
  /\b[A-Z]{1,5}[-/]?\d{2,6}\b/gi,
  // Bare 4–6 digit numbers (catch-all, lower priority)
  /\b\d{4,6}\b/g,
];

// Common OCR confusion pairs to fix before parsing
const OCR_CORRECTIONS: [RegExp, string][] = [
  [/\bO(?=\d)/g, "0"],   // capital O before digit → 0
  [/(?<=\d)O\b/g, "0"],  // capital O after digit  → 0
  [/\bI(?=\d)/g, "1"],   // capital I before digit  → 1
  [/(?<=\d)l\b/g, "1"],  // lowercase l after digit → 1
  [/\bS(?=\d)/g, "5"],   // S before digit          → 5
];

function applyCorrections(text: string): string {
  let out = text;
  for (const [pattern, replacement] of OCR_CORRECTIONS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

function extractLotNumbers(rawText: string): string[] {
  const text = applyCorrections(rawText);
  const found = new Set<string>();
  const seen = new Set<string>(); // track already-matched ranges to avoid double-counting

  for (const pattern of LOT_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const key = `${match.index}-${match.index + match[0].length}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const normalised = match[0].toUpperCase().replace(/[\s#]/g, "").trim();
      found.add(normalised);
    }
  }
  return Array.from(found);
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "cotton:lot:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  try {
    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;
    if (!imageFile) return badRequest("image file is required");

    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { createWorker } = await import("tesseract.js");

    const { PSM } = await import("tesseract.js");
    const worker = await createWorker("eng", 1, { logger: () => {} });

    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-/#. \n",
    });

    const { data } = await worker.recognize(buffer);
    await worker.terminate();

    const text: string = data.text ?? "";
    const lotNumbers = extractLotNumbers(text);

    // Also return per-word confidence so the UI can flag low-confidence reads
    const lowConfidenceWords = (data.words ?? [])
      .filter((w: { confidence: number; text: string }) => w.confidence < 60 && w.text.trim())
      .map((w: { text: string; confidence: number }) => ({ text: w.text, confidence: Math.round(w.confidence) }));

    return success({
      lotNumbers,
      rawText: text,
      totalFound: lotNumbers.length,
      lowConfidenceWords,
    });
  } catch (err) {
    return handleError(err);
  }
}
