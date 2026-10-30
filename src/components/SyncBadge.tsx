import { useSyncExternalStore } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { getSyncStatus, subscribeSync, syncNow } from '../sync';

/** Small indicator so family members know whether their marks reached everyone else. */
export default function SyncBadge() {
  const status = useSyncExternalStore(subscribeSync, getSyncStatus);
  const pending = useLiveQuery(() => db.outbox.count(), []) ?? 0;

  let label = 'Synced';
  let tone = 'ok';
  if (status.state === 'syncing') label = 'Syncing…';
  else if (status.state === 'offline') [label, tone] = [pending ? `Offline · ${pending} to send` : 'Offline', 'warn'];
  else if (status.state === 'error') [label, tone] = ['Sync failed · retry', 'over'];
  else if (pending) [label, tone] = [`${pending} to send`, 'warn'];

  return (
    <button className={`sync-badge ${tone}`} onClick={() => void syncNow()} title={status.error}>
      <i />
      {label}
    </button>
  );
}
