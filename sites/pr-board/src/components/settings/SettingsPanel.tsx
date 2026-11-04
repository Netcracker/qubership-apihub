import { useEffect, useRef, useState } from 'react';
import { isColumnShown, moveColumn, orderToKeep } from '../../board/columns.ts';
import { moveReviewerGroup, REVIEWER_GROUPS } from '../../board/reviewers.ts';
import type { Column } from '../../board/columns.ts';
import { FilterSettings } from './FilterSettings.tsx';
import { groupsToText, parseGroupLines } from '../../board/groups.ts';
import { parseList } from '../../names.ts';
import { checkRepositoryList } from '../../repository.ts';
import type { Rules } from '../../model/rules.ts';
import {
  DEFAULT_SETTINGS, DENSITIES, LABEL_CHOICES, REFRESH_INTERVALS, REVIEW_COLUMNS, isValidStaleDays, MAX_STALE_DAYS, MIN_STALE_DAYS, THEMES,
} from '../../settings.ts';
import type { Settings } from '../../settings.ts';
import { TOKEN_HELP_URL } from '../common/ids.ts';
import { BUILD_DEFAULTS } from '../../config.ts';

// The repositories in the address, the ones the data has, and how to change the address.
export interface RepositorySettings {
  requested: string[];
  available: string[];
  onChange: (repos: string[]) => void;
}

export function SettingsPanel({ settings, onChange, token, setToken, refreshing, onRefresh, columns, repositories, canResetWidths, onResetWidths, onOpenWizard }: {
  settings: Settings;
  onChange: (settings: Settings) => void;
  token: string;
  setToken: (value: string) => void;
  refreshing: boolean;
  onRefresh: (token: string) => void;
  columns: Column[];
  repositories: RepositorySettings;
  canResetWidths: boolean;
  onResetWidths: () => void;
  // Opens the setup wizard, which shows these choices with pictures (SET-21).
  onOpenWizard: () => void;
}) {
  const { rules } = settings;
  const [staleDraft, setStaleDraft] = useState(String(rules.staleDays));
  const [botsDraft, setBotsDraft] = useState(rules.extraBots.join(', '));
  const [tokenDraft, setTokenDraft] = useState('');
  const [reposDraft, setReposDraft] = useState(repositories.requested.join(', '));
  const [reposError, setReposError] = useState<string | null>(null);
  const [groupsDraft, setGroupsDraft] = useState(groupsToText(settings.repoGroups));
  const [groupsError, setGroupsError] = useState<string | null>(null);
  useEffect(() => setStaleDraft(String(rules.staleDays)), [rules.staleDays]);
  useEffect(() => setBotsDraft(rules.extraBots.join(', ')), [rules.extraBots]);
  useEffect(() => setReposDraft(repositories.requested.join(', ')), [repositories.requested]);
  useEffect(() => setGroupsDraft(groupsToText(settings.repoGroups)), [settings.repoGroups]);

  const setRules = (changes: Partial<Rules>) => onChange({ ...settings, rules: { ...rules, ...changes } });
  // The settings the list fields would give, or null while a field holds a mistake; unchanged fields keep their value.
  const fromDrafts = (): Settings | null => {
    const groups = parseGroupLines(groupsDraft);
    if ('error' in groups) return null;
    const bots = parseList(botsDraft);
    const same = (a: string[], b: string[]) => a.join(',') === b.join(',');
    return {
      ...settings,
      rules: {
        ...rules,
        extraBots: same(bots, rules.extraBots) ? rules.extraBots : bots,
      },
      repoGroups: groupsToText(groups.groups) === groupsToText(settings.repoGroups) ? settings.repoGroups : groups.groups,
    };
  };
  const changed = (next: Settings) => next.rules.extraBots !== rules.extraBots
    || next.repoGroups !== settings.repoGroups;
  // Escape or a click outside closes the panel before a field loses focus, so what was typed applies on the way out.
  const flush = useRef(() => {});
  flush.current = () => {
    const next = fromDrafts();
    if (next && changed(next)) onChange(next);
    const repos = checkRepositoryList(reposDraft);
    if ('repos' in repos && repos.repos.join(',').toLowerCase() !== repositories.requested.join(',').toLowerCase()) {
      repositories.onChange(repos.repos);
    }
  };
  useEffect(() => () => flush.current(), []);
  const changeStale = (text: string) => {
    setStaleDraft(text);
    const days = Number(text);
    if (isValidStaleDays(days)) setRules({ staleDays: days });
  };
  // An invalid list stays in the field with the reason and changes nothing.
  const commitRepos = () => {
    const result = checkRepositoryList(reposDraft);
    if ('error' in result) {
      setReposError(result.error);
      return;
    }
    setReposError(null);
    setReposDraft(result.repos.join(', '));
    // Applying the same list again would rebuild the whole board for nothing.
    if (result.repos.join(',').toLowerCase() !== repositories.requested.join(',').toLowerCase()) repositories.onChange(result.repos);
  };
  // Groups span lines, so Enter adds a line; they apply on blur or Ctrl+Enter, and a wrong line changes nothing.
  const commitGroups = () => {
    const result = parseGroupLines(groupsDraft);
    if ('error' in result) {
      setGroupsError(result.error);
      return;
    }
    setGroupsError(null);
    if (groupsToText(result.groups) !== groupsToText(settings.repoGroups)) onChange({ ...settings, repoGroups: result.groups });
  };
  const resetAll = () => {
    onChange({ ...DEFAULT_SETTINGS, repoGroups: BUILD_DEFAULTS.groups,
      rules: { ...DEFAULT_SETTINGS.rules, extraBots: BUILD_DEFAULTS.bots } });
    repositories.onChange([]);
    setReposError(null);
    setGroupsError(null);
  };
  // Lists apply on blur or Enter, and only when they changed, so a blur alone does not rebuild the board.
  const commitBots = () => {
    const bots = parseList(botsDraft);
    if (bots.join(',') !== rules.extraBots.join(',')) setRules({ extraBots: bots });
  };
  // The order covers every column, including Repository while one repository hides it (SET-24).
  const moveTo = (id: string, step: -1 | 1) => onChange({
    ...settings,
    columnOrder: orderToKeep(moveColumn(settings.columnOrder, id, step, columns.map((col) => col.id))),
  });
  const toggleColumn = (id: string) => onChange({
    ...settings,
    hiddenColumns: settings.hiddenColumns.includes(id) ? settings.hiddenColumns.filter((c) => c !== id) : settings.hiddenColumns.concat(id),
  });
  const saveToken = () => {
    const value = tokenDraft.trim();
    if (!value || refreshing) return;
    setToken(value);
    setTokenDraft('');
    onRefresh(value);
  };

  return (
    <div className="menu settings-panel" role="dialog" aria-label="Settings">
      <section>
        <h2>Repositories</h2>
        <p className="hint">As <code>owner/name</code>, separated by commas or spaces. Empty shows every repository of the data.</p>
        <label className="sr-only" htmlFor="repos-input">Repositories</label>
        <textarea id="repos-input" className="text-field" rows={2} value={reposDraft} autoComplete="off"
          placeholder={repositories.available.join(', ')} aria-invalid={!!reposError}
          aria-describedby={reposError ? 'repos-error' : undefined}
          onChange={(e) => setReposDraft(e.target.value)} onBlur={commitRepos}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitRepos(); } }} />
        {reposError ? <p id="repos-error" className="field-error" role="alert">{reposError}</p> : null}
        <label className="stacked-field" htmlFor="groups-input">Repository groups</label>
        <p className="hint">One per line: <code>Name: owner/name, owner/name</code>. A leading <code>*</code> checks the group when the board opens. They fill the Repositories menu on the board, stay in this browser, and travel in the page address.</p>
        <textarea id="groups-input" className="text-field" rows={3} value={groupsDraft} autoComplete="off"
          placeholder="Backend: acme/widgets, acme/gadgets" aria-invalid={!!groupsError}
          aria-describedby={groupsError ? 'groups-error' : undefined}
          onChange={(e) => setGroupsDraft(e.target.value)} onBlur={commitGroups}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) commitGroups(); }} />
        {groupsError ? <p id="groups-error" className="field-error" role="alert">{groupsError}</p> : null}
      </section>
      <section>
        <h2>Attention rules</h2>
        <label className="inline-field">
          Stale after
          <input type="number" min={MIN_STALE_DAYS} max={MAX_STALE_DAYS} step={1} value={staleDraft}
            onChange={(e) => changeStale(e.target.value)} onBlur={() => setStaleDraft(String(rules.staleDays))} />
          days
        </label>
        <label>
          <input type="checkbox" checked={rules.checkTitle} onChange={() => setRules({ checkTitle: !rules.checkTitle })} />
          Title follows Conventional Commits
        </label>
        <label>
          <input type="checkbox" checked={rules.requireIssue} onChange={() => setRules({ requireIssue: !rules.requireIssue })} />
          Linked issue or GitHub Project
        </label>
        <label className="stacked-field" htmlFor="extra-bots">Extra bot logins</label>
        <input id="extra-bots" className="text-field" value={botsDraft} placeholder="login, login" autoComplete="off"
          onChange={(e) => setBotsDraft(e.target.value)} onBlur={commitBots}
          onKeyDown={(e) => { if (e.key === 'Enter') commitBots(); }} />
      </section>
      <FilterSettings criteria={rules.areaCriteria} onChange={(areaCriteria) => setRules({ areaCriteria })} />
      <section>
        <div className="section-head">
          <h2>View</h2>
          <button type="button" className="btn ghost" onClick={onOpenWizard}>Setup wizard</button>
        </div>
        <div className="setting-row">
          <span>Theme</span>
          <div className="segmented" role="group" aria-label="Theme">
            {THEMES.map(([value, label]) => (
              <button key={value} type="button" aria-pressed={settings.theme === value} onClick={() => onChange({ ...settings, theme: value })}>{label}</button>
            ))}
          </div>
        </div>
        <div className="setting-row">
          <span>Density</span>
          <div className="segmented" role="group" aria-label="Density">
            {DENSITIES.map(([value, label]) => (
              <button key={value} type="button" aria-pressed={settings.density === value} onClick={() => onChange({ ...settings, density: value })}>{label}</button>
            ))}
          </div>
        </div>
        <div className="setting-row">
          <span>Labels</span>
          <div className="segmented" role="group" aria-label="Labels">
            {LABEL_CHOICES.map(([value, label]) => (
              <button key={label} type="button" aria-pressed={settings.showLabels === value} onClick={() => onChange({ ...settings, showLabels: value })}>{label}</button>
            ))}
          </div>
        </div>
        <div className="setting-row">
          <span>Review column</span>
          <div className="segmented" role="group" aria-label="Review column">
            {REVIEW_COLUMNS.map(([value, label]) => (
              <button key={value} type="button" aria-pressed={settings.reviewColumn === value} onClick={() => onChange({ ...settings, reviewColumn: value })}>{label}</button>
            ))}
          </div>
        </div>
        <span className="stacked-field" id="reviewer-order-label">Reviewers order</span>
        <p className="hint">When the Review column lists reviewers, these groups come in this order. Move them with the arrows.</p>
        <ol className="column-options" aria-labelledby="reviewer-order-label">
          {settings.reviewerOrder.map((group, index) => {
            const label = REVIEWER_GROUPS.find(([id]) => id === group)![1];
            return (
              <li key={group}>
                <span className="order-label">{label}</span>
                <button type="button" className="btn icon-only" aria-label={'Move ' + label + ' up'} disabled={index === 0}
                  onClick={() => onChange({ ...settings, reviewerOrder: moveReviewerGroup(settings.reviewerOrder, group, -1) })}>↑</button>
                <button type="button" className="btn icon-only" aria-label={'Move ' + label + ' down'} disabled={index === settings.reviewerOrder.length - 1}
                  onClick={() => onChange({ ...settings, reviewerOrder: moveReviewerGroup(settings.reviewerOrder, group, 1) })}>↓</button>
              </li>
            );
          })}
        </ol>
      </section>
      <section>
        <h2>Columns</h2>
        <p className="hint">Check the columns to show, and move them with the arrows. The order stays in this browser.</p>
        <ul className="column-options">
          {columns.map((col, index) => (
            <li key={col.id}>
              <label title={col.required ? 'This column is always shown' : undefined}>
                <input type="checkbox" checked={isColumnShown(col, settings.hiddenColumns)} disabled={col.required}
                  onChange={() => toggleColumn(col.id)} />
                {col.label}
              </label>
              <button type="button" className="btn icon-only" aria-label={'Move ' + col.label + ' up'} disabled={index === 0}
                onClick={() => moveTo(col.id, -1)}>↑</button>
              <button type="button" className="btn icon-only" aria-label={'Move ' + col.label + ' down'} disabled={index === columns.length - 1}
                onClick={() => moveTo(col.id, 1)}>↓</button>
            </li>
          ))}
        </ul>
        <button type="button" className="btn" disabled={!canResetWidths} onClick={onResetWidths}>Reset column widths</button>
      </section>
      <section>
        <h2>GitHub token</h2>
        <div className="setting-row">
          <span>Load live data again</span>
          <div className="segmented" role="group" aria-label="Load live data again">
            {REFRESH_INTERVALS.map(([value, label]) => (
              <button key={value} type="button" aria-pressed={settings.refreshMinutes === value}
                onClick={() => onChange({ ...settings, refreshMinutes: value })}>{label}</button>
            ))}
          </div>
        </div>
        {/* No <form>: browsers then offer to save the token as a password and sync it outside this browser (SEC-1). */}
        <div className="token-form">
          <p>Refresh queries GitHub directly with your personal token. It stays in this browser and is sent only to api.github.com.</p>
          <p><a href={TOKEN_HELP_URL} target="_blank" rel="noopener">Create a fine-grained token</a> with public repository read access. No extra permissions are needed.</p>
          <label htmlFor="token-input">Token</label>
          <input id="token-input" type="password" autoComplete="off"
            placeholder={token ? 'Saved. Paste a new one to replace it' : 'github_pat_…'}
            value={tokenDraft} onChange={(e) => setTokenDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') saveToken(); }} />
          <div className="actions">
            <button type="button" className="btn primary" disabled={!tokenDraft.trim() || refreshing} onClick={saveToken}>Save and refresh</button>
            {token ? <button type="button" className="btn" onClick={() => setToken('')}>Forget token</button> : null}
          </div>
        </div>
      </section>
      <div className="settings-foot">
        <span className="muted">Saved in this browser. The page address carries repository choices, author filters, and customized detection criteria.</span>
        <button type="button" className="btn" onClick={resetAll}>Reset to defaults</button>
      </div>
    </div>
  );
}
