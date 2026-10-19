import type { Point } from "./api";
import { KIND_LABEL, type Kind } from "./kinds";

export function suggestedName(points: Point[], kind: string): string {
  if (kind === "obstacle") {
    const max = points
      .filter((p) => p.kind === "obstacle")
      .reduce((m, p) => Math.max(m, p.seq ?? 0), 0);
    return `Obstacle ${max + 1}`;
  }
  const n = points.filter((p) => p.kind === kind).length;
  return `${KIND_LABEL[kind as Kind] ?? kind} ${n + 1}`;
}
