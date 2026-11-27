import { QUICK } from '../../board/view.ts';
import type { DerivedPullRequest } from '../../types.ts';

export function Tiles({ base, active, setQuick, viewer }: {
  base: DerivedPullRequest[];
  active: string[];
  setQuick: (quick: string[]) => void;
  // The token owner; without one the Review requested tile has nobody to count for.
  viewer: string;
}) {
  return (
    <div className="tiles" role="group" aria-label="Quick filters">
      <button type="button" className="tile" aria-pressed={active.length === 0} onClick={() => setQuick([])}>
        <span className="count">{base.length}</span>
        <span className="label">Open PRs</span>
      </button>
      {QUICK.filter((q) => q.id !== 'mine' || viewer).map((q) => {
        const count = base.filter(q.test).length;
        const again = q.id === 'mine' ? base.filter((pr) => pr.myReview === 'again').length : 0;
        const pressed = active.includes(q.id);
        return (
          <button key={q.id} type="button"
            className={'tile tone-' + q.tone + (count === 0 ? ' zero' : '')}
            aria-pressed={pressed}
            title={pressed ? 'Click to remove this filter' : 'Click to show only these'}
            onClick={() => setQuick(pressed ? active.filter((id) => id !== q.id) : active.concat(q.id))}>
            <span className="count">{count}</span>
            <span className="label">{q.label}</span>
            {again ? <span className="label again" title="Re-requested: you reviewed these before">· {again} again</span> : null}
          </button>
        );
      })}
    </div>
  );
}
