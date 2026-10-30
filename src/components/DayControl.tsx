import type { DayStatus, Helper } from '../types';
import { setDay } from '../actions';
import { isWorkDay, type DayInfo } from '../lib/pay';
import { fmtQty } from '../lib/format';

const LEAVE_OPTIONS: [DayStatus, string][] = [
  ['present', 'Present'],
  ['half', 'Half day'],
  ['absent', 'Absent'],
];

export const qtyStep = (h: Helper) => (h.unit === 'L' ? 0.5 : 1);

/** One-tap marking for a helper on a day: status chips, or a quantity stepper for milk etc. */
export default function DayControl({ helper, info }: { helper: Helper; info: DayInfo }) {
  const work = isWorkDay(helper, info.date);
  const note = info.entry?.note;
  const keepNote = note ? { note } : {};

  if (helper.kind === 'unit') {
    const usual = work ? helper.defaultQty : 0;
    const setQty = (qty: number) => setDay(helper, info.date, qty === usual && !note ? null : { qty, ...keepNote });
    return (
      <div className="day-control">
        <div className="stepper">
          <button className="icon-btn" aria-label="Less" disabled={info.qty <= 0} onClick={() => setQty(Math.max(0, info.qty - qtyStep(helper)))}>
            −
          </button>
          <span className="qty">
            {fmtQty(info.qty)} <small>{helper.unit}</small>
          </span>
          <button className="icon-btn" aria-label="More" onClick={() => setQty(info.qty + qtyStep(helper))}>
            +
          </button>
        </div>
        {info.qty > 0 && usual > 0 && (
          <button className="chip" onClick={() => setQty(0)}>
            Didn't come
          </button>
        )}
        {info.qty !== usual && (
          <button className="chip ghost" onClick={() => setQty(usual)}>
            Usual ({fmtQty(usual)})
          </button>
        )}
      </div>
    );
  }

  if (!work) {
    const extra = info.state === 'extra';
    return (
      <div className="day-control">
        <span className="muted">Off day</span>
        <button className={`chip ${extra ? 'on extra' : ''}`} onClick={() => setDay(helper, info.date, extra ? null : { status: 'extra', ...keepNote })}>
          {extra ? '✓ Came (extra)' : 'Came (extra)'}
        </button>
      </div>
    );
  }

  return (
    <div className="day-control chips">
      {LEAVE_OPTIONS.map(([status, label]) => (
        <button
          key={status}
          className={`chip ${info.state === status ? `on ${status}` : ''}`}
          onClick={() => setDay(helper, info.date, status === 'present' && !note ? null : { status, ...keepNote })}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
