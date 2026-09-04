const subscribers = new Set();
let sequence = 0;
let version = `${Date.now()}-0`;

export function currentCatalogVersion() {
  return version;
}

export function subscribeCatalogChanges(listener) {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

export function publishCatalogChange() {
  version = `${Date.now()}-${++sequence}`;
  const event = { version, at: new Date().toISOString() };
  for (const listener of [...subscribers]) {
    try { listener(event); } catch {}
  }
  return event;
}

export function announceCatalogChangeAfterResponse(req, res, next) {
  const methodChangesData = !["GET", "HEAD", "OPTIONS"].includes(req.method);
  const requestPath = String(req.originalUrl || "").split("?")[0];
  const calculatorDataPath = /^\/api\/admin\/(?:companies|categories|brands|products|prices|pricing-tiers|settings|templates|recycle-bin)(?:\/|$)/.test(requestPath);
  const readOnlyCommand = requestPath === "/api/admin/prices/bulk-preview";
  if (methodChangesData && calculatorDataPath && !readOnlyCommand) {
    res.once("finish", () => {
      if (res.statusCode >= 200 && res.statusCode < 300) publishCatalogChange();
    });
  }
  next();
}

export function handleCatalogEvents(req, res) {
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
  res.write("retry: 3000\n\n");
  res.write(`event: catalog-ready\ndata: ${JSON.stringify({ version: currentCatalogVersion() })}\n\n`);

  const send = (event) => {
    if (closed || res.destroyed || res.writableEnded) return;
    try { res.write(`event: catalog-change\ndata: ${JSON.stringify(event)}\n\n`); } catch { close(); }
  };
  const unsubscribe = subscribeCatalogChanges(send);
  let closed = false;
  const heartbeat = setInterval(() => {
    if (res.destroyed || res.writableEnded) return close();
    try { res.write(": keepalive\n\n"); } catch { close(); }
  }, 25000);
  const close = () => {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat);
    unsubscribe();
  };
  req.once("aborted", close);
  req.once("close", close);
  res.once("error", close);
  res.once("close", close);
}
