import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RecordSheet from "./RecordSheet";
import { secondsToT, tToSeconds } from "./interval";

describe("RecordSheet", () => {
  it("defaults to auto with 10 s interval", () => {
    localStorage.clear();
    const onStart = vi.fn();
    render(
      <RecordSheet
        state="idle"
        waypointCount={0}
        elapsedS={0}
        onStart={onStart}
        onDrop={vi.fn()}
        onStop={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Start route"));
    expect(onStart).toHaveBeenCalledWith("auto", 10);
    localStorage.clear();
  });

  it("shows Drop waypoint in auto mode", () => {
    render(
      <RecordSheet
        state="recording"
        mode="auto"
        waypointCount={0}
        elapsedS={0}
        onStart={vi.fn()}
        onDrop={vi.fn()}
        onStop={vi.fn()}
      />,
    );
    expect(screen.getByText("Drop waypoint")).toBeInTheDocument();
  });

  it("updates interval label when slider moves", () => {
    render(
      <RecordSheet
        state="idle"
        waypointCount={0}
        elapsedS={0}
        onStart={vi.fn()}
        onDrop={vi.fn()}
        onStop={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Auto"));
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "1" } });
    expect(document.querySelector(".slider-label")!.textContent).toBe("5m");
    fireEvent.change(slider, { target: { value: "0" } });
    expect(document.querySelector(".slider-label")!.textContent).toBe("5s");
  });

  it("Start passes mode and mapped interval", () => {
    const onStart = vi.fn();
    render(
      <RecordSheet
        state="idle"
        waypointCount={0}
        elapsedS={0}
        onStart={onStart}
        onDrop={vi.fn()}
        onStop={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Auto"));
    const slider = screen.getByRole("slider");
    const t = secondsToT(30);
    fireEvent.change(slider, { target: { value: String(t) } });
    fireEvent.click(screen.getByText("Start route"));
    expect(onStart).toHaveBeenCalledWith("auto", tToSeconds(t));

    fireEvent.click(screen.getByText("Manual"));
    fireEvent.click(screen.getByText("Start route"));
    expect(onStart).toHaveBeenCalledWith("manual", null);
  });

  it("remembers last mode and interval", () => {
    localStorage.clear();
    const onStart = vi.fn();
    const props = {
      state: "idle" as const,
      waypointCount: 0,
      elapsedS: 0,
      onDrop: vi.fn(),
      onStop: vi.fn(),
    };
    const { unmount } = render(<RecordSheet {...props} onStart={onStart} />);
    fireEvent.click(screen.getByText("Auto"));
    fireEvent.click(screen.getByText("2m"));
    fireEvent.click(screen.getByText("Start route"));
    expect(onStart).toHaveBeenCalledWith("auto", 120);
    unmount();

    const onStart2 = vi.fn();
    render(<RecordSheet {...props} onStart={onStart2} />);
    expect(document.querySelector(".slider-label")!.textContent).toBe("2m");
    fireEvent.click(screen.getByText("Start route"));
    expect(onStart2).toHaveBeenCalledWith("auto", 120);
    localStorage.clear();
  });

  it("minimise hides buttons and expand restores them", () => {
    localStorage.clear();
    render(
      <RecordSheet
        state="recording"
        waypointCount={0}
        elapsedS={0}
        onStart={vi.fn()}
        onDrop={vi.fn()}
        onStop={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText("Minimise recording controls"));
    expect(screen.queryByText("Drop waypoint")).toBeNull();
    expect(screen.queryByText("Stop")).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("0 wp");
    fireEvent.click(screen.getByLabelText("Show recording controls"));
    expect(screen.getByText("Drop waypoint")).toBeInTheDocument();
    expect(screen.getByText("Stop")).toBeInTheDocument();
    localStorage.clear();
  });

  it("remembers collapsed state", () => {
    localStorage.clear();
    const props = {
      waypointCount: 0,
      elapsedS: 0,
      onStart: vi.fn(),
      onDrop: vi.fn(),
      onStop: vi.fn(),
    };
    const { unmount } = render(<RecordSheet state="recording" {...props} />);
    fireEvent.click(screen.getByLabelText("Minimise recording controls"));
    unmount();
    render(<RecordSheet state="recording" {...props} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("Stop")).toBeNull();
    localStorage.clear();
  });

  it("shows keep-screen-on hint expanded but not minimised", () => {
    localStorage.clear();
    const props = {
      waypointCount: 0,
      elapsedS: 0,
      onStart: vi.fn(),
      onDrop: vi.fn(),
      onStop: vi.fn(),
    };
    const { unmount } = render(<RecordSheet state="recording" {...props} />);
    expect(
      screen.getByText(/recording pauses in the background/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Minimise recording controls"));
    expect(screen.queryByText(/recording pauses in the background/)).toBeNull();
    unmount();
    localStorage.clear();
  });

  it("Cancel in idle calls onStop", () => {
    const onStop = vi.fn();
    render(
      <RecordSheet
        state="idle"
        waypointCount={0}
        elapsedS={0}
        onStart={vi.fn()}
        onDrop={vi.fn()}
        onStop={onStop}
      />,
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(onStop).toHaveBeenCalledOnce();
  });
});
