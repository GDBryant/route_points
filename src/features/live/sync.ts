import { enqueue, registerOutboxHandler } from "@/features/sync/outbox";
import { upsertPosition, type PositionInput } from "./api";

registerOutboxHandler("upsert_position", {
  run: (p) => upsertPosition(p as PositionInput),
  latestWins: true,
});

export const enqueuePosition = (p: PositionInput) =>
  enqueue("upsert_position", p);
