// Corner cases. PR titles: escaping, long text, emoji, and the Conventional Commits rule.

import { conn, ISSUES_URL, label, review, user } from '../builders.ts';
import type { FixtureEntry } from '../builders.ts';
import { caseKit } from './kit.ts';

const FIRST_NUMBER = 9100;

export function titleCases(now: number): FixtureEntry[] {
  const { node, ago } = caseKit(now, FIRST_NUMBER);
  return [
    node('HTML in the title renders as text; HTML in the comment is sanitized Markdown.', {
      title: 'fix(ui): escape <script>alert("xss")</script> in package names',
      author: user('boris-k'), createdAt: ago(2, 3), updatedAt: ago(0, 4),
      labels: conn([label('bug', 'd73a4a', "Something isn't working"), label('module:ui', '0E8A16')]),
      latestOpinionatedReviews: conn([review('APPROVED', 'anna-dev', ago(0, 6))]),
      comments: conn([{
        createdAt: ago(0, 4), author: user('acme-release-bot'),
        body: '<!-- sonar-report:start --> <details><summary>Quality gate passed</summary> <table><tr><td>Coverage',
      }]),
    }),
    node('A long unbroken title and a long target branch wrap inside the cell.', {
      title: 'chore: regenerate frontend/widgets-ui/src/components/ApiOperationsTable/OperationsTableRowWithNestedDiffBadges.generated.ts',
      author: user('dara-ops'), baseRefName: 'release/2026.4-hotfix-operations-diff-rendering',
      createdAt: ago(1, 2), updatedAt: ago(1, 1),
    }),
    node('Emoji in the title, two assignees, three linked issues.', {
      title: 'fix: correct 🚀 rendering in package names and breadcrumbs',
      author: user('hana-docs'),
      assignees: conn([
        { login: 'anna-dev', avatarUrl: user('anna-dev').avatarUrl },
        { login: 'boris-k', avatarUrl: user('boris-k').avatarUrl },
      ]),
      closingIssuesReferences: conn([
        { title: '[Bug][UI] Emoji in package name breaks the breadcrumb width calculation', url: ISSUES_URL },
        { title: '[Bug][UI] Cyrillic package names are cut in the sidebar', url: ISSUES_URL },
        { title: '[Feat] Unicode test fixtures', url: ISSUES_URL },
      ]),
      createdAt: ago(5), updatedAt: ago(0, 9),
    }),
    node('Title has no Conventional Commits type at all.', {
      title: 'WIDGET-1234 Add export of operation groups',
      author: user('gleb-be'), createdAt: ago(2), updatedAt: ago(1),
    }),
    node('Title type "feature" is not in the allowed list; "feat" is.', {
      title: 'feature: add Draft PRs to the report',
      author: user('dara-ops'), createdAt: ago(1), updatedAt: ago(0, 5),
    }),
    node('Types are case-sensitive, so "Fix" fails.', {
      title: 'Fix: crash on empty package list',
      author: user('boris-k'), createdAt: ago(0, 6), updatedAt: ago(0, 6),
    }),
    node('No space after the colon.', {
      title: 'fix(ui):align the version selector',
      author: user('emil-qa'), createdAt: ago(3), updatedAt: ago(2),
    }),
    node('The default title of a GitHub revert PR fails the lint.', {
      title: 'Revert "feat(agent): report namespace discovery errors"',
      author: user('anna-dev'), createdAt: ago(0, 2), updatedAt: ago(0, 2),
    }),
    node('A breaking change marker with a scope is valid.', {
      title: 'feat(api)!: drop the v1 comparison endpoint',
      author: user('chen-li'), createdAt: ago(4), updatedAt: ago(1),
    }),
  ];
}
