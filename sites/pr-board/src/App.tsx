import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collectAuthors, selectedAuthors } from './board/authors.ts';
import { boardColumns, isColumnShown, REVIEWERS_LIST_WIDTHS } from './board/columns.ts';
import { HEADER_REPOSITORIES, MINUTE_MS, repositoriesSummary } from './board/format.ts';
import { groupCounts, groupFilter, groupsSelection, repositoryColors } from './board/groups.ts';
import { linkSettingsQuery } from './board/link.ts';
import { emptyTableKind, loadTargets, missingReposMessage, planRepositories } from './board/repositories.ts';
import { readToken, readWizardDone, storeToken, storeWizardDone } from './board/storage.ts';
import {
  AREA_OPTIONS, collectPriorities, countWithoutPriority, DEFAULT_VIEW, DRAFT_OPTIONS, filterPullRequests, firstDirection, readView,
  viewQuery, visibleRows, writeView,
} from './board/view.ts';
import type { SortKey, View } from './board/view.ts';
import { RefreshControl } from './components/header/RefreshControl.tsx';
import { LoadAnnouncer } from './components/common/LoadAnnouncer.tsx';
import { LoadStatus } from './components/common/LoadStatus.tsx';
import { ViewerBadge } from './components/header/ViewerBadge.tsx';
import { SetupWizard } from './components/settings/SetupWizard.tsx';
import { TokenDialog } from './components/settings/TokenDialog.tsx';
import { WizardInvite } from './components/settings/WizardInvite.tsx';
import { Tiles } from './components/header/Tiles.tsx';
import { UpdateInfo } from './components/header/UpdateInfo.tsx';
import { LegendBar } from './components/legend/LegendBar.tsx';
import { HeaderCell } from './components/table/HeaderCell.tsx';
import { Row } from './components/table/Row.tsx';
import { TableMessage } from './components/table/TableMessage.tsx';
import { AuthorMenu } from './components/toolbar/AuthorMenu.tsx';
import { PriorityMenu } from './components/toolbar/PriorityMenu.tsx';
import { RepositoriesMenu } from './components/toolbar/RepositoriesMenu.tsx';
import { CopyLink } from './components/toolbar/CopyLink.tsx';
import { SearchHelp } from './components/toolbar/SearchHelp.tsx';
import { BUILD_DEFAULTS, REPOSITORIES } from './config.ts';
import { ApiContext, NotesContext, RulesContext, ReviewViewContext } from './context.ts';
import { REST_URL } from './github/rest.ts';
import { useAutoRefresh } from './hooks/useAutoRefresh.ts';
import { useBoardSettings } from './hooks/useBoardSettings.ts';
import { useClock } from './hooks/useClock.ts';
import { useColumnWidths } from './hooks/useColumnWidths.ts';
import { useLiveLoad } from './hooks/useLiveLoad.ts';
import { useNotes } from './hooks/useNotes.ts';
import { useNoteText } from './hooks/useNoteText.ts';
import { useReportData } from './hooks/useReportData.ts';
import { useTheme } from './hooks/useTheme.ts';
import { derive } from './model/derive.ts';
import { pullRequestKey } from './model/report.ts';
import { activeLabelFilters, parseQuery, toggleLabelFilter } from './model/search.ts';
import { parseRepository, repositoryName } from './repository.ts';

// The dev server's mocks (DEV); a production build drops the branch, so the token only ever goes to GitHub (SEC-1).
const DEV = import.meta.env.DEV ? window.PR_BOARD_DEV || null : null;
const BUILD_REPOS = REPOSITORIES.map(repositoryName);

// Each set of repositories and token loads once by itself (DATA-23).
const loadKey = (names: string[], token: string) => names.join(',').toLowerCase() + '|' + token;

export function App() {
  const { data, showLive } = useReportData();
  const report = data.report;
  const [view, setView] = useState(readView);
  const [token, setTokenState] = useState(readToken);
  const [reportToken, setReportToken] = useState('');
  const { start, refreshing, load, error: refreshError, lastAttempt } = useLiveLoad();
  const { now, tick } = useClock();
  const { settings, setSettings, link, setRepos } = useBoardSettings();
  const notesApi = useNotes();
  useTheme(settings.theme, settings.density);

  useEffect(() => writeView(view, linkSettingsQuery(link, BUILD_DEFAULTS.groups, BUILD_DEFAULTS.bots)), [view, link]);

  const rules = settings.rules;
  const groups = settings.repoGroups;
  const notLoaded = data.status === 'none';
  const dataRepos = useMemo(() => (report ? report.repos : BUILD_REPOS), [report]);
  const plan = useMemo(() => planRepositories({ dataRepos, linkRepos: link.repos, groups, viewGroups: view.groups, notLoaded }),
    [dataRepos, link.repos, groups, view.groups, notLoaded]);
  const { shown: repos, groupNames, checked, wanted, pending } = plan;
  const targets = useMemo(() => loadTargets(plan, report ? report.repos : [], BUILD_REPOS), [plan, report]);
  const problem = 'problem' in targets ? targets.problem : null;
  // A reason Refresh cannot start shows once Refresh is asked for, and goes as soon as the reason does.
  const [showProblem, setShowProblem] = useState(false);
  useEffect(() => { if (!problem) setShowProblem(false); }, [problem]);

  const patch = useCallback((changes: Partial<View>) => setView((prev) => ({ ...prev, ...changes })), []);
  const onToggleLabel = useCallback((name: string) => {
    setView((prev) => ({ ...prev, q: toggleLabelFilter(prev.q, name) }));
  }, []);
  // Each Review layout starts at its own default width (SET-20), so a width dragged for one does not squeeze the other.
  const changeSettings = (next: typeof settings) => {
    if (next.reviewColumn !== settings.reviewColumn) resize.onReset('review');
    setSettings(next);
  };
  // The setup wizard (SET-21). A first visit offers it in a small card, so the board shows first; taking the tour or
  // Not now answers the card for good in this browser.
  const [inviting, setInviting] = useState(() => !readWizardDone());
  const [wizardOpen, setWizardOpen] = useState(false);
  const closeWizard = useCallback(() => { storeWizardDone(); setWizardOpen(false); }, []);
  const startTour = useCallback(() => { storeWizardDone(); setInviting(false); setWizardOpen(true); }, []);
  const dismissInvite = useCallback(() => { storeWizardDone(); setInviting(false); }, []);
  // The token dialog (SET-18). After Not now, or after the token is forgotten, it does not open by itself again until
  // the page reloads.
  const [askingToken, setAskingToken] = useState(false);
  const tokenDismissed = useRef(false);
  const closeTokenDialog = useCallback(() => { tokenDismissed.current = true; setAskingToken(false); }, []);
  const setToken = (value: string) => {
    if (!value) tokenDismissed.current = true;
    storeToken(value);
    setTokenState(value);
  };

  // The load that ran for each set of repositories and token, so the automatic load never repeats one (DATA-23).
  const autoLoaded = useRef({ key: '', token: '' });
  const refresh = (withToken: string) => {
    if (!('names' in targets)) {
      setShowProblem(true);
      return;
    }
    // Skip the heavy parts of the query that only hidden columns would show.
    const parts = { checks: columns.some((c) => c.id === 'ci'), comments: columns.some((c) => c.id === 'comment') };
    const options = { token: withToken, repositories: targets.names.map(parseRepository), parts };
    autoLoaded.current = { key: loadKey(targets.names, withToken), token: withToken };
    start(DEV ? { ...options, endpoint: DEV.graphqlUrl } : options, (loaded) => {
      setReportToken(withToken);
      showLive(loaded);
      tick();
    });
  };

  // Without a snapshot the page loads live data itself (DATA-23). Fewer repositories than the data holds need no load:
  // their rows are already there, and the next load reads only these.
  useEffect(() => {
    const key = loadKey(wanted, token);
    if (!data.noSnapshot || !token || !wanted.length || refreshing || autoLoaded.current.key === key) return;
    const covered = !!report && autoLoaded.current.token === token && !pending.length;
    autoLoaded.current = { key, token };
    if (!covered) refresh(token);
  });
  // Live data loads again at the chosen interval while the tab is visible and a load can start (DATA-24, SET-22).
  const autoRefresh = data.source === 'live' && !!token && !refreshing && settings.refreshMinutes > 0 && !problem;
  useAutoRefresh(autoRefresh, lastAttempt, settings.refreshMinutes * MINUTE_MS, () => refresh(token));
  useEffect(() => {
    // It waits for the setup wizard, so the two dialogs never stack.
    if (data.noSnapshot && !token && wanted.length && !tokenDismissed.current && !wizardOpen) setAskingToken(true);
  }, [data.noSnapshot, token, wanted.length, wizardOpen]);

  const viewerActor = data.source === 'live' && token && token === reportToken && report && report.viewer ? report.viewer : null;
  const viewer = viewerActor ? viewerActor.login : '';
  // Without a known viewer the Review requested filter has nobody to count for: it waits, kept in the address (FILTER-18).
  const activeQuick = useMemo(() => (viewer ? view.quick : view.quick.filter((id) => id !== 'mine')), [viewer, view.quick]);
  const derived = useMemo(() => {
    const shown = new Set(repos.map((repo) => repo.toLowerCase()));
    const inView = (report ? report.prs : []).filter((pr) => !link.repos.length || shown.has(pr.repo.toLowerCase()));
    return inView.map((pr) => derive(pr, now, rules, viewer));
  }, [report, repos, link.repos, now, rules, viewer]);
  const allPrs = useNoteText(derived, notesApi.notes);

  // Repository groups narrow the rows before every other filter, so the menus count only what the groups show.
  const rowColors = useMemo(() => repositoryColors(groups), [groups]);
  const perGroup = useMemo(() => groupCounts(groups, groupNames, repos, allPrs.map((pr) => pr.repo)), [groups, groupNames, repos, allPrs]);
  const prs = useMemo(() => {
    if (!groups.length) return allPrs;
    const shows = groupFilter(groups, checked);
    return allPrs.filter((pr) => shows(pr.repo));
  }, [allPrs, groups, checked]);
  // The Repository column shows when the rows the groups let through come from more than one repository (TABLE-26);
  // the search does not count, so the column does not come and go while typing.
  const rowRepoCount = useMemo(() => new Set(prs.map((pr) => pr.repo.toLowerCase())).size, [prs]);
  const offeredColumns = useMemo(() => boardColumns(rowRepoCount, settings.columnOrder), [rowRepoCount, settings.columnOrder]);
  const columns = useMemo(() => offeredColumns.filter((c) => isColumnShown(c, settings.hiddenColumns)), [offeredColumns, settings.hiddenColumns]);
  const { tableWrapRef, widths, tableWidth, resize, canResetWidths, resetWidths } =
    useColumnWidths(columns, settings.reviewColumn === 'list' ? REVIEWERS_LIST_WIDTHS : undefined);

  const authors = useMemo(() => collectAuthors(prs), [prs]);
  const priorities = useMemo(() => collectPriorities(prs), [prs]);
  const noPriority = useMemo(() => countWithoutPriority(prs), [prs]);
  const selected = useMemo(() => selectedAuthors(view.authors, authors, viewer), [view.authors, authors, viewer]);

  const parsedQuery = useMemo(() => parseQuery(view.q), [view.q]);
  const activeLabels = useMemo(() => activeLabelFilters(parsedQuery), [parsedQuery]);

  const base = useMemo(
    () => filterPullRequests(prs, { draft: view.draft, area: view.area, priority: view.priority }, selected, parsedQuery),
    [prs, selected, view.draft, view.area, view.priority, parsedQuery],
  );

  const rows = useMemo(
    () => visibleRows(base, { quick: activeQuick, sort: view.sort, dir: view.dir }),
    [base, activeQuick, view.sort, view.dir],
  );

  const onSort = (key: SortKey) => {
    if (view.sort === key) patch({ dir: view.dir === 'asc' ? 'desc' : 'asc' });
    else patch({ sort: key, dir: firstDirection(key) });
  };
  const resetView = () => setView({ ...DEFAULT_VIEW });
  // The same test that keeps defaults out of the address.
  const isDefault = viewQuery(view) === '';

  const api = useMemo(() => ({ token, restUrl: DEV ? DEV.restUrl : REST_URL }), [token]);
  const reviewView = useMemo(() => ({ list: settings.reviewColumn === 'list', viewer, order: settings.reviewerOrder }),
    [settings.reviewColumn, viewer, settings.reviewerOrder]);
  const headerRepos = plan.headerRepos;

  return (
    <ApiContext.Provider value={api}><RulesContext.Provider value={rules}><NotesContext.Provider value={notesApi}><ReviewViewContext.Provider value={reviewView}>
      <header className="masthead">
        <h1>
          <span className="repo" title={headerRepos.length > HEADER_REPOSITORIES ? headerRepos.join(', ') : undefined}>{repositoriesSummary(headerRepos)}</span>
          Open pull requests
        </h1>
        <div className="masthead-side">
          <Tiles base={base} active={activeQuick} viewer={viewer}
            setQuick={(quick) => patch({ quick: !viewer && view.quick.includes('mine') ? [...quick, 'mine'] : quick })} />
          {report ? <UpdateInfo report={report} live={data.source === 'live'} now={now} refreshMinutes={settings.refreshMinutes} /> : null}
          <RefreshControl token={token} setToken={setToken} refreshing={refreshing} onRefresh={refresh} onAskToken={() => setAskingToken(true)}
            settings={settings} onSettingsChange={changeSettings} columns={offeredColumns}
            repositories={{ requested: link.repos, available: dataRepos, onChange: setRepos }}
            canResetWidths={canResetWidths} onResetWidths={resetWidths} onOpenWizard={() => setWizardOpen(true)} />
          {viewerActor ? <ViewerBadge viewer={viewerActor} /> : null}
        </div>
      </header>

      {refreshError ? <div className="banner bad" role="alert">Refresh failed. {refreshError}</div> : null}
      {showProblem && problem ? <div className="banner warn" role="alert">{problem}</div> : null}
      {data.status === 'error' ? (
        <div className="banner bad" role="alert">
          {data.error} Use Refresh with a token to load live data.
        </div>
      ) : null}
      {pending.length && (report || data.noSnapshot) && !refreshing ? (
        <div className="banner warn">
          {missingReposMessage(pending, !!token, notLoaded ? 'none' : data.source === 'live' ? 'live' : 'snapshot')}
          {token ? null : <button type="button" className="btn banner-action" onClick={() => setAskingToken(true)}>Add token</button>}
        </div>
      ) : null}
      {report && report.warnings.length ? <div className="banner warn">{report.warnings.map((w) => <div key={w}>{w}</div>)}</div> : null}

      <div className="toolbar">
        <label className="sr-only" htmlFor="pr-search">Search pull requests</label>
        <div className="search-box">
          <input id="pr-search" className="search" type="search" placeholder="Search, or filter: label:bug reviewer:anna-dev -is:draft"
            value={view.q} onChange={(e) => patch({ q: e.target.value })} />
          <SearchHelp onExample={(q) => patch({ q })} />
        </div>
        {groups.length ? (
          <RepositoriesMenu groups={groups} options={groupNames} checked={checked} counts={perGroup}
            setChecked={(next) => patch({ groups: groupsSelection(next, groups, groupNames) })} />
        ) : null}
        <AuthorMenu authors={authors} selected={selected} mode={view.authors} setAuthors={(value) => patch({ authors: value })} viewer={viewer} />
        <div className="segmented" role="group" aria-label="Draft status">
          {DRAFT_OPTIONS.map(([value, label]) =>
            <button key={value} type="button" aria-pressed={view.draft === value} onClick={() => patch({ draft: value })}>{label}</button>)}
        </div>
        <div className="segmented" role="group" aria-label="Area" title="Area comes from module labels, [FE]/[BE] tags, and frontend/ or backend/ paths">
          {AREA_OPTIONS.map(([value, label]) =>
            <button key={value} type="button" aria-pressed={view.area === value} onClick={() => patch({ area: value })}>{label}</button>)}
        </div>
        {priorities.length || view.priority.length ? (
          <PriorityMenu priorities={priorities} noneCount={noPriority} selected={view.priority} setPriority={(priority) => patch({ priority })} />
        ) : null}
        {isDefault ? null : <button type="button" className="btn ghost" onClick={resetView}>Reset view</button>}
        <CopyLink />
        <span className="result-count">{rows.length === 1 ? '1 pull request' : rows.length + ' pull requests'}</span>
      </div>

      <div className="table-wrap" ref={tableWrapRef}>
        <table className="board" style={{ width: tableWidth + 'px' }}>
          <colgroup>{columns.map((col) => <col key={col.id} style={{ width: widths[col.id] + 'px' }} />)}</colgroup>
          <thead><tr>{columns.map((col, index) => <HeaderCell key={col.id} col={col} index={index} view={view} onSort={onSort} width={widths[col.id]} resize={resize} />)}</tr></thead>
          <tbody>
            {rows.length ? rows.map((pr) => <Row key={pullRequestKey(pr)} pr={pr} now={now} columns={columns} repos={repos} showLabels={settings.showLabels}
              groupColor={rowColors.get(pr.repo.toLowerCase())} activeLabels={activeLabels} onToggleLabel={onToggleLabel} />)
              : <TableMessage colSpan={columns.length} onResetView={resetView} progress={load && !load.finished ? <LoadStatus load={load} /> : null}
                kind={emptyTableKind({ loading: data.status === 'loading' || refreshing, notLoaded, failed: data.status === 'error', plan })} />}
          </tbody>
        </table>
      </div>

      {load && (rows.length || load.finished) ? <LoadStatus load={load} floating /> : null}
      <LoadAnnouncer load={load} />
      <LegendBar />
      {wizardOpen ? <SetupWizard settings={settings} onChange={changeSettings} onClose={closeWizard} /> : null}
      {inviting && !askingToken ? <WizardInvite onStart={startTour} onDismiss={dismissInvite} /> : null}
      {askingToken ? (
        <TokenDialog onClose={closeTokenDialog}
          onSave={(value) => { setToken(value); setAskingToken(false); refresh(value); }} />
      ) : null}
    </ReviewViewContext.Provider></NotesContext.Provider></RulesContext.Provider></ApiContext.Provider>
  );
}
