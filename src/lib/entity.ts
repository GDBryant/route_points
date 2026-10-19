import { useCallback, useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { Table } from "dexie";
import { db, type OutboxItem, type OutboxKind } from "./db";
import { enqueue } from "@/features/sync/outbox";

export interface EntityEvent {
  eventType: string;
  new?: unknown;
  old?: { id: string };
}

export interface EntityDef<T extends { id: string; client_id?: string }> {
  table: Table<T & { adventure_id: string }, string>;
  kindUpsert: OutboxKind;
  kindDelete: OutboxKind;
  list: (adventureId: string) => Promise<T[]>;
  listByToken: (token: string) => Promise<T[]>;
  subscribe: (adventureId: string, cb: (e: EntityEvent) => void) => () => void;
  applyEvent?: (adventureId: string, e: EntityEvent) => Promise<void>;
  mergeRemote?: (remote: T, local: T | undefined) => T;
  ownsItem?: (item: OutboxItem, clientId: string) => boolean;
}

export function defineEntity<T extends { id: string; client_id?: string }>(
  def: EntityDef<T>,
) {
  const merge = def.mergeRemote ?? ((r: T) => r);
  const owns =
    def.ownsItem ??
    ((item: OutboxItem, clientId: string) =>
      item.kind === def.kindUpsert &&
      (item.payload as { client_id?: string }).client_id === clientId);

  async function syncFromServer(adventureId: string) {
    const remote = await def.list(adventureId);
    await db.transaction("rw", def.table, db.outbox, async () => {
      const local = await def.table
        .where("adventure_id")
        .equals(adventureId)
        .toArray();
      const items = await db.outbox.toArray();
      const pendingClientIds = new Set(
        items
          .filter((i) => i.kind === def.kindUpsert)
          .map((i) => (i.payload as { client_id: string }).client_id),
      );
      const pendingDeleteIds = new Set(
        items
          .filter((i) => i.kind === def.kindDelete)
          .map((i) => (i.payload as { id: string }).id),
      );
      const live = remote.filter((r) => !pendingDeleteIds.has(r.id));
      const remoteIds = new Set(live.map((r) => r.id));
      for (const row of local) {
        if (
          !remoteIds.has(row.id) &&
          !(row.client_id && pendingClientIds.has(row.client_id))
        )
          await def.table.delete(row.id);
      }
      const localByClient = new Map(local.map((r) => [r.client_id, r]));
      await def.table.bulkPut(
        live.map((r) => ({
          ...merge(r, localByClient.get(r.client_id)),
          adventure_id: adventureId,
        })),
      );
    });
  }

  async function remove(row: T & { adventure_id?: string }) {
    await def.table.delete(row.id);
    const items = await db.outbox.toArray();
    for (const i of items)
      if (owns(i, row.client_id as string)) await db.outbox.delete(i.id!);
    await enqueue(def.kindDelete, { id: row.id });
  }

  function useEntity(opts: { adventureId?: string; token?: string }) {
    const [tokenRows, setTokenRows] = useState<T[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [tick, setTick] = useState(0);

    const localRows = useLiveQuery(
      () =>
        opts.adventureId
          ? def.table.where("adventure_id").equals(opts.adventureId).toArray()
          : Promise.resolve([] as (T & { adventure_id: string })[]),
      [opts.adventureId, tick],
      [] as T[],
    );

    useEffect(() => {
      if (opts.adventureId || !opts.token) return;
      def
        .listByToken(opts.token)
        .then(setTokenRows)
        .catch((e) => setError(e.message));
    }, [opts.adventureId, opts.token]);

    useEffect(() => {
      if (!opts.adventureId) return;
      const adventureId = opts.adventureId;
      let active = true;
      syncFromServer(adventureId)
        .then(() => active && setTick((t) => t + 1))
        .catch((e) => active && setError(e.message));

      const apply = def.applyEvent ?? ((id: string) => syncFromServer(id));
      const unsub = def.subscribe(adventureId, (e) => {
        apply(adventureId, e).catch(() => {});
      });
      return () => {
        active = false;
        unsub();
      };
    }, [opts.adventureId]);

    const refresh = useCallback(() => {
      if (opts.adventureId)
        syncFromServer(opts.adventureId).catch((e) => setError(e.message));
      else if (opts.token)
        def
          .listByToken(opts.token)
          .then(setTokenRows)
          .catch((e) => setError(e.message));
    }, [opts.adventureId, opts.token]);

    return {
      rows: opts.adventureId ? localRows : tokenRows,
      error,
      refresh,
    };
  }

  return { syncFromServer, remove, useEntity };
}
