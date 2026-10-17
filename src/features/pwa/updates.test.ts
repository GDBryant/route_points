import { afterEach, describe, expect, it, vi } from "vitest";
import { checkForUpdates } from "./updates";

describe("checkForUpdates", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("unsupported without serviceWorker", async () => {
    expect(await checkForUpdates()).toBe("unsupported");
  });

  it("found when a worker is waiting", async () => {
    vi.stubGlobal("navigator", {
      serviceWorker: {
        getRegistration: vi.fn().mockResolvedValue({
          update: vi.fn(),
          installing: null,
          waiting: {},
        }),
      },
    });
    expect(await checkForUpdates()).toBe("found");
  });
});
