import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Payment, PaymentType } from '../types';
import { deletePayment } from '../actions';
import { monthKey, shortDate } from '../lib/dates';
import { fmtDays, fmtMoney, fmtQty } from '../lib/format';
import { shareText, summarize, type DayInfo } from '../lib/pay';
import { roleEmoji } from '../lib/roles';
import { goBack } from '../nav';
import Calendar from '../components/Calendar';
import DaySheet from '../components/DaySheet';
import HelperForm from '../components/HelperForm';
import MonthPicker from '../components/MonthPicker';
import PaymentSheet from '../components/PaymentSheet';

const PAYMENT_LABEL: Record<PaymentType, string> = { salary: 'Salary', advance: 'Advance', bonus: 'Bonus' };

function Row({ label, value, tone }: { label: string; value: string; tone?: 'over' | 'credit' }) {
  return (
    <div className="kv">
      <span>{label}</span>
      <b className={tone ? `${tone}-text` : ''}>{value}</b>
    </div>
  );
}

async function share(text: string) {
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
  }
  open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
}

export default function HelperDetail({ id }: { id: string }) {
  const [month, setMonth] = useState(monthKey);
  const [editing, setEditing] = useState(false);
  const [day, setDay] = useState<DayInfo | null>(null);
  const [paying, setPaying] = useState<{ type: PaymentType; amount?: number } | null>(null);

  const helper = useLiveQuery(async () => (await db.helpers.get(id)) ?? null, [id]);
  const entries =
    useLiveQuery(() => db.entries.where('[helperId+date]').between([id, `${month}-01`], [id, `${month}-31`], true, true).toArray(), [id, month]) ?? [];
  const payments = useLiveQuery(() => db.payments.where('[helperId+month]').equals([id, month]).toArray(), [id, month]) ?? [];

  if (helper === undefined) return null;
  if (helper === null)
    return (
      <div className="card empty">
        <p>This helper isn't here (yet). If someone just added them, give it a few seconds to sync.</p>
        <button className="btn" onClick={goBack}>
          Back
        </button>
      </div>
    );

  const s = summarize(helper, month, entries, payments);
  const sortedPayments = [...payments].sort((a, b) => a.date.localeCompare(b.date));
  const removePayment = (p: Payment) => {
    if (confirm(`Delete ${PAYMENT_LABEL[p.type].toLowerCase()} of ${fmtMoney(p.amount)}?`)) void deletePayment(p);
  };

  return (
    <>
      <header className="detail-head">
        <button className="icon-btn" aria-label="Back" onClick={goBack}>
          ‹
        </button>
        <span className="avatar">{roleEmoji(helper.role)}</span>
        <div className="grow">
          <h1>{helper.name}</h1>
          <small className="muted">
            {helper.role}
            {helper.kind === 'salaried' ? ` · ${fmtMoney(helper.salary)}/month · ${fmtDays(helper.paidLeaves)} paid leave` : ` · ${fmtMoney(helper.unitRate)}/${helper.unit}`}
          </small>
        </div>
        {helper.phone && (
          <a className="icon-btn" href={`tel:${helper.phone}`} aria-label="Call">
            📞
          </a>
        )}
        <button className="icon-btn" aria-label="Edit" onClick={() => setEditing(true)}>
          ✎
        </button>
      </header>

      <div className="page-head">
        <MonthPicker month={month} setMonth={setMonth} />
      </div>

      <div className="card">
        <div className="hero-label">{s.balance >= 0 ? 'Balance due' : 'Paid extra'}</div>
        <div className="hero-amount">{fmtMoney(Math.abs(s.balance))}</div>
        {helper.kind === 'salaried' ? (
          <>
            <Row label="Monthly salary" value={fmtMoney(helper.salary)} />
            <Row
              label={`Leaves taken${s.half ? ` (${s.half} half)` : ''}`}
              value={`${fmtQty(s.leaves)} of ${fmtQty(helper.paidLeaves)} paid`}
              tone={s.unpaidLeaves ? 'over' : undefined}
            />
            {s.unpaidLeaves > 0 && <Row label={`Unpaid ${fmtDays(s.unpaidLeaves)} × ${fmtMoney(s.perDay)}`} value={`−${fmtMoney(s.deduction)}`} tone="over" />}
            {s.extra > 0 && <Row label={`Extra ${fmtDays(s.extra)}`} value={`+${fmtMoney(s.extraPay)}`} tone="credit" />}
          </>
        ) : (
          <>
            <Row label={`${fmtQty(s.qtyTotal)} ${helper.unit} × ${fmtMoney(helper.unitRate)}`} value={fmtMoney(s.earned)} />
            {s.skipped > 0 && <Row label="Days skipped" value={String(s.skipped)} />}
          </>
        )}
        <Row label="Earned" value={fmtMoney(s.earned)} />
        {s.advances > 0 && <Row label="Advance given" value={`−${fmtMoney(s.advances)}`} />}
        {s.salaryPaid > 0 && <Row label="Paid" value={`−${fmtMoney(s.salaryPaid)}`} />}
        {s.bonus > 0 && <Row label="Bonus given (not deducted)" value={fmtMoney(s.bonus)} />}
        <button className="btn block ghost share" onClick={() => share(shareText(helper, month, s))}>
          Share summary on WhatsApp
        </button>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Attendance</h3>
          <small className="muted">Tap a day to change it</small>
        </div>
        <Calendar helper={helper} days={s.days} onPick={setDay} />
      </div>

      <div className="card">
        <h3>Payments</h3>
        {sortedPayments.length === 0 && <p className="muted small">Nothing paid for this month yet.</p>}
        {sortedPayments.map((p) => (
          <div className="payment" key={p.id}>
            <div className="grow">
              <b>{PAYMENT_LABEL[p.type]}</b>
              <small className="muted">
                {shortDate(p.date)}
                {p.note ? ` · ${p.note}` : ''}
                {p.by ? ` · by ${p.by}` : ''}
              </small>
            </div>
            <b>{fmtMoney(p.amount)}</b>
            <button className="icon-btn small" aria-label="Delete payment" onClick={() => removePayment(p)}>
              ✕
            </button>
          </div>
        ))}
        <div className="actions">
          {s.balance > 0 && (
            <button className="btn primary" onClick={() => setPaying({ type: 'salary', amount: s.balance })}>
              Pay {fmtMoney(s.balance)}
            </button>
          )}
          <button className="btn" onClick={() => setPaying({ type: 'advance' })}>
            + Advance
          </button>
          <button className="btn" onClick={() => setPaying({ type: 'bonus' })}>
            + Bonus
          </button>
        </div>
      </div>

      {editing && <HelperForm initial={helper} onClose={() => setEditing(false)} />}
      {day && <DaySheet helper={helper} info={day} onClose={() => setDay(null)} />}
      {paying && <PaymentSheet helper={helper} month={month} type={paying.type} amount={paying.amount} onClose={() => setPaying(null)} />}
    </>
  );
}
