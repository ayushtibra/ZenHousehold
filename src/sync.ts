import { allTables, db, getSession, syncTables, type SyncKind } from './db';
import type { Member, Session } from './types';
import { newId } from './lib/format';

export interface SyncStatus {
  state: 'idle' | 'syncing' | 'offline' | 'error';
  lastSynced?: number;
  error?: string;
}

let status: SyncStatus = { state: 'idle' };
const listeners = new Set<() => void>();

function setStatus(next: Partial<SyncStatus>) {
  status = { ...status, ...next };
  listeners.forEach((l) => l());
}

export const subscribeSync = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};
export const getSyncStatus = () => status;

class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function api<T>(path: string, body: unknown, code?: string): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(code ? { 'x-household': code } : {}) },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Request failed (${res.status})`);
  return data as T;
}

interface SyncResponse {
  household: { name: string };
  cursor: number;
  more: boolean;
  records: { kind: string; id: string; data: { id: string; deleted?: boolean } }[];
}

export const normalizeCode = (raw: string) => raw.toUpperCase().replace(/[^0-9A-Z]/g, '');
export const formatCode = (code: string) => code.match(/.{1,4}/g)?.join('-') ?? code;

/** Write rows locally right away and queue them for the server. */
export async function save<T extends { id: string; deleted?: boolean }>(kind: SyncKind, ...rows: T[]) {
  const session = await getSession();
  const updatedAt = new Date().toISOString();
  const table = syncTables[kind];
  await db.transaction('rw', table, db.outbox, async () => {
    for (const row of rows) {
      const data = { ...row, by: session?.member, updatedAt };
      if (data.deleted) await table.delete(data.id);
      else await table.put(data);
      await db.outbox.add({ kind, id: data.id, data });
    }
  });
  scheduleSync();
}

let timer: ReturnType<typeof setTimeout> | undefined;
function scheduleSync() {
  clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), 300);
}

async function syncOnce(session: Session) {
  for (;;) {
    const pending = await db.outbox.orderBy('seq').limit(100).toArray();
    const cursor = ((await db.meta.get('cursor'))?.value as number | undefined) ?? 0;
    const res = await api<SyncResponse>(
      '/api/sync',
      { cursor, mutations: pending.map(({ kind, id, data }) => ({ kind, id, data })) },
      session.code,
    );
    await db.transaction('rw', allTables(), async () => {
      await db.outbox.bulkDelete(pending.map((p) => p.seq!));
      // Edits made while this request was in flight win over what the server just sent.
      const unsent = new Set((await db.outbox.toArray()).map((p) => `${p.kind}:${p.id}`));
      for (const r of res.records) {
        const table = syncTables[r.kind as SyncKind];
        if (!table || unsent.has(`${r.kind}:${r.id}`)) continue;
        if (r.data.deleted) await table.delete(r.id);
        else await table.put(r.data);
      }
      await db.meta.put({ key: 'cursor', value: res.cursor });
      if (res.household.name !== session.household) {
        await db.meta.put({ key: 'session', value: { ...session, household: res.household.name } });
      }
    });
    if (!res.more && (await db.outbox.count()) === 0) return;
  }
}

let running: Promise<void> | null = null;
let rerun = false;

export function syncNow(): Promise<void> {
  if (running) {
    rerun = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        rerun = false;
        const session = await getSession();
        if (!session) return;
        if (!navigator.onLine) return setStatus({ state: 'offline' });
        setStatus({ state: 'syncing' });
        await syncOnce(session);
        setStatus({ state: 'idle', lastSynced: Date.now(), error: undefined });
      } while (rerun);
    } catch (e) {
      setStatus({ state: navigator.onLine ? 'error' : 'offline', error: e instanceof Error ? e.message : String(e) });
    } finally {
      running = null;
    }
  })();
  return running;
}

/** Sync on open, when the app comes back to the foreground, when back online, and every 30s while visible. */
export function startAutoSync(): () => void {
  const kick = () => {
    if (document.visibilityState === 'visible') void syncNow();
  };
  kick();
  const interval = setInterval(kick, 30_000);
  document.addEventListener('visibilitychange', kick);
  addEventListener('online', kick);
  return () => {
    clearInterval(interval);
    document.removeEventListener('visibilitychange', kick);
    removeEventListener('online', kick);
  };
}

async function clearLocal() {
  await db.transaction('rw', allTables(), () => Promise.all(allTables().map((t) => t.clear())));
}

async function startSession(session: Session) {
  await clearLocal();
  await db.meta.put({ key: 'session', value: session });
  await syncNow();
  await ensureMember();
}

/**
 * Make sure this device is listed as a household member. Joining with a name that's already
 * there (your second phone, the laptop) reuses that member instead of adding a duplicate.
 * Joining and app start-up both call this, so concurrent calls share one run.
 */
let ensuring: Promise<void> | null = null;
export function ensureMember(): Promise<void> {
  ensuring ??= addSelfAsMember().finally(() => (ensuring = null));
  return ensuring;
}

async function addSelfAsMember() {
  const session = await getSession();
  if (!session || session.memberId) return;
  const name = session.member.trim();
  const existing = (await db.members.toArray()).find((m) => m.name.trim().toLowerCase() === name.toLowerCase());
  const id = existing?.id ?? newId();
  await db.meta.put({ key: 'session', value: { ...session, memberId: id } });
  if (!existing) await save<Member>('member', { id, name, joinedAt: new Date().toISOString() });
}

export async function createHousehold(name: string, member: string) {
  const res = await api<{ code: string; name: string }>('/api/households', { name });
  await startSession({ code: res.code, household: res.name, member });
}

export async function joinHousehold(rawCode: string, member: string) {
  const code = normalizeCode(rawCode);
  const res = await api<SyncResponse>('/api/sync', { cursor: 0 }, code).catch((e) => {
    throw e instanceof ApiError && e.status === 404 ? new Error('No household found with this code.') : e;
  });
  await startSession({ code, household: res.household.name, member });
}

/** Forget the household on this device. The data stays on the server for the other members. */
export const leaveHousehold = clearLocal;

export async function renameMember(member: string) {
  const session = await getSession();
  if (!session) return;
  await db.meta.put({ key: 'session', value: { ...session, member } });
  const me = session.memberId ? await db.members.get(session.memberId) : undefined;
  if (me) await save<Member>('member', { ...me, name: member });
}
