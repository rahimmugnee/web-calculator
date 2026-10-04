import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import WordButton from "./WordButton";
import { downloadWord } from "../lib/wordExport";

jest.mock("../lib/wordExport", () => ({ downloadWord: jest.fn() }));
beforeEach(() => { downloadWord.mockReset(); });

test("disables Word export until a quotation exists", () => {
  render(<WordButton disabled filename="test.pdf" />);
  expect(screen.getByRole("button", { name: /Download Word/ })).toBeDisabled();
});

test("exports both existing pages and saves quotation history", async () => {
  const save = jest.fn().mockResolvedValue({});
  render(<><div id="pdf-page-1">Invoice</div><div id="pdf-page-2">Terms</div><WordButton filename="test.pdf" companyName="Sasha" onBeforeDownload={save} /></>);
  fireEvent.click(screen.getByRole("button", { name: /Download Word/ }));
  await waitFor(() => expect(downloadWord).toHaveBeenCalledWith(expect.objectContaining({ filename: "test.pdf", companyName: "Sasha", pages: [document.getElementById("pdf-page-1"), document.getElementById("pdf-page-2")] })));
  expect(save).toHaveBeenCalledTimes(1);
});

test("shows download errors and allows retry", async () => {
  downloadWord.mockRejectedValue(new Error("Export failed"));
  render(<WordButton filename="test.pdf" />);
  fireEvent.click(screen.getByRole("button", { name: /Download Word/ }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Export failed");
  expect(screen.getByRole("button", { name: /Download Word/ })).toBeEnabled();
});
