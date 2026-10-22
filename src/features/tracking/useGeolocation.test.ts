import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGeolocation } from "./useGeolocation";

function mockGeo(permState: string | null = "granted") {
  const watchPosition = vi.fn();
  const clearWatch = vi.fn();
  const getCurrentPosition = vi.fn();
  const status = {
    state: permState as string | null,
    onchange: null as (() => void) | null,
  };
  const query = vi.fn().mockResolvedValue(permState === null ? null : status);
  Object.defineProperty(navigator, "geolocation", {
    value: { watchPosition, clearWatch, getCurrentPosition },
    configurable: true,
  });
  Object.defineProperty(navigator, "permissions", {
    value: permState === "absent" ? undefined : { query },
    configurable: true,
  });
  return { watchPosition, clearWatch, getCurrentPosition, query, status };
}

const fix = {
  coords: {
    latitude: -33.5,
    longitude: 18.4,
    accuracy: 10,
    heading: 90,
    speed: 5,
  },
} as GeolocationPosition;

describe("useGeolocation", () => {
  beforeEach(() => localStorage.clear());

  it("sets position from watchPosition callback", async () => {
    const { watchPosition } = mockGeo();
    watchPosition.mockImplementation((cb: PositionCallback) => {
      cb(fix);
      return 1;
    });
    const { result } = renderHook(() => useGeolocation());
    await waitFor(() =>
      expect(result.current.position).toEqual({
        lat: -33.5,
        lng: 18.4,
        accuracy: 10,
        heading: 90,
        speed: 5,
      }),
    );
    expect(result.current.error).toBeNull();
  });

  it("clears watch on unmount", async () => {
    const { watchPosition, clearWatch } = mockGeo();
    watchPosition.mockReturnValue(42);
    const { unmount } = renderHook(() => useGeolocation());
    await waitFor(() => expect(watchPosition).toHaveBeenCalled());
    unmount();
    expect(clearWatch).toHaveBeenCalledWith(42);
  });

  it("sets error on error callback", async () => {
    const { watchPosition } = mockGeo();
    watchPosition.mockImplementation(
      (_cb: PositionCallback, err: PositionErrorCallback) => {
        queueMicrotask(() =>
          err({ message: "denied", code: 2 } as GeolocationPositionError),
        );
        return 1;
      },
    );
    const { result } = renderHook(() => useGeolocation());
    await waitFor(() => expect(result.current.error).toBe("denied"));
  });

  it("shows prompt state and starts watch on request()", async () => {
    const { watchPosition } = mockGeo("prompt");
    watchPosition.mockReturnValue(7);
    const { result } = renderHook(() => useGeolocation());
    await waitFor(() => expect(result.current.state).toBe("prompt"));
    expect(watchPosition).not.toHaveBeenCalled();
    act(() => result.current.request());
    expect(watchPosition).toHaveBeenCalled();
    expect(result.current.state).toBe("watching");
  });

  it("denied permission → state denied, no watchPosition", async () => {
    const { watchPosition } = mockGeo("denied");
    const { result } = renderHook(() => useGeolocation());
    await waitFor(() => expect(result.current.state).toBe("denied"));
    expect(watchPosition).not.toHaveBeenCalled();
  });

  it("geoEnabled localStorage starts watch without query", async () => {
    localStorage.setItem("geoEnabled", "1");
    const { watchPosition, query } = mockGeo("denied");
    watchPosition.mockReturnValue(3);
    renderHook(() => useGeolocation());
    expect(watchPosition).toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it("success sets geoEnabled", async () => {
    const { watchPosition } = mockGeo();
    watchPosition.mockImplementation((cb: PositionCallback) => {
      cb(fix);
      return 1;
    });
    renderHook(() => useGeolocation());
    await waitFor(() => expect(localStorage.getItem("geoEnabled")).toBe("1"));
  });

  it("error code 1 → denied, clears watch and key", async () => {
    localStorage.setItem("geoEnabled", "1");
    const { watchPosition, clearWatch } = mockGeo();
    watchPosition.mockImplementation(
      (_cb: PositionCallback, err: PositionErrorCallback) => {
        queueMicrotask(() =>
          err({ code: 1, message: "no" } as GeolocationPositionError),
        );
        return 9;
      },
    );
    const { result } = renderHook(() => useGeolocation());
    await waitFor(() => expect(result.current.state).toBe("denied"));
    expect(clearWatch).toHaveBeenCalledWith(9);
    expect(localStorage.getItem("geoEnabled")).toBeNull();
  });

  it("error code 3 with prompt permission → back to prompt", async () => {
    const { watchPosition, clearWatch, query } = mockGeo();
    watchPosition.mockImplementation(
      (_cb: PositionCallback, err: PositionErrorCallback) => {
        queueMicrotask(() =>
          err({ code: 3, message: "timeout" } as GeolocationPositionError),
        );
        return 5;
      },
    );
    query
      .mockResolvedValueOnce({ state: "granted" })
      .mockResolvedValue({ state: "prompt" });
    const { result } = renderHook(() => useGeolocation());
    await waitFor(() => expect(result.current.state).toBe("prompt"));
    expect(clearWatch).toHaveBeenCalledWith(5);
  });

  it("no permissions API → prompt", async () => {
    const { watchPosition } = mockGeo("absent");
    const { result } = renderHook(() => useGeolocation());
    await waitFor(() => expect(result.current.state).toBe("prompt"));
    expect(watchPosition).not.toHaveBeenCalled();
  });

  it("denied permission recovers when permission onchange reports granted", async () => {
    const { watchPosition, status } = mockGeo("denied");
    watchPosition.mockReturnValue(11);
    const { result } = renderHook(() => useGeolocation());
    await waitFor(() => expect(result.current.state).toBe("denied"));
    status.state = "granted";
    act(() => status.onchange?.());
    expect(watchPosition).toHaveBeenCalled();
    expect(result.current.state).toBe("watching");
  });

  it("code 1 denied retries via getCurrentPosition and recovers", async () => {
    vi.useFakeTimers();
    try {
      localStorage.setItem("geoEnabled", "1");
      const { watchPosition, getCurrentPosition } = mockGeo();
      watchPosition
        .mockImplementationOnce(
          (_cb: PositionCallback, err: PositionErrorCallback) => {
            err({ code: 1, message: "no" } as GeolocationPositionError);
            return 9;
          },
        )
        .mockReturnValue(12);
      getCurrentPosition.mockImplementation((cb: PositionCallback) => cb(fix));
      const { result } = renderHook(() => useGeolocation());
      expect(result.current.state).toBe("denied");
      await act(() => vi.advanceTimersByTimeAsync(5000));
      expect(getCurrentPosition).toHaveBeenCalled();
      expect(result.current.state).toBe("watching");
    } finally {
      vi.useRealTimers();
    }
  });

  it("code 1 denied retries on visibilitychange", async () => {
    localStorage.setItem("geoEnabled", "1");
    const { watchPosition, getCurrentPosition } = mockGeo();
    watchPosition.mockImplementation(
      (_cb: PositionCallback, err: PositionErrorCallback) => {
        err({ code: 1, message: "no" } as GeolocationPositionError);
        return 9;
      },
    );
    const { result } = renderHook(() => useGeolocation());
    await waitFor(() => expect(result.current.state).toBe("denied"));
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });
});
