import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nearbyOsmName } from "./osmName";

const okJson = (body: unknown) =>
  ({ ok: true, json: () => Promise.resolve(body) }) as Response;

const mockFetch = (impl: (url: string) => unknown) => {
  const f = vi.fn((url: RequestInfo | URL) =>
    Promise.resolve(impl(String(url))),
  );
  vi.stubGlobal("fetch", f);
  return f;
};

describe("nearbyOsmName", () => {
  beforeEach(() => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("picks nearest named overpass element", async () => {
    mockFetch(() =>
      okJson({
        elements: [
          { type: "node", lat: -33.5, lon: 18.6, tags: { name: "Far" } },
          {
            type: "way",
            center: { lat: -33.5, lon: 18.401 },
            tags: { name: "Near" },
          },
        ],
      }),
    );
    await expect(nearbyOsmName(-33.5, 18.4)).resolves.toBe("Near");
  });

  it("falls back to nominatim name when overpass fails", async () => {
    mockFetch((url) =>
      url.includes("overpass")
        ? { ok: false }
        : okJson({ name: "Hilltop", address: {} }),
    );
    await expect(nearbyOsmName(-33.5, 18.4)).resolves.toBe("Hilltop");
  });

  it("uses address fallback when nominatim has no name", async () => {
    mockFetch((url) =>
      url.includes("overpass")
        ? Promise.reject(new Error("down"))
        : okJson({ address: { amenity: "fuel", road: "Main St" } }),
    );
    await expect(nearbyOsmName(-33.5, 18.4)).resolves.toBe("fuel");
  });

  it("returns null when both fail", async () => {
    mockFetch(() => Promise.reject(new Error("down")));
    await expect(nearbyOsmName(-33.5, 18.4)).resolves.toBeNull();
  });

  it("returns null offline without fetching", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const f = mockFetch(() => okJson({}));
    await expect(nearbyOsmName(-33.5, 18.4)).resolves.toBeNull();
    expect(f).not.toHaveBeenCalled();
  });
});
