import { useMemo, useRef } from 'react';
import type { Notes } from '../board/notes.ts';
import { pullRequestKey } from '../model/report.ts';
import type { DerivedPullRequest } from '../types.ts';

// Adds each PR's note text for note: (NOTE-7). A PR whose note did not change keeps the same object, so the memoized
// rows of the other PRs do not render again.
export function useNoteText(prs: DerivedPullRequest[], notes: Notes): DerivedPullRequest[] {
  const cache = useRef(new WeakMap<DerivedPullRequest, DerivedPullRequest>());
  return useMemo(() => prs.map((pr) => {
    const note = notes[pullRequestKey(pr)];
    const noteText = note ? note.text.toLowerCase() : '';
    const previous = cache.current.get(pr);
    if (previous && (previous.noteText || '') === noteText) return previous;
    const next = noteText ? { ...pr, noteText } : pr;
    cache.current.set(pr, next);
    return next;
  }), [prs, notes]);
}
