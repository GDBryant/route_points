import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdventureSettingsSheet from "./AdventureSettingsSheet";

vi.mock("@/features/pwa/updates", () => ({
  checkForUpdates: vi.fn().mockResolvedValue("none"),
}));

const adventure = { id: "a1", name: "Dunes", snap_radius_m: 20 };

describe("AdventureSettingsSheet", () => {
  it("Share adventure calls onShare", () => {
    const onShare = vi.fn();
    render(
      <AdventureSettingsSheet
        adventure={adventure}
        isOwner
        onSaved={vi.fn()}
        onShare={onShare}
        onExit={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Share adventure"));
    expect(onShare).toHaveBeenCalledOnce();
  });

  it("hides Share adventure without onShare", () => {
    render(
      <AdventureSettingsSheet
        adventure={adventure}
        isOwner
        onSaved={vi.fn()}
        onExit={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByText("Share adventure")).toBeNull();
  });

  it("Exit adventure calls onExit", () => {
    const onExit = vi.fn();
    render(
      <AdventureSettingsSheet
        adventure={adventure}
        isOwner
        onSaved={vi.fn()}
        onExit={onExit}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Exit adventure"));
    expect(onExit).toHaveBeenCalledOnce();
  });

  it("check for updates shows Up to date and version", async () => {
    render(
      <AdventureSettingsSheet
        adventure={adventure}
        isOwner
        onSaved={vi.fn()}
        onExit={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(new RegExp(`v${__APP_VERSION__}`))).toBeInTheDocument();
    fireEvent.click(screen.getByText("Check for updates"));
    await screen.findByText("Up to date");
  });
});
