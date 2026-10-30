import { useState } from 'react';
import type { Helper, PaymentType } from '../types';
import { addPayment } from '../actions';
import { monthLabel, todayKey } from '../lib/dates';
import Sheet from './Sheet';

const TYPES: [PaymentType, string, string][] = [
  ['salary', 'Salary', 'Settles what they earned this month.'],
  ['advance', 'Advance', 'Given early; taken off this month’s pay.'],
  ['bonus', 'Bonus', 'Extra on top (Diwali, gift) — not deducted.'],
];

export default function PaymentSheet({
  helper,
  month,
  type: initialType,
  amount: initialAmount,
  onClose,
}: {
  helper: Helper;
  month: string;
  type: PaymentType;
  amount?: number;
  onClose: () => void;
}) {
  const [type, setType] = useState(initialType);
  const [amount, setAmount] = useState(initialAmount ? String(initialAmount) : '');
  const [date, setDate] = useState(todayKey);
  const [note, setNote] = useState('');
  const value = Number(amount);

  const save = async () => {
    await addPayment({ helperId: helper.id, month, type, amount: value, date, note: note.trim() || undefined });
    onClose();
  };

  return (
    <Sheet title={`Payment · ${monthLabel(month)}`} onClose={onClose}>
      <div className="chips segmented">
        {TYPES.map(([t, label]) => (
          <button key={t} className={`chip ${type === t ? 'on present' : ''}`} onClick={() => setType(t)}>
            {label}
          </button>
        ))}
      </div>
      <p className="muted small">{TYPES.find(([t]) => t === type)![2]}</p>
      <label className="field">
        <span>Amount (₹)</span>
        <input type="number" inputMode="numeric" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
      </label>
      <label className="field">
        <span>Paid on</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value || todayKey())} />
      </label>
      <label className="field">
        <span>Note</span>
        <input value={note} placeholder="e.g. UPI, cash" onChange={(e) => setNote(e.target.value)} maxLength={140} />
      </label>
      <button className="btn primary block" disabled={!(value > 0)} onClick={save}>
        Save payment
      </button>
    </Sheet>
  );
}
