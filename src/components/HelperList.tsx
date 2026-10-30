import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Helper } from '../types';
import { monthKey, monthLabel } from '../lib/dates';
import { fmtDays, fmtMoney, fmtQty } from '../lib/format';
import { summarize } from '../lib/pay';
import { roleEmoji } from '../lib/roles';
import { go } from '../nav';
import HelperForm from './HelperForm';

/** Helpers with this month's leaves and balance; tap one for the calendar and payments. */
export default function HelperList({ adding }: { adding?: boolean }) {
  const month = monthKey();
  const [formOpen, setFormOpen] = useState(!!adding);
  const helpers = useLiveQuery(() => db.helpers.toArray(), []);
  const entries = useLiveQuery(() => db.entries.where('date').between(`${month}-01`, `${month}-31`, true, true).toArray(), [month]) ?? [];
  const payments = useLiveQuery(() => db.payments.where('month').equals(month).toArray(), [month]) ?? [];

  useEffect(() => {
    if (adding) history.replaceState(null, '', '#/settings');
  }, [adding]);

  if (!helpers) return null;
  const sorted = [...helpers].sort((a, b) => a.name.localeCompare(b.name));
  const active = sorted.filter((h) => h.active);
  const archived = sorted.filter((h) => !h.active);

  const row = (h: Helper) => {
    const s = summarize(
      h,
      month,
      entries.filter((e) => e.helperId === h.id),
      payments.filter((p) => p.helperId === h.id),
    );
    const over = h.kind === 'salaried' && s.leaves > h.paidLeaves;
    return (
      <button key={h.id} className="list-row" onClick={() => go(`helper/${h.id}`)}>
        <span className="avatar">{roleEmoji(h.role)}</span>
        <span className="grow">
          <b>{h.name}</b>
          <small>
            {h.kind === 'salaried'
              ? `${h.role} · leaves ${fmtQty(s.leaves)} of ${fmtDays(h.paidLeaves)}`
              : `${h.role} · ${fmtQty(s.qtyTotal)} ${h.unit} this month`}
          </small>
        </span>
        <span className="right">
          <b className={over ? 'over-text' : ''}>{fmtMoney(s.balance)}</b>
          <small>{s.balance >= 0 ? 'due' : 'paid extra'}</small>
        </span>
      </button>
    );
  };

  return (
    <div className="card">
      <div className="card-head">
        <h3>Helpers</h3>
        {active.length > 0 && <small className="muted">{monthLabel(month)} so far</small>}
      </div>
      {active.length === 0 && <p className="muted small">Maid, cook, milkman, newspaper… add them to track leaves and pay.</p>}
      {active.map(row)}
      <button className="btn block" onClick={() => setFormOpen(true)}>
        + Add helper
      </button>
      {archived.length > 0 && (
        <details className="archived">
          <summary>Archived ({archived.length})</summary>
          {archived.map(row)}
        </details>
      )}
      {formOpen && <HelperForm onClose={() => setFormOpen(false)} />}
    </div>
  );
}
