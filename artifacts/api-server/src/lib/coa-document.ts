export const MAX_COA_BYTES = 5 * 1024 * 1024;
export const COA_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type CoaMimeType = (typeof COA_MIME_TYPES)[number];

export type DocumentValidation =
  | { ok: true; bytes: Buffer; mimeType: CoaMimeType }
  | { ok: false; status: 400 | 413; error: string };

const BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/;

export function isCoaMimeType(value: string): value is CoaMimeType {
  return (COA_MIME_TYPES as readonly string[]).includes(value);
}

export function hasMatchingDocumentSignature(bytes: Buffer, mimeType: CoaMimeType): boolean {
  if (bytes.byteLength === 0) {
    return false;
  }

  if (mimeType === "application/pdf") {
    const head = bytes.subarray(0, 8).toString("ascii");
    return head.includes("%PDF");
  }

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
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  );
}

export function validateCoaDocument(documentBase64: string, mimeType: string): DocumentValidation {
  if (!documentBase64 || !mimeType) {
    return { ok: false, status: 400, error: "Choose a PDF, JPEG, PNG, or WebP laboratory report." };
  }

  if (!isCoaMimeType(mimeType)) {
    return { ok: false, status: 400, error: "Choose a PDF, JPEG, PNG, or WebP laboratory report." };
  }

  if (
    documentBase64.length > 8 * 1024 * 1024 ||
    documentBase64.length % 4 !== 0 ||
    !BASE64_PATTERN.test(documentBase64)
  ) {
    return { ok: false, status: 400, error: "The document data is invalid. Please choose another file." };
  }

  const bytes = Buffer.from(documentBase64, "base64");
  if (!bytes.byteLength) {
    return { ok: false, status: 400, error: "This file is empty or could not be read. Choose another document." };
  }

  if (bytes.byteLength > MAX_COA_BYTES) {
    return { ok: false, status: 413, error: "This document is too large. Choose a file under 5 MB." };
  }

  if (!hasMatchingDocumentSignature(bytes, mimeType)) {
    return {
      ok: false,
      status: 400,
      error: "The file does not match its selected document type, or the file is damaged.",
    };
  }

  return { ok: true, bytes, mimeType };
}
