import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Helper, Member } from '../types';
import { roleEmoji } from './roles';

export interface People {
  members: Member[];
  helpers: Helper[];
  /** Display name for a task assignee ('m:<id>' / 'h:<id>'), undefined for anyone. */
  label: (assignee?: string) => string | undefined;
}

/** Members and active helpers, for assigning tasks and showing who they're for. */
export function usePeople(): People {
  const members = useLiveQuery(() => db.members.toArray(), []) ?? [];
  const helpers = useLiveQuery(() => db.helpers.toArray(), []) ?? [];
  const sortedMembers = [...members].sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
  return {
    members: sortedMembers,
    helpers: helpers.filter((h) => h.active).sort((a, b) => a.name.localeCompare(b.name)),
    label: (assignee) => {
      if (!assignee) return undefined;
      const id = assignee.slice(2);
      if (assignee.startsWith('m:')) return members.find((m) => m.id === id)?.name ?? 'Former member';
      const h = helpers.find((x) => x.id === id);
      return h ? `${roleEmoji(h.role)} ${h.name}` : 'Former helper';
    },
  };
}
