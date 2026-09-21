export const INVOICE_PAGE_WIDTH = 794;
export const INVOICE_PAGE_HEIGHT = 1175;

export function resolveInvoicePageFormatClass(companyFormatClass, quotationKind) {
  return quotationKind === "fixed" ? companyFormatClass : "invoice-format-shared";
}

export function getInvoiceFitElements(page) {
  const frame = page?.querySelector(":scope > .invoice-inner > .invoice-content-frame");
  const content = frame?.querySelector(":scope > .invoice-fit-content");
  return { frame, content };
}

export function resetInvoiceContentFit(page) {
  const { content } = getInvoiceFitElements(page);
  content?.style.removeProperty("transform");
  content?.style.removeProperty("transform-origin");
  content?.style.removeProperty("width");
}

export function fitInvoicePageContent(page) {
  const { frame, content } = getInvoiceFitElements(page);
  if (!frame || !content) return 1;

  resetInvoiceContentFit(page);

  const frameStyle = window.getComputedStyle(frame);
  const availableHeight = frame.clientHeight
    - (Number.parseFloat(frameStyle.paddingTop) || 0)
    - (Number.parseFloat(frameStyle.paddingBottom) || 0);
  const contentHeight = content.scrollHeight;
  const scale = Math.min(1, availableHeight / Math.max(1, contentHeight));

  if (scale < 0.999) {
    content.style.setProperty("transform", `scale(${scale})`, "important");
    content.style.setProperty("transform-origin", "top left", "important");
    content.style.setProperty("width", `${100 / scale}%`, "important");
  }

  return scale;
}
