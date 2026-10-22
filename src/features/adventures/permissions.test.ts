import { describe, expect, it } from "vitest";
import { can, type Action } from "./permissions";

const ALL: Action[] = [
  "addPoint",
  "editPoint",
  "deletePoint",
  "editRoute",
  "deleteRoute",
  "importGpx",
  "sharePosition",
  "editSettings",
  "manageMembers",
];

describe("can", () => {
  it("owner can everything", () => {
    for (const a of ALL) expect(can("owner", a)).toBe(true);
  });
  it("editor can content actions but not admin", () => {
    expect(can("editor", "addPoint")).toBe(true);
    expect(can("editor", "sharePosition")).toBe(true);
    expect(can("editor", "editSettings")).toBe(false);
    expect(can("editor", "manageMembers")).toBe(false);
  });
  it("viewer/null/undefined/guest can nothing", () => {
    for (const a of ALL) {
      expect(can("viewer", a)).toBe(false);
      expect(can(null, a)).toBe(false);
      expect(can(undefined, a)).toBe(false);
      expect(can("guest", a)).toBe(false);
    }
  });
});
