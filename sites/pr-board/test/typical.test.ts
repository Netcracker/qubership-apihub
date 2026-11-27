import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePullRequest } from '../src/github/normalize.ts';
import { derive } from '../src/model/derive.ts';
import { cornerCaseNodes } from '../dev/fixtures/corner-cases.ts';
import { BOTS, PEOPLE } from '../dev/fixtures/people.ts';
import { TYPICAL_SIZE, typicalNodes } from '../dev/fixtures/typical.ts';

const NOW = Date.parse('2026-10-28T12:00:00Z');
const prs = typicalNodes(NOW).map(({ node }) => derive(normalizePullRequest(node), NOW));

test('the typical board is the same for the same moment', () => {
  assert.deepEqual(typicalNodes(NOW), typicalNodes(NOW));
  assert.equal(prs.length, TYPICAL_SIZE);
});

test('the typical board covers every CI, review, and conflict state, and both areas', () => {
  const seen = (pick: (pr: (typeof prs)[number]) => string) => new Set(prs.map(pick));
  assert.deepEqual([...seen((pr) => pr.ci)].sort(), ['failing', 'none', 'passing', 'running']);
  assert.deepEqual([...seen((pr) => pr.review)].sort(), ['approved', 'changes_requested', 'none']);
  assert.deepEqual([...seen((pr) => pr.mergeable)].sort(), ['clean', 'conflicts', 'unknown']);
  assert.ok(prs.some((pr) => pr.areas.includes('be')) && prs.some((pr) => pr.areas.includes('fe')));
  assert.ok(prs.some((pr) => pr.areas.length === 0));
});

test('the typical board mixes drafts, bots, attention, comments, and failed checks', () => {
  assert.ok(prs.some((pr) => pr.draft) && prs.some((pr) => !pr.draft));
  assert.ok(prs.some((pr) => pr.bot));
  assert.ok(prs.some((pr) => pr.attention.length > 0) && prs.some((pr) => pr.attention.length === 0));
  assert.ok(prs.some((pr) => pr.comments.length === 2) && prs.some((pr) => pr.comments.length === 0));
  assert.ok(prs.filter((pr) => pr.ci === 'failing').every((pr) => pr.checks && pr.checks.failed.length > 0));
});

test('the typical board uses only the fictional cast and its own PR numbers', () => {
  const cast = new Set([...PEOPLE, ...BOTS]);
  const logins = prs.flatMap((pr) => [pr.author?.login, ...pr.assignees.map((a) => a.login), ...pr.reviewers.map((r) => r.login)]);
  assert.deepEqual(logins.filter((l) => l && l !== 'ghost' && !cast.has(l)), []);
  const numbers = prs.map((pr) => pr.number);
  const corner = new Set(cornerCaseNodes(NOW).map((e) => e.node.number));
  assert.equal(new Set(numbers).size, numbers.length);
  assert.deepEqual(numbers.filter((n) => corner.has(n)), []);
});

test('activity on a typical PR falls between its opening and its last update', () => {
  for (const { node } of typicalNodes(NOW)) {
    const activity = [
      ...(node.comments?.nodes || []).map((c) => c!.createdAt),
      ...(node.latestOpinionatedReviews?.nodes || []).map((r) => r!.submittedAt!),
    ];
    for (const at of activity) {
      assert.ok(at >= node.createdAt && at <= node.updatedAt, '#' + node.number + ': ' + at);
    }
    assert.ok(node.updatedAt <= new Date(NOW).toISOString());
  }
});
