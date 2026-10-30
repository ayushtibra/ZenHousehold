import { describe, expect, it } from 'vitest';
import type { Entry, Helper, Payment } from '../types';
import { dayInfo, shareText, summarize } from './pay';

const maid: Helper = {
  id: 'm',
  name: 'Sunita',
  role: 'Maid',
  kind: 'salaried',
  workDays: [1, 2, 3, 4, 5, 6], // Sundays off
  salary: 6000,
  paidLeaves: 2,
  unit: '',
  unitRate: 0,
  defaultQty: 0,
  active: true,
  createdAt: '',
};

const milk: Helper = {
  ...maid,
  id: 'k',
  name: 'Ramesh',
  role: 'Milk',
  kind: 'unit',
  workDays: [0, 1, 2, 3, 4, 5, 6],
  salary: 0,
  paidLeaves: 0,
  unit: 'L',
  unitRate: 60,
  defaultQty: 2,
};

const entry = (h: Helper, date: string, e: Partial<Entry>): Entry => ({ id: `${h.id}:${date}`, helperId: h.id, date, ...e });
const pay = (type: Payment['type'], amount: number, month = '2026-11'): Payment => ({
  id: `${type}${amount}`,
  helperId: 'm',
  month,
  type,
  amount,
  date: '2026-11-30',
  createdAt: '',
});

// November 2026: 30 days, starts on a Sunday → 5 Sundays, 25 work days.
const NOV = '2026-11';

describe('dayInfo', () => {
  it('defaults to present on work days and off otherwise', () => {
    expect(dayInfo(maid, '2026-11-02').state).toBe('present'); // Monday
    expect(dayInfo(maid, '2026-11-01').state).toBe('off'); // Sunday
  });

  it('ignores a leave marked on an off day but keeps extra', () => {
    expect(dayInfo(maid, '2026-11-01', entry(maid, '2026-11-01', { status: 'absent' })).state).toBe('off');
    expect(dayInfo(maid, '2026-11-01', entry(maid, '2026-11-01', { status: 'extra' })).state).toBe('extra');
  });

  it('uses the usual quantity for unit helpers unless changed', () => {
    expect(dayInfo(milk, '2026-11-02').qty).toBe(2);
    const skipped = dayInfo(milk, '2026-11-02', entry(milk, '2026-11-02', { qty: 0 }));
    expect(skipped).toMatchObject({ qty: 0, state: 'absent', marked: true });
  });
});

describe('summarize salaried', () => {
  it('pays full salary within the paid-leave allowance', () => {
    const s = summarize(maid, NOV, [entry(maid, '2026-11-03', { status: 'absent' }), entry(maid, '2026-11-04', { status: 'half' })], []);
    expect(s).toMatchObject({ scheduled: 25, leaves: 1.5, unpaidLeaves: 0, deduction: 0, earned: 6000, balance: 6000 });
  });

  it('deducts leaves beyond the allowance at salary ÷ days in month', () => {
    const entries = ['03', '04', '05'].map((d) => entry(maid, `2026-11-${d}`, { status: 'absent' }));
    entries.push(entry(maid, '2026-11-06', { status: 'half' }));
    const s = summarize(maid, NOV, entries, []);
    // 3.5 leaves − 2 paid = 1.5 unpaid × ₹200/day
    expect(s).toMatchObject({ leaves: 3.5, unpaidLeaves: 1.5, perDay: 200, deduction: 300, earned: 5700 });
  });

  it('adds extra days and subtracts advances and salary paid, but not bonus', () => {
    const s = summarize(maid, NOV, [entry(maid, '2026-11-08', { status: 'extra' })], [
      pay('advance', 1000),
      pay('salary', 2000),
      pay('bonus', 500),
      pay('advance', 999, '2026-10'),
      { ...pay('salary', 3000), deleted: true },
    ]);
    expect(s).toMatchObject({ extra: 1, extraPay: 200, earned: 6200, advances: 1000, salaryPaid: 2000, bonus: 500, balance: 3200 });
  });

  it('ignores deleted entries', () => {
    const s = summarize(maid, NOV, [{ ...entry(maid, '2026-11-03', { status: 'absent' }), deleted: true }], []);
    expect(s.leaves).toBe(0);
  });
});

describe('summarize unit', () => {
  it('bills quantity × rate with skipped and changed days', () => {
    const s = summarize(milk, NOV, [entry(milk, '2026-11-02', { qty: 0 }), entry(milk, '2026-11-03', { qty: 3 })], []);
    // 28 normal days × 2 + 0 + 3 = 59 L
    expect(s).toMatchObject({ qtyTotal: 59, skipped: 1, earned: 3540, balance: 3540 });
  });
});

describe('shareText', () => {
  it('summarises leaves, deductions and balance', () => {
    const entries = ['03', '04', '05'].map((d) => entry(maid, `2026-11-${d}`, { status: 'absent' }));
    const text = shareText(maid, NOV, summarize(maid, NOV, entries, [pay('advance', 1000)]));
    expect(text).toContain('Leaves: 3 days (2 days paid)');
    expect(text).toContain('Unpaid leave: 1 day → −₹200');
    expect(text).toContain('Advance taken: −₹1,000');
    expect(text).toContain('*Balance due: ₹4,800*');
  });
});
