import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Task } from '../types';
import { addDays, dayLabel, todayKey } from '../lib/dates';
import { dayInfo } from '../lib/pay';
import { usePeople } from '../lib/people';
import { roleEmoji } from '../lib/roles';
import { compareTasks, onHome } from '../lib/tasks';
import { go } from '../nav';
import DayControl from '../components/DayControl';
import SyncBadge from '../components/SyncBadge';
import TaskForm from '../components/TaskForm';
import TaskRow from '../components/TaskRow';

/** Today at a glance: helpers' attendance, then tasks due today or overdue. */
export default function Home() {
  const today = todayKey();
  const [date, setDate] = useState(today);
  const [editing, setEditing] = useState<Task | 'new' | null>(null);
  const people = usePeople();
  const helpers = useLiveQuery(() => db.helpers.toArray(), []);
  const entries = useLiveQuery(() => db.entries.where('date').equals(date).toArray(), [date]) ?? [];
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? [];
  if (!helpers) return null;

  const active = helpers.filter((h) => h.active).sort((a, b) => a.name.localeCompare(b.name));
  const byHelper = new Map(entries.map((e) => [e.helperId, e]));
  const due = tasks.filter((t) => onHome(t, today)).sort(compareTasks);
  const open = due.filter((t) => !t.done).length;

  return (
    <>
      <header className="page-head">
        <div className="month-picker">
          <button className="icon-btn" aria-label="Previous day" onClick={() => setDate(addDays(date, -1))}>
            ‹
          </button>
          <span>{dayLabel(date)}</span>
          <button className="icon-btn" aria-label="Next day" disabled={date >= addDays(today, 60)} onClick={() => setDate(addDays(date, 1))}>
            ›
          </button>
        </div>
        <SyncBadge />
      </header>
      {date !== today && (
        <button className="link center" onClick={() => setDate(today)}>
          Back to today
        </button>
      )}

      <div className="section-head">
        <h2>Helpers</h2>
        {active.length > 0 && <small className="muted">Present unless marked</small>}
      </div>
      {active.length === 0 ? (
        <div className="card empty">
          <p className="muted">Add your maid, cook, milkman… to mark leaves and half days here in one tap.</p>
          <button className="btn" onClick={() => go('settings/add-helper')}>
            Add helper
          </button>
        </div>
      ) : (
        active.map((h) => {
          const info = dayInfo(h, date, byHelper.get(h.id));
          return (
            <div className={`card helper-card s-${info.state}`} key={h.id}>
              <button className="helper-name" onClick={() => go(`helper/${h.id}`)}>
                <span className="avatar">{roleEmoji(h.role)}</span>
                <span>
                  <b>{h.name}</b>
                  <small>
                    {h.role}
                    {info.entry?.by ? ` · marked by ${info.entry.by}` : ''}
                  </small>
                </span>
                <span className="chev">›</span>
              </button>
              <DayControl helper={h} info={info} />
              {info.entry?.note && <p className="muted small note">“{info.entry.note}”</p>}
            </div>
          );
        })
      )}

      {date === today && (
        <>
          <div className="section-head">
            <h2>To do{open ? ` (${open})` : ''}</h2>
            <button className="link" onClick={() => go('todo')}>
              See all ›
            </button>
          </div>
          <div className="card task-list">
            {due.length === 0 && <p className="muted small empty-line">Nothing due today or overdue.</p>}
            {due.map((t) => (
              <TaskRow key={t.id} task={t} assignee={people.label(t.assignee)} onEdit={() => setEditing(t)} />
            ))}
            <button className="link add-task" onClick={() => setEditing('new')}>
              + Add task
            </button>
          </div>
        </>
      )}

      {editing && <TaskForm initial={editing === 'new' ? undefined : editing} people={people} onClose={() => setEditing(null)} />}
    </>
  );
}
