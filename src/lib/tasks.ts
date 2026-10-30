import type { Repeat, Task } from '../types';
import { addDays, dateKey, daysInMonth, shiftMonth } from './dates';

export const REPEAT_LABEL: Record<Repeat, string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };

/** Due date of the occurrence after `due`. Monthly keeps to `anchorDay`, clamped to short months. */
export function nextDue(due: string, repeat: Repeat, anchorDay = Number(due.slice(8))): string {
  if (repeat === 'daily') return addDays(due, 1);
  if (repeat === 'weekly') return addDays(due, 7);
  const ym = shiftMonth(due.slice(0, 7), 1);
  return `${ym}-${String(Math.min(anchorDay, daysInMonth(ym))).padStart(2, '0')}`;
}

/** Local calendar day a task was ticked on. */
export const doneDay = (t: Task) => (t.doneAt ? dateKey(new Date(t.doneAt)) : undefined);

export type Bucket = 'overdue' | 'today' | 'upcoming' | 'someday' | 'done';

export function bucket(t: Task, today: string): Bucket {
  if (t.done) return 'done';
  if (!t.due) return 'someday';
  if (t.due < today) return 'overdue';
  return t.due === today ? 'today' : 'upcoming';
}

/**
 * What Home shows: open tasks due today or earlier, plus ones ticked off today
 * (struck through, so a mis-tap can be undone).
 */
export function onHome(t: Task, today: string): boolean {
  if (!t.due || t.due > today) return false;
  return !t.done || doneDay(t) === today;
}

/** Overdue first (oldest first), then by due date, then undated, then title. */
export function compareTasks(a: Task, b: Task): number {
  if (a.done !== b.done) return a.done ? 1 : -1;
  if (a.done) return (b.doneAt ?? '').localeCompare(a.doneAt ?? '');
  // Plain comparison (not localeCompare): undated tasks sort after every date.
  if (a.due !== b.due) return !a.due ? 1 : !b.due ? -1 : a.due < b.due ? -1 : 1;
  return a.title.localeCompare(b.title);
}

/**
 * Rows to save when ticking a task. A repeating task also creates its next occurrence,
 * with an id derived from the series and date so two people ticking at once don't make two.
 */
export function completeTask(t: Task, who: string, now: Date, today: string): Task[] {
  const done: Task = { ...t, done: true, doneBy: who, doneAt: now.toISOString() };
  if (!t.repeat) return [done];
  const seriesId = t.seriesId ?? t.id;
  const due = nextDue(t.due ?? today, t.repeat, t.anchorDay);
  const next: Task = {
    id: `${seriesId}:${due}`,
    title: t.title,
    note: t.note,
    assignee: t.assignee,
    due,
    repeat: t.repeat,
    anchorDay: t.anchorDay,
    seriesId,
    done: false,
    createdBy: t.createdBy,
    createdAt: now.toISOString(),
  };
  return [{ ...done, nextId: next.id }, next];
}

/** Rows to save when unticking: reopen it, and drop the next occurrence if nobody has ticked that yet. */
export function reopenTask(t: Task, next: Task | undefined): Task[] {
  const open: Task = { ...t, done: false, doneBy: undefined, doneAt: undefined, nextId: undefined };
  return next && !next.done ? [open, { ...next, deleted: true }] : [open];
}
