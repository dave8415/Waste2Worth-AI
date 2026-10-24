import { Router, type IRouter } from "express";
import { AnalyzeWasteBody, AnalyzeWasteResponse } from "@workspace/api-zod";
import { describeGeminiFailure } from "../lib/gemini-error";
import { geminiErrorMessage } from "../lib/gemini-errors";
import { photoObservation } from "../lib/photo-observations";

const router: IRouter = Router();
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const GEMINI_MODEL = "gemini-3.1-flash-lite";
const LIMITATION_NOTE =
  "A photo cannot confirm moisture, quality, or energy value. Lab testing may still be needed before choosing a reuse method.";

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
    "Only describe visible condition or apparent dryness. Never output a numeric moisture percentage, calorific/heating value, ash percentage, or certified quality grade in any field. These require user-entered measurements, never photo inference.",
    "You help farmers and collectors identify agricultural and plantation waste from a photo.",
    "Identify the most likely visible material. Be cautious: do not claim certainty when evidence is weak.",
    "List short visual clues that are actually visible in the image, and practical possible reuse options.",
    "Only suggest options appropriate to the apparent material; avoid claiming that a specific use is safe or profitable.",
    "If the image is not clearly agricultural or plantation residue, say that in wasteType and use low confidence.",
    "Return JSON fields: wasteType, confidence (low, medium, or high), visibleClues, visibleQualityIndicators, possibleContamination, possibleUses, limitationNote.",
    "visibleQualityIndicators lists only observable surface or condition clues, not confirmed material quality. possibleContamination lists possible visible foreign matter, mould-like patches or mixed material only when actually visible, and says these need inspection. Use empty arrays if not assessable. Do not infer purity or absence of contamination from an image.",
    "Do not infer moisture, quality, or energy value from the image. The limitationNote must say that a photo cannot confirm these and lab testing may still be needed.",
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
                confidence: { type: "STRING", enum: ["low", "medium", "high"] },
                visibleClues: { type: "ARRAY", items: { type: "STRING" } },
                visibleQualityIndicators: { type: "ARRAY", items: { type: "STRING" } },
                possibleContamination: { type: "ARRAY", items: { type: "STRING" } },
                possibleUses: { type: "ARRAY", items: { type: "STRING" } },
                limitationNote: { type: "STRING" },
              },
              required: ["wasteType", "confidence", "visibleClues", "visibleQualityIndicators", "possibleContamination", "possibleUses", "limitationNote"],
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

    const parsedAnalysis = AnalyzeWasteResponse.safeParse(generatedValue);
    if (!parsedAnalysis.success) {
      req.log.warn("Gemini returned an analysis with an unexpected format");
      res.status(502).json({ error: "The analysis could not be read. Please try again." });
      return;
    }

    const visual = parsedAnalysis.data;
    for (const field of ["visibleClues", "visibleQualityIndicators", "possibleContamination", "possibleUses"] as const) {
      visual[field] = visual[field]?.filter(line => photoObservation(line) !== null) ?? [];
    }
    visual.wasteType = photoObservation(visual.wasteType) ?? "Agricultural residue (visual estimate)";
    res.json(
      AnalyzeWasteResponse.parse({
        ...visual,
        limitationNote: LIMITATION_NOTE,
      }),
    );
  } catch {
    req.log.warn("Gemini image analysis request could not be completed");
    res.status(503).json({
      error: "Gemini could not analyze this photo right now. Check the connection and try again.",
    });
  }
});

export default router;
