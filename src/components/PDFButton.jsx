// src/components/PDFButton.jsx
import html2canvas from "html2canvas";
import { PDFDocument } from "pdf-lib";

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
