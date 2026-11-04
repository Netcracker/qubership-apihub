// The token and the column widths in this browser's localStorage. Storage can be blocked, so every access is guarded.

import { DEFAULT_WIDTHS, MIN_COLUMN_PX } from './columns.ts';
import type { Widths } from './columns.ts';

const TOKEN_KEY = 'apihub-pr-board.token';
const COLUMNS_KEY = 'apihub-pr-board.columns';

export function readToken(): string {
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
}
export function storeToken(token: string) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token); else localStorage.removeItem(TOKEN_KEY);
  } catch { /* storage is blocked; the token lives only for this page load */ }
}

// The setup wizard (SET-21) opens by itself until it has been closed once in this browser.
// Blocked storage counts as done, so the wizard never opens on every visit; a refused write counts until a reload.
const WIZARD_KEY = 'apihub-pr-board.wizard';
let wizardDoneHere = false;
export function readWizardDone(): boolean {
  if (wizardDoneHere) return true;
  try { return localStorage.getItem(WIZARD_KEY) === 'done'; } catch { return true; }
}
export function storeWizardDone() {
  try { localStorage.setItem(WIZARD_KEY, 'done'); } catch { wizardDoneHere = true; }
}

// Column widths are kept in this browser under their own key, apart from the other settings.
export function readColumnWidths(): Widths {
  try {
    const saved: Record<string, unknown> = JSON.parse(localStorage.getItem(COLUMNS_KEY) || '{}');
    return Object.fromEntries(Object.entries(saved).filter((pair): pair is [string, number] => {
      const [id, w] = pair;
      return Object.hasOwn(DEFAULT_WIDTHS, id) && typeof w === 'number' && Number.isFinite(w) && w >= MIN_COLUMN_PX;
    }));
  } catch {
    return {};
  }
}
export function writeColumnWidths(widths: Widths) {
  try {
    if (Object.keys(widths).length) localStorage.setItem(COLUMNS_KEY, JSON.stringify(widths)); else localStorage.removeItem(COLUMNS_KEY);
  } catch { /* storage is blocked; widths live only for this page load */ }
}
