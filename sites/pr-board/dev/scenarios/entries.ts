// The sets of mock PRs that scenarios serve.

import { cornerCaseNodes } from '../fixtures/corner-cases.ts';
import type { FixtureEntry } from '../fixtures/builders.ts';
import { typicalNodes } from '../fixtures/typical.ts';

export const MANY_PRS = 300;
// The copies are numbered from here, apart from the numbers of the board they copy.
export const MANY_FIRST_NUMBER = 20000;

export function mixedEntries(now: number): FixtureEntry[] {
  return typicalNodes(now).concat(cornerCaseNodes(now));
}

export function manyEntries(now: number): FixtureEntry[] {
  const base = mixedEntries(now);
  return Array.from({ length: MANY_PRS }, (_, i) => {
    const source = base[i % base.length].node;
    return { node: { ...source, number: MANY_FIRST_NUMBER + i, title: source.title + ' (copy ' + (i + 1) + ')' }, note: null };
  });
}
