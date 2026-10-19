import { db } from "@/lib/db";
import { defineEntity } from "@/lib/entity";
import { enqueue } from "@/features/sync/outbox";
import {
  listPoints,
  listPointsByToken,
  subscribePoints,
  type Point,
  type PointInput,
} from "./api";
import type { PointFormInput } from "./AddPointSheet";
import "./sync";

export const pointEntity = defineEntity<Point>({
  table: db.points,
  kindUpsert: "upsert_point",
  kindDelete: "delete_point",
  list: listPoints,
  listByToken: listPointsByToken,
  subscribe: (id, cb) => subscribePoints(id, cb),
  applyEvent: async (adventureId, e) => {
    if (e.eventType === "DELETE") {
      if (e.old) await db.points.delete(e.old.id);
    } else {
      await db.points.put({ ...(e.new as Point), adventure_id: adventureId });
    }
  },
});

export const syncPointsFromServer = pointEntity.syncFromServer;
export const removePoint = pointEntity.remove;

export const pointInput = (
  p: Point,
  o: Partial<PointFormInput & { lat: number; lng: number }> = {},
) => ({
  name: p.name,
  kind: p.kind,
  note: p.note ?? "",
  seq: p.seq,
  accuracy_m: null,
  lat: p.lat,
  lng: p.lng,
  client_id: p.client_id,
  ...o,
});

export async function swapSeq(
  adventureId: string,
  points: Point[],
  p: Point,
  dir: -1 | 1,
) {
  const sorted = [...points].sort(
    (a, b) => (a.seq ?? 9999) - (b.seq ?? 9999) || a.name.localeCompare(b.name),
  );
  const i = sorted.findIndex((x) => x.id === p.id);
  const other = sorted[i + dir];
  if (!other) return;
  const seqA = p.seq ?? i + 1;
  const seqB = other.seq ?? i + 1 + dir;
  await savePointLocal(adventureId, pointInput(p, { seq: seqB }));
  await savePointLocal(adventureId, pointInput(other, { seq: seqA }));
}

export async function savePointLocal(
  adventureId: string,
  input: PointFormInput & { lat: number; lng: number },
): Promise<Point> {
  const clientId = input.client_id ?? crypto.randomUUID();
  const existing = input.client_id
    ? await db.points.where("client_id").equals(input.client_id).first()
    : undefined;
  const point: Point & { adventure_id: string } = {
    id: existing?.id ?? clientId,
    client_id: clientId,
    adventure_id: adventureId,
    name: input.name,
    kind: input.kind,
    seq: input.seq,
    lat: input.lat,
    lng: input.lng,
    note: input.note || null,
  };
  await db.points.put(point);
  const payload: PointInput = {
    adventure_id: adventureId,
    client_id: clientId,
    name: input.name,
    kind: input.kind,
    seq: input.seq,
    lat: input.lat,
    lng: input.lng,
    accuracy_m: input.accuracy_m,
    note: input.note,
  };
  await enqueue("upsert_point", payload);
  return point;
}
