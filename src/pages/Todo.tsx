import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Session, Task } from '../types';
import { todayKey } from '../lib/dates';
import { usePeople } from '../lib/people';
import { bucket, compareTasks, type Bucket } from '../lib/tasks';
import SyncBadge from '../components/SyncBadge';
import TaskForm from '../components/TaskForm';
import TaskRow from '../components/TaskRow';

type Filter = 'open' | 'mine' | 'done';

const GROUPS: [Bucket, string][] = [
  ['overdue', 'Overdue'],
  ['today', 'Today'],
  ['upcoming', 'Upcoming'],
  ['someday', 'No date'],
];

const DONE_SHOWN = 50;

export default function Todo({ session }: { session: Session }) {
  const [filter, setFilter] = useState<Filter>('open');
  const [editing, setEditing] = useState<Task | 'new' | null>(null);
  const people = usePeople();
  const tasks = useLiveQuery(() => db.tasks.toArray(), []);
  if (!tasks) return null;

  const today = todayKey();
  const me = session.memberId ? `m:${session.memberId}` : undefined;
  const shown = tasks
    .filter((t) => (filter === 'done' ? t.done : !t.done && (filter === 'open' || (me && t.assignee === me))))
    .sort(compareTasks);

  const row = (t: Task) => <TaskRow key={t.id} task={t} assignee={people.label(t.assignee)} onEdit={() => setEditing(t)} />;
  const filters: [Filter, string][] = [
    ['open', 'All open'],
    ['mine', 'Mine'],
    ['done', 'Done'],
  ];

  return (
    <>
      <header className="page-head">
        <h1>To-do</h1>
        <SyncBadge />
      </header>
      <div className="chips segmented">
        {filters.map(([f, label]) => (
          <button key={f} className={`chip ${filter === f ? 'on present' : ''}`} onClick={() => setFilter(f)}>
            {label}
          </button>
        ))}
      </div>

      {shown.length === 0 && (
        <div className="card empty">
          <p className="muted">
            {filter === 'done' ? 'Nothing ticked off yet.' : filter === 'mine' ? 'Nothing assigned to you.' : 'All clear. Add bills, repairs, shopping — anything the house needs.'}
          </p>
        </div>
      )}

      {filter === 'done' ? (
        shown.length > 0 && <div className="card task-list">{shown.slice(0, DONE_SHOWN).map(row)}</div>
      ) : (
        GROUPS.map(([b, label]) => {
          const group = shown.filter((t) => bucket(t, today) === b);
          return (
            group.length > 0 && (
              <section key={b}>
                <h3 className={`group-head ${b}`}>
                  {label} <span className="muted">{group.length}</span>
                </h3>
                <div className="card task-list">{group.map(row)}</div>
              </section>
            )
          );
        })
      )}

      <button className="fab" aria-label="Add task" onClick={() => setEditing('new')}>
        +
      </button>
      {editing && <TaskForm initial={editing === 'new' ? undefined : editing} people={people} onClose={() => setEditing(null)} />}
    </>
  );
}
