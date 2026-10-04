import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, Header, WidthType, TableLayoutType, BorderStyle, AlignmentType, HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom } from "docx";
import { fitInvoicePageContent } from "./invoiceLayout";

const PAGE_WIDTH = 11906;
const PAGE_HEIGHT = 16838;
const PIXEL_TO_TWIP = 15;
const clean = (text) => String(text || "").replace(/\s+/g, " ").trim();
const css = (node) => window.getComputedStyle(node.nodeType === 3 ? node.parentElement : node);
const skip = (node) => node.matches?.(".invoice-pad-bg, button, script, style, svg, .quotation-pdf-excluded");
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const borderless = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder };
function color(value) {
  const match = String(value).match(/rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)(?:[, /]+([\d.]+))?\)/);
  if (!match || match[4] === "0") return undefined;
  return match.slice(1, 4).map((v) => Number(v).toString(16).padStart(2, "0")).join("").toUpperCase();
}
function textRuns(node) {
  if (node.nodeType === 3) {
    const style = css(node);
    return [new TextRun({ text: node.textContent.replace(/\s+/g, " "), font: "Arial", size: Math.max(14, Math.round((parseFloat(style.fontSize) || 13) * 1.5)), bold: Number(style.fontWeight) >= 600 || style.fontWeight === "bold", italics: style.fontStyle === "italic", color: color(style.color) })];
  }
  if (skip(node) || node.tagName === "IMG") return [];
  if (node.tagName === "BR") return [new TextRun({ break: 1 })];
  return [...node.childNodes].flatMap(textRuns);
}
function paragraph(node, prefix = "") {
  const style = css(node);
  const isHeading = /^H[1-6]$/.test(node.tagName) || /terms-title|terms-h|proposal-title|price-title/.test(node.className || "");
  return new Paragraph({
    children: [...(prefix ? [new TextRun({ text: prefix, bold: isHeading })] : []), ...textRuns(node)],
    alignment: style.textAlign === "center" ? AlignmentType.CENTER : style.textAlign === "right" ? AlignmentType.RIGHT : AlignmentType.LEFT,
    spacing: { before: Math.min(180, Math.round((parseFloat(style.marginTop) || 0) * 10)), after: isHeading ? 100 : 45, line: 250 },
    shading: color(style.backgroundColor) ? { fill: color(style.backgroundColor) } : undefined,
    keepNext: isHeading,
  });
}
async function imageRun(node, background = false) {
  const response = await fetch(node.src);
  if (!response.ok) throw new Error("Could not load quotation artwork. Please refresh and try again.");
  const blob = await response.blob();
  let data = new Uint8Array(await blob.arrayBuffer());
  let type = blob.type.includes("jpeg") ? "jpg" : blob.type.includes("gif") ? "gif" : "png";
  if (!/image\/(png|jpeg|gif)/.test(blob.type)) {
    const image = new Image();
    image.src = node.src;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext("2d").drawImage(image, 0, 0);
    const converted = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!converted) throw new Error("Could not convert quotation artwork.");
    data = new Uint8Array(await converted.arrayBuffer());
    type = "png";
  }
  const rect = node.getBoundingClientRect();
  const width = background ? PAGE_WIDTH / 15 : Math.min(rect.width || 80, 140);
  const height = background ? PAGE_HEIGHT / 15 : rect.height || width * (node.naturalHeight || 50) / (node.naturalWidth || 100);
  return new ImageRun({ type, data, transformation: { width, height },
    ...(background ? { floating: {
      horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: 0 },
      verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: 0 },
      behindDocument: true, allowOverlap: true,
    } } : {}),
  });
}
async function nativeTable(node) {
  const first = [...node.rows].find((row) => [...row.cells].every((cell) => cell.colSpan === 1));
  const widths = first ? [...first.cells].map((cell) => Math.max(300, Math.round((cell.getBoundingClientRect().width || 80) * 15))) : undefined;
  const rows = [];
  for (const row of node.rows) {
    const cells = [];
    for (const cell of row.cells) {
      const children = await blocks(cell);
      cells.push(new TableCell({ columnSpan: cell.colSpan > 1 ? cell.colSpan : undefined, rowSpan: cell.rowSpan > 1 ? cell.rowSpan : undefined,
        shading: color(css(cell).backgroundColor) ? { fill: color(css(cell).backgroundColor) } : undefined,
        margins: { top: 80, bottom: 80, left: 70, right: 70 },
        children: children.length ? children : [new Paragraph("")],
      }));
    }
    rows.push(new TableRow({ children: cells, tableHeader: row.parentElement.tagName === "THEAD", cantSplit: true }));
  }
  return [new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED, columnWidths: widths }), new Paragraph({ spacing: { after: 60 } })];
}
async function twoColumns(node) {
  const children = [...node.children];
  const rows = [];
  for (let i = 0; i < children.length; i += 2) {
    const cells = [];
    const pair = children.slice(i, i + 2);
    for (const child of pair) {
      // Keep labels and values together, including address/quality text.
      cells.push(new TableCell({ columnSpan: pair.length === 1 ? 2 : undefined, borders: borderless, margins: { top: 40, bottom: 80, left: 0, right: 100 }, children: [paragraph(child)] }));
    }
    rows.push(new TableRow({ children: cells, cantSplit: true }));
  }
  return [new Table({ rows, borders: borderless, width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: [5400, 5400], layout: TableLayoutType.FIXED }), new Paragraph({ spacing: { after: 30 } })];
}
const roman = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];
async function blocks(node) {
  if (node.nodeType === 3) return clean(node.textContent) ? [paragraph(node)] : [];
  if (skip(node)) return [];
  if (node.tagName === "IMG") return [new Paragraph({ children: [await imageRun(node)], spacing: { after: 50 } })];
  if (node.tagName === "TABLE") return nativeTable(node);
  if (node.matches(".price-title, .renex-proposal-title, .sasha-proposal-title, .terms-title")) return [paragraph(node)];
  if (node.matches(".info-grid, .sasha-client-grid, .renex-client-grid, .ref-row, .sasha-ref-row")) return twoColumns(node);
  if (node.matches(".signatures, .sasha-signatory, .renex-signatory")) {
    const result = [new Paragraph({ text: "Sincerely", spacing: { before: 200, after: 80 } })];
    const images = [...node.querySelectorAll("img")];
    if (images.length) result.push(new Paragraph({ children: await Promise.all(images.map((image) => imageRun(image))) }));
    const profile = node.querySelector(".profile-name");
    const details = profile ? [...profile.children] : [...node.children].filter((child) => !child.querySelector("img") && !child.matches("img, .sig-title, .sasha-sincerely, .renex-sincerely"));
    for (const detail of details) result.push(paragraph(detail));
    return result;
  }
  if (node.tagName === "OL" || node.tagName === "UL") {
    const result = [];
    const items = [...node.children].filter((child) => child.tagName === "LI");
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const prefix = node.tagName === "UL" ? "• " : node.getAttribute("type") === "i" ? `${roman[index] || index + 1}. ` : `${index + 1}. `;
      const nested = [...item.children].some((child) => /^(DIV|OL|UL|SECTION)$/.test(child.tagName));
      if (!nested) result.push(paragraph(item, prefix));
      else {
        let first = true;
        for (const child of item.childNodes) {
          if (child.nodeType === 3 && !clean(child.textContent)) continue;
          if (first && child.nodeType === 1 && !/^(OL|UL)$/.test(child.tagName)) {
            result.push(paragraph(child, prefix)); first = false;
          } else result.push(...await blocks(child));
        }
      }
    }
    return result;
  }
  const hasBlocks = [...node.children].some((child) => !skip(child) && (child.tagName === "IMG" || /^(TABLE|OL|UL)$/.test(child.tagName) || !["inline", "inline-block", "contents"].includes(css(child).display)));
  if (!hasBlocks && clean(node.textContent)) return [paragraph(node)];
  const result = [];
  for (const child of node.childNodes) result.push(...await blocks(child));
  return result;
}
export async function createWordDocument({ pages }) {
  if (!pages.length || pages.some((page) => !page)) throw new Error("Calculate a quotation before downloading Word.");
  await document.fonts?.ready;
  const sections = [];
  for (const source of pages) {
    const page = source.cloneNode(true);
    page.removeAttribute("id");
    page.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
    page.classList.remove("preview-mode");
    page.classList.add("invoice--pdf-scale");
    Object.assign(page.style, { position: "absolute", left: "-10000px", top: "0", width: "794px", transform: "none" });
    document.body.appendChild(page);
    try {
      fitInvoicePageContent(page);
      const inner = page.querySelector(":scope > .invoice-inner") || page;
      const style = css(inner);
      const pad = page.querySelector(".invoice-pad-bg");
      const header = pad ? new Header({ children: [new Paragraph({ children: [await imageRun(pad, true)] })] }) : undefined;
      sections.push({
        properties: { page: { size: { width: PAGE_WIDTH, height: PAGE_HEIGHT }, margin: {
          top: Math.round((parseFloat(style.paddingTop) || 150) * 14.33), bottom: Math.round((parseFloat(style.paddingBottom) || 90) * 14.33),
          left: Math.round((parseFloat(style.paddingLeft) || 30) * PIXEL_TO_TWIP), right: Math.round((parseFloat(style.paddingRight) || 30) * PIXEL_TO_TWIP), header: 0, footer: 0,
        } } },
        ...(header ? { headers: { default: header } } : {}),
        children: await blocks(inner),
      });
    } finally { page.remove(); }
  }
  return new Document({ creator: "Quotation Builder", title: "Quotation", styles: { default: { document: { run: { font: "Arial", size: 18 }, paragraph: { spacing: { after: 60 } } } } }, sections });
}
export async function downloadWord(options) {
  const blob = await Packer.toBlob(await createWordDocument(options));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = options.filename.replace(/\.(pdf|docx)$/i, "") + ".docx";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
