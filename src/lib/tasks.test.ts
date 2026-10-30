import { describe, expect, it } from 'vitest';
import type { Task } from '../types';
import { bucket, compareTasks, completeTask, nextDue, onHome, reopenTask } from './tasks';

const task = (t: Partial<Task>): Task => ({ id: 't', title: 'Task', done: false, createdAt: '', ...t });
const TODAY = '2026-10-30';

describe('nextDue', () => {
  it('steps daily and weekly', () => {
    expect(nextDue('2026-10-31', 'daily')).toBe('2026-11-01');
    expect(nextDue('2026-10-30', 'weekly')).toBe('2026-11-06');
  });

  it('keeps the day of month, clamped to short months', () => {
    expect(nextDue('2026-01-31', 'monthly')).toBe('2026-02-28');
    expect(nextDue('2026-02-28', 'monthly', 31)).toBe('2026-03-31');
    expect(nextDue('2026-12-05', 'monthly')).toBe('2027-01-05');
  });
});

describe('Home and buckets', () => {
  it('shows open tasks due today or earlier', () => {
    expect(onHome(task({ due: '2026-10-28' }), TODAY)).toBe(true);
    expect(onHome(task({ due: TODAY }), TODAY)).toBe(true);
    expect(onHome(task({ due: '2026-10-31' }), TODAY)).toBe(false);
    expect(onHome(task({}), TODAY)).toBe(false);
  });

  it('keeps tasks ticked today, hides older done ones', () => {
    const doneToday = new Date(2026, 9, 30, 9, 0).toISOString();
    const doneYesterday = new Date(2026, 9, 29, 9, 0).toISOString();
    expect(onHome(task({ due: '2026-10-28', done: true, doneAt: doneToday }), TODAY)).toBe(true);
    expect(onHome(task({ due: '2026-10-28', done: true, doneAt: doneYesterday }), TODAY)).toBe(false);
  });

  it('buckets by due date', () => {
    expect(bucket(task({ due: '2026-10-01' }), TODAY)).toBe('overdue');
    expect(bucket(task({ due: TODAY }), TODAY)).toBe('today');
    expect(bucket(task({ due: '2026-11-01' }), TODAY)).toBe('upcoming');
    expect(bucket(task({}), TODAY)).toBe('someday');
    expect(bucket(task({ due: '2026-10-01', done: true }), TODAY)).toBe('done');
  });

  it('sorts open before done, oldest due first, undated last', () => {
    const list = [task({ id: 'a', title: 'a' }), task({ id: 'b', due: '2026-11-02' }), task({ id: 'c', due: '2026-10-01' }), task({ id: 'd', done: true })];
    expect(list.sort(compareTasks).map((t) => t.id)).toEqual(['c', 'b', 'a', 'd']);
  });
});

describe('completing and reopening', () => {
  const now = new Date('2026-10-30T10:00:00Z');

  it('just marks a one-off task done', () => {
    const rows = completeTask(task({ due: TODAY }), 'Mom', now, TODAY);
    expect(rows).toEqual([expect.objectContaining({ done: true, doneBy: 'Mom', doneAt: now.toISOString() })]);
  });

  it('creates the next occurrence of a repeating task with a stable id', () => {
    const bill = task({ id: 'bill', title: 'Pay electricity', due: '2026-10-31', repeat: 'monthly', anchorDay: 31, assignee: 'm:1' });
    const [done, next] = completeTask(bill, 'Ayush', now, TODAY);
    expect(next).toMatchObject({ id: 'bill:2026-11-30', seriesId: 'bill', due: '2026-11-30', done: false, assignee: 'm:1', title: 'Pay electricity' });
    expect(done.nextId).toBe('bill:2026-11-30');
    // Ticking the next one continues the same series and returns to the 31st.
    expect(completeTask(next, 'Ayush', now, TODAY)[1]).toMatchObject({ id: 'bill:2026-12-31', due: '2026-12-31' });
  });

  it('reopening removes the next occurrence unless it was already done', () => {
    const [done, next] = completeTask(task({ id: 'x', due: TODAY, repeat: 'daily' }), 'Mom', now, TODAY);
    const rows = reopenTask(done, next);
    expect(rows[0]).toMatchObject({ done: false, doneBy: undefined, nextId: undefined });
    expect(rows[1]).toMatchObject({ id: next.id, deleted: true });
    expect(reopenTask(done, { ...next, done: true })).toHaveLength(1);
  });
});
