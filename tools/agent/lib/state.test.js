'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const state = require('./state')

const bot = { login: 'github-actions[bot]' }

test('render then parse returns the same state', () => {
  const value = { schema: 1, kind: 'pull', number: 7, phase: 'reviewed', costs: [{ usd: 0.5 }], reviews: [] }
  const body = state.render('## Agent state\n\nAll good.', value)
  assert.ok(body.startsWith(state.MARKER))
  assert.ok(body.includes('All good.'))
  assert.deepEqual(state.parse(body), value)
})

test('the JSON never contains --> and survives dashes in strings', () => {
  const nasty = ['--> injected', 'a--b', 'x---y', '----', '<!-- nested -->', 'back\\slash--', 'ends with -']
  const value = { schema: 1, notes: nasty }
  const body = state.render('human', value)
  // Only the closer of the marker line and the closer of the JSON block may appear.
  assert.equal(body.split('-->').length, 3)
  assert.deepEqual(state.parse(body), value)
})

test('parse returns null when there is no state block', () => {
  assert.equal(state.parse('just a comment'), null)
  assert.equal(state.parse(`${state.MARKER}\nhuman text only`), null)
  assert.equal(state.parse(''), null)
  assert.equal(state.parse(null), null)
})

test('parse throws on a damaged block', () => {
  assert.throws(() => state.parse(`${state.MARKER}\nx\n\n<!-- ai-autonomous-state-json\n{ nope }\n-->`), /invalid JSON/)
  assert.throws(() => state.parse(`${state.MARKER}\nx\n\n<!-- ai-autonomous-state-json\n{"a":1}`), /not closed/)
  assert.throws(() => state.parse('<!-- ai-autonomous-state-json\n[1]\n-->'), /JSON object/)
  assert.throws(() => state.parse('<!-- ai-autonomous-state-json\nnull\n-->'), /JSON object/)
})

test('a human part that quotes the opener does not hide the real block', () => {
  const body = state.render('see `<!-- ai-autonomous-state-json` in the docs', { schema: 1, ok: true })
  assert.deepEqual(state.parse(body), { schema: 1, ok: true })
})

test('findStateComment ignores other authors and comments without the marker', () => {
  const forged = { id: 1, user: { login: 'mallory' }, body: `${state.MARKER}\nforged` }
  const chatter = { id: 2, user: bot, body: 'Review is done' }
  const quoted = { id: 3, user: bot, body: `text first ${state.MARKER}` }
  const real = { id: 4, user: bot, body: `${state.MARKER}\nreal` }
  const later = { id: 5, user: bot, body: `${state.MARKER}\nlater` }
  assert.equal(state.findStateComment([forged, chatter, quoted, real, later]), real)
  assert.equal(state.findStateComment([forged, chatter]), null)
  assert.equal(state.findStateComment([]), null)
  assert.equal(state.findStateComment([{ id: 6, body: state.MARKER }, { id: 7, user: bot }]), null)
  assert.equal(state.findStateComment(undefined), null)
})

test('empty states have the documented shape', () => {
  assert.deepEqual(state.emptyIssueState(12), { schema: 1, kind: 'issue', number: 12, phase: null, costs: [] })
  assert.deepEqual(state.emptyPullState(34), {
    schema: 1,
    kind: 'pull',
    number: 34,
    phase: null,
    costs: [],
    reviews: [],
  })
})

test('addCost returns a new state and leaves the input alone', () => {
  const before = state.emptyIssueState(1)
  const after = state.addCost(before, { run: 'r1', usd: 1 })
  assert.deepEqual(before.costs, [])
  assert.deepEqual(after.costs, [{ run: 'r1', usd: 1 }])
  assert.notEqual(after, before)
  const twice = state.addCost(after, { run: 'r2', usd: 2 })
  assert.deepEqual(
    twice.costs.map((cost) => cost.run),
    ['r1', 'r2'],
  )
  assert.deepEqual(state.addCost({ schema: 1 }, { run: 'r' }).costs, [{ run: 'r' }])
})

test('actorOf: the running attempt, else the last attempt, else null', () => {
  assert.equal(state.actorOf(null), null)
  assert.equal(state.actorOf({}), null)
  assert.equal(state.actorOf({ attempts: [{ n: 1 }] }), null)
  assert.equal(state.actorOf({ attempts: [{ n: 1, actor: 'carol' }, { n: 2, actor: 'dave' }] }), 'dave')
  assert.equal(state.actorOf({ attempts: [{ actor: 'carol' }], implementing: { actor: 'erin' } }), 'erin')
  assert.equal(state.actorOf({ attempts: [{ actor: 'carol' }], implementing: {} }), 'carol')
})

test('replaceState swaps the state block and keeps the human part', () => {
  const before = state.render('### AI review\n\nSummary.', { schema: 1, costs: [] })
  const after = state.replaceState(before, { schema: 1, costs: [{ usd: 1 }] })
  assert.equal(after, state.render('### AI review\n\nSummary.', { schema: 1, costs: [{ usd: 1 }] }))
  assert.deepEqual(state.parse(after).costs, [{ usd: 1 }])
  assert.equal(state.replaceState('no block at all', { a: 1 }), state.render('no block at all', { a: 1 }))
  assert.deepEqual(state.parse(state.replaceState(undefined, { a: 1 })), { a: 1 })
})

test('mergeCosts keeps the records of both states once and the rest of `mine`', () => {
  const a = { run: 'r1', role: 'implementer', at: 't1', usd: 1 }
  const b = { run: 'r2', role: 'assistant', at: 't2', usd: 0.25 }
  const c = { run: 'r3', role: 'reviewer', at: 't3', usd: 0.5 }
  const fresh = { phase: 'stopped', costs: [a, b] }
  const mine = { phase: 'waiting-ci', pr: 7, costs: [{ ...a }, c] }
  const merged = state.mergeCosts(fresh, mine)
  assert.deepEqual(merged.costs, [a, b, c])
  assert.deepEqual([merged.phase, merged.pr], ['waiting-ci', 7])
  // Neither input changes.
  assert.deepEqual(mine.costs.length, 2)
  assert.deepEqual(fresh.costs, [a, b])
})

test('mergeCosts tells records apart by run, role, time, and price', () => {
  const base = { run: 'r1', role: 'implementer', at: 't1', usd: 1 }
  const others = [{ ...base, run: 'r2' }, { ...base, role: 'reviewer' }, { ...base, at: 't2' }, { ...base, usd: 2 }]
  const merged = state.mergeCosts({ costs: [base] }, { costs: others })
  assert.equal(merged.costs.length, 5)
})

test('mergeCosts accepts a missing fresh state and missing cost lists', () => {
  const mine = { phase: 'x', costs: [{ run: 'r1', role: 'a', at: 't', usd: 1 }] }
  assert.deepEqual(state.mergeCosts(null, mine), mine)
  assert.deepEqual(state.mergeCosts({ phase: 'y' }, { phase: 'x' }), { phase: 'x', costs: [] })
})

test('withFreshCosts reads the comment now and merges its costs into `mine`', async () => {
  const added = { run: 'r9', role: 'assistant', at: 't9', usd: 0.1 }
  const body = state.render('human', { schema: 1, phase: 'implementing', costs: [added] })
  const comments = [{ id: 1, user: { login: 'bob' }, body: 'hi' }, { id: 5, user: bot, body }]
  const listed = []
  const gh = { listIssueComments: async (n) => (listed.push(n), comments) }
  const mine = { schema: 1, phase: 'waiting-ci', costs: [] }
  assert.deepEqual(await state.withFreshCosts(gh, 200, mine), { ...mine, costs: [added] })
  assert.deepEqual(listed, [200])
  // No state comment yet: `mine` is what it was.
  const empty = { listIssueComments: async () => [] }
  assert.deepEqual(await state.withFreshCosts(empty, 200, mine), mine)
})
