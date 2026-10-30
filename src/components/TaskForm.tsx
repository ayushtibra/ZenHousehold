import { useState } from 'react';
import type { Repeat, Task } from '../types';
import { deleteTask, saveTask } from '../actions';
import { getSession } from '../db';
import { addDays, todayKey } from '../lib/dates';
import { newId } from '../lib/format';
import { REPEAT_LABEL } from '../lib/tasks';
import type { People } from '../lib/people';
import Sheet from './Sheet';

const REPEATS: (Repeat | undefined)[] = [undefined, 'daily', 'weekly', 'monthly'];

export default function TaskForm({ initial, people, onClose }: { initial?: Task; people: People; onClose: () => void }) {
  const today = todayKey();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [assignee, setAssignee] = useState(initial?.assignee ?? '');
  const [due, setDue] = useState(initial ? (initial.due ?? '') : today);
  const [repeat, setRepeat] = useState<Repeat | undefined>(initial?.repeat);

  const pickRepeat = (r: Repeat | undefined) => {
    setRepeat(r);
    // A repeating task needs a first date to count from.
    if (r && !due) setDue(today);
  };

  const save = async () => {
    const base: Task = initial ?? { id: newId(), title: '', done: false, createdBy: (await getSession())?.member, createdAt: new Date().toISOString() };
    await saveTask({
      ...base,
      title: title.trim(),
      note: note.trim() || undefined,
      assignee: assignee || undefined,
      due: due || undefined,
      repeat,
      anchorDay: repeat === 'monthly' && due ? Number(due.slice(8)) : undefined,
    });
    onClose();
  };

  const remove = async () => {
    if (!initial || !confirm(`Delete “${initial.title}”?`)) return;
    await deleteTask(initial);
    onClose();
  };

  const dueChips: [string, string][] = [
    [today, 'Today'],
    [addDays(today, 1), 'Tomorrow'],
    ...(repeat ? [] : ([['', 'No date']] as [string, string][])),
  ];

  return (
    <Sheet title={initial ? 'Edit task' : 'New task'} onClose={onClose}>
      <label className="field">
        <span>Task</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Pay electricity bill" maxLength={100} autoFocus={!initial} />
      </label>

      <label className="field">
        <span>For</span>
        <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
          <option value="">Anyone</option>
          {people.members.length > 0 && (
            <optgroup label="Family">
              {people.members.map((m) => (
                <option key={m.id} value={`m:${m.id}`}>
                  {m.name}
                </option>
              ))}
            </optgroup>
          )}
          {people.helpers.length > 0 && (
            <optgroup label="Helpers">
              {people.helpers.map((h) => (
                <option key={h.id} value={`h:${h.id}`}>
                  {h.name} ({h.role})
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </label>

      <div className="field">
        <span>Due</span>
        <div className="chips">
          {dueChips.map(([value, label]) => (
            <button key={label} className={`chip ${due === value ? 'on present' : ''}`} onClick={() => setDue(value)}>
              {label}
            </button>
          ))}
          <input type="date" className="date-chip" value={due} onChange={(e) => setDue(e.target.value || (repeat ? today : ''))} aria-label="Pick a date" />
        </div>
      </div>

      <div className="field">
        <span>Repeats</span>
        <div className="chips segmented">
          {REPEATS.map((r) => (
            <button key={r ?? 'none'} className={`chip ${repeat === r ? 'on present' : ''}`} onClick={() => pickRepeat(r)}>
              {r ? REPEAT_LABEL[r] : 'Never'}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span>Note</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" maxLength={200} />
      </label>

      {initial?.createdBy && <p className="muted small">Added by {initial.createdBy}</p>}

      <button className="btn primary block" disabled={!title.trim()} onClick={save}>
        {initial ? 'Save' : 'Add task'}
      </button>
      {initial && (
        <button className="btn block ghost danger" onClick={remove}>
          Delete task
        </button>
      )}
    </Sheet>
  );
}
