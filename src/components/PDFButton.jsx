// src/components/PDFButton.jsx
import bengaliRegularFontUrl from "@fontsource/noto-sans-bengali/files/noto-sans-bengali-bengali-400-normal.woff";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const A4 = { w: 595.28, h: 841.89 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function normalizePdfText(value = "") {
  return String(value)
    .replace(/[–—−]/g, "-")
    .replace(/×/g, "x")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E\xA0-\xFF\u09F3]/g, "")
    .replace(/\s+/g, " ");
}

function parseCssColor(value) {
  if (!value || value === "transparent") return null;
  const match = String(value).match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/i);
  if (!match) return null;
  const opacity = match[4] === undefined ? 1 : Math.min(1, Math.max(0, Number(match[4])));
  if (opacity === 0) return null;
  return {
    color: rgb(Number(match[1]) / 255, Number(match[2]) / 255, Number(match[3]) / 255),
    opacity,
  };
}

function isVisible(style, rect) {
  return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0 && rect.width > 0 && rect.height > 0;
}

function cumulativeScale(element, root) {
  let scale = 1;
  let current = element;
  while (current && current !== root) {
    const transform = window.getComputedStyle(current).transform;
    if (transform && transform !== "none") {
      const match = transform.match(/^matrix\(([^)]+)\)$/);
      if (match) {
        const values = match[1].split(",").map(Number);
        scale *= Math.hypot(values[0] || 1, values[1] || 0);
      }
    }
    current = current.parentElement;
  }
  return scale;
}

function toRoman(value) {
  const numerals = [
    [1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"],
    [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"],
  ];
  let number = Math.max(1, Number(value) || 1);
  let result = "";
  numerals.forEach(([amount, token]) => {
    while (number >= amount) {
      result += token;
      number -= amount;
    }
  });
  return result;
}

function listMarkerFor(item) {
  const list = item.parentElement;
  if (!list || list.tagName !== "OL") return list?.tagName === "UL" ? "-" : "";
  const siblings = Array.from(list.children).filter((child) => child.tagName === "LI");
  const value = (Number(list.getAttribute("start")) || 1) + Math.max(0, siblings.indexOf(item));
  const typeAttribute = list.getAttribute("type");
  const type = (typeAttribute || window.getComputedStyle(list).listStyleType || "decimal").toLowerCase();
  if (typeAttribute === "I" || type.includes("upper-roman")) return `${toRoman(value).toUpperCase()}.`;
  if (type === "i" || type.includes("lower-roman")) return `${toRoman(value)}.`;
  if (typeAttribute === "A" || type.includes("upper-alpha")) return `${String.fromCharCode(64 + value)}.`;
  if (type === "a" || type.includes("lower-alpha")) return `${String.fromCharCode(96 + value)}.`;
  return `${value}.`;
}

function collectEditableTextRuns(el) {
  const rootRect = el.getBoundingClientRect();
  const pageWidth = rootRect.width || el.clientWidth || 794;
  const pageHeight = rootRect.height || el.clientHeight || 1123;
  const walker = document.createTreeWalker(el, window.NodeFilter.SHOW_TEXT);
  const runs = [];
  let node = walker.nextNode();

  while (node) {
    const parent = node.parentElement;
    const raw = node.nodeValue || "";
    if (parent?.closest(".price-title-left")) {
      node = walker.nextNode();
      continue;
    }
    if (parent && raw.trim()) {
      const style = window.getComputedStyle(parent);
      if (isVisible(style, parent.getBoundingClientRect())) {
        const tableCell = parent.closest("td, th");
        const alignmentContainer = tableCell || parent;
        const alignmentStyle = window.getComputedStyle(alignmentContainer);
        const alignmentRect = alignmentContainer.getBoundingClientRect();
        let lineRun = null;
        for (const match of raw.matchAll(/\S+\s*/g)) {
          const text = normalizePdfText(match[0]);
          if (!text.trim()) continue;
          const range = document.createRange();
          range.setStart(node, match.index);
          range.setEnd(node, match.index + match[0].length);
          const rect = range.getBoundingClientRect();
          range.detach?.();
          if (!rect.width || !rect.height) continue;
          if (rect.bottom <= rootRect.top || rect.top >= rootRect.bottom) continue;
          const nextRun = {
            text,
            x: rect.left - rootRect.left,
            y: rect.top - rootRect.top,
            width: rect.width,
            height: rect.height,
            fontSize: Number.parseFloat(style.fontSize) || 12,
            domScale: cumulativeScale(parent, el),
            bold: style.fontWeight === "bold" || Number.parseInt(style.fontWeight, 10) >= 600,
            italic: style.fontStyle === "italic" || style.fontStyle === "oblique",
            color: parseCssColor(style.color),
            textAlign: alignmentStyle.textAlign,
            containerX: alignmentRect.left - rootRect.left,
            containerWidth: alignmentRect.width,
            paddingLeft: Number.parseFloat(alignmentStyle.paddingLeft) || 0,
            paddingRight: Number.parseFloat(alignmentStyle.paddingRight) || 0,
            alignWithinContainer: Boolean(tableCell),
            container: alignmentContainer,
          };
          if (lineRun && Math.abs(lineRun.y - nextRun.y) < 1.5) {
            lineRun.text += nextRun.text;
            lineRun.width = Math.max(lineRun.width, (nextRun.x + nextRun.width) - lineRun.x);
          } else {
            lineRun = nextRun;
            runs.push(lineRun);
          }
        }
      }
    }
    node = walker.nextNode();
  }

  el.querySelectorAll(".price-title-left").forEach((title) => {
    const style = window.getComputedStyle(title);
    const rect = title.getBoundingClientRect();
    const text = normalizePdfText(title.textContent || "").trim();
    if (!text || !isVisible(style, rect)) return;
    runs.push({
      text,
      x: rect.left - rootRect.left,
      y: rect.top - rootRect.top,
      width: rect.width,
      height: rect.height,
      fontSize: Number.parseFloat(style.fontSize) || 12,
      domScale: cumulativeScale(title, el),
      bold: true,
      italic: false,
      color: parseCssColor(style.color),
      textAlign: "center",
      containerX: rect.left - rootRect.left,
      containerWidth: rect.width,
      paddingLeft: Number.parseFloat(style.paddingLeft) || 0,
      paddingRight: Number.parseFloat(style.paddingRight) || 0,
      alignWithinContainer: true,
    });
  });

  el.querySelectorAll("li").forEach((item) => {
    const marker = listMarkerFor(item);
    if (!marker) return;
    const style = window.getComputedStyle(item);
    const rect = item.getBoundingClientRect();
    if (!isVisible(style, rect)) return;
    runs.push({
      text: marker,
      x: Math.max(0, rect.left - rootRect.left - 18),
      y: rect.top - rootRect.top,
      width: 16,
      height: Number.parseFloat(style.lineHeight) || rect.height,
      fontSize: Number.parseFloat(style.fontSize) || 12,
      domScale: cumulativeScale(item, el),
      bold: false,
      italic: false,
      color: parseCssColor(style.color),
    });
  });

  const mergedRuns = [];
  runs.forEach((run) => {
    const previous = mergedRuns[mergedRuns.length - 1];
    const sameAlignedLine = previous
      && run.alignWithinContainer
      && previous.container === run.container
      && Math.abs(previous.y - run.y) < 1.5
      && previous.bold === run.bold
      && previous.italic === run.italic
      && Math.abs(previous.fontSize - run.fontSize) < 0.1;

    if (sameAlignedLine) {
      previous.text += run.text;
      const right = Math.max(previous.x + previous.width, run.x + run.width);
      previous.x = Math.min(previous.x, run.x);
      previous.width = right - previous.x;
    } else {
      mergedRuns.push(run);
    }
  });

  return { runs: mergedRuns, pageWidth, pageHeight, rootRect };
}

async function embedTextLayerFonts(pdf) {
  await import("regenerator-runtime/runtime");
  const fontkitModule = await import("@pdf-lib/fontkit");
  const fontkit = fontkitModule.default || fontkitModule;
  pdf.registerFontkit(fontkit);
  const bengaliFontBytes = await fetch(bengaliRegularFontUrl).then((response) => {
    if (!response.ok) throw new Error("Unable to load the PDF currency font.");
    return response.arrayBuffer();
  });
  const [regular, bold, italic, boldItalic, currency] = await Promise.all([
    pdf.embedFont(StandardFonts.Helvetica),
    pdf.embedFont(StandardFonts.HelveticaBold),
    pdf.embedFont(StandardFonts.HelveticaOblique),
    pdf.embedFont(StandardFonts.HelveticaBoldOblique),
    pdf.embedFont(bengaliFontBytes, { subset: true }),
  ]);
  return { regular, bold, italic, boldItalic, currency };
}

function splitCurrencyText(text, font, currencyFont, size) {
  return text.split(/(৳)/).filter(Boolean).map((value) => {
    const segmentFont = value === "৳" ? currencyFont : font;
    return { value, font: segmentFont, width: segmentFont.widthOfTextAtSize(value, size) };
  });
}

function drawEditableText(page, el, fonts) {
  const { runs, pageWidth, pageHeight } = collectEditableTextRuns(el);
  const scaleX = A4.w / pageWidth;
  const scaleY = A4.h / pageHeight;

  for (const run of runs) {
    const font = run.bold && run.italic ? fonts.boldItalic : run.bold ? fonts.bold : run.italic ? fonts.italic : fonts.regular;
    try {
      const text = run.text.trimEnd();
      const fontSize = Math.max(4, run.fontSize * (run.domScale || 1) * scaleY);
      const segments = splitCurrencyText(text, font, fonts.currency, fontSize);
      const measuredWidth = segments.reduce((total, segment) => total + segment.width, 0);
      const contentLeft = ((run.containerX ?? run.x) + (run.paddingLeft || 0)) * scaleX;
      const contentRight = ((run.containerX ?? run.x) + (run.containerWidth ?? run.width) - (run.paddingRight || 0)) * scaleX;
      let x = Math.max(0, run.x * scaleX);
      if (run.alignWithinContainer && (run.textAlign === "right" || run.textAlign === "end")) {
        x = Math.max(contentLeft, contentRight - measuredWidth);
      } else if (run.alignWithinContainer && run.textAlign === "center") {
        x = Math.max(contentLeft, contentLeft + ((contentRight - contentLeft - measuredWidth) / 2));
      }
      const y = Math.max(0, A4.h - ((run.y + run.height * 0.82) * scaleY));
      let cursorX = x;
      segments.forEach((segment) => {
        page.drawText(segment.value, {
          x: cursorX,
          y,
          size: fontSize,
          font: segment.font,
          color: run.color?.color || rgb(0, 0, 0),
          opacity: run.color?.opacity ?? 1,
        });
        cursorX += segment.width;
      });
    } catch (error) {
      console.warn("Skipped unsupported PDF text:", run.text, error);
    }
  }
}

function pdfBox(rect, rootRect, scaleX, scaleY) {
  const left = Math.max(0, rect.left - rootRect.left);
  const top = Math.max(0, rect.top - rootRect.top);
  const right = Math.min(rootRect.width, rect.right - rootRect.left);
  const bottom = Math.min(rootRect.height, rect.bottom - rootRect.top);
  if (right <= left || bottom <= top) return null;
  return {
    x: left * scaleX,
    y: A4.h - (bottom * scaleY),
    width: (right - left) * scaleX,
    height: (bottom - top) * scaleY,
    top: A4.h - (top * scaleY),
    right: right * scaleX,
  };
}

function drawElementDecorations(page, element, rootRect, scaleX, scaleY) {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  if (!isVisible(style, rect)) return;
  const box = pdfBox(rect, rootRect, scaleX, scaleY);
  if (!box) return;

  const elementOpacity = Math.min(1, Math.max(0, Number(style.opacity) || 0));
  const background = parseCssColor(style.backgroundColor);
  if (background) {
    page.drawRectangle({
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      color: background.color,
      opacity: background.opacity * elementOpacity,
    });
  }

  const sides = [
    ["Top", box.x, box.top, box.right, box.top, scaleY],
    ["Right", box.right, box.top, box.right, box.y, scaleX],
    ["Bottom", box.x, box.y, box.right, box.y, scaleY],
    ["Left", box.x, box.top, box.x, box.y, scaleX],
  ];
  sides.forEach(([side, startX, startY, endX, endY, sideScale]) => {
    const borderStyle = style[`border${side}Style`];
    const width = Number.parseFloat(style[`border${side}Width`]) || 0;
    const border = parseCssColor(style[`border${side}Color`]);
    if (!border || !width || borderStyle === "none" || borderStyle === "hidden") return;
    page.drawLine({
      start: { x: startX, y: startY },
      end: { x: endX, y: endY },
      thickness: Math.max(0.35, width * sideScale),
      color: border.color,
      opacity: border.opacity * elementOpacity,
    });
  });
}

async function imageBytesForPdf(image) {
  const source = image.currentSrc || image.src;
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Unable to load PDF image: ${source}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  const png = contentType.includes("png") || (bytes[0] === 0x89 && bytes[1] === 0x50);
  const jpeg = contentType.includes("jpeg") || contentType.includes("jpg") || (bytes[0] === 0xff && bytes[1] === 0xd8);
  if (png || jpeg) return { bytes, type: png ? "png" : "jpeg" };

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || Math.max(1, Math.round(image.getBoundingClientRect().width));
  canvas.height = image.naturalHeight || Math.max(1, Math.round(image.getBoundingClientRect().height));
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  const converted = await fetch(canvas.toDataURL("image/png"));
  return { bytes: new Uint8Array(await converted.arrayBuffer()), type: "png" };
}

async function drawImageElement(pdf, page, image, rootRect, scaleX, scaleY) {
  const style = window.getComputedStyle(image);
  const rect = image.getBoundingClientRect();
  if (!isVisible(style, rect)) return;
  const box = pdfBox(rect, rootRect, scaleX, scaleY);
  if (!box) return;

  try {
    const source = await imageBytesForPdf(image);
    const embedded = source.type === "png" ? await pdf.embedPng(source.bytes) : await pdf.embedJpg(source.bytes);
    const naturalWidth = image.naturalWidth || embedded.width;
    const naturalHeight = image.naturalHeight || embedded.height;
    const objectFit = style.objectFit || "fill";
    let width = box.width;
    let height = box.height;
    if (objectFit === "contain") {
      const ratio = Math.min(box.width / naturalWidth, box.height / naturalHeight);
      width = naturalWidth * ratio;
      height = naturalHeight * ratio;
    }
    page.drawImage(embedded, {
      x: box.x + ((box.width - width) / 2),
      y: box.y + ((box.height - height) / 2),
      width,
      height,
      opacity: Math.min(1, Math.max(0, Number(style.opacity) || 0)),
    });
  } catch (error) {
    console.warn("Skipped unsupported PDF image:", image.src, error);
  }
}

async function renderDomPage(pdf, el, textFonts) {
  const page = pdf.addPage([A4.w, A4.h]);
  const rootRect = el.getBoundingClientRect();
  const pageWidth = rootRect.width || el.clientWidth || 794;
  const pageHeight = rootRect.height || el.clientHeight || 1175;
  const scaleX = A4.w / pageWidth;
  const scaleY = A4.h / pageHeight;
  const allElements = [el, ...el.querySelectorAll("*")];
  const padImages = allElements.filter((element) => element.matches?.("img.invoice-pad-bg"));
  const contentImages = allElements.filter((element) => element.tagName === "IMG" && !element.matches(".invoice-pad-bg"));

  drawElementDecorations(page, el, rootRect, scaleX, scaleY);
  for (const image of padImages) await drawImageElement(pdf, page, image, rootRect, scaleX, scaleY);
  allElements.forEach((element) => {
    if (element !== el && element.tagName !== "IMG") {
      drawElementDecorations(page, element, rootRect, scaleX, scaleY);
    }
  });
  for (const image of contentImages) await drawImageElement(pdf, page, image, rootRect, scaleX, scaleY);
  drawEditableText(page, el, textFonts);
  return page;
}

function encodePublicPath(path) {
  return path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function extractPitch(raw = "") {
  const match = String(raw).match(/P(\d+(?:[._]\d+)?)/i);
  if (!match) return "";
  return match[1].replace("_", ".");
}

function normalizeBrand(raw = "") {
  const value = String(raw).toLowerCase();
  if (value.includes("leyard")) return "leyard";
  if (value.includes("absen")) return "absen";
  return "lampro";
}

function buildModuleCataloguePath({ displayType, technology, pitch, moduleBrand, cabinetSizeKey }) {
  const brand = normalizeBrand(moduleBrand);

  if (displayType === "indoor") {
    if (brand === "leyard") {
      const leyardBase = "Mugnee Product data sheet/Module Catalogue/Indoor/Leyard";
      if (technology === "cob") {
        const cobMap = {
          "1.25": `${leyardBase}/COB/Leyard_SV1.2_P1.25_Technical_Specification.pdf`,
          "1.53": `${leyardBase}/COB/Leyard_SV1.5_P1.538_Technical_Specification.pdf`,
          "1.86": `${leyardBase}/COB/Leyard_SV1.8_P1.8_Technical_Specification.pdf`,
        };
        return cobMap[pitch] || null;
      }
      if (technology === "gob") {
        const gobMap = {
          "1.86": `${leyardBase}/GOB/P1.86_GOB_Indoor_LED_Module_Catalogue.pdf`,
          "2": `${leyardBase}/GOB/P2_GOB_Indoor_LED_Module_Catalogue.pdf`,
          "2.5": `${leyardBase}/GOB/P2.5_GOB_Indoor_LED_Module_Catalogue.pdf`,
        };
        return gobMap[pitch] || null;
      }
      const smdMap = {
        "1.25": `${leyardBase}/SMD/P1.25_Indoor_LED_Module_Catalogue.pdf`,
        "1.53": `${leyardBase}/SMD/P1.53_Indoor_LED_Module_Catalogue.pdf`,
        "1.86": `${leyardBase}/SMD/P1.86_Indoor_LED_Module_Catalogue.pdf`,
        "2": `${leyardBase}/SMD/P2_Indoor_LED_Module_Catalogue.pdf`,
        "2.5": `${leyardBase}/SMD/P2.5_Indoor_LED_Module_Catalogue.pdf`,
        "3": `${leyardBase}/SMD/P3.076_Indoor_LED_Module_Catalogue.pdf`,
        "3.076": `${leyardBase}/SMD/P3.076_Indoor_LED_Module_Catalogue.pdf`,
        "4": `${leyardBase}/SMD/P4_Indoor_LED_Module_Catalogue.pdf`,
      };
      return smdMap[pitch] || null;
    }

    if (technology === "cob") {
      if (cabinetSizeKey === "600x337.5") {
        const lminiMap = {
          "1.25": "Mugnee Product data sheet/Module Catalogue/Indoor/Lampro/COB/LMini (COB) P1.25.pdf",
          "1.86": "Mugnee Product data sheet/Module Catalogue/Indoor/Lampro/COB/(COB) LMini1.8  V1.9 20241021.pdf",
        };
        if (lminiMap[pitch]) return lminiMap[pitch];
      }
      const cobMap = {
        "1.25": "Mugnee Product data sheet/Module Catalogue/Indoor/Lampro/COB/LC COB 1.25.pdf",
        "1.53": "Mugnee Product data sheet/Module Catalogue/Indoor/Lampro/COB/LC COB 1.5.pdf",
        "1.86": "Mugnee Product data sheet/Module Catalogue/Indoor/Lampro/COB/LC COB 1.8.pdf",
      };
      return cobMap[pitch] || null;
    }

    if (technology === "gob") {
      const gobMap = {
        "1.86": "Mugnee Product data sheet/Module Catalogue/Indoor/Lampro/GOB/LC1.86P GOB specifications.pdf",
        "2.5": "Mugnee Product data sheet/Module Catalogue/Indoor/Lampro/GOB/LC2.5P GOB specifications.pdf",
      };
      return gobMap[pitch] || null;
    }

    const indoorSmdMap = {
      "1.25": "Mugnee Product data sheet/Module Catalogue/Indoor/Lampro/SMD/LC1.25P specifications.pdf",
      "1.53": "Mugnee Product data sheet/Module Catalogue/Indoor/Lampro/SMD/LC1.53P specifications.pdf",
      "1.86": "Mugnee Product data sheet/Module Catalogue/Indoor/Lampro/SMD/LC1.86P specifications.pdf",
      "2": "Mugnee Product data sheet/Module Catalogue/Indoor/Lampro/SMD/LC2P specifications.pdf",
      "2.5": "Mugnee Product data sheet/Module Catalogue/Indoor/Lampro/SMD/LC2.5P specifications.pdf",
      "3": "Mugnee Product data sheet/Module Catalogue/Indoor/Lampro/SMD/LC3P specifications.pdf",
      "3.076": "Mugnee Product data sheet/Module Catalogue/Indoor/Lampro/SMD/LC3.076P specifications.pdf",
      "4": "Mugnee Product data sheet/Module Catalogue/Indoor/Lampro/SMD/LC4P specifications.pdf",
    };
    return indoorSmdMap[pitch] || null;
  }

  if (brand === "leyard") {
    const leyardOutdoorBase = "Mugnee Product data sheet/Module Catalogue/Outdoor/Leyard";
    const outdoorMap = {
      "2.5": `${leyardOutdoorBase}/P2.5_Outdoor_LED_Module_Technical_Specification.pdf`,
      "3": `${leyardOutdoorBase}/P3.076_Outdoor_LED_Module_Technical_Specification.pdf`,
      "3.076": `${leyardOutdoorBase}/P3.076_Outdoor_LED_Module_Technical_Specification.pdf`,
      "4": `${leyardOutdoorBase}/P4_Outdoor_LED_Module_Technical_Specification.pdf`,
      "5": `${leyardOutdoorBase}/P5_Outdoor_LED_Module_Technical_Specification.pdf`,
    };
    return outdoorMap[pitch] || null;
  }

  const outdoorSmdMap = {
    "2.5": "Mugnee Product data sheet/Module Catalogue/Outdoor/Lampro/LC2.5PO specifications.pdf",
    "3": "Mugnee Product data sheet/Module Catalogue/Outdoor/Lampro/LC3.076PO specifications.pdf",
    "3.076": "Mugnee Product data sheet/Module Catalogue/Outdoor/Lampro/LC3.076PO specifications.pdf",
    "3.91": "Mugnee Product data sheet/Module Catalogue/Outdoor/Lampro/LR3.91O specifications.pdf",
    "4": "Mugnee Product data sheet/Module Catalogue/Outdoor/Lampro/LC4PO specifications.pdf",
    "5": "Mugnee Product data sheet/Module Catalogue/Outdoor/Lampro/LC5PO specifications.pdf",
    "6": "Mugnee Product data sheet/Module Catalogue/Outdoor/Lampro/LC6PO specifications.pdf",
    "6.67": "Mugnee Product data sheet/Module Catalogue/Outdoor/Lampro/LC6.667PO specifications.pdf",
    "8": "Mugnee Product data sheet/Module Catalogue/Outdoor/Lampro/LC8PO specifications.pdf",
    "10": "Mugnee Product data sheet/Module Catalogue/Outdoor/Lampro/LC10PO specifications.pdf",
  };
  return outdoorSmdMap[pitch] || null;
}

function buildControllerCataloguePath({ displayType, controllerBrand, controllerId }) {
  if (!controllerId) return null;

  if (controllerBrand === "Novastar") {
    const novastarMap = {
      NS_TB1: null,
      NS_TB2: "Mugnee Product data sheet/Processor and Controller/Novastar/TB-20 Plus.pdf",
      NS_TB40: "Mugnee Product data sheet/Processor and Controller/Novastar/Tb-40.pdf",
      NS_TB50: "Mugnee Product data sheet/Processor and Controller/Novastar/Tb-50.pdf",
      NS_TB60: "Mugnee Product data sheet/Processor and Controller/Novastar/Tb-60.pdf",
      NS_TU15PRO: "Mugnee Product data sheet/Processor and Controller/Novastar/TU-15 Pro.pdf",
      NS_TU20PRO: "Mugnee Product data sheet/Processor and Controller/Novastar/TU-20 Pro.pdf",
      NS_TU40PRO: "Mugnee Product data sheet/Processor and Controller/Novastar/TU-40 Pro.pdf",
      NS_DSP400: "Mugnee Product data sheet/Processor and Controller/Novastar/dsp-400-pro.pdf",
      NS_DSP600: "Mugnee Product data sheet/Processor and Controller/Novastar/DSP600-Pro-All-in-One-Controller-Specifications-V1.0.0.pdf",
      NS_DSP1000: "Mugnee Product data sheet/Processor and Controller/Novastar/DSP1000 Pro.pdf",
      NS_DSP2000: "Mugnee Product data sheet/Processor and Controller/Novastar/VX2000 Pro Specification.pdf",
    };
    return novastarMap[controllerId] || null;
  }

  const huiduIndoorMap = {
    VP210H: "Mugnee Product data sheet/Processor and Controller/Indoor/HD-VP210H Specification.pdf",
    VP410H: "Mugnee Product data sheet/Processor and Controller/Indoor/HD-VP410H Specification.pdf",
    VP630: "Mugnee Product data sheet/Processor and Controller/Indoor/HD-VP630 Specification.pdf",
    VP830: "Mugnee Product data sheet/Processor and Controller/Indoor/HD-VP830 Specification v2.1.pdf",
    VP1240A: "Mugnee Product data sheet/Processor and Controller/Indoor/HD-VP1240A Specification v1.2.pdf",
    VP1620S: "Mugnee Product data sheet/Processor and Controller/Indoor/HD-VP1620S Specification V1.0 (1).pdf",
    VP1640A: "Mugnee Product data sheet/Processor and Controller/Indoor/HD-VP1640 Specification v3.1.pdf",
  };
  const huiduOutdoorMap = {
    A3L: "Mugnee Product data sheet/Processor and Controller/Outdoor/HD-A3L Specification V1.1.pdf",
    A5L: "Mugnee Product data sheet/Processor and Controller/Outdoor/HD-A5L Specification V1.1.pdf",
    A6L: "Mugnee Product data sheet/Processor and Controller/Outdoor/HD-A6L Specification V1.4.pdf",
    C16L: "Mugnee Product data sheet/Processor and Controller/Outdoor/hd-c16l-specification-v1.0.pdf",
  };

  const preferredMap = displayType === "outdoor" ? huiduOutdoorMap : huiduIndoorMap;
  return preferredMap[controllerId] || huiduIndoorMap[controllerId] || huiduOutdoorMap[controllerId] || null;
}

function buildReceivingCardCataloguePath(receivingCardId = "") {
  const map = {
    R712: "Mugnee Product data sheet/Recieving Card, PSu and structure/HD-R712 Specification V2.1.pdf",
    R732: "Mugnee Product data sheet/Recieving Card, PSu and structure/HD-R732 Specification V0.1.pdf",
    NS_NV3210: "Mugnee Product data sheet/Recieving Card, PSu and structure/NV3210_Receiving_Card.pdf",
    NS_NV7512: "Mugnee Product data sheet/Recieving Card, PSu and structure/NV7512_Receiving_Card.pdf",
    NS_A5S_16: "Mugnee Product data sheet/Recieving Card, PSu and structure/Novastar A5s Plus.pdf",
    NS_A5S_26: "Mugnee Product data sheet/Recieving Card, PSu and structure/Novastar A5s Plus.pdf",
  };
  return map[receivingCardId] || null;
}

function normalizePowerSupplyBrand(raw = "") {
  return String(raw).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function buildPowerSupplyCataloguePath(psuBrand = "") {
  const folder = "Mugnee Product data sheet/Recieving Card, PSu and structure";
  const fileByBrand = {
    lampro: "Lampro power supply.pdf",
    genergy: "G-energy power supply.pdf",
    meanwell: "Mean_Well_LRS-200_5V_200W_Power_Supply.pdf",
  };
  const file = fileByBrand[normalizePowerSupplyBrand(psuBrand)];
  return file ? `${folder}/${file}` : null;
}

function normalizeCabinetSizeKey(cabinet = {}) {
  const raw = [cabinet.sizeId, cabinet.sizeKey, cabinet.optionId, cabinet.id, cabinet.sizeLabel, cabinet.label]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, "");

  if (raw.includes("640x480") || raw.includes("640mmx480mm")) return "640x480";
  if (raw.includes("640x640") || raw.includes("640mmx640mm")) return "640x640";
  if (raw.includes("960x960") || raw.includes("960mmx960mm")) return "960x960";
  if (raw.includes("1280x1280") || raw.includes("1280mmx1280mm")) return "1280x1280";
  return "";
}

export function getCataloguePaths(exportData) {
  if (exportData?.quotationType === "rental") return [];
  if (exportData?.quotationType === "pa") return [];
  if (exportData?.quotationType === "conference") return [];
  if (!exportData?.items) return [];

  const displayType = exportData.items.dispType || "indoor";
  const technology = exportData.items.technology || "smd";
  const moduleBrand = exportData.items?.brands?.module || "";
  const moduleBrandSelection = exportData.items?.brandSelections?.module || moduleBrand;
  const controllerBrand = exportData.items?.brands?.controller || "";
  const psuBrand = exportData.items?.brands?.psu || "";
  const controllerId = exportData.items.controllerId || "";
  const receivingCardId = exportData.items?.receivingPicked?.id || "";
  const pitch = extractPitch(exportData.model?.id || exportData.model?.name || "");
  const cabinetSizeKey = normalizeCabinetSizeKey(exportData.items?.cabinet);

  const paths = [];
  if (moduleBrandSelection !== "Custom") {
    paths.push(buildModuleCataloguePath({ displayType, technology, pitch, moduleBrand, cabinetSizeKey }));
  }

  if (exportData.items.cabinetEnabled && normalizeCabinetSizeKey(exportData.items.cabinet) === "640x480") {
    paths.push("Mugnee Product data sheet/Cabinet 640 X 480.pdf");
  }

  paths.push(
    buildControllerCataloguePath({ displayType, controllerBrand, controllerId }),
    buildReceivingCardCataloguePath(receivingCardId),
    buildPowerSupplyCataloguePath(psuBrand),
    "Mugnee Product data sheet/Recieving Card, PSu and structure/Structure.pdf"
  );

  return [...new Set(paths.filter(Boolean))];
}

async function appendPdfFromPublic(pdf, relativePath) {
  const response = await fetch("/" + encodePublicPath(relativePath));
  if (!response.ok) {
    throw new Error(`Failed to load catalogue PDF: ${relativePath}`);
  }

  const sourceBytes = await response.arrayBuffer();
  const sourcePdf = await PDFDocument.load(sourceBytes);
  const copiedPages = await pdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
  copiedPages.forEach((page) => pdf.addPage(page));
}

export default function PDFButton({
  targetId = "invoice-root",
  targetIds = null,
  filename = "Mugnee_Quotation.pdf",
  exportData = null,
  onBeforeDownload = null,
}) {
  const fitPdfContent = (el) => {
    const inner = el.querySelector(":scope > .invoice-inner");
    const panel = inner?.querySelector(":scope > .invoice-panel");
    if (!inner || !panel) return;

    panel.style.removeProperty("transform");
    panel.style.removeProperty("transform-origin");
    panel.style.removeProperty("width");

    const innerStyle = window.getComputedStyle(inner);
    const availableHeight = inner.clientHeight
      - (Number.parseFloat(innerStyle.paddingTop) || 0)
      - (Number.parseFloat(innerStyle.paddingBottom) || 0);
    const contentHeight = panel.scrollHeight;
    const scale = Math.min(1, availableHeight / Math.max(1, contentHeight));

    if (scale < 0.999) {
      panel.style.setProperty("transform", `scale(${scale})`, "important");
      panel.style.setProperty("transform-origin", "top left", "important");
      panel.style.setProperty("width", `${100 / scale}%`, "important");
    }
  };

  const applyPdfClasses = (el) => {
    el.classList.add("invoice--pdf-scale");
    el.classList.remove("preview-mode");
  };

  const revertPdfClasses = (el) => {
    const panel = el.querySelector(":scope > .invoice-inner > .invoice-panel:not(.terms-panel)");
    panel?.style.removeProperty("transform");
    panel?.style.removeProperty("transform-origin");
    panel?.style.removeProperty("width");
    el.classList.remove("invoice--pdf-scale");
    el.classList.add("preview-mode");
  };

  const handleDownload = async () => {
    const ids = Array.isArray(targetIds) && targetIds.length ? targetIds : [targetId];
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean);

    if (!els.length) return alert("Invoice root পাওয়া যায়নি!");

    els.forEach(applyPdfClasses);
    await sleep(60);
    els.forEach(fitPdfContent);
    await sleep(60);

    try {
      const pdf = await PDFDocument.create();
      const textFonts = await embedTextLayerFonts(pdf);

      for (const el of els) {
        await renderDomPage(pdf, el, textFonts);
      }

      const cataloguePaths = getCataloguePaths(exportData);
      for (const relativePath of cataloguePaths) {
        try {
          await appendPdfFromPublic(pdf, relativePath);
        } catch (catalogueError) {
          console.warn(catalogueError);
        }
      }

      const out = await pdf.save();
      if (onBeforeDownload) await onBeforeDownload();
      const blob = new Blob([out], { type: "application/pdf" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);

    } catch (err) {
      console.error(err);
      alert("PDF তৈরি হয়নি। Console এ error দেখুন।");
    } finally {
      els.forEach(revertPdfClasses);
    }
  };

  return (
    <button onClick={handleDownload} className="btn btn-primary" type="button">
      Download Quotation (PDF)
    </button>
  );
}
