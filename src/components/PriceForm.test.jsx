import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import PriceForm from "./PriceForm";
import { CatalogProvider } from "../context/CatalogContext";

function renderPriceForm() {
  function Harness() {
    const [sizePick, setSizePick] = useState(null);
    const [activeSize, setActiveSize] = useState({});

    return (
      <CatalogProvider>
        <PriceForm
          onChange={jest.fn()}
          onCalculated={jest.fn()}
          sizePick={sizePick}
          onSizeSelectionChange={setActiveSize}
        />
        <pre data-testid="active-size">{JSON.stringify(activeSize)}</pre>
        <button type="button" onClick={() => setSizePick(null)}>
          reset-size-pick
        </button>
        <button type="button" onClick={() => setSizePick({ row: "cobP125Width", width: 11.81 })}>
          pick-cob-p125-width
        </button>
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

  fireEvent.click(screen.getByLabelText(/outdoor/i));
  fireEvent.click(screen.getByLabelText(/^with cabinet$/i));
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

test("COB P1.25 width pick selects the nearest 16:9 panel height", async () => {
  renderPriceForm();

  fireEvent.click(screen.getByRole("button", { name: "Technology" }));
  fireEvent.click(await screen.findByRole("option", { name: "COB" }));
  fireEvent.click(screen.getByRole("button", { name: "Module Brand" }));
  fireEvent.click(await screen.findByRole("option", { name: "Leyard" }));
  fireEvent.click(screen.getByRole("button", { name: "pick-cob-p125-width" }));

  await waitFor(() => {
    expect(screen.getByLabelText(/width \(ft\)/i)).toHaveValue("11.81");
    expect(screen.getByLabelText(/height \(ft\)/i)).toHaveValue("6.64");
    expect(screen.getByLabelText("Total Panel Pixels")).toHaveValue("4,665,600");
    expect(screen.getByTestId("active-size")).toHaveTextContent(
      JSON.stringify({ cobP125Width: 11.81, cobP125Height: 6.64 })
    );
  });
});

test("Lampro COB P1.25 keeps the regular module quotation format", async () => {
  renderPriceForm();

  fireEvent.click(screen.getByRole("button", { name: "Technology" }));
  fireEvent.click(await screen.findByRole("option", { name: "COB" }));

  expect(screen.getByRole("button", { name: "Module Brand" })).toHaveTextContent("Lampro");
  expect(screen.getByLabelText("Modules (auto)")).toBeInTheDocument();
  expect(screen.getByLabelText("Total Module Pixels")).toBeInTheDocument();
  expect(screen.queryByLabelText("Total Panel Pixels")).not.toBeInTheDocument();
});

test("custom fields can be added and removed", () => {
  renderPriceForm();

  fireEvent.click(screen.getByText("With Custom Field"));
  expect(screen.getByLabelText("Custom item name 1")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /add custom field/i }));
  expect(screen.getByLabelText("Custom item name 2")).toBeInTheDocument();

  fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[1]);
  expect(screen.queryByLabelText("Custom item name 2")).not.toBeInTheDocument();
});
