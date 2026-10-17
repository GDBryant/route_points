import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SyncBadge from "./SyncBadge";

vi.mock("@/lib/db", () => ({
  db: {
    outbox: {
      where: () => ({
        aboveOrEqual: () => ({ toArray: vi.fn().mockResolvedValue([]) }),
      }),
      update: vi.fn().mockResolvedValue(1),
    },
  },
}));

vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: vi.fn(() => [
    { id: 1, kind: "upsert_point", last_error: "boom" },
  ]),
}));

const base = { online: true, pending: 0, dead: 0, syncing: false };

describe("SyncBadge", () => {
  afterEach(() => vi.useRealTimers());

  it("click online pending 0 calls onSync and shows All synced", () => {
    const onSync = vi.fn();
    render(<SyncBadge {...base} onSync={onSync} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onSync).toHaveBeenCalledOnce();
    expect(screen.getByRole("status")).toHaveTextContent("All synced");
  });

  it("offline pending 2 shows Offline · 2 queued", () => {
    render(<SyncBadge {...base} online={false} pending={2} onSync={vi.fn()} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("status")).toHaveTextContent("Offline · 2 queued");
  });

  it("toast disappears after 1500ms", () => {
    vi.useFakeTimers();
    render(<SyncBadge {...base} onSync={vi.fn()} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("status")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1500));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("dead > 0 opens failed list, no onSync", () => {
    const onSync = vi.fn();
    render(<SyncBadge {...base} dead={2} onSync={onSync} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText(/Failed sync items/)).toBeInTheDocument();
    expect(onSync).not.toHaveBeenCalled();
    expect(screen.getByText("Later")).toBeInTheDocument();
    expect(screen.queryByText("Discard")).toBeNull();
  });
});
