import { validateCoaDocument } from "./coa-document";
import {
  COA_EXTRACTION_PROMPT,
  COA_RESPONSE_SCHEMA,
  GEMINI_COA_MODEL,
  sanitizeCoaExtraction,
  type CoaCandidate,
} from "./coa-extraction";
import { describeGeminiFailure } from "./gemini-error";
import { geminiErrorMessage } from "./gemini-errors";

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

export type ExtractLog = {
  warn: (obj: object | string, msg?: string) => void;
};

export type ExtractCoaResult = {
  status: number;
  json: { error: string } | CoaCandidate;
};

const MISSING_KEY =
  "Gemini is not configured yet. Add GEMINI_API_KEY to the server's environment secrets, then try again.";

export async function extractCoaFromDocument(
  body: unknown,
  options: {
    apiKey: string | undefined;
    fetchImpl?: typeof fetch;
    log: ExtractLog;
  },
): Promise<ExtractCoaResult> {
  const record = body !== null && typeof body === "object" ? body as Record<string, unknown> : {};
  const documentBase64 = typeof record.documentBase64 === "string" ? record.documentBase64 : "";
  const mimeType = typeof record.mimeType === "string" ? record.mimeType : "";
  const document = validateCoaDocument(documentBase64, mimeType);
  if (!document.ok) {
    return { status: document.status, json: { error: document.error } };
  }

  const apiKey = options.apiKey?.trim();
  if (!apiKey) {
    return { status: 503, json: { error: MISSING_KEY } };
  }

  const fetchImpl = options.fetchImpl ?? fetch;

  try {
    const upstreamResponse = await fetchImpl(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_COA_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        signal: AbortSignal.timeout(90_000),
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: COA_EXTRACTION_PROMPT },
                { inline_data: { mime_type: document.mimeType, data: documentBase64 } },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: COA_RESPONSE_SCHEMA,
            temperature: 0,
          },
        }),
      },
    );

    if (!upstreamResponse.ok) {
      const errorPayload: unknown = await upstreamResponse.json().catch(() => null);
      const failure = describeGeminiFailure(upstreamResponse.status, errorPayload, apiKey);
      options.log.warn(
        { model: GEMINI_COA_MODEL, ...failure.diagnostic },
        "Gemini COA extraction request failed",
      );
      return {
        status: 503,
        json: { error: geminiErrorMessage(upstreamResponse.status, errorPayload, "document") },
      };
    }

    const payload = (await upstreamResponse.json()) as GeminiResponse;
    const generatedText = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();
    if (!generatedText) {
      return { status: 502, json: { error: "Gemini returned no printed values. Enter the results manually." } };
    }

    let generatedValue: unknown;
    try {
      generatedValue = JSON.parse(generatedText);
    } catch {
      options.log.warn("Gemini returned invalid COA JSON");
      return { status: 502, json: { error: "The extracted values could not be read. Enter the results manually." } };
    }

    return { status: 200, json: sanitizeCoaExtraction(generatedValue) };
  } catch {
    options.log.warn("Gemini COA extraction request could not be completed");
    return {
      status: 503,
      json: { error: "Gemini could not read this document right now. Check the connection and try again." },
    };
  }
}
