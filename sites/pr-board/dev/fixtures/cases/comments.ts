// Corner cases. Comments: review summaries, long bot reports, Markdown, and long discussions.

import { REPO_URL } from '../people.ts';
import { checks, conn, PULLS_URL, requested, rollup, run, team, user } from '../builders.ts';
import type { FixtureEntry } from '../builders.ts';
import { caseKit } from './kit.ts';

const FIRST_NUMBER = 9500;

export function commentCases(now: number): FixtureEntry[] {
  const { node, ago } = caseKit(now, FIRST_NUMBER);
  return [
    node('The newest text is a review summary, not an issue comment. Empty and whitespace-only comments are skipped.', {
      title: 'test(api-unifier): cover channel fixtures without an address',
      author: user('hana-docs'), createdAt: ago(1, 5), updatedAt: ago(0, 1),
      comments: conn([
        { createdAt: ago(0, 3), author: user('anna-dev'), body: 'Rebased on main.' },
        { createdAt: ago(0, 2), author: user('boris-k'), body: '   \n  ' },
      ]),
      reviews: conn([
        { submittedAt: ago(0, 1), author: user('chen-li'), body: 'Two nits inline, otherwise fine.' },
        { submittedAt: ago(0, 0, 30), author: user('chen-li'), body: '' },
      ]),
    }),
    node('Two full comments in the popover, with links to GitHub. One reviewer was asked but has not answered.', {
      title: 'feat(portal-backend): add a package export endpoint',
      author: user('gleb-be'), createdAt: ago(3), updatedAt: ago(0, 1),
      reviewRequests: conn([requested('chen-li'), team('widgets-backend')]),
      comments: conn([
        {
          createdAt: ago(0, 5), author: user('anna-dev'), url: PULLS_URL,
          body: 'Thanks! Two questions:\n\n1. Do we stream the archive or build it in memory?\n2. What happens for packages with more than 1000 versions?',
        },
        {
          createdAt: ago(0, 1), author: user('gleb-be'), url: PULLS_URL,
          body: '1. Streamed, see `ExportService.writeZip`.\n2. Paginated by 100, covered by `TestExportManyVersions`.',
        },
      ]),
    }),
    node('A bot report longer than 4000 characters is cut in prs.json; the popover says so and links to GitHub.', {
      title: 'test(ui-tests): stabilize snapshot comparison on CI',
      author: user('boris-k'), createdAt: ago(1), updatedAt: ago(0, 3),
      comments: conn([{
        createdAt: ago(0, 3), author: user('acme-release-bot'), url: PULLS_URL,
        body: '### Snapshot report\n\n' + Array.from({ length: 120 }, (_, i) => '- `snapshot-' + (i + 1) + '.png`: pixel difference 0.0' + (i % 10) + '% (within threshold)').join('\n'),
      }]),
    }),
    node('A long multi-line Markdown comment collapses to a short plain-text preview; click it for the full text.', {
      title: 'fix(agent): retry discovery when the API server is throttling',
      author: user('farah-ui'), baseRefName: 'develop', mergeable: 'CONFLICTING',
      commits: rollup('ERROR', checks([run('agent-unit', 'TIMED_OUT', 'Backend'), run('agent-lint', 'SUCCESS', 'Backend')])),
      createdAt: ago(8), updatedAt: ago(0, 20),
      comments: conn([{
        createdAt: ago(0, 20), author: user('acme-release-bot'),
        body: '### CI failed on `agent-unit`\n\n```\n--- FAIL: TestDiscoveryRetry (3.02s)\n    discovery_test.go:118: expected 3 retries, got 1\n```\n\n**Likely cause:** the backoff resets on every 429.',
      }]),
    }),
    node('Markdown in comments: a table, a task list, a quote, a link, and inline HTML. Scripts, event handlers, and javascript: links are removed.', {
      title: 'feat(ui-tests): report visual diffs as a table',
      author: user('boris-k'), createdAt: ago(1), updatedAt: ago(0, 1),
      comments: conn([
        {
          createdAt: ago(0, 2), author: user('acme-release-bot'), url: PULLS_URL,
          body: '## Visual diff report\n\n| Story | Diff | Status |\n| --- | ---: | :---: |\n| `Button/Primary` | 0.00% | ✅ |\n'
            + '| `Table/Sticky header` | 0.42% | ⚠️ |\n\n<details><summary>Environment</summary>\n\nChrome 141, 1280×800\n\n</details>\n\n'
            + '> Threshold is **0.1%**. See [the test guide](' + REPO_URL + ').',
        },
        {
          createdAt: ago(0, 1), author: user('anna-dev'), url: PULLS_URL,
          body: 'Before merging:\n- [x] update baselines\n- [ ] check dark theme\n\nLine one\nline two on its own line.\n\n'
            + '<script>alert("xss")</script><img src="x" onerror="alert(1)"> [harmless text](javascript:alert%281%29)',
        },
      ]),
    }),
    node('A long discussion: the table shows the latest two comments, and the panel loads all of them over REST.', {
      title: 'feat(portal-backend): import packages from an OpenAPI registry',
      author: user('gleb-be'), createdAt: ago(9), updatedAt: ago(0, 1),
      comments: conn(Array.from({ length: 14 }, (_, i) => ({
        createdAt: ago(8 - Math.floor(i / 2), (i % 2) * 5), author: user(i % 3 === 0 ? 'anna-dev' : i % 3 === 1 ? 'gleb-be' : 'chen-li'),
        url: PULLS_URL,
        body: 'Discussion comment ' + (i + 1) + (i % 4 === 0 ? ':\n\n- [ ] check the **registry** timeout\n- [x] add `retry`' : '.'),
      }))),
      reviews: conn([
        { submittedAt: ago(3), author: user('chen-li'), url: PULLS_URL, body: 'Requesting changes: see the inline notes on the importer.' },
        { submittedAt: ago(2), author: user('anna-dev'), body: '' },
      ]),
    }),
  ];
}
