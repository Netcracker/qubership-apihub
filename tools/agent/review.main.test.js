'use strict'
// main() of review.js on the path that stops before any model call: a diff above the size limit. The path that runs the
// models needs Git and opencode and is not tested here. The size rules are in lib/review-size.test.js.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const log = require('./lib/log')
const state = require('./lib/state')
const { main } = require('./review')

log.setWriter(() => {})

const RUN = 'https://github.com/o/r/actions/runs/1'
const HEAD = 'abcdef0123456789abcdef0123456789abcdef01'

function fakeGh({ files, comments = [] }) {
  const calls = []
  const record = (name) => async (...args) => (calls.push([name, ...args]), { id: 77 })
  return {
    calls,
    getPull: async () => ({ title: 'Big change', base: { ref: 'develop' }, head: { sha: HEAD }, user: { login: 'alice' } }),
    listPullFiles: async () => files,
    listIssueComments: async () => comments,
    createIssueComment: record('createIssueComment'),
    updateIssueComment: record('updateIssueComment'),
    addLabels: record('addLabels'),
    createReview: record('createReview'),
  }
}

const bigFiles = [{ filename: 'a.go', additions: 4000, deletions: 1001 }]

async function run({ gh, env = {} }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'review-test-'))
  const fullEnv = {
    AGENT_NUMBER: '123',
    AGENT_RUN_URL: RUN,
    AGENT_OUT: path.join(dir, 'out'),
    AGENT_DRY_RUN: 'false',
    GITHUB_STEP_SUMMARY: path.join(dir, 'summary'),
    ...env,
  }
  // A call that would start a model needs the facts first; failing here proves that none was reached.
  const computeFacts = () => assert.fail('the facts must not be computed for a skipped review')
  try {
    await main(fullEnv, { gh, computeFacts })
    const summary = fs.existsSync(fullEnv.GITHUB_STEP_SUMMARY) ? fs.readFileSync(fullEnv.GITHUB_STEP_SUMMARY, 'utf8') : ''
    return { summary, files: fs.readdirSync(fullEnv.AGENT_OUT) }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

test('a diff above the limit gets a state comment and nothing else: no model, no label, no review', async () => {
  const gh = fakeGh({ files: bigFiles })
  const { files } = await run({ gh })
  assert.deepEqual(gh.calls.map((c) => c[0]), ['createIssueComment'])
  const [, number, body] = gh.calls[0]
  assert.equal(number, 123)
  assert.match(body, /^<!-- ai-autonomous-state -->\n### AI review of abcdef0 skipped\n\nThe diff has 5001 changed lines in 1 files/)
  assert.match(body, /Comment `\/agent review force` to review it anyway\./)
  const saved = state.parse(body)
  assert.equal(saved.reviews.length, 1)
  assert.deepEqual(
    { ...saved.reviews[0], at: 'x' },
    { sha: HEAD, run: RUN, at: 'x', skipped: 'size', lines: 5001, files: 1, trigger: 'auto' },
  )
  assert.deepEqual(files, [])
})

test('the skip keeps the cost records and updates the existing state comment', async () => {
  const before = { ...state.emptyPullState(123), costs: [{ run: 'r0', role: 'pr-reviewer', at: 't', usd: 0.5 }] }
  const comments = [{ id: 9, user: { login: 'github-actions[bot]' }, body: state.render('old', before) }]
  const gh = fakeGh({ files: bigFiles, comments })
  await run({ gh, env: { AGENT_COMMAND: JSON.stringify({ name: 'review', force: false, notes: '' }) } })
  assert.deepEqual(gh.calls.map((c) => [c[0], c[1]]), [['updateIssueComment', 9]])
  const saved = state.parse(gh.calls[0][2])
  assert.deepEqual(saved.costs, before.costs)
  assert.equal(saved.reviews[0].trigger, 'command')
  assert.equal(saved.reviews[0].skipped, 'size')
})

test('too many files skip too, with the file limit from the environment', async () => {
  const many = Array.from({ length: 4 }, (_, i) => ({ filename: `f${i}.go`, additions: 1, deletions: 0 }))
  const gh = fakeGh({ files: many })
  await run({ gh, env: { AGENT_REVIEW_MAX_FILES: '3' } })
  assert.deepEqual(gh.calls.map((c) => c[0]), ['createIssueComment'])
  assert.match(gh.calls[0][2], /The diff has 4 changed lines in 4 files .*above the limit of 5000 lines or 3 files/)
})

test('in dry-run the skip goes to the job summary and nothing is written to GitHub', async () => {
  const gh = fakeGh({ files: bigFiles })
  const { summary } = await run({ gh, env: { AGENT_DRY_RUN: 'true' } })
  assert.deepEqual(gh.calls, [])
  assert.match(summary, /## Dry run: AI review of #123\n\n### AI review of abcdef0 skipped/)
})
