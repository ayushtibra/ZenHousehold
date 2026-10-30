import type { Entry, Helper, Payment } from '../types';
import { monthDays, monthLabel, weekday } from './dates';
import { fmtDays, fmtMoney, fmtQty } from './format';

export type DayState = 'present' | 'absent' | 'half' | 'extra' | 'off';

export interface DayInfo {
  date: string;
  state: DayState;
  /** Unit helpers: quantity delivered that day. */
  qty: number;
  /** True when someone marked this day; false when it's the default. */
  marked: boolean;
  entry?: Entry;
}

export const isWorkDay = (h: Helper, date: string) => h.workDays.includes(weekday(date));

export function dayInfo(h: Helper, date: string, entry?: Entry): DayInfo {
  const work = isWorkDay(h, date);
  if (h.kind === 'unit') {
    const qty = entry?.qty ?? (work ? h.defaultQty : 0);
    const state: DayState = qty > 0 ? 'present' : work && h.defaultQty > 0 ? 'absent' : 'off';
    return { date, state, qty, marked: !!entry, entry };
  }
  let state: DayState = entry?.status ?? (work ? 'present' : 'off');
  // A leave can only be taken on a day they were supposed to come.
  if (!work && (state === 'absent' || state === 'half' || state === 'present')) state = 'off';
  return { date, state, qty: 0, marked: !!entry, entry };
}

export interface MonthSummary {
  days: DayInfo[];
  scheduled: number;
  absent: number;
  half: number;
  extra: number;
  /** Absent days + half days counted as ½. */
  leaves: number;
  unpaidLeaves: number;
  perDay: number;
  deduction: number;
  extraPay: number;
  /** Unit helpers. */
  qtyTotal: number;
  skipped: number;
  earned: number;
  advances: number;
  salaryPaid: number;
  bonus: number;
  /** earned − advances − salary paid. Negative means overpaid. */
  balance: number;
}

/**
 * Salaried: per-day pay = salary ÷ days in the month. Leaves beyond the paid allowance are
 * deducted at that rate; extra days (came on an off day) are added at it. Unused paid leaves
 * don't carry over.
 */
export function summarize(h: Helper, month: string, entries: Entry[], payments: Payment[]): MonthSummary {
  const byDate = new Map(entries.filter((e) => !e.deleted).map((e) => [e.date, e]));
  const days = monthDays(month).map((d) => dayInfo(h, d, byDate.get(d)));
  const count = (s: DayState) => days.filter((d) => d.state === s).length;
  const absent = count('absent');
  const half = count('half');
  const extra = count('extra');
  const leaves = absent + half / 2;
  const unpaidLeaves = h.kind === 'salaried' ? Math.max(0, leaves - h.paidLeaves) : 0;
  const perDay = h.kind === 'salaried' ? h.salary / days.length : 0;
  const deduction = Math.round(unpaidLeaves * perDay);
  const extraPay = Math.round(extra * perDay);
  const qtyTotal = h.kind === 'unit' ? days.reduce((sum, d) => sum + d.qty, 0) : 0;
  const earned = h.kind === 'salaried' ? h.salary - deduction + extraPay : Math.round(qtyTotal * h.unitRate);

  const live = payments.filter((p) => !p.deleted && p.month === month);
  const sum = (t: Payment['type']) => live.filter((p) => p.type === t).reduce((s, p) => s + p.amount, 0);
  const advances = sum('advance');
  const salaryPaid = sum('salary');

  return {
    days,
    scheduled: days.filter((d) => isWorkDay(h, d.date)).length,
    absent,
    half,
    extra,
    leaves,
    unpaidLeaves,
    perDay,
    deduction,
    extraPay,
    qtyTotal,
    skipped: h.kind === 'unit' ? absent : 0,
    earned,
    advances,
    salaryPaid,
    bonus: sum('bonus'),
    balance: earned - advances - salaryPaid,
  };
}

/** Month statement to send on WhatsApp. */
export function shareText(h: Helper, month: string, s: MonthSummary): string {
  const lines = [`*${h.name} (${h.role}) — ${monthLabel(month)}*`];
  if (h.kind === 'salaried') {
    lines.push(`Salary: ${fmtMoney(h.salary)}`);
    const leaveParts = [`${fmtDays(s.leaves)}`];
    if (s.half) leaveParts.push(`incl. ${s.half} half day${s.half > 1 ? 's' : ''}`);
    lines.push(`Leaves: ${leaveParts.join(', ')} (${fmtDays(h.paidLeaves)} paid)`);
    if (s.unpaidLeaves) lines.push(`Unpaid leave: ${fmtDays(s.unpaidLeaves)} → −${fmtMoney(s.deduction)}`);
    if (s.extra) lines.push(`Extra days: ${s.extra} → +${fmtMoney(s.extraPay)}`);
  } else {
    lines.push(`Total: ${fmtQty(s.qtyTotal)} ${h.unit} × ${fmtMoney(h.unitRate)} = ${fmtMoney(s.earned)}`);
    if (s.skipped) lines.push(`Skipped days: ${s.skipped}`);
  }
  lines.push(`Earned: ${fmtMoney(s.earned)}`);
  if (s.advances) lines.push(`Advance taken: −${fmtMoney(s.advances)}`);
  if (s.salaryPaid) lines.push(`Paid: −${fmtMoney(s.salaryPaid)}`);
  if (s.bonus) lines.push(`Bonus given: ${fmtMoney(s.bonus)}`);
  lines.push(s.balance >= 0 ? `*Balance due: ${fmtMoney(s.balance)}*` : `*Paid extra: ${fmtMoney(-s.balance)}*`);
  return lines.join('\n');
}
