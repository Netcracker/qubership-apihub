// The second mock repository. Its PR numbers repeat those of the typical board (101, 104, 107), so the board must
// tell PRs apart by repository and number.

import type { RawPullRequest } from '../../src/github/raw.ts';
import { agoFrom, checks, conn, label, review, rollup, run, user } from './builders.ts';
import type { FixtureEntry } from './builders.ts';
import { GADGETS_REPOSITORY } from './people.ts';

const GADGETS_URL = 'https://github.com/' + GADGETS_REPOSITORY;

type GadgetFields = Partial<RawPullRequest> & Pick<RawPullRequest, 'number' | 'title' | 'createdAt' | 'updatedAt'>;

function gadget(fields: GadgetFields): FixtureEntry {
  return {
    note: null,
    node: {
      url: GADGETS_URL + '/pulls',
      isDraft: false,
      baseRefName: 'main',
      mergeable: 'MERGEABLE',
      author: user('chen-li'),
      assignees: conn([]),
      labels: conn([]),
      closingIssuesReferences: conn([{ number: 12, title: 'Gadgets need a firmware check', url: GADGETS_URL + '/issues' }]),
      projectsV2: conn([]),
      latestOpinionatedReviews: conn([]),
      reviewRequests: conn([]),
      commits: rollup('SUCCESS'),
      comments: conn([]),
      reviews: conn([]),
      ...fields,
    },
  };
}

export function gadgetsEntries(now: number): FixtureEntry[] {
  const ago = agoFrom(now);
  return [
    gadget({
      number: 101, title: 'feat(firmware): check the gadget firmware version on connect',
      createdAt: ago(2), updatedAt: ago(0, 3), labels: conn([label('module:firmware', '5319e7')]),
      comments: conn([{ createdAt: ago(0, 3), author: user('emil-qa'), url: GADGETS_URL + '/pulls', body: 'Tested on the gadget bench: the check passes.' }]),
    }),
    gadget({
      number: 104, title: 'fix(pairing): retry pairing after a timeout',
      author: user('gleb-be'), createdAt: ago(6), updatedAt: ago(1), mergeable: 'CONFLICTING',
      commits: rollup('FAILURE', checks([run('pairing tests', 'FAILURE', 'CI')])),
    }),
    gadget({
      number: 107, title: 'docs(gadgets): explain the pairing states',
      author: user('hana-docs'), createdAt: ago(1), updatedAt: ago(0, 8),
      latestOpinionatedReviews: conn([review('APPROVED', 'anna-dev', ago(0, 8))]),
    }),
    gadget({ number: 3, title: 'chore: set up the gadgets repository', createdAt: ago(20), updatedAt: ago(12), isDraft: true }),
  ];
}
