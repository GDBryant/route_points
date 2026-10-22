import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRecorder } from "./useRecorder";
import type { GeoPosition } from "@/features/tracking/useGeolocation";
import type { Point } from "@/features/points/api";

const addWaypoints = vi.fn().mockResolvedValue(1);
vi.mock("./repo", async (importOriginal) => {
  const mod = await importOriginal<typeof import("./repo")>();
  return {
    ...mod,
    queueWaypoints: (...args: unknown[]) => addWaypoints(...args),
  };
});

const pos = (accuracy = 5, lat = -33.5, lng = 18.4): GeoPosition => ({
  lat,
  lng,
  accuracy,
  heading: 0,
  speed: 0,
});

const setVis = (value: string) => {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value,
  });
  document.dispatchEvent(new Event("visibilitychange"));
};

const pt = (id: string, lat = -33.5001, lng = 18.4001): Point => ({
  id,
  name: id,
  kind: "obstacle",
  seq: null,
  lat,
  lng,
  note: null,
});

describe("useRecorder", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    addWaypoints.mockClear();
  });
  afterEach(() => vi.useRealTimers());

  it("auto mode drops on interval when moving, skips when stationary", async () => {
    let lat = -33.5;
    const ref = { current: pos() };
    const { result } = renderHook(() => useRecorder(ref, [], 20));
    act(() => result.current.start("auto", 5));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6_000);
    });
    const afterFirst = result.current.waypointCount;
    expect(afterFirst).toBeGreaterThanOrEqual(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(11_000);
    });
    expect(result.current.waypointCount).toBe(afterFirst);

    for (let i = 0; i < 3; i++) {
      lat -= 0.0002;
      ref.current = pos(5, lat, 18.4);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5_500);
      });
    }
    expect(result.current.waypointCount).toBeGreaterThanOrEqual(afterFirst + 2);
    expect(result.current.route?.interval_s).toBe(5);
  });

  it("skips waypoint when accuracy > 50 m", () => {
    const { result } = renderHook(() => useRecorder({ current: pos(100) }, [], 20));
    act(() => result.current.start("manual", null));
    act(() => result.current.dropWaypoint());
    expect(result.current.waypointCount).toBe(0);
  });

  it("manual drop + flush on stop calls addWaypoints", async () => {
    const { result } = renderHook(() => useRecorder({ current: pos() }, [], 20));
    act(() => result.current.start("manual", null));
    act(() => result.current.dropWaypoint());
    act(() => result.current.dropWaypoint());
    expect(result.current.waypointCount).toBe(2);
    const cid = result.current.route!.client_id;
    await act(async () => {
      await result.current.stop();
    });
    expect(addWaypoints).toHaveBeenCalledWith(
      cid,
      expect.arrayContaining([
        expect.objectContaining({ seq: 1 }),
        expect.objectContaining({ seq: 2 }),
      ]),
    );
  });

  it("requests and releases wake lock", async () => {
    const release = vi.fn();
    const request = vi.fn().mockResolvedValue({ release });
    Object.defineProperty(navigator, "wakeLock", {
      value: { request },
      configurable: true,
    });
    const { result } = renderHook(() => useRecorder({ current: pos() }, [], 20));
    act(() => result.current.start("manual", null));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(request).toHaveBeenCalledWith("screen");
    await act(async () => {
      await result.current.stop();
    });
    expect(release).toHaveBeenCalled();
  });

  it("snaps from_point to nearest point within radius", () => {
    const { result } = renderHook(() =>
      useRecorder({ current: pos() }, [pt("p-near"), pt("p-far", 0, 0)], 20),
    );
    act(() => result.current.start("manual", null));
    expect(result.current.route?.from_point_id).toBe("p-near");
  });

  it("setFromPoint updates route and no-ops when idle", () => {
    const { result } = renderHook(() => useRecorder({ current: pos() }, [], 20));
    act(() => result.current.setFromPoint("p-x"));
    expect(result.current.route).toBeNull();
    act(() => result.current.start("manual", null));
    act(() => result.current.setFromPoint("p-start"));
    expect(result.current.route?.from_point_id).toBe("p-start");
  });

  it("flushes buffer when hidden", async () => {
    const { result } = renderHook(() => useRecorder({ current: pos() }, [], 20));
    act(() => result.current.start("manual", null));
    act(() => result.current.dropWaypoint());
    act(() => setVis("hidden"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(addWaypoints).toHaveBeenCalledTimes(1);
    expect(addWaypoints.mock.calls[0][1]).toHaveLength(1);
    setVis("visible");
  });

  it("re-acquires wake lock and drops immediately on visible", async () => {
    const request = vi.fn().mockResolvedValue({ release: vi.fn() });
    Object.defineProperty(navigator, "wakeLock", {
      value: { request },
      configurable: true,
    });
    const ref = { current: pos() };
    const { result } = renderHook(() => useRecorder(ref, [], 20));
    act(() => result.current.start("auto", 10));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(request).toHaveBeenCalledTimes(1);
    const count = result.current.waypointCount;
    ref.current = pos(5, -33.5002, 18.4);
    act(() => setVis("visible"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(request).toHaveBeenCalledTimes(2);
    expect(result.current.waypointCount).toBe(count + 1);
  });

  it("auto mode started without GPS waits for first fix to firm", async () => {
    const ref = { current: null as GeoPosition | null };
    const { result } = renderHook(() => useRecorder(ref, [], 20));
    act(() => result.current.start("auto", 5));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(result.current.waypointCount).toBe(0);
    ref.current = pos(30);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(result.current.waypointCount).toBe(0);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_500);
    });
    expect(result.current.waypointCount).toBe(0);
    ref.current = pos(20);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(result.current.waypointCount).toBe(1);
  });

  it("manual mode started without GPS drops first fix at ≤12 m and snaps from point", async () => {
    const ref = { current: null as GeoPosition | null };
    const { result } = renderHook(() =>
      useRecorder(ref, [pt("p-start", -33.5, 18.4)], 20),
    );
    act(() => result.current.start("manual", null));
    expect(result.current.route?.from_point_id).toBeNull();
    ref.current = pos(10, -33.5, 18.4);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(result.current.waypointCount).toBe(1);
    expect(result.current.route?.from_point_id).toBe("p-start");
  });

  it("first fix hard cap drops at 15 s when accuracy stays poor", async () => {
    const ref = { current: null as GeoPosition | null };
    const { result } = renderHook(() => useRecorder(ref, [], 20));
    act(() => result.current.start("auto", 5));
    ref.current = pos(40);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(16_000);
    });
    expect(result.current.waypointCount).toBe(1);
  });

  it("flushes buffered waypoints at 10", async () => {
    const { result } = renderHook(() => useRecorder({ current: pos() }, [], 20));
    act(() => result.current.start("manual", null));
    for (let i = 0; i < 10; i++) act(() => result.current.dropWaypoint());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(addWaypoints).toHaveBeenCalled();
  });
});
