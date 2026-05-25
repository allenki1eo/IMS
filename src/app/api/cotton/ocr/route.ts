import { NextRequest } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, handleError } from "@/lib/response";

// Lot number patterns:
// LOT001, LOT-001, L001, A001, ABC-001, 0001, etc.
const LOT_PATTERNS = [
  /\b[A-Z]{1,5}[-\s]?\d{2,6}\b/gi,   // letter prefix + digits: LOT001, L-001, ABC 012
  /\b\d{4,6}\b/g,                      // bare numbers 4–6 digits: 00123
];

function extractLotNumbers(text: string): string[] {
  const found = new Set<string>();
  for (const pattern of LOT_PATTERNS) {
    const matches = text.match(pattern) ?? [];
    for (const m of matches) {
      // Normalise: uppercase, collapse internal spaces/dashes
      found.add(m.toUpperCase().replace(/\s+/g, "").trim());
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

    // Dynamically import tesseract.js to avoid edge-runtime issues
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createWorker } = require("tesseract.js");

    const worker = await createWorker("eng", 1, {
      // Suppress verbose Tesseract logs
      logger: () => {},
    });

    const {
      data: { text },
    } = await worker.recognize(buffer);

    await worker.terminate();

    const lotNumbers = extractLotNumbers(text as string);

    return success({
      lotNumbers,
      rawText: text,           // returned so the UI can show what was read
      totalFound: lotNumbers.length,
    });
  } catch (err) {
    return handleError(err);
  }
}
