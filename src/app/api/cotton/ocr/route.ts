import { NextRequest } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, handleError } from "@/lib/response";

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "cotton:lot:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return success({
      lotNumbers: [],
      error: "OCR_NOT_CONFIGURED",
      message: "Set ANTHROPIC_API_KEY in environment variables to enable OCR import",
    });
  }

  try {
    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;
    if (!imageFile) return badRequest("image file is required");

    const arrayBuffer = await imageFile.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mediaType = (imageFile.type || "image/jpeg") as string;

    // Dynamically require Anthropic SDK at runtime — avoids static import errors when package is absent
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let AnthropicClient: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      AnthropicClient = require("@anthropic-ai/sdk");
      // Handle both CJS default export forms
      if (AnthropicClient.default) AnthropicClient = AnthropicClient.default;
    } catch {
      return success({
        lotNumbers: [],
        error: "OCR_SDK_NOT_INSTALLED",
        message: "The @anthropic-ai/sdk package is not installed. Run: npm install @anthropic-ai/sdk",
      });
    }

    const client = new AnthropicClient({ apiKey });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: "text",
              text: 'This is a photo of a cotton lot tally sheet or lot number list. Extract all lot numbers visible. Return ONLY a JSON array of strings, no explanation. Example: ["LOT001", "LOT002"]. If none found, return [].',
            },
          ],
        },
      ],
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const textContent = message.content.find((c: any) => c.type === "text");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!textContent || (textContent as any).type !== "text") {
      return success({ lotNumbers: [] });
    }

    let lotNumbers: string[] = [];
    try {
      // Extract JSON array from response (handle cases where model adds extra text)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawText: string = (textContent as any).text;
      const openIdx = rawText.indexOf("[");
      const closeIdx = rawText.lastIndexOf("]");
      if (openIdx !== -1 && closeIdx !== -1 && closeIdx > openIdx) {
        lotNumbers = JSON.parse(rawText.slice(openIdx, closeIdx + 1));
      }
    } catch {
      // If parsing fails, return empty array
    }

    return success({ lotNumbers: Array.isArray(lotNumbers) ? lotNumbers : [] });
  } catch (err) {
    return handleError(err);
  }
}
