import { labelTextColor } from '../../board/format.ts';
import { isCurrentSprint, sprintDays } from '../../model/derive.ts';
import type { Issue, PullRequest, Sprint } from '../../types.ts';

const VISIBLE_ISSUE_LABELS = 3;

// The Issue column (TABLE-8): the issues the PR closes (the Development field), each with its type and labels. Without
// one, the project it was added to instead, or "No issue".
export function IssueCell({ pr, now, showLabels }: { pr: PullRequest; now: number; showLabels: boolean }) {
  if (pr.issues.length) {
    return <div className="issue-list">{pr.issues.map((issue, i) => <IssueItem key={i} issue={issue} now={now} showLabels={showLabels} />)}</div>;
  }
  if (pr.projects && pr.projects.length) return <span className="dash">No issue · in {pr.projects.join(', ')}</span>;
  return <span className="dash">No issue</span>;
}

function sprintDates(sprint: Sprint): string {
  const { first, last } = sprintDays(sprint);
  const day = (date: string) => new Date(date + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return day(first) + ' – ' + day(last);
}

// Priority, Estimate, and Sprint from GitHub Projects (TABLE-28); a field that is not set does not show.
function ProjectFields({ issue, now }: { issue: Issue; now: number }) {
  if (!issue.priority && issue.estimate === null && !issue.sprint) return null;
  const current = isCurrentSprint(issue.sprint, now);
  return (
    <div className="issue-fields">
      {issue.priority ? (
        <span className="field-chip" title={'Priority: ' + issue.priority.name}>
          <span className="issue-type-dot" aria-hidden="true" style={{ background: 'var(--issue-type-' + (issue.priority.color || 'gray') + ')' }}></span>
          {issue.priority.name}
        </span>
      ) : null}
      {issue.estimate !== null ? <span className="field-chip" title="Estimate">Est {issue.estimate}</span> : null}
      {issue.sprint ? (
        <span className={'field-chip' + (current ? ' current' : '')} title={issue.sprint.title + ': ' + sprintDates(issue.sprint)}>
          {issue.sprint.title}{current ? ' · current' : ''}
        </span>
      ) : null}
    </div>
  );
}

function IssueItem({ issue, now, showLabels }: { issue: Issue; now: number; showLabels: boolean }) {
  const shown = showLabels ? issue.labels.slice(0, VISIBLE_ISSUE_LABELS) : [];
  const hidden = issue.labels.slice(VISIBLE_ISSUE_LABELS);
  return (
    <div className="issue-item">
      <a className="issue-ref" href={issue.url} target="_blank" rel="noopener"
        title={'Closes ' + issue.title + (issue.number ? ' (#' + issue.number + ')' : '')}>
        {issue.type ? (
          <span className="issue-type" title={'Issue type: ' + issue.type.name}>
            <span className="issue-type-dot" aria-hidden="true"
              style={{ background: 'var(--issue-type-' + (issue.type.color || 'gray') + ')' }}></span>
            {issue.type.name}
          </span>
        ) : null}
        {issue.number ? <span className="issue-number">#{issue.number}</span> : null}
        <span className="issue-title">{issue.title}</span>
      </a>
      <ProjectFields issue={issue} now={now} />
      {shown.length ? (
        <div className="issue-labels">
          {shown.map((label) => (
            <span key={label.name} className="label-chip static" title={label.description || label.name}
              style={label.color ? { background: '#' + label.color, color: labelTextColor(label.color) } : undefined}>{label.name}</span>
          ))}
          {hidden.length ? <span className="label-more static" title={hidden.map((l) => l.name).join(', ')}>+{hidden.length}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
