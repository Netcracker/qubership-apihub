// DEV panel injected by dev/mock-plugin.ts: scenario switches. Never shipped to Pages.

interface ScenarioOption {
  id: string;
  label: string;
}

interface DevState {
  live: boolean;
  report: string;
  refresh: string;
  reportScenarios: ScenarioOption[];
  refreshScenarios: ScenarioOption[];
}

export {};

const COLLAPSED_KEY = 'apihub-pr-board.dev-panel-collapsed';

const style = document.createElement('style');
style.textContent = `
  #dev-panel { position: fixed; right: 12px; bottom: 12px; z-index: 100; width: 270px; font: 12px/1.4 var(--font-sans);
    background: var(--surface); color: var(--fg); border: 1px dashed var(--example-ink);
    border-radius: 8px; box-shadow: var(--shadow); }
  #dev-panel header { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; cursor: pointer;
    color: var(--example-ink); font-weight: 600; letter-spacing: .06em; }
  #dev-panel .body { display: grid; gap: 8px; padding: 0 10px 10px; }
  #dev-panel label { display: grid; gap: 3px; color: var(--muted); }
  #dev-panel select { font: inherit; padding: 4px 6px; border-radius: 4px; border: 1px solid var(--line-strong);
    background: var(--surface); color: var(--fg); }
  #dev-panel.collapsed .body { display: none; }
  #dev-panel .hint { color: var(--muted); }
`;
document.head.appendChild(style);

const panel = document.createElement('aside');
panel.id = 'dev-panel';
try { if (localStorage.getItem(COLLAPSED_KEY) === '1') panel.classList.add('collapsed'); } catch { /* ignore */ }
document.body.appendChild(panel);

const escapeHtml = (text: string) => text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

function select(id: string, label: string, options: ScenarioOption[], value: string): string {
  const items = options.map((o) => `<option value="${escapeHtml(o.id)}"${o.id === value ? ' selected' : ''}>${escapeHtml(o.label)}</option>`).join('');
  return `<label for="${id}">${escapeHtml(label)}<select id="${id}">${items}</select></label>`;
}

function render(state: DevState) {
  panel.innerHTML = `
    <header role="button" tabindex="0" aria-expanded="${!panel.classList.contains('collapsed')}"><span>DEV · ${state.live ? 'live GitHub data' : 'mock data'}</span><span>${panel.classList.contains('collapsed') ? '▲' : '▼'}</span></header>
    <div class="body">
      ${state.live
        ? '<div class="hint">Scenarios are off. Restart without --mode live to use mocks.</div>'
        : select('dev-report', 'prs.json on page load', state.reportScenarios, state.report)
          + select('dev-refresh', 'Live loads (GraphQL)', state.refreshScenarios, state.refresh)
          + '<div class="hint">Refresh accepts any token in mock mode.</div>'}
    </div>`;
  const header = panel.querySelector('header')!;
  header.onclick = () => {
    panel.classList.toggle('collapsed');
    try { localStorage.setItem(COLLAPSED_KEY, panel.classList.contains('collapsed') ? '1' : '0'); } catch { /* ignore */ }
    render(state);
    panel.querySelector('header')!.focus();
  };
  header.onkeydown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); header.click(); }
  };
  const report = panel.querySelector<HTMLSelectElement>('#dev-report');
  const refresh = panel.querySelector<HTMLSelectElement>('#dev-refresh');
  if (report) report.onchange = () => update({ report: report.value }, true);
  if (refresh) refresh.onchange = () => update({ refresh: refresh.value }, false);
}

// A dev server that went away says so in the console instead of failing silently.
const failed = (error: Error) => console.error('DEV panel: ' + error.message);

function update(change: Pick<DevState, 'report'> | Pick<DevState, 'refresh'>, reload: boolean) {
  fetch('/__dev/state', { method: 'POST', body: JSON.stringify(change) })
    .then((r) => r.json() as Promise<DevState>)
    .then((state) => (reload ? window.location.reload() : render(state)))
    .catch(failed);
}

fetch('/__dev/state').then((r) => r.json() as Promise<DevState>).then(render).catch(failed);
