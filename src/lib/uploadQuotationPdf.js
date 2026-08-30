/**
 * Optional cloud upload for generated quotations.
 * Set REACT_APP_QUOTATION_PDF_UPLOAD_URL to your HTTPS endpoint (FormData POST).
 * Body: file (PDF), refNo, source ("web" | "android"), generatedAt (ISO).
 * Optional: REACT_APP_QUOTATION_PDF_UPLOAD_API_KEY → sent as Authorization: Bearer <key>
 * Your server should store under a path like quotations/{source}/{sanitizedRef}.pdf to avoid clashes.
 */

const UPLOAD_URL = process.env.REACT_APP_QUOTATION_PDF_UPLOAD_URL || "";
const API_KEY = process.env.REACT_APP_QUOTATION_PDF_UPLOAD_API_KEY || "";

export function isQuotationPdfUploadConfigured() {
  return Boolean(UPLOAD_URL && API_KEY);
}

export async function uploadQuotationPdf({ blob, filename, refNo, source = "web" }) {
  if (!UPLOAD_URL || !blob) return { ok: false, skipped: true, reason: "no_url" };
  if (!API_KEY) return { ok: false, skipped: true, reason: "no_api_key" };

  const form = new FormData();
  form.append("file", blob, filename);
  form.append("refNo", refNo || "");
  form.append("source", source);
  form.append("generatedAt", new Date().toISOString());

  const res = await fetch(UPLOAD_URL, {
    method: "POST",
    body: form,
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Upload failed (${res.status})`);
  }
  return { ok: true, skipped: false };
}
