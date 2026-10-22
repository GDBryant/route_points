import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useLocalBool } from "./useLocalBool";

describe("useLocalBool", () => {
  it("defaults when unset", () => {
    localStorage.clear();
    const { result } = renderHook(() => useLocalBool("k1", true));
    expect(result.current[0]).toBe(true);
    const { result: r2 } = renderHook(() => useLocalBool("k2", false));
    expect(r2.current[0]).toBe(false);
  });

  it('reads "off"', () => {
    localStorage.setItem("k3", "off");
    const { result } = renderHook(() => useLocalBool("k3", true));
    expect(result.current[0]).toBe(false);
  });

  it('setter persists "on"/"off"', () => {
    localStorage.clear();
    const { result } = renderHook(() => useLocalBool("k4", true));
    act(() => result.current[1](false));
    expect(result.current[0]).toBe(false);
    expect(localStorage.getItem("k4")).toBe("off");
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
    expect(localStorage.getItem("k4")).toBe("on");
  });
});
