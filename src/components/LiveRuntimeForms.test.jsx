import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import PASystemForm from "./PASystemForm";
import ConferenceSystemForm from "./ConferenceSystemForm";
import RentalPriceForm from "./RentalPriceForm";

const paProduct = (unitPrice, productName = "Wall Speaker") => ({
  id: "pa-live-speaker",
  brand: "CMX",
  installationType: "wired",
  systemFamily: "Speaker",
  componentType: "wall-speaker",
  productName,
  model: "LIVE-PA-1",
  unit: "Nos.",
  unitPrice,
  active: true,
});

const conferenceProduct = (unitPrice, productName = "Master Control Unit") => ({
  id: "conference-live-control",
  brand: "Spoon",
  systemType: "both",
  componentType: "master-control-unit",
  productName,
  model: "LIVE-CONF-1",
  unit: "Nos.",
  unitPrice,
});

test("PA selected rows receive live catalog edits without losing quantity or a manual price", async () => {
  let latest;
  const onChange = jest.fn((snapshot) => { latest = snapshot; });
  const view = render(<PASystemForm products={[paProduct(100)]} brands={["CMX"]} onChange={onChange} />);

  await waitFor(() => expect(latest?.items.find((item) => item.productId === "pa-live-speaker")?.unitPrice).toBe(100));
  const card = screen.getByText("Wall Mount Speaker", { selector: ".pa-card-heading" }).closest(".pa-component-card");
  fireEvent.change(within(card).getAllByRole("spinbutton")[0], { target: { value: "4" } });

  view.rerender(<PASystemForm products={[paProduct(200, "Live Wall Speaker")] } brands={["CMX"]} onChange={onChange} />);
  await waitFor(() => expect(latest.items.find((item) => item.productId === "pa-live-speaker")).toMatchObject({
    qty: 4,
    productName: "Live Wall Speaker",
    unitPrice: 200,
  }));

  fireEvent.change(within(card).getByLabelText("Unit Price (Tk)"), { target: { value: "777" } });
  view.rerender(<PASystemForm products={[paProduct(300, "Newest Wall Speaker")] } brands={["CMX"]} onChange={onChange} />);
  await waitFor(() => expect(latest.items.find((item) => item.productId === "pa-live-speaker")).toMatchObject({
    qty: 4,
    productName: "Newest Wall Speaker",
    unitPrice: 777,
  }));
});

test("Conference rows and custom items stay mounted while live product data changes", async () => {
  let latest;
  const onChange = jest.fn((snapshot) => { latest = snapshot; });
  const view = render(<ConferenceSystemForm products={[conferenceProduct(500)]} brands={["Spoon"]} onChange={onChange} />);

  await waitFor(() => expect(latest?.items.find((item) => item.productId === "conference-live-control")?.unitPrice).toBe(500));
  fireEvent.click(screen.getByRole("button", { name: "Add Custom Item" }));
  await waitFor(() => expect(latest.items.some((item) => item.selectionMode === "custom" && item.productName === "Custom Item")).toBe(true));

  view.rerender(<ConferenceSystemForm products={[conferenceProduct(650, "Live Conference Controller")] } brands={["Spoon"]} onChange={onChange} />);
  await waitFor(() => expect(latest.items.find((item) => item.productId === "conference-live-control")).toMatchObject({
    productName: "Live Conference Controller",
    unitPrice: 650,
  }));
  expect(latest.items.some((item) => item.selectionMode === "custom" && item.productName === "Custom Item")).toBe(true);
});

test("Rental settings update live but do not overwrite a rate the user edited", async () => {
  const defaults = { duration: 1, soundRate: 0, transportValue: 0, vatEnabled: false, includedQty: {} };
  const view = render(<RentalPriceForm settings={{ ...defaults, sftRate: 170, structureRate: 3200 }} />);

  expect(screen.getByLabelText("Display Rate / sft")).toHaveValue(170);
  expect(screen.getByLabelText("Structure Rate (Tk)")).toHaveValue(3200);

  view.rerender(<RentalPriceForm settings={{ ...defaults, sftRate: 180, structureRate: 3300 }} />);
  await waitFor(() => {
    expect(screen.getByLabelText("Display Rate / sft")).toHaveValue(180);
    expect(screen.getByLabelText("Structure Rate (Tk)")).toHaveValue(3300);
  });

  fireEvent.change(screen.getByLabelText("Display Rate / sft"), { target: { value: "999" } });
  view.rerender(<RentalPriceForm settings={{ ...defaults, sftRate: 190, structureRate: 3400 }} />);
  await waitFor(() => {
    expect(screen.getByLabelText("Display Rate / sft")).toHaveValue(999);
    expect(screen.getByLabelText("Structure Rate (Tk)")).toHaveValue(3400);
  });
});
