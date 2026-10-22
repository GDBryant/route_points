import { describe, expect, it } from "vitest";
import {
  arrowPositions,
  fmtDistance,
  fmtDuration,
  fmtSpeed,
  routeDurationS,
  routeLengthM,
  withEndpoints,
} from "./routeUtils";
import type { Point } from "@/features/points/api";

const line: [number, number][] = Array.from({ length: 12 }, (_, i) => [
  18.4 + i * 0.001,
  -33.5,
]);

describe("arrowPositions", () => {
  it("returns arrows for multi-point route", () => {
    expect(arrowPositions(line).length).toBeGreaterThan(0);
  });
  it("empty for <2 points", () => {
    expect(arrowPositions([[18.4, -33.5]])).toHaveLength(0);
  });
});

describe("routeLengthM", () => {
  it("sums segment lengths", () => {
    expect(routeLengthM(line)).toBeGreaterThan(900);
    expect(routeLengthM(line)).toBeLessThan(1400);
  });
});

const pt = (lng: number, lat: number): Point => ({
  id: "p",
  name: "",
  kind: "",
  seq: null,
  lat,
  lng,
  note: null,
});

describe("withEndpoints", () => {
  it("prepends from", () => {
    expect(withEndpoints(line, pt(1, 2), null)[0]).toEqual([1, 2]);
  });
  it("appends to", () => {
    expect(withEndpoints(line, null, pt(3, 4)).at(-1)).toEqual([3, 4]);
  });
  it("same reference when neither given", () => {
    expect(withEndpoints(line)).toBe(line);
  });
  it("unchanged when coords empty", () => {
    const empty: [number, number][] = [];
    expect(withEndpoints(empty, pt(1, 2), pt(3, 4))).toBe(empty);
  });
});

describe("routeDurationS", () => {
  it("returns seconds between started_at and ended_at", () => {
    expect(
      routeDurationS({
        started_at: "2026-01-01T10:00:00Z",
        ended_at: "2026-01-01T10:10:00Z",
      }),
    ).toBe(600);
  });
  it("null when either missing", () => {
    expect(routeDurationS({ started_at: null, ended_at: "x" })).toBeNull();
    expect(
      routeDurationS({ started_at: "2026-01-01T10:00:00Z", ended_at: null }),
    ).toBeNull();
  });
  it("null when non-positive", () => {
    expect(
      routeDurationS({
        started_at: "2026-01-01T10:10:00Z",
        ended_at: "2026-01-01T10:00:00Z",
      }),
    ).toBeNull();
  });
});

describe("fmtDistance", () => {
  it("meters under 1 km", () => {
    expect(fmtDistance(532.4)).toBe("532 m");
  });
  it("2 decimals under 10 km", () => {
    expect(fmtDistance(1234)).toBe("1.23 km");
  });
  it("1 decimal at 10 km+", () => {
    expect(fmtDistance(12345)).toBe("12.3 km");
  });
});

describe("fmtDuration", () => {
  it("m:ss under an hour", () => {
    expect(fmtDuration(247)).toBe("4:07");
  });
  it("h:mm:ss at 1h+", () => {
    expect(fmtDuration(3750)).toBe("1:02:30");
  });
});

describe("fmtSpeed", () => {
  it("dash for non-positive inputs", () => {
    expect(fmtSpeed(0, 100, false)).toBe("–");
    expect(fmtSpeed(1000, 0, false)).toBe("–");
  });
  it("km/h", () => {
    expect(fmtSpeed(1000, 600, false)).toBe("6.0 km/h");
  });
  it("pace min/km", () => {
    expect(fmtSpeed(1000, 390, true)).toBe("6:30 /km");
  });
});
