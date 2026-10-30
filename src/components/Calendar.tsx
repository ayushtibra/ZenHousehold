import type { Helper } from '../types';
import { todayKey, weekday } from '../lib/dates';
import { fmtQty } from '../lib/format';
import type { DayInfo } from '../lib/pay';

const HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const LEGEND = {
  salaried: [
    ['present', 'Present'],
    ['half', 'Half day'],
    ['absent', 'Absent'],
    ['extra', 'Extra'],
    ['off', 'Off'],
  ],
  unit: [
    ['present', 'Delivered'],
    ['absent', 'Skipped'],
    ['off', 'No delivery'],
  ],
} as const;

/** Month grid (Monday first). Tap a day to change it. */
export default function Calendar({ helper, days, onPick }: { helper: Helper; days: DayInfo[]; onPick: (d: DayInfo) => void }) {
  const lead = (weekday(days[0].date) + 6) % 7;
  const today = todayKey();
  return (
    <>
      <div className="calendar">
        {HEADERS.map((h, i) => (
          <span key={i} className="cal-head">
            {h}
          </span>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <span key={`b${i}`} />
        ))}
        {days.map((d) => (
          <button
            key={d.date}
            className={`cal-day s-${d.state}${d.marked ? ' marked' : ''}${d.date === today ? ' today' : ''}${d.date > today ? ' future' : ''}`}
            onClick={() => onPick(d)}
            title={d.entry?.note}
            aria-label={`${d.date.slice(8)}: ${helper.kind === 'unit' ? `${fmtQty(d.qty)} ${helper.unit}` : d.state}${d.entry?.note ? ` (${d.entry.note})` : ''}`}
          >
            <span>{Number(d.date.slice(8))}</span>
            {helper.kind === 'unit' && d.qty > 0 && <small>{fmtQty(d.qty)}</small>}
            {helper.kind === 'salaried' && d.state === 'half' && <small>½</small>}
            {d.entry?.note && <i className="note-dot" />}
          </button>
        ))}
      </div>
      <div className="legend">
        {LEGEND[helper.kind].map(([state, label]) => (
          <span key={state}>
            <i className={`swatch s-${state}`} />
            {label}
          </span>
        ))}
      </div>
    </>
  );
}
