import { useState } from "react";

export default function WordButton({ disabled, filename, companyName, logoUrl, onBeforeDownload }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const download = async () => {
    setBusy(true);
    setError("");
    try {
      const { downloadWord } = await import("../lib/wordExport");
      if (onBeforeDownload) await onBeforeDownload();
      await downloadWord({ pages: [document.getElementById("pdf-page-1"), document.getElementById("pdf-page-2")], filename, companyName, logoUrl });
    } catch (failure) {
      setError(failure.message || "Word download failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return <div className="word-download">
    <button type="button" className="btn btn-light" title="Download an editable Word quotation with company letterhead, text and tables." disabled={disabled || busy} onClick={download}>{busy ? "Preparing Word…" : "Download Word (.docx)"}</button>
    {error ? <small role="alert">{error}</small> : null}
  </div>;
}
