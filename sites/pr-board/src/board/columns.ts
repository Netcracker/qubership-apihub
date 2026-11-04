// The table columns, their default widths, and how spare width is shared out.

import type { SortKey } from './view.ts';

export const MIN_COLUMN_PX = 56;
export const RESIZE_STEP_PX = 16;

export interface Column {
  id: string;
  sort: SortKey | null;
  label: string;
  cls: string;
  width: number;
  hint?: string;
  // Always shown: a row makes no sense without it.
  required?: boolean;
  // Shown only when the data covers more than one repository.
  severalRepos?: boolean;
}

export type Widths = Record<string, number>;

export const COLUMNS: Column[] = [
  { id: 'repo', sort: 'repo', label: 'Repository', cls: 'c-repo', width: 130, severalRepos: true },
  { id: 'number', sort: 'number', label: '#', cls: 'c-num', width: 72, required: true },
  { id: 'title', sort: 'title', label: 'Pull request', cls: 'c-title', width: 340, required: true },
  { id: 'issue', sort: null, label: 'Issue', cls: 'c-issue', width: 190 },
  { id: 'author', sort: 'author', label: 'Author', cls: 'c-person', width: 170 },
  { id: 'ci', sort: 'ci', label: 'CI', cls: 'c-state', width: 60 },
  { id: 'review', sort: 'review', label: 'Review', cls: 'c-state', width: 96 },
  { id: 'merge', sort: 'merge', label: 'Conflicts', cls: 'c-state', width: 96 },
  { id: 'age', sort: 'age', label: 'Age · activity', cls: 'c-age', width: 132 },
  { id: 'assignee', sort: null, label: 'Assignee', cls: 'c-person', width: 170 },
  { id: 'comment', sort: null, label: 'Last comment', cls: 'c-comment', width: 270 },
  { id: 'attention', sort: 'attention', label: 'Attention', cls: 'c-attn', width: 104, hint: 'Click an icon to see why the PR needs attention' },
];
export const DEFAULT_WIDTHS: Widths = Object.fromEntries(COLUMNS.map((c) => [c.id, c.width]));
// The Review column as a list of reviewers (TABLE-30) starts wide enough for an avatar, a login, and an icon.
const REVIEWERS_LIST_PX = 180;
export const REVIEWERS_LIST_WIDTHS: Widths = { ...DEFAULT_WIDTHS, review: REVIEWERS_LIST_PX };

// Columns that absorb spare width so the table always fills the window.
export const FLEX_COLUMNS = ['title', 'comment'];

const DEFAULT_ORDER = COLUMNS.map((column) => column.id);
const isColumnId = (id: string) => DEFAULT_ORDER.includes(id);

// Every column id once: the known ones of the order given, then the rest in the default order (SET-24). An id from a
// newer version is dropped, and a column added later goes where it is by default.
export function completeOrder(order: string[]): string[] {
  const known = [...new Set(order.filter(isColumnId))];
  return [...known, ...DEFAULT_ORDER.filter((id) => !known.includes(id))];
}

// What to keep for an order: nothing when it is the default one.
export function orderToKeep(order: string[]): string[] {
  const full = completeOrder(order);
  return full.join(',') === DEFAULT_ORDER.join(',') ? [] : full;
}

// Moves a column one place up or down among the columns offered now, so a hidden Repository column never takes a
// step of its own.
export function moveColumn(order: string[], id: string, step: -1 | 1, offered: string[]): string[] {
  const full = completeOrder(order);
  const visible = full.filter((columnId) => offered.includes(columnId));
  const neighbor = visible[visible.indexOf(id) + step];
  if (!neighbor || !visible.includes(id)) return full;
  const a = full.indexOf(id);
  const b = full.indexOf(neighbor);
  [full[a], full[b]] = [full[b], full[a]];
  return full;
}

// The columns the board offers for data from this many repositories, in the viewer's order, before any is hidden.
export function boardColumns(repoCount: number, order: string[] = []): Column[] {
  return completeOrder(order).map((id) => COLUMNS.find((column) => column.id === id)!)
    .filter((column) => !column.severalRepos || repoCount > 1);
}

export function isColumnShown(column: Column, hiddenColumns: string[]): boolean {
  return !!column.required || !hiddenColumns.includes(column.id);
}

// Widen flexible columns until the table fills the available width. The column being resized is left alone so it
// follows the pointer, and saved widths stay as the user set them. Pull request is always shown, so the last visible
// column takes the spare width only while Pull request is being resized and Last comment is hidden; the last column
// is never Pull request, so the one being resized still stays as dragged.
export function fitToWidth(base: Widths, available: number, resizingId: string | null, columns: Column[]): Widths {
  const total = columns.reduce((sum, c) => sum + base[c.id], 0);
  if (!available || total >= available) return base;
  let flex = FLEX_COLUMNS.filter((id) => id !== resizingId && columns.some((c) => c.id === id));
  if (!flex.length) flex = [columns[columns.length - 1].id];
  const extra = available - total;
  const share = Math.floor(extra / flex.length);
  const fitted = { ...base };
  flex.forEach((id, i) => { fitted[id] += share + (i === 0 ? extra - share * flex.length : 0); });
  return fitted;
}

export interface ResizeHandlers {
  onResize: (id: string, width: number) => void;
  onCommit: (id: string, width: number) => void;
  onReset: (id: string) => void;
}
