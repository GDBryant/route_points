import { db } from "@/lib/db";
import { enqueue } from "@/features/sync/outbox";
import { listPoints, type Point, type PointInput } from "./api";
import type { PointFormInput } from "./AddPointSheet";

export async function syncPointsFromServer(adventureId: string) {
  const remote = await listPoints(adventureId);
  await db.transaction("rw", db.points, db.outbox, async () => {
    const local = await db.points
      .where("adventure_id")
      .equals(adventureId)
      .toArray();
    const items = await db.outbox.toArray();
    const pendingClientIds = new Set(
      items
        .filter((i) => i.kind === "upsert_point")
        .map((i) => (i.payload as { client_id: string }).client_id),
    );
    const pendingDeleteIds = new Set(
      items
        .filter((i) => i.kind === "delete_point")
        .map((i) => (i.payload as { id: string }).id),
    );
    const live = remote.filter((p) => !pendingDeleteIds.has(p.id));
    const remoteIds = new Set(live.map((p) => p.id));
    for (const p of local) {
      if (
        !remoteIds.has(p.id) &&
        !(p.client_id && pendingClientIds.has(p.client_id))
      )
        await db.points.delete(p.id);
    }
    await db.points.bulkPut(
      live.map((p) => ({ ...p, adventure_id: adventureId })),
    );
  });
}

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

export async function removePoint(point: Point) {
  await db.points.delete(point.id);
  const items = await db.outbox.toArray();
  for (const i of items) {
    if (
      i.kind === "upsert_point" &&
      (i.payload as { client_id: string }).client_id === point.client_id
    )
      await db.outbox.delete(i.id!);
  }
  await enqueue("delete_point", { id: point.id });
}
