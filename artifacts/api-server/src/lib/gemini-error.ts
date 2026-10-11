function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : {};
}

/** Log selected error fields only, never the raw response, request, or credentials. */
export function describeGeminiFailure(httpStatus: number, payload: unknown, apiKey: string) {
  const error = asRecord(asRecord(payload).error);
  let providerMessage = typeof error.message === "string" ? error.message : "No error message returned.";
  if (apiKey) {
    providerMessage = providerMessage.split(apiKey).join("[REDACTED]");
    providerMessage = providerMessage.split(encodeURIComponent(apiKey)).join("[REDACTED]");
  }
  providerMessage = providerMessage
    .replace(/AIza[A-Za-z0-9_-]+/g, "[REDACTED]")
    .replace(/([?&]key=)[^&\s"']+/gi, "$1[REDACTED]")
    .slice(0, 1500);
  const providerStatus =
    typeof error.status === "string" && /^[A-Z_]+$/.test(error.status)
      ? error.status
      : "UNKNOWN";
  const providerReasons = Array.isArray(error.details)
    ? error.details.map(asRecord).map(detail => detail.reason)
        .filter((reason): reason is string => typeof reason === "string" && /^[A-Z_]+$/.test(reason))
    : [];

  let message: string;
  if (
    httpStatus === 401 ||
    providerReasons.includes("API_KEY_INVALID") ||
    /api key not valid|invalid api key|api key expired/i.test(providerMessage)
  ) {
    message = "Google rejected the Gemini API key. Check the server's GEMINI_API_KEY in Secrets; do not enter it here.";
  } else if (httpStatus === 403) {
    message = "Google denied Gemini API access. Check that the Generative Language API is enabled and the key's API restrictions allow it.";
  } else if (httpStatus === 404) {
    message = "Google could not find the configured Gemini model or endpoint. The server configuration needs to be checked.";
  } else if (httpStatus === 429) {
    message = "Google's Gemini quota or rate limit was reached. Wait before retrying and check your Google AI Studio usage and quota.";
  } else if (httpStatus === 400) {
    message = "Google rejected the image or analysis request format. Try a valid JPEG, PNG, or WebP photo; the server logs contain the redacted error details.";
  } else {
    message = "Google's Gemini service could not complete the analysis. Please try again later.";
  }

  return {
    diagnostic: { upstreamStatus: httpStatus, providerStatus, providerMessage, providerReasons },
    message,
  };
}
