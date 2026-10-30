import { useState } from 'react';
import type { Helper, HelperKind } from '../types';
import { saveHelper } from '../actions';
import { WEEKDAYS } from '../lib/dates';
import { newId } from '../lib/format';
import { ROLES } from '../lib/roles';
import Sheet from './Sheet';

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function blank(): Helper {
  return {
    id: newId(),
    name: '',
    role: 'Maid',
    kind: 'salaried',
    workDays: ALL_DAYS,
    salary: 0,
    paidLeaves: 2,
    unit: 'L',
    unitRate: 0,
    defaultQty: 1,
    active: true,
    createdAt: new Date().toISOString(),
  };
}

export default function HelperForm({ initial, onClose }: { initial?: Helper; onClose: () => void }) {
  const [h, setH] = useState<Helper>(initial ?? blank);
  const set = (patch: Partial<Helper>) => setH((cur) => ({ ...cur, ...patch }));
  const num = (v: string) => (v === '' ? 0 : Number(v));

  const pickRole = (role: string) => {
    const preset = ROLES.find((r) => r.role === role)!;
    // Only switch billing style for a new helper; an existing one keeps what was set up.
    set(initial ? { role } : { role, kind: preset.kind, unit: preset.unit ?? h.unit, defaultQty: preset.defaultQty ?? h.defaultQty });
  };

  const toggleDay = (d: number) => set({ workDays: h.workDays.includes(d) ? h.workDays.filter((x) => x !== d) : [...h.workDays, d].sort() });

  const valid =
    h.name.trim() !== '' && h.workDays.length > 0 && (h.kind === 'salaried' ? h.salary > 0 && h.paidLeaves >= 0 : h.unitRate > 0 && h.unit.trim() !== '');

  const save = async () => {
    await saveHelper({ ...h, name: h.name.trim(), unit: h.unit.trim(), phone: h.phone?.trim() || undefined });
    onClose();
  };

  const kinds: [HelperKind, string][] = [
    ['salaried', 'Monthly salary'],
    ['unit', 'Pay per quantity'],
  ];

  return (
    <Sheet title={initial ? `Edit ${initial.name}` : 'Add helper'} onClose={onClose}>
      <label className="field">
        <span>Name</span>
        <input value={h.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Sunita" maxLength={40} autoFocus={!initial} />
      </label>

      <label className="field">
        <span>Role</span>
        <select value={h.role} onChange={(e) => pickRole(e.target.value)}>
          {ROLES.map((r) => (
            <option key={r.role} value={r.role}>
              {r.emoji} {r.role}
            </option>
          ))}
        </select>
      </label>

      <div className="field">
        <span>How you pay</span>
        <div className="chips segmented">
          {kinds.map(([k, label]) => (
            <button key={k} className={`chip ${h.kind === k ? 'on present' : ''}`} onClick={() => set({ kind: k })}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {h.kind === 'salaried' ? (
        <div className="field-row">
          <label className="field">
            <span>Salary / month (₹)</span>
            <input type="number" inputMode="numeric" min="0" value={h.salary || ''} onChange={(e) => set({ salary: num(e.target.value) })} />
          </label>
          <label className="field">
            <span>Paid leaves / month</span>
            <input type="number" inputMode="decimal" min="0" step="0.5" value={h.paidLeaves} onChange={(e) => set({ paidLeaves: num(e.target.value) })} />
          </label>
        </div>
      ) : (
        <div className="field-row three">
          <label className="field">
            <span>Unit</span>
            <input value={h.unit} onChange={(e) => set({ unit: e.target.value })} placeholder="L" maxLength={10} />
          </label>
          <label className="field">
            <span>Usual / day</span>
            <input type="number" inputMode="decimal" min="0" step="0.5" value={h.defaultQty} onChange={(e) => set({ defaultQty: num(e.target.value) })} />
          </label>
          <label className="field">
            <span>₹ per {h.unit || 'unit'}</span>
            <input type="number" inputMode="decimal" min="0" value={h.unitRate || ''} onChange={(e) => set({ unitRate: num(e.target.value) })} />
          </label>
        </div>
      )}

      <div className="field">
        <span>{h.kind === 'salaried' ? 'Comes on' : 'Delivers on'}</span>
        <div className="weekdays">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <button key={d} className={`chip ${h.workDays.includes(d) ? 'on present' : ''}`} onClick={() => toggleDay(d)}>
              {WEEKDAYS[d].slice(0, 2)}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span>Phone (optional)</span>
        <input type="tel" value={h.phone ?? ''} onChange={(e) => set({ phone: e.target.value })} maxLength={20} />
      </label>

      <button className="btn primary block" disabled={!valid} onClick={save}>
        {initial ? 'Save changes' : 'Add helper'}
      </button>
      {initial && (
        <button
          className="btn block ghost"
          onClick={async () => {
            await saveHelper({ ...initial, active: !initial.active });
            onClose();
          }}
        >
          {initial.active ? 'Stopped working here (archive)' : 'Restore'}
        </button>
      )}
    </Sheet>
  );
}
