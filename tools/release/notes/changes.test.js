const { test } = require('node:test')
const assert = require('node:assert/strict')
const { groupChanges, issueCategory, titleCategory } = require('./changes')

const REPO = 'https://github.com/Netcracker/qubership-apihub'
const commit = (sha, subject, body = '') => ({ sha, hash: sha.slice(0, 7), author: 'Dev Name', subject, body })
const pull = (number, title, issues = []) => ({
  number,
  title,
  url: `${REPO}/pull/${number}`,
  author: 'dev',
  issues,
})

test('issueCategory: issue type first, then labels', () => {
  assert.equal(issueCategory('Feature', []), 'features')
  assert.equal(issueCategory('Bug', ['feature']), 'bugfixes')
  assert.equal(issueCategory('Story', ['bug']), 'other')
  assert.equal(issueCategory(null, ['Bug']), 'bugfixes')
  assert.equal(issueCategory(null, ['task']), 'other')
})

test('titleCategory: the Conventional Commits type of the title', () => {
  assert.deepEqual(['feat(ui): x', 'fix: y', 'chore: deps: z', 'Bugfix of w'].map(titleCategory), [
    'features',
    'bugfixes',
    'other',
    'bugfixes',
  ])
})

test('groupChanges: one entry per pull request, a line per closing issue, breaking first and only there', () => {
  const issue = (title, type) => ({ title, url: `${REPO}/issues/${title}`, type, labels: [] })
  const shared = pull(10, 'feat: shared', [issue('1', 'Feature'), issue('2', 'Bug')])
  const groups = groupChanges(
    [
      { commit: commit('a1', 'feat: shared part 1'), login: null, pull: shared },
      { commit: commit('a2', 'feat: shared part 2'), login: null, pull: shared },
      { commit: commit('b1', 'fix: no issue'), login: null, pull: pull(11, 'fix: no issue') },
      { commit: commit('c1', 'refactor!: drop the old API'), login: null, pull: pull(12, 'refactor!: drop the old API') },
      { commit: commit('d1', 'chore: direct'), login: 'pusher', pull: null },
      { commit: commit('e1', 'docs: direct, no login'), login: null, pull: null },
      { commit: commit('f1', 'chore(release): publish'), login: 'bot', pull: null },
    ],
    REPO,
  )
  assert.deepEqual(groups, {
    breaking: [`- refactor!: drop the old API by @dev in ${REPO}/pull/12`],
    features: [`- feat: shared by @dev in ${REPO}/pull/10 for issue ([1](${REPO}/issues/1))`],
    bugfixes: [
      `- feat: shared by @dev in ${REPO}/pull/10 for issue ([2](${REPO}/issues/2))`,
      `- fix: no issue by @dev in ${REPO}/pull/11`,
    ],
    other: [
      `- chore: direct by @pusher in [d1](${REPO}/commit/d1)`,
      `- docs: direct, no login by Dev Name in [e1](${REPO}/commit/e1)`,
    ],
  })
})

test('groupChanges: a BREAKING CHANGE footer in any commit of a pull request makes it breaking', () => {
  const p = pull(20, 'fix: x', [{ title: 'Bug', url: 'u', type: 'Bug', labels: [] }])
  const groups = groupChanges(
    [
      { commit: commit('a', 'fix: x'), login: null, pull: p },
      { commit: commit('b', 'fix: x more', 'BREAKING CHANGE: the field is gone'), login: null, pull: p },
    ],
    REPO,
  )
  assert.equal(groups.breaking.length, 1)
  assert.equal(groups.bugfixes.length, 0)
})
