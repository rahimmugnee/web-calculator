import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import PriceForm from "./PriceForm";
import { CatalogProvider } from "../context/CatalogContext";

function renderPriceForm() {
  function Harness() {
    const [sizePick, setSizePick] = useState(null);
    const [activeSize, setActiveSize] = useState({});
    const [displayType, setDisplayType] = useState("indoor");
    const [technology, setTechnology] = useState("smd");

    return (
      <CatalogProvider>
        <PriceForm
          displayType={displayType}
          technology={technology}
          onChange={jest.fn()}
          onCalculated={jest.fn()}
          sizePick={sizePick}
          onSizeSelectionChange={setActiveSize}
        />
        <pre data-testid="active-size">{JSON.stringify(activeSize)}</pre>
        <button type="button" onClick={() => setSizePick(null)}>
          reset-size-pick
        </button>
        <button type="button" onClick={() => setDisplayType("indoor")}>set-display-indoor</button>
        <button type="button" onClick={() => { setDisplayType("outdoor"); setTechnology("smd"); }}>set-display-outdoor</button>
        <button type="button" onClick={() => setTechnology("gob")}>set-technology-gob</button>
        <button type="button" onClick={() => setTechnology("cob")}>set-technology-cob</button>
      </CatalogProvider>
    );
  }

  render(<Harness />);
}

beforeEach(() => {
  jest.spyOn(global, "fetch").mockResolvedValue({ ok: false });
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("area input selects module width and height chips without cabinet", async () => {
  renderPriceForm();

  const areaInput = screen.getByLabelText(/area \(sft\)/i);
  fireEvent.change(areaInput, { target: { value: "595.35" } });
  fireEvent.blur(areaInput);

  await waitFor(() => {
    expect(screen.getByTestId("active-size")).toHaveTextContent(
      JSON.stringify({ width: 32.55, height: 18.38 })
    );
  });
});

test("area input selects selected cabinet size width and height chips with cabinet", async () => {
  renderPriceForm();

  fireEvent.click(screen.getByRole("button", { name: "set-display-outdoor" }));
  expect(screen.queryByRole("heading", { name: "Display Structure" })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Display Configuration" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Display Structure" }));
  fireEvent.click(screen.getByRole("option", { name: "With Cabinet" }));
  fireEvent.click(screen.getByRole("button", { name: /cabinet size/i }));
  fireEvent.click(await screen.findByRole("option", { name: /960mm x 960mm/i }));

  const areaInput = screen.getByLabelText(/area \(sft\)/i);
  fireEvent.change(areaInput, { target: { value: "595.35" } });
  fireEvent.blur(areaInput);

  await waitFor(() => {
    expect(screen.getByTestId("active-size")).toHaveTextContent(
      JSON.stringify({ cabinetWidth960: 31.5, cabinetHeight960: 18.9 })
    );
  });
});

test("uses dropdowns for display structure choices", () => {
  renderPriceForm();

  expect(screen.getByRole("button", { name: "Display Structure" })).toHaveTextContent("Without Cabinet");
  const quotationMode = screen.getByRole("button", { name: "Quotation Mode" });
  expect(quotationMode).toHaveTextContent("Regular");
  fireEvent.click(quotationMode);
  fireEvent.click(screen.getByRole("option", { name: "Irregular" }));
  expect(screen.getByRole("heading", { name: "Irregular Quotation" })).toBeInTheDocument();

  const quality = screen.getByRole("button", { name: "Quality" });
  expect(quality).toHaveTextContent("Gold - Standard");
  fireEvent.click(quality);
  fireEvent.click(screen.getByRole("option", { name: "Platinum - 15% premium" }));
  expect(screen.getByRole("button", { name: "Quality" })).toHaveTextContent("Platinum - 15% premium");
  expect(screen.getByLabelText(/Custom Warranty/i)).toHaveAttribute("placeholder", "Default: 2 Year(s)");

  const productModelSection = screen.getByRole("heading", { name: "Model, Brand & Size" }).closest("section");
  expect(screen.queryByRole("heading", { name: "Controller and Receiving Card Brand" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Controller Model" }).closest("section")).toBe(productModelSection);

  const controllerRow = screen.getByRole("button", { name: "Controller Model" }).closest(".form-row");
  expect(screen.getByRole("button", { name: "Receiving Card" }).closest(".form-row")).toBe(controllerRow);
  expect(screen.getByRole("heading", { name: "Component Unit Price (Tk)" })).toBeInTheDocument();
  expect(screen.getAllByLabelText("Power Supply Price")).toHaveLength(1);
  const metricsRow = screen.getByLabelText("Controller Pixel Capacity").closest(".form-row");
  expect(screen.getByLabelText("Total Module Pixels").closest(".form-row")).toBe(metricsRow);

  const quantitySection = screen.getByRole("heading", { name: "Component Quantity" }).closest("section");
  expect(screen.getByLabelText("LED Module (pcs)").closest("section")).toBe(quantitySection);
  expect(screen.getByLabelText("Receiving Card (pcs)").closest("section")).toBe(quantitySection);
  expect(screen.getByLabelText("Power Supply (pcs)").closest("section")).toBe(quantitySection);
  expect(screen.getByRole("button", { name: "Power Supply Brand" }).closest("section")).toBe(quantitySection);

  const vatOption = screen.getByRole("button", { name: "VAT Option" });
  const paymentTerms = screen.getByRole("button", { name: "Payment Terms" });
  expect(vatOption.closest(".vat-terms-row")).toBe(paymentTerms.closest(".vat-terms-row"));
  expect(paymentTerms.closest(".vat-terms-row")).toBe(
    screen.getByLabelText("Delivery Time (days)").closest(".vat-terms-row")
  );
  fireEvent.click(vatOption);
  fireEvent.click(screen.getByRole("option", { name: "With VAT (10%)" }));
  expect(screen.getByRole("button", { name: "VAT Option" })).toHaveTextContent("With VAT (10%)");
  fireEvent.click(paymentTerms);
  fireEvent.click(screen.getByRole("option", { name: "75% Advance, 25% before Installation" }));
  expect(screen.getByRole("button", { name: "Payment Terms" })).toHaveTextContent("75% Advance, 25% before Installation");
});

test("Leyard COB P1.25 keeps the regular module quotation format", async () => {
  renderPriceForm();

  fireEvent.click(screen.getByRole("button", { name: "set-technology-cob" }));
  fireEvent.click(screen.getByRole("button", { name: "Module Brand" }));
  fireEvent.click(await screen.findByRole("option", { name: "Leyard" }));

  expect(screen.getByRole("button", { name: "Module Brand" })).toHaveTextContent("Leyard");
  expect(screen.getByLabelText("LED Module (pcs)")).toBeInTheDocument();
  expect(screen.getByLabelText("Total Module Pixels")).toBeInTheDocument();
  expect(screen.queryByLabelText("LED Module Area (sft)")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Total Panel Pixels")).not.toBeInTheDocument();
});

test("Lampro COB P1.25 keeps the regular module quotation format", async () => {
  renderPriceForm();

  fireEvent.click(screen.getByRole("button", { name: "set-technology-cob" }));

  expect(screen.getByRole("button", { name: "Module Brand" })).toHaveTextContent("Lampro");
  expect(screen.getByLabelText("LED Module (pcs)")).toBeInTheDocument();
  expect(screen.getByLabelText("Total Module Pixels")).toBeInTheDocument();
  expect(screen.queryByLabelText("Total Panel Pixels")).not.toBeInTheDocument();
});

test("shows generic pixel-pitch labels for indoor, outdoor, GOB and COB modules", async () => {
  renderPriceForm();

  expect(screen.getByRole("button", { name: "Pixel Pitch" })).toHaveTextContent("P1.25");
  fireEvent.click(screen.getByRole("button", { name: "Pixel Pitch" }));
  expect(screen.getByRole("option", { name: "P1.53" })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "P1.86" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("option", { name: "P1.86" }));

  fireEvent.click(screen.getByRole("button", { name: "set-display-outdoor" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Pixel Pitch" })).toHaveTextContent("P2.5"));
  fireEvent.click(screen.getByRole("button", { name: "Pixel Pitch" }));
  expect(screen.getByRole("option", { name: "P4" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("option", { name: "P4" }));

  fireEvent.click(screen.getByRole("button", { name: "set-display-indoor" }));
  fireEvent.click(screen.getByRole("button", { name: "set-technology-gob" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Pixel Pitch" })).toHaveTextContent("P1.25"));
  fireEvent.click(screen.getByRole("button", { name: "set-technology-cob" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Pixel Pitch" })).toHaveTextContent("P1.25"));
  fireEvent.click(screen.getByRole("button", { name: "Pixel Pitch" }));
  expect(screen.getByRole("option", { name: "P1.53" })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "P1.86" })).toBeInTheDocument();
});

test("custom fields can be added and removed", () => {
  renderPriceForm();

  const customFieldOption = screen.getByRole("button", { name: "Custom Field Option" });
  const discountOption = screen.getByRole("button", { name: "Discount Option" });
  expect(customFieldOption.closest(".optional-options-row")).toBe(discountOption.closest(".optional-options-row"));

  fireEvent.click(customFieldOption);
  fireEvent.click(screen.getByRole("option", { name: "With Custom Field" }));
  expect(screen.getByLabelText("Custom item name 1")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /add custom field/i }));
  expect(screen.getByLabelText("Custom item name 2")).toBeInTheDocument();

  fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[1]);
  expect(screen.queryByLabelText("Custom item name 2")).not.toBeInTheDocument();
});

test("manual component selections survive tab focus and live catalog refreshes", async () => {
  global.fetch.mockImplementation((input) => {
    const url = String(input);
    if (url.includes("/public/companies")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([{ id: 1, name: "Mugnee", code: "mugnee", is_default: true, assets: {} }]),
      });
    }
    if (url.includes("/led-prices") || url.includes("/led-module/brands")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }
    return Promise.resolve({ ok: false });
  });

  renderPriceForm();
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(4));

  fireEvent.click(screen.getByRole("button", { name: "Pixel Pitch" }));
  fireEvent.click(screen.getByRole("option", { name: "P2" }));
  fireEvent.click(screen.getByRole("button", { name: "Module Brand" }));
  fireEvent.click(screen.getByRole("option", { name: "Absen" }));
  fireEvent.click(screen.getByRole("button", { name: "Controller Model" }));
  expect(screen.getByRole("option", { name: "DSP-400" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("option", { name: "TU-40 Pro" }));
  fireEvent.click(screen.getByRole("button", { name: "Receiving Card" }));
  fireEvent.click(screen.getByRole("option", { name: "NV7512 (16 pin)" }));
  fireEvent.click(screen.getByRole("button", { name: "Power Supply Brand" }));
  fireEvent.click(screen.getByRole("option", { name: "G-Energy" }));

  const fetchCountBeforeFocus = global.fetch.mock.calls.length;
  fireEvent.focus(window);
  expect(global.fetch).toHaveBeenCalledTimes(fetchCountBeforeFocus);

  window.dispatchEvent(new Event("calculator-admin-change"));
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(fetchCountBeforeFocus + 4));

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Pixel Pitch" })).toHaveTextContent("P2");
    expect(screen.getByRole("button", { name: "Module Brand" })).toHaveTextContent("Absen");
    expect(screen.getByRole("button", { name: "Controller Model" })).toHaveTextContent("TU-40 Pro");
    expect(screen.getByRole("button", { name: "Receiving Card" })).toHaveTextContent("NV7512");
    expect(screen.getByRole("button", { name: "Power Supply Brand" })).toHaveTextContent("G-Energy");
    expect(screen.queryByText(/N200V5-A/)).not.toBeInTheDocument();
  });
});
