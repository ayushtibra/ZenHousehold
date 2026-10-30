import { db, getSession } from './db';
import { save } from './sync';
import type { DayStatus, Helper, Payment, Task } from './types';
import { addDays, todayKey } from './lib/dates';
import { isWorkDay } from './lib/pay';
import { newId } from './lib/format';
import { completeTask, reopenTask } from './lib/tasks';

export interface DayChange {
  status?: DayStatus;
  qty?: number;
  note?: string;
}

const entryId = (helperId: string, date: string) => `${helperId}:${date}`;

/** Mark a day, or pass null to go back to the default (present / usual quantity). */
export function setDay(helper: Helper, date: string, change: DayChange | null) {
  const base = { id: entryId(helper.id, date), helperId: helper.id, date };
  return save('entry', change ? { ...base, ...change } : { ...base, deleted: true });
}

/**
 * Apply the same mark from `from` to `to` inclusive, e.g. "on leave 3–7 Nov".
 * Leaves and half days only land on the helper's work days.
 */
export function setDays(helper: Helper, from: string, to: string, change: DayChange | null) {
  const rows = [];
  const leave = change?.status === 'absent' || change?.status === 'half';
  for (let d = from; d <= to; d = addDays(d, 1)) {
    if (leave && !isWorkDay(helper, d)) continue;
    const base = { id: entryId(helper.id, d), helperId: helper.id, date: d };
    rows.push(change ? { ...base, ...change } : { ...base, deleted: true });
  }
  return save('entry', ...rows);
}

export const saveHelper = (helper: Helper) => save('helper', helper);

export function addPayment(p: Omit<Payment, 'id' | 'createdAt'>) {
  return save('payment', { ...p, id: newId(), createdAt: new Date().toISOString() });
}

export const deletePayment = (p: Payment) => save('payment', { ...p, deleted: true });

export const saveTask = (t: Task) => save('task', t);

export const deleteTask = (t: Task) => save('task', { ...t, deleted: true });

export async function toggleTask(t: Task) {
  if (!t.done) {
    const who = (await getSession())?.member ?? '';
    return save('task', ...completeTask(t, who, new Date(), todayKey()));
  }
  const next = t.nextId ? await db.tasks.get(t.nextId) : undefined;
  return save('task', ...reopenTask(t, next));
}
