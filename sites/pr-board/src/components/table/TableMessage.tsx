import type { ReactNode } from 'react';
import type { TableMessageKind } from '../../board/repositories.ts';

// What the table body says when it has no rows: loading, no repositories chosen, no group checked, nothing loaded
// yet, or no match.

export function TableMessage({ kind, colSpan, onResetView, progress }: {
  kind: TableMessageKind;
  colSpan: number;
  onResetView: () => void;
  // What a live load is doing, in place of the plain loading line (DATA-27).
  progress?: ReactNode;
}) {
  return (
    <tr><td colSpan={colSpan}><div className="empty">
      {kind === 'loading' && progress ? progress : null}
      {kind === 'loading' && !progress ? <span className="loading" role="status"><span className="spinner" aria-hidden="true"></span>Loading pull requests…</span> : null}
      {kind === 'no-repos' ? (
        <>
          <strong>Choose the repositories to show</strong>
          <span>Add them in Settings, or open a link with <code>?repos=owner/name</code>.</span>
        </>
      ) : null}
      {kind === 'no-groups' ? (
        <>
          <strong>No repository group is checked</strong>
          <span>Check a group in the Repositories menu to load its pull requests.</span>
        </>
      ) : null}
      {kind === 'not-loaded' ? <strong>No pull requests loaded yet</strong> : null}
      {kind === 'no-match' ? (
        <>
          <strong>No pull requests match this view</strong>
          <span>Try clearing the search or selecting more authors.</span>
          <button type="button" className="btn" onClick={onResetView}>Reset view</button>
        </>
      ) : null}
    </div></td></tr>
  );
}
