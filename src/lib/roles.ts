import type { HelperKind } from '../types';

export interface RolePreset {
  role: string;
  emoji: string;
  kind: HelperKind;
  unit?: string;
  defaultQty?: number;
}

export const ROLES: RolePreset[] = [
  { role: 'Maid', emoji: '🧹', kind: 'salaried' },
  { role: 'Cook', emoji: '🍳', kind: 'salaried' },
  { role: 'Driver', emoji: '🚗', kind: 'salaried' },
  { role: 'Nanny', emoji: '🧸', kind: 'salaried' },
  { role: 'Gardener', emoji: '🪴', kind: 'salaried' },
  { role: 'Car wash', emoji: '🚿', kind: 'salaried' },
  { role: 'Milk', emoji: '🥛', kind: 'unit', unit: 'L', defaultQty: 1 },
  { role: 'Newspaper', emoji: '📰', kind: 'unit', unit: 'copy', defaultQty: 1 },
  { role: 'Ironing', emoji: '👕', kind: 'unit', unit: 'pc', defaultQty: 0 },
  { role: 'Other', emoji: '👤', kind: 'salaried' },
];

export const roleEmoji = (role: string) => ROLES.find((r) => r.role === role)?.emoji ?? '👤';
