import { db } from "@/lib/db";
import { registerOutboxHandler, rewriteIds } from "@/features/sync/outbox";
import { deletePoint, upsertPoint, type PointInput } from "./api";

registerOutboxHandler("upsert_point", {
  run: (p) => upsertPoint(p as PointInput),
  reconcile: async (payload, result) => {
    const row = result as Record<string, unknown> | null;
    if (!row?.id) return;
    const p = payload as PointInput;
    const existing = await db.points
      .where("client_id")
      .equals(p.client_id)
      .first();
    if (existing && existing.id !== row.id) await db.points.delete(existing.id);
    await db.points.put(row as unknown as Parameters<typeof db.points.put>[0]);
    await rewriteIds(p.client_id, row.id as string);
  },
});

registerOutboxHandler("delete_point", {
  run: (p) => deletePoint((p as { id: string }).id),
  refs: ["id"],
});
