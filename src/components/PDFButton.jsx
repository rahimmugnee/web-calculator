// src/components/PDFButton.jsx
import html2canvas from "html2canvas";
import { PDFDocument } from "pdf-lib";
import { uploadQuotationPdf } from "../lib/uploadQuotationPdf.js";

const A4 = { w: 595.28, h: 841.89 };
const EXPORT_PX = { w: 2480, h: 3508 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

function buildModuleCataloguePath({ displayType, technology, pitch, moduleBrand }) {
  const brand = normalizeBrand(moduleBrand);

  if (displayType === "indoor") {
    if (brand === "leyard") {
      if (technology === "cob") {
        return "Mugnee Product data sheet/Module Catalogue/Indoor/Leyard/Leyard SV COB 20250812.pdf";
      }
      return "Mugnee Product data sheet/Module Catalogue/Indoor/Leyard/LUS Series Brochure-INDOOR MODULE SMD&GOB.pdf";
    }

    if (technology === "cob") {
      const cobMap = {
        "1.25": "Mugnee Product data sheet/Module Catalogue/Indoor/Lampro/COB/LMini (COB) P1.25.pdf",
        "1.53": "Mugnee Product data sheet/Module Catalogue/Indoor/BAKO/BAKO COB P1.53  Specs File.pdf",
        "1.86": "Mugnee Product data sheet/Module Catalogue/Indoor/Lampro/COB/(COB) LMini1.8  V1.9 20241021.pdf",
      };
      return cobMap[pitch] || "Mugnee Product data sheet/Module Catalogue/Indoor/Leyard/Leyard SV COB 20250812.pdf";
    }

    if (technology === "gob") {
      const gobMap = {
        "1.86": "Mugnee Product data sheet/Module Catalogue/Indoor/Lampro/GOB/LC1.86P GOB specifications.pdf",
      };
      return gobMap[pitch] || "Mugnee Product data sheet/Module Catalogue/Indoor/Leyard/LUS Series Brochure-INDOOR MODULE SMD&GOB.pdf";
    }

    const indoorSmdMap = {
      "1.25": "Mugnee Product data sheet/Module Catalogue/Indoor/Lampro/SMD/LC1.25P specifications.pdf",
      "1.86": "Mugnee Product data sheet/Module Catalogue/Indoor/Lampro/SMD/LC1.86P specifications.pdf",
      "2": "Mugnee Product data sheet/Module Catalogue/Indoor/Lampro/SMD/LC2P specifications.pdf",
      "2.5": "Mugnee Product data sheet/Module Catalogue/Indoor/Lampro/SMD/LC2.5P specifications.pdf",
      "3": "Mugnee Product data sheet/Module Catalogue/Indoor/Lampro/SMD/LC3P specifications.pdf",
      "3.076": "Mugnee Product data sheet/Module Catalogue/Indoor/Lampro/SMD/LC3.076P specifications.pdf",
      "4": "Mugnee Product data sheet/Module Catalogue/Indoor/Lampro/SMD/LC4P specifications.pdf",
    };
    return indoorSmdMap[pitch] || "Mugnee Product data sheet/Module Catalogue/Indoor/Leyard/LUS Series Brochure-INDOOR MODULE SMD&GOB.pdf";
  }

  if (brand === "leyard") {
    return "Mugnee Product data sheet/Module Catalogue/Outdoor/Leyard/LVS Series - Outdoor Leyard.pdf";
  }

  const outdoorSmdMap = {
    "2.5": "Mugnee Product data sheet/Module Catalogue/Outdoor/Lampro/LC2.5PO specifications.pdf",
    "3.076": "Mugnee Product data sheet/Module Catalogue/Outdoor/Lampro/LC3.076PO specifications.pdf",
    "3.91": "Mugnee Product data sheet/Module Catalogue/Outdoor/Lampro/LR3.91O specifications.pdf",
    "4": "Mugnee Product data sheet/Module Catalogue/Outdoor/Lampro/LC4PO specifications.pdf",
    "5": "Mugnee Product data sheet/Module Catalogue/Outdoor/Lampro/LC5PO specifications.pdf",
    "6": "Mugnee Product data sheet/Module Catalogue/Outdoor/Lampro/LC6PO specifications.pdf",
    "6.67": "Mugnee Product data sheet/Module Catalogue/Outdoor/Lampro/LC6.667PO specifications.pdf",
    "10": "Mugnee Product data sheet/Module Catalogue/Outdoor/Lampro/LC10PO specifications.pdf",
  };
  return outdoorSmdMap[pitch] || "Mugnee Product data sheet/Module Catalogue/Outdoor/Leyard/LVS Series - Outdoor Leyard.pdf";
}

function buildControllerCataloguePath({ displayType, controllerBrand, controllerId }) {
  if (!controllerId) return null;

  if (controllerBrand === "Novastar") {
    const novastarMap = {
      NS_TB1: null,
      NS_TB2: "Mugnee Product data sheet/Processor and Controller/Novastar/TB2-4G Multimedia Player .pdf",
      NS_TB40: "Mugnee Product data sheet/Processor and Controller/Novastar/Tb-40.pdf",
      NS_DSP400: "Mugnee Product data sheet/Processor and Controller/Novastar/dsp-400-pro.pdf",
      NS_DSP600: "Mugnee Product data sheet/Processor and Controller/Novastar/DSP600-Pro-All-in-One-Controller-Specifications-V1.0.0.pdf",
      NS_DSP1000: "Mugnee Product data sheet/Processor and Controller/Novastar/DSP1000 Pro.pdf",
      NS_DSP2000: "Mugnee Product data sheet/Processor and Controller/Novastar/VX2000 Pro Specification.pdf",
    };
    return novastarMap[controllerId] || null;
  }

  const indoorMap = {
    VP210H: "Mugnee Product data sheet/Processor and Controller/Indoor/HD-VP210H Specification.pdf",
    VP410H: "Mugnee Product data sheet/Processor and Controller/Indoor/HD-VP410H Specification.pdf",
    VP630: "Mugnee Product data sheet/Processor and Controller/Indoor/HD-VP630 Specification.pdf",
    VP830: "Mugnee Product data sheet/Processor and Controller/Indoor/HD-VP830 Specification v2.1.pdf",
    VP1240A: "Mugnee Product data sheet/Processor and Controller/Indoor/HD-VP1240A Specification v1.2.pdf",
    VP1620S: "Mugnee Product data sheet/Processor and Controller/Indoor/HD-VP1620S Specification V1.0 (1).pdf",
    VP1640A: "Mugnee Product data sheet/Processor and Controller/Indoor/HD-VP1640 Specification v3.1.pdf",
    C16L: "Mugnee Product data sheet/Processor and Controller/Outdoor/hd-c16l-specification-v1.0.pdf",
  };
  const outdoorMap = {
    A3L: "Mugnee Product data sheet/Processor and Controller/Outdoor/HD-A3L Specification V1.1.pdf",
    A5L: "Mugnee Product data sheet/Processor and Controller/Outdoor/HD-A5L Specification V1.1.pdf",
    A6L: "Mugnee Product data sheet/Processor and Controller/Outdoor/HD-A6L Specification V1.4.pdf",
    C16L: "Mugnee Product data sheet/Processor and Controller/Outdoor/hd-c16l-specification-v1.0.pdf",
  };

  return (displayType === "outdoor" ? outdoorMap : indoorMap)[controllerId] || indoorMap[controllerId] || null;
}

function buildReceivingCardCataloguePath(receivingCardId = "") {
  const map = {
    R712: "Mugnee Product data sheet/Recieving Card, PSu and structure/HD-R712 Specification V2.1.pdf",
    R732: "Mugnee Product data sheet/Recieving Card, PSu and structure/HD-R732 Specification V0.1.pdf",
    NS_A5S_16: "Mugnee Product data sheet/Recieving Card, PSu and structure/Novastar A5s Plus.pdf",
    NS_A5S_26: "Mugnee Product data sheet/Recieving Card, PSu and structure/Novastar A5s Plus.pdf",
  };
  return map[receivingCardId] || null;
}

function getCataloguePaths(exportData) {
  if (!exportData?.items) return [];

  const displayType = exportData.items.dispType || "indoor";
  const technology = exportData.items.technology || "smd";
  const moduleBrand = exportData.items?.brands?.module || "";
  const controllerBrand = exportData.items?.brands?.controller || "";
  const controllerId = exportData.items.controllerId || "";
  const receivingCardId = exportData.items?.receivingPicked?.id || "";
  const pitch = extractPitch(exportData.model?.id || exportData.model?.name || "");

  const paths = [buildModuleCataloguePath({ displayType, technology, pitch, moduleBrand })];

  if (exportData.items.cabinetEnabled) {
    paths.push("Mugnee Product data sheet/Cabinet 640 X 480.pdf");
  }

  paths.push(
    buildControllerCataloguePath({ displayType, controllerBrand, controllerId }),
    buildReceivingCardCataloguePath(receivingCardId),
    "Mugnee Product data sheet/Recieving Card, PSu and structure/power supply.pdf",
    "Mugnee Product data sheet/Recieving Card, PSu and structure/Frame.pdf"
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
}) {
  const applyPdfClasses = (el) => {
    el.classList.add("invoice--pdf-scale");
    el.classList.remove("preview-mode");
  };

  const revertPdfClasses = (el) => {
    el.classList.remove("invoice--pdf-scale");
    el.classList.add("preview-mode");
  };

  const renderElementToPngBytes = async (el) => {
    const baseW = el.scrollWidth || el.clientWidth || 794;
    const targetScale = Math.max(1, EXPORT_PX.w / baseW);

    const canvas = await html2canvas(el, {
      scale: targetScale,
      backgroundColor: null,
      useCORS: true,
      allowTaint: true,
      logging: false,
      windowWidth: el.scrollWidth,
      windowHeight: el.scrollHeight,
    });

    const png = canvas.toDataURL("image/png");
    const bytes = await (await fetch(png)).arrayBuffer();
    return bytes;
  };

  const handleDownload = async () => {
    const ids = Array.isArray(targetIds) && targetIds.length ? targetIds : [targetId];
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean);

    if (!els.length) return alert("Invoice root পাওয়া যায়নি!");

    els.forEach(applyPdfClasses);
    await sleep(60);

    try {
      const pdf = await PDFDocument.create();

      for (const el of els) {
        const bytes = await renderElementToPngBytes(el);
        const page = pdf.addPage([A4.w, A4.h]);
        const img = await pdf.embedPng(bytes);
        page.drawImage(img, { x: 0, y: 0, width: A4.w, height: A4.h });
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
      const blob = new Blob([out], { type: "application/pdf" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);

      const refNo = exportData?.quotationRef || "";
      try {
        await uploadQuotationPdf({ blob, filename, refNo, source: "web" });
      } catch (uploadErr) {
        console.warn("Quotation PDF cloud upload:", uploadErr);
      }
    } catch (err) {
      console.error(err);
      alert("PDF তৈরি হয়নি। Console এ error দেখুন।");
    } finally {
      els.forEach(revertPdfClasses);
    }
  };

  return (
    <button onClick={handleDownload} className="btn btn-primary">
      Download Quotation (PDF)
    </button>
  );
}
