import { reviewerRanks } from '../../board/reviewers.ts';
import type { ReviewerGroup, ReviewerStatus } from '../../board/reviewers.ts';
import type { Density, ReviewColumn } from '../../settings.ts';
import { Octicon } from '../common/Octicon.tsx';
import type { OcticonName } from '../common/Octicon.tsx';

type Tone = 'good' | 'bad' | 'idle' | 'warn';

interface PreviewRow {
  ci: { code: string; tone: Tone };
  review: { code: string; tone: Tone };
  // Where each reviewer's review stands, for the Reviewers layout; "mine" is the viewer, whose review is due.
  reviewers: { icon: OcticonName; tone: Tone; mine?: boolean }[];
  title: string;
  avatar: string;
  // Label chips under the title, as theme color names, for the Labels step.
  labels: string[];
}

// Three made-up rows that show the states the wizard is about: passing and failing checks, approved, changes
// requested, and a review that waits for the viewer.
const ROWS: PreviewRow[] = [
  { ci: { code: 'P', tone: 'good' }, review: { code: '✓', tone: 'good' }, title: '78%', avatar: 'var(--issue-type-green)', labels: ['blue', 'purple'],
    reviewers: [{ icon: 'check', tone: 'good' }, { icon: 'check', tone: 'good' }] },
  { ci: { code: 'F', tone: 'bad' }, review: { code: 'CR', tone: 'bad' }, title: '62%', avatar: 'var(--issue-type-purple)', labels: ['red'],
    reviewers: [{ icon: 'fileDiff', tone: 'bad' }, { icon: 'dot', tone: 'warn' }] },
  { ci: { code: 'P', tone: 'good' }, review: { code: '–', tone: 'idle' }, title: '70%', avatar: 'var(--issue-type-orange)', labels: ['yellow', 'green', 'blue'],
    reviewers: [{ icon: 'dot', tone: 'warn', mine: true }, { icon: 'dot', tone: 'warn' }] },
];

function Board({ theme, density, review, labels }: { theme: 'light' | 'dark'; density: Density; review: ReviewColumn; labels: boolean }) {
  return (
    <div className={'view-preview theme-' + theme + ' vp-' + density}>
      <div className="vp-head"><span className="vp-tile" /><span className="vp-tile" /><span className="vp-tile accent" /></div>
      {ROWS.map((row, index) => (
        <div key={index} className={'vp-row ci-' + row.ci.tone}>
          <span className="vp-avatar" style={{ background: row.avatar }} />
          <span className="vp-title">
            <span style={{ width: row.title }} />
            {labels ? (
              <span className="vp-labels">
                {row.labels.map((color, i) => <span key={i} className="vp-label" style={{ background: 'var(--issue-type-' + color + ')' }} />)}
              </span>
            ) : null}
          </span>
          <span className={'vp-pill ' + row.ci.tone}>{row.ci.code}</span>
          {review === 'code' ? <span className={'vp-pill ' + row.review.tone}>{row.review.code}</span> : (
            <span className="vp-reviewers">
              {row.reviewers.map((r, i) => (
                <span key={i} className={'vp-reviewer' + (r.mine ? ' mine' : '')}>
                  <span className="vp-mini-avatar" /><span className="vp-line" />
                  <span className={'vp-icon ' + r.tone}><Octicon name={r.icon} size={8} /></span>
                </span>
              ))}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// The Review cells alone, large enough to read, for the Review column step: a code per PR, or the reviewers with
// GitHub's icons. The made-up viewer is boris-k, whose own pending review stands out.
const REVIEW_CELLS: { code: string; tone: Tone; waiting: number; reviewers: { login: string; icon: OcticonName; tone: Tone; mine?: boolean }[] }[] = [
  { code: '✓', tone: 'good', waiting: 0, reviewers: [{ login: 'anna-dev', icon: 'check', tone: 'good' }, { login: 'chen-li', icon: 'check', tone: 'good' }] },
  { code: 'CR', tone: 'bad', waiting: 1, reviewers: [{ login: 'dara-ops', icon: 'fileDiff', tone: 'bad' }, { login: 'emil-qa', icon: 'dot', tone: 'warn' }] },
  { code: '–', tone: 'idle', waiting: 2, reviewers: [{ login: 'boris-k', icon: 'dot', tone: 'warn', mine: true }, { login: 'hana-docs', icon: 'dot', tone: 'warn' }] },
];

function ReviewCells({ theme, review }: { theme: 'light' | 'dark'; review: ReviewColumn }) {
  return (
    <div className={'view-preview vp-cells theme-' + theme}>
      <div className="vp-cell-head">Review</div>
      {REVIEW_CELLS.map((cell, index) => (
        <div key={index} className="vp-cell">
          {review === 'code' ? (
            <span className="vp-code">
              <span className={'vp-pill big ' + cell.tone}>{cell.code}</span>
              {cell.waiting ? <span className="vp-waiting">◷{cell.waiting}</span> : null}
            </span>
          ) : (
            <span className="vp-people">
              {cell.reviewers.map((r) => (
                <span key={r.login} className={'vp-person' + (r.mine ? ' mine' : '')}>
                  <span className="vp-mini-avatar big" />
                  <span className="vp-login">{r.login}</span>
                  <span className={'vp-icon ' + r.tone}><Octicon name={r.icon} size={11} /></span>
                </span>
              ))}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// One PR's reviewers for the Reviewers order step (SET-25): two approvals, requested changes, and two reviews not given
// yet, one of them the made-up viewer's.
const ORDER_REVIEWERS: { login: string; status: ReviewerStatus; mine?: boolean }[] = [
  { login: 'anna-dev', status: 'approved' },
  { login: 'hana-docs', status: 'pending' },
  { login: 'dara-ops', status: 'changes' },
  { login: 'boris-k', status: 'pending', mine: true },
  { login: 'chen-li', status: 'approved' },
];
const STATUS_ICON: Partial<Record<ReviewerStatus, { icon: OcticonName; tone: Tone }>> = {
  approved: { icon: 'check', tone: 'good' },
  changes: { icon: 'fileDiff', tone: 'bad' },
  pending: { icon: 'dot', tone: 'warn' },
};

function OrderedCell({ theme, order }: { theme: 'light' | 'dark'; order: ReviewerGroup[] }) {
  const rank = reviewerRanks(order);
  // The viewer's own request leads the reviews not given yet, as on the board.
  const sorted = [...ORDER_REVIEWERS].sort((a, b) => rank[a.status] - rank[b.status] || Number(!!b.mine) - Number(!!a.mine));
  return (
    <div className={'view-preview vp-cells vp-order theme-' + theme}>
      <div className="vp-cell-head">Review</div>
      <div className="vp-cell">
        <span className="vp-people">
          {sorted.map((r) => (
            <span key={r.login} className={'vp-person' + (r.mine ? ' mine' : '')}>
              <span className="vp-mini-avatar big" />
              <span className="vp-login">{r.login}</span>
              <span className={'vp-icon ' + STATUS_ICON[r.status]!.tone}><Octicon name={STATUS_ICON[r.status]!.icon} size={11} /></span>
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}

// One PR's Reviewers list in a given order; "split" draws it in light and dark side by side.
export function ReviewerOrderPreview({ theme, order }: { theme: 'light' | 'dark' | 'split'; order: ReviewerGroup[] }) {
  if (theme !== 'split') return <div className="preview-frame" aria-hidden="true"><OrderedCell theme={theme} order={order} /></div>;
  return (
    <div className="preview-frame vp-split" aria-hidden="true">
      <OrderedCell theme="light" order={order} />
      <OrderedCell theme="dark" order={order} />
    </div>
  );
}

// The Review cells in a given look; "split" draws them in light and dark side by side.
export function ReviewCellPreview({ theme, review }: { theme: 'light' | 'dark' | 'split'; review: ReviewColumn }) {
  if (theme !== 'split') return <div className="preview-frame" aria-hidden="true"><ReviewCells theme={theme} review={review} /></div>;
  return (
    <div className="preview-frame vp-split" aria-hidden="true">
      <ReviewCells theme="light" review={review} />
      <ReviewCells theme="dark" review={review} />
    </div>
  );
}

// A small picture of the board in a given look, for the setup wizard (SET-21). It is decoration: the card's label says
// what it shows. "split" is the System theme: the light and the dark board side by side.
export function ViewPreview({ theme, density, review, labels }: {
  theme: 'light' | 'dark' | 'split';
  density: Density;
  review: ReviewColumn;
  labels: boolean;
}) {
  if (theme !== 'split') return <div className="preview-frame" aria-hidden="true"><Board theme={theme} density={density} review={review} labels={labels} /></div>;
  return (
    <div className="preview-frame vp-split" aria-hidden="true">
      <Board theme="light" density={density} review={review} labels={labels} />
      <Board theme="dark" density={density} review={review} labels={labels} />
    </div>
  );
}
