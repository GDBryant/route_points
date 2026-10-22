export type Role = "owner" | "editor" | "viewer";
export type Action =
  | "addPoint"
  | "editPoint"
  | "deletePoint"
  | "editRoute"
  | "deleteRoute"
  | "importGpx"
  | "sharePosition"
  | "editSettings"
  | "manageMembers";
const EDITOR: Action[] = [
  "addPoint",
  "editPoint",
  "deletePoint",
  "editRoute",
  "deleteRoute",
  "importGpx",
  "sharePosition",
];
export function can(
  role: Role | string | null | undefined,
  action: Action,
): boolean {
  if (role === "owner") return true;
  if (role === "editor") return EDITOR.includes(action);
  return false;
}
