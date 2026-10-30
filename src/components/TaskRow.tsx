import type { Task } from '../types';
import { toggleTask } from '../actions';
import { dayLabel, shortDate, todayKey } from '../lib/dates';
import { bucket, doneDay, REPEAT_LABEL } from '../lib/tasks';

const time = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

export default function TaskRow({ task, assignee, onEdit }: { task: Task; assignee?: string; onEdit: () => void }) {
  const b = bucket(task, todayKey());
  const meta: string[] = [];
  if (task.done) {
    const day = doneDay(task);
    const when = task.doneAt && day ? ` · ${day === todayKey() ? time(task.doneAt) : shortDate(day)}` : '';
    meta.push(`✓ ${task.doneBy || 'Done'}${when}`);
  } else if (task.due) {
    meta.push(b === 'overdue' ? `Overdue · ${shortDate(task.due)}` : dayLabel(task.due));
  }
  if (task.repeat) meta.push(`↻ ${REPEAT_LABEL[task.repeat]}`);
  meta.push(assignee ?? 'Anyone');

  return (
    <div className={`task${task.done ? ' done' : ''}${b === 'overdue' ? ' overdue' : ''}`}>
      <button className="check" role="checkbox" aria-checked={task.done} aria-label={`${task.done ? 'Reopen' : 'Done:'} ${task.title}`} onClick={() => toggleTask(task)}>
        {task.done ? '✓' : ''}
      </button>
      <button className="task-body" onClick={onEdit}>
        <span className="task-title">{task.title}</span>
        <small>{meta.join(' · ')}</small>
      </button>
    </div>
  );
}
