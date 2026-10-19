import { db, type OutboxItem, type OutboxKind } from "@/lib/db";

export const MAX_ATTEMPTS = 5;
export const SNOOZE_MS = 60 * 60 * 1000;

export interface OutboxHandler {
  run: (payload: unknown) => Promise<unknown>;
  reconcile?: (payload: unknown, result: unknown) => Promise<void>;
  refs?: string[];
  latestWins?: boolean;
}

const handlers = new Map<OutboxKind, OutboxHandler>();

export function registerOutboxHandler(
  kind: OutboxKind,
  h: OutboxHandler,
): void {
  handlers.set(kind, h);
}

export async function rewriteIds(from: string, to: string): Promise<void> {
  for (const i of await db.outbox.toArray()) {
    const pl = i.payload as Record<string, unknown>;
    let changed = false;
    for (const k of handlers.get(i.kind)?.refs ?? []) {
      if (pl[k] === from) {
        pl[k] = to;
        changed = true;
      }
    }
    if (changed) await db.outbox.update(i.id!, { payload: pl });
  }
}

export async function snooze(id: number) {
  await db.outbox.update(id, {
    attempts: 0,
    snoozed_until: new Date(Date.now() + SNOOZE_MS).toISOString(),
  });
}

let drainScheduled = false;

export async function enqueue(kind: OutboxKind, payload: unknown) {
  if (handlers.get(kind)?.latestWins)
    await db.outbox.where("kind").equals(kind).delete();
  await db.outbox.add({
    kind,
    payload,
    created_at: new Date().toISOString(),
    attempts: 0,
    last_error: null,
  });
  if (!drainScheduled) {
    drainScheduled = true;
    setTimeout(() => {
      drainScheduled = false;
      if (navigator.onLine) drain();
    }, 50);
  }
}

function isNetworkError(e: unknown): boolean {
  return (
    e instanceof TypeError ||
    (e instanceof Error && /fetch|network|offline/i.test(e.message))
  );
}

async function run(item: OutboxItem): Promise<unknown> {
  const h = handlers.get(item.kind);
  if (!h) throw new Error(`no handler: ${item.kind}`);
  return h.run(item.payload);
}

export interface DrainResult {
  done: number;
  failed: number;
  stoppedOffline: boolean;
}

let draining = false;

export async function drain(): Promise<DrainResult> {
  if (draining) return { done: 0, failed: 0, stoppedOffline: false };
  draining = true;
  try {
    return await drainLoop();
  } finally {
    draining = false;
  }
}

async function drainLoop(): Promise<DrainResult> {
  const res: DrainResult = { done: 0, failed: 0, stoppedOffline: false };
  const attempted = new Set<number>();
  for (;;) {
    const now = new Date().toISOString();
    const item = await db.outbox
      .orderBy("id")
      .filter(
        (i) =>
          i.attempts < MAX_ATTEMPTS &&
          (!i.snoozed_until || i.snoozed_until <= now) &&
          !attempted.has(i.id!),
      )
      .first();
    if (!item) break;
    attempted.add(item.id!);
    try {
      const result = await run(item);
      await db.outbox.delete(item.id!);
      res.done++;
      await handlers.get(item.kind)?.reconcile?.(item.payload, result);
    } catch (e) {
      const err =
        (e as { message?: string })?.message ??
        (e instanceof Error ? e.message : String(e));
      if (isNetworkError(e) || !navigator.onLine) {
        await db.outbox.update(item.id!, {
          attempts: item.attempts + 1,
          last_error: err,
        });
        res.stoppedOffline = true;
        break;
      }
      await db.outbox.update(item.id!, {
        attempts: item.attempts + 1,
        last_error: err,
      });
      res.failed++;
    }
  }
  return res;
}

export async function pendingCount(): Promise<number> {
  return db.outbox.where("attempts").below(MAX_ATTEMPTS).count();
}
