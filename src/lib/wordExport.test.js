import { Packer } from "docx";
import JSZip from "jszip";
import { TextEncoder, TextDecoder } from "util";
import { createWordDocument } from "./wordExport";
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
const png = new Uint8Array(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9V0AAAAASUVORK5CYII=", "base64"));
beforeEach(() => {
  jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, blob: async () => ({ type: "image/png", arrayBuffer: async () => png.buffer }) });
});
afterEach(() => jest.restoreAllMocks());

test("exports editable quotation text and table over letterhead artwork", async () => {
  const invoice = document.createElement("div");
  invoice.className = "invoice-wrap preview-mode";
  invoice.innerHTML = '<img class="invoice-pad-bg" src="/pad.png"><div class="invoice-inner"><div class="ref-row"><div><b>Ref:</b> TEST-123</div><div>Date: 04/10/26</div></div><div class="info-grid"><div>Name: বাংলা</div><div>Designation: Manager</div><div>Organization: Test</div><div>Mobile: 123</div></div><div class="price-title" style="background-color:rgb(40,255,120);text-align:center">Quotation for LED Display</div><table><thead><tr><th>Item</th><th>Unit</th><th>Qty</th><th>Total</th></tr></thead><tbody><tr><td>Custom Cable</td><td>Meter</td><td>3</td><td>4,500</td></tr><tr><td colspan="3">Grand Total</td><td>4,500</td></tr></tbody></table><div class="signatures"><div class="sig-block"><img src="/signature.png"><div class="profile-name"><span>Signer</span><span>Coordinator</span><span>Cell: 12345</span></div></div><img src="/seal.png"></div></div>';
  const terms = document.createElement("div");
  terms.innerHTML = '<img class="invoice-pad-bg" src="/pad.png"><div class="invoice-inner"><div class="terms-title" style="background-color:rgb(48,110,160);color:white;text-align:center">Terms &amp; Conditions</div><ol><li><div class="terms-h">Currency &amp; Validity</div><ol type="i"><li>All prices in BDT</li><li><b>VAT excluded</b></li></ol></li><li><div>Payment Terms</div><p>100% advance</p></li></ol></div>';
  const original = invoice.outerHTML;
  const zip = await JSZip.loadAsync(await Packer.toBuffer(await createWordDocument({ pages: [invoice, terms] })));
  const xml = await zip.file("word/document.xml").async("string");
  for (const value of ["TEST-123", "Custom Cable", "Meter", "4,500", "বাংলা", "100% advance", "Coordinator", "Cell: 12345", "i. "]) expect(xml).toContain(value);
  expect(xml).toContain("<w:tbl>");
  expect(xml).toContain('w:gridSpan w:val="3"');
  expect(xml).toContain('w:fill="28FF78"');
  expect(xml.match(/<w:sectPr>/g)).toHaveLength(2);
  expect(xml).not.toContain("<wp:anchor");
  expect(xml).toContain("<wp:inline");
  const headerFile = Object.keys(zip.files).find((name) => /^word\/header\d+\.xml$/.test(name));
  const header = await zip.file(headerFile).async("string");
  expect(header).toContain("<wp:anchor");
  expect(header).toContain('behindDoc="1"');
  expect(invoice.outerHTML).toBe(original);
  expect(document.querySelector(".invoice--pdf-scale")).toBeNull();
});

test("cleans up export clones when artwork fails to load", async () => {
  global.fetch.mockResolvedValue({ ok: false });
  const source = document.createElement("div");
  source.innerHTML = '<img class="invoice-pad-bg" src="/missing.png">';
  await expect(createWordDocument({ pages: [source] })).rejects.toThrow("Could not load quotation artwork");
  expect(document.querySelector(".invoice--pdf-scale")).toBeNull();
});

test("requires both quotation and terms sources", async () => {
  await expect(createWordDocument({ pages: [null] })).rejects.toThrow("Calculate a quotation");
});
