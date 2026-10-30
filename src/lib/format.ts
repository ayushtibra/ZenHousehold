export const fmtMoney = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/** 2 -> '2', 1.5 -> '1.5', 0.25 -> '0.25' */
export const fmtQty = (q: number) => String(Math.round(q * 100) / 100);

/** 1 -> '1 day', 2.5 -> '2.5 days' */
export const fmtDays = (n: number) => `${fmtQty(n)} ${n === 1 ? 'day' : 'days'}`;

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
