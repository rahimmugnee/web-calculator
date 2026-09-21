import {
  fitInvoicePageContent,
  getInvoiceFitElements,
  resetInvoiceContentFit,
  resolveInvoicePageFormatClass,
} from "./invoiceLayout";

function invoicePage({ availableHeight = 975, contentHeight = 1200 } = {}) {
  document.body.innerHTML = `
    <div class="invoice-wrap">
      <div class="invoice-inner">
        <div class="invoice-content-frame">
          <div class="invoice-fit-content">
            <div class="invoice-panel">Nested category design</div>
          </div>
        </div>
      </div>
    </div>
  `;

  const page = document.querySelector(".invoice-wrap");
  const { frame, content } = getInvoiceFitElements(page);
  Object.defineProperty(frame, "clientHeight", { configurable: true, value: availableHeight });
  Object.defineProperty(content, "scrollHeight", { configurable: true, value: contentHeight });
  return { page, frame, content };
}

test("fits the shared invoice content frame without selecting a category panel", () => {
  const { page, content } = invoicePage();

  expect(fitInvoicePageContent(page)).toBeCloseTo(0.8125);
  expect(content.style.transform).toBe("scale(0.8125)");
  expect(Number.parseFloat(content.style.width)).toBeCloseTo(123.077, 2);
  expect(document.querySelector(".invoice-panel").style.transform).toBe("");
});

test("keeps short invoice content at its natural scale and resets previous fitting", () => {
  const { page, content } = invoicePage({ contentHeight: 700 });
  content.style.transform = "scale(0.5)";
  content.style.width = "200%";

  expect(fitInvoicePageContent(page)).toBe(1);
  expect(content.style.transform).toBe("");
  expect(content.style.width).toBe("");

  content.style.transform = "scale(0.75)";
  resetInvoiceContentFit(page);
  expect(content.style.transform).toBe("");
});

test("excludes the original LED top and bottom frame padding from usable fit height", () => {
  const { page, frame } = invoicePage({ availableHeight: 975, contentHeight: 950 });
  frame.style.paddingTop = "20px";
  frame.style.paddingBottom = "14px";

  expect(fitInvoicePageContent(page)).toBeCloseTo(941 / 950);
});

test.each(["rental", "pa", "conference"])(
  "keeps %s quotations in the shared page area instead of applying a company fixed-LED override",
  (quotationKind) => {
    expect(resolveInvoicePageFormatClass("invoice-format-renex", quotationKind))
      .toBe("invoice-format-shared");
  }
);

test("keeps the company-specific design class for fixed LED quotations", () => {
  expect(resolveInvoicePageFormatClass("invoice-format-renex", "fixed"))
    .toBe("invoice-format-renex");
});
