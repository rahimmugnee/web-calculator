import { get, put } from "./api";

const originalBroadcastChannel = global.BroadcastChannel;

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

describe("admin API live-update announcements", () => {
  let channels;
  let onAdminChange;
  let setItemSpy;

  beforeEach(() => {
    channels = [];
    window.localStorage.clear();
    setItemSpy = jest.spyOn(Storage.prototype, "setItem");
    onAdminChange = jest.fn();
    window.addEventListener("calculator-admin-change", onAdminChange);
    global.BroadcastChannel = jest.fn().mockImplementation((name) => {
      const channel = {
        name,
        postMessage: jest.fn(),
        close: jest.fn(),
      };
      channels.push(channel);
      return channel;
    });
    jest.spyOn(Date, "now").mockReturnValue(1_725_432_100_000);
  });

  afterEach(() => {
    window.removeEventListener("calculator-admin-change", onAdminChange);
    jest.restoreAllMocks();
    if (originalBroadcastChannel === undefined) delete global.BroadcastChannel;
    else global.BroadcastChannel = originalBroadcastChannel;
  });

  test("announces a successful mutation through every live-update transport after the response succeeds", async () => {
    let finishRequest;
    global.fetch = jest.fn(() => new Promise((resolve) => { finishRequest = resolve; }));

    const request = put("/admin/prices/42", {
      company_id: 1,
      prices: { default: 9500 },
    });

    expect(global.BroadcastChannel).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
    expect(onAdminChange).not.toHaveBeenCalled();

    finishRequest(jsonResponse({ id: 42 }));
    await expect(request).resolves.toEqual({ id: 42 });

    const message = {
      type: "calculator-admin-change",
      path: "/admin/prices/42",
      at: 1_725_432_100_000,
    };
    expect(global.BroadcastChannel).toHaveBeenCalledWith("calculator-live-updates");
    expect(channels).toHaveLength(1);
    expect(channels[0].postMessage).toHaveBeenCalledWith(message);
    expect(channels[0].close).toHaveBeenCalledTimes(1);
    expect(setItemSpy).toHaveBeenCalledWith("calculatorLiveUpdate", JSON.stringify(message));
    expect(onAdminChange).toHaveBeenCalledTimes(1);
    expect(onAdminChange.mock.calls[0][0].detail).toEqual(message);
  });

  test("does not announce a GET request", async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse([{ id: 1 }]));

    await expect(get("/admin/products")).resolves.toEqual([{ id: 1 }]);

    expect(global.BroadcastChannel).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
    expect(onAdminChange).not.toHaveBeenCalled();
  });

  test("does not announce a failed mutation", async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse(
      { error: "Price update failed." },
      { ok: false, status: 400 }
    ));

    await expect(put("/admin/prices/42", { prices: { default: 9500 } }))
      .rejects.toThrow("Price update failed.");

    expect(global.BroadcastChannel).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
    expect(onAdminChange).not.toHaveBeenCalled();
  });
});
