import Dexie, { type Table } from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Entry, Helper, Member, Payment, Session, Task } from './types';

export type SyncKind = 'helper' | 'entry' | 'payment' | 'member' | 'task';

export interface OutboxItem {
  seq?: number;
  kind: SyncKind;
  id: string;
  data: Record<string, unknown>;
}

/** Local copy of the household (works offline) plus changes not yet pushed to the server. */
class HouseholdDB extends Dexie {
  helpers!: Table<Helper, string>;
  entries!: Table<Entry, string>;
  payments!: Table<Payment, string>;
  members!: Table<Member, string>;
  tasks!: Table<Task, string>;
  outbox!: Table<OutboxItem, number>;
  meta!: Table<{ key: string; value: unknown }, string>;

  constructor() {
    super('zenhousehold');
    this.version(1).stores({
      helpers: 'id',
      entries: 'id, date, [helperId+date]',
      payments: 'id, month, [helperId+month]',
      outbox: '++seq',
      meta: 'key',
    });
    this.version(2).stores({
      members: 'id',
      tasks: 'id',
    });
  }
}

export const db = new HouseholdDB();

export const syncTables = {
  helper: db.helpers,
  entry: db.entries,
  payment: db.payments,
  member: db.members,
  task: db.tasks,
} as Record<SyncKind, Table<{ id: string }, string>>;

/** Every table that holds household data, for transactions that touch all of them. */
export const allTables = () => [...Object.values(syncTables), db.outbox, db.meta];

export async function getSession(): Promise<Session | undefined> {
  return (await db.meta.get('session'))?.value as Session | undefined;
}

/** undefined while loading, null when this device hasn't joined a household. */
export function useSession(): Session | null | undefined {
  return useLiveQuery(async () => (await getSession()) ?? null, []);
}
