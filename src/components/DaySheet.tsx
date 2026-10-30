import { useState } from 'react';
import type { DayStatus, Helper } from '../types';
import { setDays } from '../actions';
import { addDays, shortDate } from '../lib/dates';
import { isWorkDay, type DayInfo } from '../lib/pay';
import { fmtQty } from '../lib/format';
import Sheet from './Sheet';

type Choice = DayStatus | 'default';

/** Edit one day from the calendar, optionally repeating it over a range (e.g. a week of leave). */
export default function DaySheet({ helper, info, onClose }: { helper: Helper; info: DayInfo; onClose: () => void }) {
  const work = isWorkDay(helper, info.date);
  const [choice, setChoice] = useState<Choice>(info.entry?.status ?? 'default');
  const [qty, setQty] = useState(String(info.qty));
  const [note, setNote] = useState(info.entry?.note ?? '');
  const [until, setUntil] = useState(info.date);

  const options: [Choice, string][] = work
    ? [
        ['default', 'Present'],
        ['half', 'Half day'],
        ['absent', 'Absent'],
      ]
    : [
        ['default', 'Off'],
        ['extra', 'Came (extra)'],
      ];

  const save = async () => {
    const trimmed = note.trim();
    const last = until < info.date ? info.date : until;
    if (helper.kind === 'unit') {
      const n = Math.max(0, Number(qty) || 0);
      const usual = work ? helper.defaultQty : 0;
      await setDays(helper, info.date, last, n === usual && !trimmed && last === info.date ? null : { qty: n, note: trimmed || undefined });
    } else {
      const status = choice === 'default' ? undefined : choice;
      await setDays(helper, info.date, last, !status && !trimmed ? null : { status, note: trimmed || undefined });
    }
    onClose();
  };

  return (
    <Sheet title={shortDate(info.date)} onClose={onClose}>
      {helper.kind === 'unit' ? (
        <label className="field">
          <span>Quantity ({helper.unit})</span>
          <input type="number" inputMode="decimal" min="0" step="0.5" value={qty} onChange={(e) => setQty(e.target.value)} />
          <small className="muted">Usual: {fmtQty(work ? helper.defaultQty : 0)}. Set 0 if they didn't come.</small>
        </label>
      ) : (
        <div className="chips segmented">
          {options.map(([value, label]) => (
            <button key={value} className={`chip ${choice === value ? `on ${value === 'default' ? 'present' : value}` : ''}`} onClick={() => setChoice(value)}>
              {label}
            </button>
          ))}
        </div>
      )}

      <label className="field">
        <span>Note</span>
        <input value={note} placeholder="e.g. went to village, informed a day before" onChange={(e) => setNote(e.target.value)} maxLength={140} />
      </label>

      <label className="field">
        <span>Same for every day until</span>
        <input type="date" value={until} min={info.date} max={addDays(info.date, 62)} onChange={(e) => setUntil(e.target.value || info.date)} />
        {until > info.date && helper.kind === 'salaried' && (choice === 'absent' || choice === 'half') && (
          <small className="muted">Their off days in between are skipped.</small>
        )}
      </label>

      {info.entry?.by && <p className="muted small">Last marked by {info.entry.by}</p>}

      <button className="btn primary block" onClick={save}>
        Save
      </button>
    </Sheet>
  );
}
