import { useState } from 'react';
import { useDismiss } from '../../hooks/useDismiss.ts';
import { SEARCH_QUALIFIERS } from '../../model/search.ts';

const SEARCH_EXAMPLES = ['label:bug -is:draft', 'reviewer:anna-dev review:none', 'area:fe ci:failing', 'label:"module:ui" is:stale', 'no:issue no:label'];

export function SearchHelp({ onExample }: { onExample: (query: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, setOpen);
  return (
    <div className="menu-wrap" ref={ref}>
      <button type="button" className="btn icon-only" aria-label="Search syntax" aria-expanded={open} onClick={() => setOpen(!open)}>?</button>
      {open ? (
        <div className="menu search-help" role="dialog" aria-label="Search syntax">
          <strong>Search syntax</strong>
          <p>Words match the title, number, people, labels, branch, failed checks, issues, projects, comments, and attention reasons. Add qualifiers to narrow the list; a minus in front excludes.</p>
          <dl>
            {Object.entries(SEARCH_QUALIFIERS).map(([key, q]) => <div key={key}><dt><code>{key}:</code></dt><dd>{q.hint}</dd></div>)}
          </dl>
          <p>Examples:</p>
          <div className="examples">
            {SEARCH_EXAMPLES.map((q) => <button key={q} type="button" className="btn" onClick={() => { onExample(q); setOpen(false); }}><code>{q}</code></button>)}
          </div>
        </div>
      ) : null}
    </div>
  );
}
