'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const {
  REPORT_MARKER,
  periodOf,
  inPeriod,
  issueCounts,
  levelCounts,
  agentPrCounts,
  costByFlow,
  attemptCounts,
  renderReport,
  queriesOf,
} = require('./report')

const NOW = new Date('2026-10-24T06:00:00.750Z')
const period = periodOf(NOW, 7)
const labeled = (...names) => ({ labels: names.map((name) => ({ name })) })

test('periodOf covers the days before now, in UTC seconds', () => {
  assert.deepEqual(periodOf(NOW, 7), { from: '2026-10-17T06:00:00Z', to: '2026-10-24T06:00:00Z', days: 7 })
  assert.deepEqual(periodOf('2026-03-01T00:00:00Z', 1), {
    from: '2026-02-28T00:00:00Z',
    to: '2026-03-01T00:00:00Z',
    days: 1,
  })
  assert.equal(periodOf(Date.parse('2026-10-24T06:00:00Z'), 30).from, '2026-09-24T06:00:00Z')
})

test('periodOf rejects days that are not a positive integer, and an invalid date', () => {
  for (const days of [0, -1, 1.5, NaN, '7', undefined]) assert.throws(() => periodOf(NOW, days), /days/)
  assert.throws(() => periodOf('not a date', 7), /now/)
})

test('inPeriod includes both ends and rejects outside, missing, and invalid timestamps', () => {
  assert.equal(inPeriod('2026-10-17T06:00:00Z', period), true)
  assert.equal(inPeriod('2026-10-24T06:00:00.000Z', period), true)
  assert.equal(inPeriod('2026-10-17T05:59:59Z', period), false)
  assert.equal(inPeriod('2026-10-24T06:00:01Z', period), false)
  assert.equal(inPeriod(undefined, period), false)
  assert.equal(inPeriod('yesterday', period), false)
})

test('issueCounts splits suitable, unsuitable, and unassessed, and counts agent:needs-human on top', () => {
  const counts = issueCounts([
    labeled('ai:suitable'),
    labeled('ai:suitable', 'agent:needs-human'),
    labeled('ai:unsuitable'),
    labeled('ai:suitable', 'ai:unsuitable'),
    labeled('bug'),
    { labels: ['agent:needs-human'] },
    {},
  ])
  assert.deepEqual(counts, { total: 7, suitable: 2, unsuitable: 2, unlabeled: 3, needsHuman: 2 })
  assert.deepEqual(issueCounts([]), { total: 0, suitable: 0, unsuitable: 0, unlabeled: 0, needsHuman: 0 })
  assert.equal(issueCounts(undefined).total, 0)
})

test('levelCounts counts by level in order, with the lowest level of a pull request and a "no level" row', () => {
  const result = levelCounts([
    labeled('ai:l1-executor'),
    labeled('ai:l1-executor', 'bug'),
    labeled('ai:l3-autonomous', 'ai:l0-assistant'),
    labeled('dependencies'),
    {},
  ])
  assert.equal(result.total, 5)
  assert.deepEqual(
    result.rows.map((r) => [r.level, r.count]),
    [['ai:l0-assistant', 1], ['ai:l1-executor', 2], ['ai:l2-agent', 0], ['ai:l3-autonomous', 0], [null, 2]],
  )
  assert.deepEqual(result.rows.map((r) => r.share), [0.2, 0.4, 0, 0, 0.4])
})

test('levelCounts gives zero shares for no pull requests', () => {
  const result = levelCounts([])
  assert.equal(result.total, 0)
  assert.equal(result.rows.length, 5)
  assert.ok(result.rows.every((r) => r.count === 0 && r.share === 0))
})

test('agentPrCounts counts completed, draft or needs-human, and merged pull requests', () => {
  const counts = agentPrCounts([
    { ...labeled('agent:completed'), draft: false, pull_request: { merged_at: '2026-10-20T10:00:00Z' } },
    { ...labeled('agent:needs-human'), draft: true, pull_request: { merged_at: null } },
    { ...labeled(), draft: true, pull_request: {} },
    { ...labeled('agent:needs-human', 'ai:l1-executor'), draft: false, pull_request: {} },
    { ...labeled('agent:completed'), draft: false, merged_at: '2026-10-21T10:00:00Z' },
  ])
  assert.deepEqual(counts, { opened: 5, completed: 2, draftOrNeedsHuman: 3, merged: 2 })
  assert.deepEqual(agentPrCounts([]), { opened: 0, completed: 0, draftOrNeedsHuman: 0, merged: 0 })
})

const cost = (extra) => ({
  flow: 'implement', model: 'openai/model-a', variant: 'high', usd: 1, at: '2026-10-20T10:00:00Z', ...extra,
})

test('costByFlow sums the records of the period by flow, by model, and in total', () => {
  const result = costByFlow(
    [
      cost({ flow: 'chat', usd: 0.25, model: 'openai/model-b', variant: null }),
      cost(),
      cost({ flow: 'review', usd: 2 }),
      cost({ flow: 'ci-fix', usd: 0.5 }),
      cost({ flow: 'ci-check', usd: 0.125 }),
      cost({ flow: 'zeta', usd: 0.5 }),
      cost({ flow: 'review', usd: 4, at: '2026-10-10T10:00:00Z' }),
      cost({ usd: 8, at: '2026-10-25T10:00:00Z' }),
      cost({ usd: 8, at: undefined }),
      cost({ usd: 8, at: 'soon' }),
    ],
    period,
  )
  assert.deepEqual(result.flows, [
    { flow: 'review', calls: 1, usd: 2 },
    { flow: 'implement', calls: 1, usd: 1 },
    { flow: 'ci-fix', calls: 1, usd: 0.5 },
    { flow: 'ci-check', calls: 1, usd: 0.125 },
    { flow: 'chat', calls: 1, usd: 0.25 },
    { flow: 'zeta', calls: 1, usd: 0.5 },
  ])
  assert.deepEqual(result.models, [
    { model: 'openai/model-a:high', calls: 5, usd: 4.125 },
    { model: 'openai/model-b', calls: 1, usd: 0.25 },
  ])
  assert.deepEqual(result.total, { calls: 6, usd: 4.375 })
})

test('costByFlow copes with missing fields and with no records', () => {
  const result = costByFlow([{ at: '2026-10-20T10:00:00Z' }, { at: '2026-10-20T10:00:00Z', usd: 'x' }], period)
  assert.deepEqual(result.flows, [{ flow: 'unknown', calls: 2, usd: 0 }])
  assert.deepEqual(result.models, [{ model: 'unknown', calls: 2, usd: 0 }])
  assert.deepEqual(costByFlow(undefined, period), { flows: [], models: [], total: { calls: 0, usd: 0 } })
})

test('attemptCounts counts the attempts of the period by result and counts forced issues', () => {
  const attempt = (result, at = '2026-10-20T10:00:00Z') => ({ n: 1, result, at })
  const result = attemptCounts(
    [
      { attempts: [attempt('ci-green'), attempt('pr-opened'), attempt('error'), attempt('unrelated')] },
      { forced: true, attempts: [attempt('draft'), attempt('ci-red'), attempt('ci-red', '2026-09-01T00:00:00Z')] },
      {
        forced: false,
        attempts: [attempt('stopped'), attempt('blocked'), attempt('odd'), { at: '2026-10-20T10:00:00Z' }],
      },
      { attempts: [{ result: 'ci-green' }] },
      {},
    ],
    period,
  )
  assert.equal(result.total, 10)
  assert.equal(result.forced, 2)
  assert.deepEqual(result.results, [
    { result: 'pr-opened', count: 1 },
    { result: 'draft', count: 1 },
    { result: 'blocked', count: 1 },
    { result: 'unrelated', count: 1 },
    { result: 'ci-green', count: 1 },
    { result: 'ci-red', count: 1 },
    { result: 'error', count: 1 },
    { result: 'stopped', count: 1 },
    { result: 'odd', count: 1 },
    { result: 'unknown', count: 1 },
  ])
})

test('attemptCounts counts an attempt with unrelated: true as unrelated, whatever the CI verdict was', () => {
  const at = '2026-10-20T10:00:00Z'
  const result = attemptCounts(
    [{ attempts: [{ result: 'ci-green', unrelated: true, at }, { result: 'ci-red', unrelated: true, at }, { result: 'ci-red', at }] }],
    period,
  )
  assert.equal(result.total, 3)
  assert.deepEqual(result.results, [{ result: 'unrelated', count: 2 }, { result: 'ci-red', count: 1 }])
})

test('attemptCounts is empty without states', () => {
  assert.deepEqual(attemptCounts([], period), { total: 0, results: [], forced: 0 })
  assert.deepEqual(attemptCounts(undefined, period), { total: 0, results: [], forced: 0 })
})

function sample(overrides = {}) {
  return {
    period,
    issues: issueCounts([labeled('ai:suitable'), labeled('ai:unsuitable'), labeled()]),
    levels: levelCounts([labeled('ai:l1-executor'), labeled('ai:l1-executor'), labeled(), labeled('ai:l0-assistant')]),
    agentPrs: { opened: 2, completed: 1, draftOrNeedsHuman: 1, merged: 1 },
    reviewed: 3,
    costs: costByFlow([cost({ usd: 1.5 }), cost({ flow: 'review', usd: 0.004 })], period),
    attempts: attemptCounts(
      [{ forced: true, attempts: [{ result: 'pr-opened', at: '2026-10-20T10:00:00Z' }] }],
      period,
    ),
    sources: { read: 6, unreadable: 0 },
    ...overrides,
  }
}

test('renderReport writes the heading, one paragraph, and a table per topic', () => {
  const text = renderReport(sample())
  assert.ok(text.startsWith(`${REPORT_MARKER}\n## AI Autonomous report: 2026-10-17 to 2026-10-24\n\n`))
  assert.match(text, /In the last 7 days \(UTC\), 3 Bug and Task issues were created, and 1 was assessed as suitable/)
  assert.match(text, /agent. 4 pull requests were merged\. The agent opened 2 pull requests, 1 of them reached/)
  assert.match(text, /It made 2 AI calls that cost about \$1\.50\./)
  assert.equal(text.match(/estimates/g).length, 1)
  assert.match(text, /\| Unsuitable \(`ai:unsuitable`\) \| 1 \|/)
  assert.match(text, /\| `ai:l1-executor` \| 2 \| 50% \|/)
  assert.match(text, /\| No level \| 1 \| 25% \|/)
  assert.match(text, /\| Merged \| 1 \|/)
  assert.match(text, /\| `pr-opened` \| 1 \|/)
  assert.match(text, /Total: 1 attempt, 1 of them forced\./)
  assert.match(text, /\| review \| 1 \| \$0\.0040 \|/)
  assert.match(text, /\| `openai\/model-a:high` \| 2 \| \$1\.50 \|/)
  assert.match(text, /\*\*Total: \$1\.50\*\* in 2 calls\./)
  assert.match(text, /State comments read: 6\.\n$/)
  assert.ok(text.endsWith('\n') && !text.endsWith('\n\n'))
  for (const line of text.split('\n')) assert.equal(line, line.trimEnd())
})

test('renderReport says so when nothing was recorded, and counts unreadable states', () => {
  const empty = sample({
    issues: issueCounts([]),
    levels: levelCounts([]),
    agentPrs: agentPrCounts([]),
    reviewed: 0,
    costs: costByFlow([], period),
    attempts: attemptCounts([], period),
    sources: { read: 0, unreadable: 2 },
  })
  const text = renderReport({ ...empty, period: periodOf(NOW, 1) })
  assert.match(text, /In the last 1 day \(UTC\), 0 Bug and Task issues were created, and 0 were/)
  assert.match(text, /No attempt was recorded in the period\./)
  assert.match(text, /No AI call was recorded in the period\./)
  assert.match(text, /\| `ai:l0-assistant` \| 0 \| 0% \|/)
  assert.match(text, /2 could not be read and are left out\./)
  assert.doesNotMatch(renderReport({ ...empty, sources: undefined }), /State comments read/)
})

test('queriesOf builds the five searches with the start of the period', () => {
  const q = queriesOf('o/r', period)
  assert.equal(q.bugs, 'repo:o/r is:issue type:Bug created:>=2026-10-17T06:00:00Z')
  assert.equal(q.tasks, 'repo:o/r is:issue type:Task created:>=2026-10-17T06:00:00Z')
  assert.equal(q.merged, 'repo:o/r is:pr is:merged merged:>=2026-10-17T06:00:00Z')
  assert.equal(q.opened, 'repo:o/r is:pr created:>=2026-10-17T06:00:00Z')
  assert.equal(q.reviewed, 'repo:o/r is:pr label:"agent:pr-reviewed" updated:>=2026-10-17T06:00:00Z')
})
