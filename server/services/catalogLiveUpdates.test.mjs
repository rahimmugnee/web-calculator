import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { announceCatalogChangeAfterResponse, handleCatalogEvents, publishCatalogChange, subscribeCatalogChanges } from "./catalogLiveUpdates.mjs";

test("publishes catalog changes to active subscribers only", () => {
  const received = [];
  const unsubscribe = subscribeCatalogChanges((event) => received.push(event));

  const event = publishCatalogChange();
  assert.equal(received.length, 1);
  assert.deepEqual(received[0], event);
  assert.match(event.version, /^\d+-\d+$/);

  unsubscribe();
  publishCatalogChange();
  assert.equal(received.length, 1);
});

test("streams a ready event and future catalog changes over SSE", () => {
  const req = new EventEmitter();
  const res = new EventEmitter();
  res.headers = {};
  res.output = "";
  res.status = (statusCode) => { res.statusCode = statusCode; return res; };
  res.setHeader = (name, value) => { res.headers[name] = value; };
  res.flushHeaders = () => {};
  res.write = (value) => { res.output += value; return true; };

  handleCatalogEvents(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["Content-Type"], "text/event-stream");
  assert.match(res.output, /event: catalog-ready/);

  const outputBeforeChange = res.output;
  const event = publishCatalogChange();
  assert.equal(res.output, `${outputBeforeChange}event: catalog-change\ndata: ${JSON.stringify(event)}\n\n`);

  req.emit("close");
  const outputAfterClose = res.output;
  publishCatalogChange();
  assert.equal(res.output, outputAfterClose);
});

test("announces only successful calculator-data mutations after the response finishes", () => {
  const received = [];
  const unsubscribe = subscribeCatalogChanges((event) => received.push(event));
  const makeResponse = (statusCode) => {
    const response = new EventEmitter();
    response.statusCode = statusCode;
    return response;
  };
  const run = (method, originalUrl, statusCode = 200) => {
    const response = makeResponse(statusCode);
    let nextCalled = false;
    announceCatalogChangeAfterResponse({ method, originalUrl }, response, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    response.emit("finish");
  };

  const calculatorDataMutations = [
    ["PUT", "/api/admin/companies/1"],
    ["POST", "/api/admin/categories"],
    ["PUT", "/api/admin/brands/2"],
    ["POST", "/api/admin/products"],
    ["PUT", "/api/admin/prices/42"],
    ["POST", "/api/admin/prices/bulk-apply"],
    ["PUT", "/api/admin/pricing-tiers/3"],
    ["PUT", "/api/admin/settings/1/rental-led"],
    ["PUT", "/api/admin/templates/1/quotation"],
    ["POST", "/api/admin/recycle-bin/product/42/restore"],
  ];
  calculatorDataMutations.forEach(([method, url], index) => {
    run(method, url, 200);
    assert.equal(received.length, index + 1, `${method} ${url} should publish a catalog change`);
  });
  const publishedCount = calculatorDataMutations.length;
  run("PUT", "/api/admin/products/42", 400);
  run("GET", "/api/admin/products", 200);
  run("POST", "/api/admin/prices/bulk-preview", 200);
  run("POST", "/api/admin/customers", 201);
  assert.equal(received.length, publishedCount);
  unsubscribe();
});
