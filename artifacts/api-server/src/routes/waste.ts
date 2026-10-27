import { Router, type IRouter } from "express";
import { AnalyzeWasteBody, AnalyzeWasteResponse, ExtractCoaBody, ExtractCoaResponse } from "@workspace/api-zod";
import { extractCoaFromDocument } from "../lib/extract-coa";
import { describeGeminiFailure } from "../lib/gemini-error";
import { ANALYSIS_TIMEOUT_MESSAGE, geminiErrorMessage, isGeminiTimeoutError } from "../lib/gemini-errors";
import {
  MATERIAL_CATEGORIES,
  PREFERRED_MATERIAL_IDS,
  normalizeWasteAnalysis,
} from "../lib/waste-analysis";

const router: IRouter = Router();
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const GEMINI_MODEL = "gemini-3.1-flash-lite";

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

function hasMatchingImageSignature(bytes: Buffer, mimeType: string): boolean {
  if (mimeType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (mimeType === "image/png") {
    return (
      bytes.length >= 8 &&
      bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    );
  }

  return (
    mimeType === "image/webp" &&
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  );
}

router.post("/waste/analyze", async (req, res): Promise<void> => {
  const parsedInput = AnalyzeWasteBody.safeParse(req.body);
  if (!parsedInput.success) {
    res.status(400).json({ error: "Choose a JPEG, PNG, or WebP image to analyze." });
    return;
  }

  const { imageBase64, mimeType } = parsedInput.data;
  if (
    imageBase64.length > 8 * 1024 * 1024 ||
    imageBase64.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(imageBase64)
  ) {
    res.status(400).json({ error: "The image data is invalid. Please choose another photo." });
    return;
  }

  const imageBytes = Buffer.from(imageBase64, "base64");
  if (imageBytes.byteLength > MAX_IMAGE_BYTES) {
    res.status(413).json({ error: "This photo is too large. Choose an image under 6 MB." });
    return;
  }

  if (!hasMatchingImageSignature(imageBytes, mimeType)) {
    res.status(400).json({ error: "The image file does not match its selected image type." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    res.status(503).json({
      error:
        "Gemini is not configured yet. Add GEMINI_API_KEY to the server's environment secrets, then try again.",
    });
    return;
  }

  const prompt = [
    "Only describe what is visible: colour, shape, texture, particle size appearance, visible dryness, clumping, mould-like appearance, soil, stones, plastic, leaves, metal, or other visible debris.",
    "Never output a numeric moisture percentage, calorific or heating value, ash percentage, bulk density, quality grade, or certification in any field. Never calculate those values from a photo.",
    "You identify any agricultural or plantation residue, including materials not in a local database. Do not restrict yourself to a short list.",
    "Return JSON fields: materialId, materialName, materialCategory, confidence (low, medium, or high), visibleClues, visibleQualityIndicators, possibleContamination, possibleUses, needsUserConfirmation, isAgriculturalResidue, wasteType, limitationNote.",
    `Preferred materialId values when clearly matched: ${PREFERRED_MATERIAL_IDS.join(", ")}.`,
    `materialCategory must be one of: ${MATERIAL_CATEGORIES.join("; ")}.`,
    "materialName is a human-readable name and may be open, including Indonesian common names. Always keep that proposed name. Do not return materialId as the display name; use a normal name such as Rice straw.",
    "Only set a preferred materialId when the visible material matches that id or its common names. Never assign rice-husk or rice-straw because the photo is rice-related.",
    "Do not use rice-husk or rice-straw for gabah, paddy rice, paddy grain, rice grain, unmilled rice, beras, a rice field, or a standing crop.",
    "isAgriculturalResidue must be true, false, or unknown as strings. true only for agricultural or plantation residue such as husks, straw, bagasse, shells, peels, stalks, fronds or wood residues.",
    "false for food grain, paddy, gabah, beras, standing crops, people, buildings, machinery, animals, or unrelated scenes.",
    "If no preferred materialId matches, set materialId to other-agricultural-residue, keep materialName, and set needsUserConfirmation to true.",
    "If the image is not agricultural or plantation residue, use materialId unknown, isAgriculturalResidue false, low or medium confidence, and needsUserConfirmation true.",
    "Set needsUserConfirmation true when confidence is medium or low, or when materialId is other-agricultural-residue or unknown.",
    "wasteType must equal materialName.",
    "visibleQualityIndicators are only visible condition clues, not confirmed quality.",
    "possibleContamination lists only visible foreign matter. Never claim the batch is clean from a photo. If nothing suspicious is visible, return an empty array.",
    "possibleUses are options to investigate, not proven safe or profitable uses.",
    "The limitationNote must say that a photo cannot confirm moisture, quality, or energy value and lab testing may still be needed.",
  ].join(" ");

  try {
    const upstreamResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        signal: AbortSignal.timeout(90_000),
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType, data: imageBase64 } },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                wasteType: { type: "STRING" },
                materialId: { type: "STRING" },
                materialName: { type: "STRING" },
                materialCategory: { type: "STRING" },
                confidence: { type: "STRING", enum: ["low", "medium", "high"] },
                visibleClues: { type: "ARRAY", items: { type: "STRING" } },
                visibleQualityIndicators: { type: "ARRAY", items: { type: "STRING" } },
                possibleContamination: { type: "ARRAY", items: { type: "STRING" } },
                possibleUses: { type: "ARRAY", items: { type: "STRING" } },
                needsUserConfirmation: { type: "BOOLEAN" },
                isAgriculturalResidue: { type: "STRING", enum: ["true", "false", "unknown"] },
                limitationNote: { type: "STRING" },
              },
              required: [
                "wasteType", "materialId", "materialName", "materialCategory", "confidence",
                "visibleClues", "visibleQualityIndicators", "possibleContamination", "possibleUses",
                "needsUserConfirmation", "isAgriculturalResidue", "limitationNote",
              ],
            },
            temperature: 0.2,
          },
        }),
      },
    );
    if (!upstreamResponse.ok) {
      const errorPayload: unknown = await upstreamResponse.json().catch(() => null);
      const failure = describeGeminiFailure(upstreamResponse.status, errorPayload, apiKey);
      req.log.warn(
        { model: GEMINI_MODEL, ...failure.diagnostic },
        "Gemini image analysis request failed",
      );
      res.status(503).json({ error: geminiErrorMessage(upstreamResponse.status, errorPayload) });
      return;
    }

    const payload = (await upstreamResponse.json()) as GeminiResponse;
    const generatedText = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();
    if (!generatedText) {
      res.status(502).json({ error: "Gemini returned no analysis. Please try another photo." });
      return;
    }

    let generatedValue: unknown;
    try {
      generatedValue = JSON.parse(generatedText);
    } catch {
      req.log.warn("Gemini returned invalid analysis JSON");
      res.status(502).json({ error: "The analysis could not be read. Please try again." });
      return;
    }

    const visual = normalizeWasteAnalysis(generatedValue);
    const parsedAnalysis = AnalyzeWasteResponse.safeParse(visual);
    if (!parsedAnalysis.success) {
      req.log.warn("Gemini returned an analysis with an unexpected format");
      res.status(502).json({ error: "The analysis could not be read. Please try again." });
      return;
    }

    res.json(parsedAnalysis.data);
  } catch (error) {
    req.log.warn("Gemini image analysis request could not be completed");
    res.status(503).json({
      error: isGeminiTimeoutError(error)
        ? ANALYSIS_TIMEOUT_MESSAGE
        : "Gemini could not analyze this photo right now. Check the connection and try again.",
    });
  }
});

router.post("/waste/extract-coa", async (req, res): Promise<void> => {
  const parsedInput = ExtractCoaBody.safeParse(req.body);
  if (!parsedInput.success) {
    res.status(400).json({ error: "Choose a PDF, JPEG, PNG, or WebP laboratory report." });
    return;
  }
  const result = await extractCoaFromDocument(parsedInput.data, {
    apiKey: process.env.GEMINI_API_KEY,
    log: req.log,
  });
  if (result.status === 200 && !("error" in result.json)) {
    const parsed = ExtractCoaResponse.safeParse(result.json);
    if (!parsed.success) {
      req.log.warn("Gemini returned a COA result with an unexpected format");
      res.status(502).json({ error: "The extracted values could not be read. Enter the results manually." });
      return;
    }
    res.json(parsed.data);
    return;
  }
  res.status(result.status).json(result.json);
});

export default router;
