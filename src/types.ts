/** Salaried = fixed monthly pay with leaves (maid, cook). Unit = billed per quantity (milk, newspaper). */
export type HelperKind = 'salaried' | 'unit';

export interface Helper {
  id: string;
  name: string;
  role: string;
  kind: HelperKind;
  phone?: string;
  /** Days of the week they come, 0 = Sunday. */
  workDays: number[];
  /** Salaried only. */
  salary: number;
  paidLeaves: number;
  /** Unit only: e.g. 'L', rate per unit, usual quantity per work day. */
  unit: string;
  unitRate: number;
  defaultQty: number;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
  deleted?: boolean;
}

/** An explicit mark for one helper on one day. No entry = the default (present on work days, usual quantity). */
export type DayStatus = 'present' | 'absent' | 'half' | 'extra';

export interface Entry {
  /** `${helperId}:${date}` */
  id: string;
  helperId: string;
  date: string;
  status?: DayStatus;
  qty?: number;
  note?: string;
  by?: string;
  updatedAt?: string;
  deleted?: boolean;
}

/** Salary and advances count against what was earned in `month`; a bonus is extra on top. */
export type PaymentType = 'salary' | 'advance' | 'bonus';

export interface Payment {
  id: string;
  helperId: string;
  /** 'YYYY-MM' the payment is for, not necessarily when it was paid. */
  month: string;
  type: PaymentType;
  amount: number;
  date: string;
  note?: string;
  by?: string;
  createdAt: string;
  updatedAt?: string;
  deleted?: boolean;
}

/** Someone who joined the household (one per person; a second device with the same name reuses it). */
export interface Member {
  id: string;
  name: string;
  joinedAt: string;
  updatedAt?: string;
  deleted?: boolean;
}

export type Repeat = 'daily' | 'weekly' | 'monthly';

export interface Task {
  id: string;
  title: string;
  note?: string;
  /** 'm:<memberId>' or 'h:<helperId>'; unset = anyone. */
  assignee?: string;
  /** 'YYYY-MM-DD'; unset = no date. Repeating tasks always have one. */
  due?: string;
  repeat?: Repeat;
  /** Monthly repeats: day of month to come back to (31 → 30 Nov → 31 Dec). */
  anchorDay?: number;
  /** Shared by every occurrence of a repeating task. */
  seriesId?: string;
  /** Occurrence created when this one was ticked; removed again if it's unticked. */
  nextId?: string;
  done: boolean;
  doneBy?: string;
  doneAt?: string;
  createdBy?: string;
  createdAt: string;
  by?: string;
  updatedAt?: string;
  deleted?: boolean;
}

export interface Session {
  code: string;
  household: string;
  member: string;
  /** Missing on sessions created before members existed; filled in on next launch. */
  memberId?: string;
}
