import { useState } from 'react';
import type { Column } from '../../board/columns.ts';
import { useDismiss } from '../../hooks/useDismiss.ts';
import { rulesAreDefault } from '../../settings.ts';
import type { Settings } from '../../settings.ts';
import { SettingsPanel } from '../settings/SettingsPanel.tsx';
import type { RepositorySettings } from '../settings/SettingsPanel.tsx';
import { SETTINGS_BUTTON_ID } from '../common/ids.ts';
import { BUILD_DEFAULTS } from '../../config.ts';

export function RefreshControl({ token, setToken, refreshing, onRefresh, onAskToken, settings, onSettingsChange, columns, repositories, canResetWidths, onResetWidths, onOpenWizard }: {
  token: string;
  setToken: (value: string) => void;
  refreshing: boolean;
  onRefresh: (token: string) => void;
  // Refresh without a token asks for one (SET-13).
  onAskToken: () => void;
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
  // The columns the board offers, shown or hidden.
  columns: Column[];
  repositories: RepositorySettings;
  canResetWidths: boolean;
  onResetWidths: () => void;
  onOpenWizard: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, setOpen);
  const custom = !rulesAreDefault(settings.rules, BUILD_DEFAULTS.bots);

  return (
    <div className="menu-wrap refresh" ref={ref}>
      <div className="refresh-buttons">
        <button type="button" className="btn primary" disabled={refreshing}
          onClick={() => { if (token) onRefresh(token); else onAskToken(); }}>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
        <button type="button" id={SETTINGS_BUTTON_ID} className="btn icon" aria-label={custom ? 'Settings (custom attention rules)' : 'Settings'}
          title={custom ? 'Settings. Your attention rules differ from the team defaults.' : 'Settings'}
          aria-expanded={open} onClick={() => setOpen(!open)}>
          ⚙{custom ? <span className="dot" aria-hidden="true"></span> : null}
        </button>
      </div>
      {open ? (
        <SettingsPanel settings={settings} onChange={onSettingsChange} token={token} setToken={setToken} refreshing={refreshing}
          onRefresh={(value) => { setOpen(false); onRefresh(value); }} columns={columns} repositories={repositories} canResetWidths={canResetWidths} onResetWidths={onResetWidths}
          onOpenWizard={() => { setOpen(false); onOpenWizard(); }} />
      ) : null}
    </div>
  );
}
