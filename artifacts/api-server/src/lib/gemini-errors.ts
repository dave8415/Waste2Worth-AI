export const ANALYSIS_TIMEOUT_MESSAGE = "Analysis took too long. Please try again.";

export function isGeminiTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error && typeof error.name === "string" ? error.name : "";
  const message = "message" in error && typeof error.message === "string" ? error.message : "";
  return name === "TimeoutError" || name === "AbortError" || /aborted due to timeout/i.test(message);
}

export function geminiErrorMessage(
  status: number,
  payload: unknown,
  kind: "photo" | "document" = "photo",
): string {
  const error =
    payload && typeof payload === "object" && "error" in payload
      ? (payload as { error?: unknown }).error
      : undefined;
  const details =
    error && typeof error === "object" && "details" in error
      ? (error as { details?: unknown }).details
      : undefined;
  const invalidKey =
    Array.isArray(details) &&
    details.some(
      (detail) =>
        detail && typeof detail === "object" &&
        ["API_KEY_INVALID", "API_KEY_EXPIRED"].includes(detail.reason),
    );
  const providerMessage =
    error && typeof error === "object" && "message" in error &&
    typeof error.message === "string" ? error.message : "";

  if (invalidKey || /api key not valid|invalid api key|api key expired/i.test(providerMessage) ||
    status === 401 || status === 403) {
    return "Gemini rejected the API key or its permissions. Ask the app owner to check GEMINI_API_KEY in server Secrets and allow access to the Gemini API, then try again.";
  }
  if (status === 429) {
    return "Gemini's request limit or quota has been reached. Wait before trying again. If this continues, ask the app owner to check the Gemini project's quota and billing.";
  }
  if (status === 404) {
    return kind === "document"
      ? "The configured Gemini model is unavailable. Ask the app owner to update the server to a supported document-analysis model, then try again."
      : "The configured Gemini model is unavailable. Ask the app owner to update the server to a supported image-analysis model, then try again.";
  }
  if (status === 400) {
    return kind === "document"
      ? "Gemini could not read this document. Try a clearer PDF, JPG, PNG, or WebP laboratory report. If this continues, ask the app owner to check the Gemini configuration."
      : "Gemini could not process this photo. Try another clear JPG, PNG, or WebP image. If this continues, ask the app owner to check the Gemini configuration.";
  }
  return "Gemini is temporarily unavailable. Please wait a moment and try again.";
}
