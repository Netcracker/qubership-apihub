'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const state = require('./state')
const { publishResult, previewResult, resultMarker, legacyResults } = require('./results')

const BOT = 'github-actions[bot]'

/** A fake client over a list of comments (oldest first). */
function fakeGh(initial = []) {
  const comments = initial.map((c, i) => ({ id: 100 + i, user: { login: BOT }, created_at: String(i), ...c }))
  let next = 1000
  return {
    comments,
    listIssueComments: async () => comments.map((c) => ({ ...c })),
    createIssueComment: async (n, body) => {
      const c = { id: next++, user: { login: BOT }, body }
      comments.push(c)
      return { ...c }
    },
    updateIssueComment: async (id, body) => {
      const c = comments.find((x) => x.id === id)
      if (!c) throw new Error(`no comment ${id}`)
      c.body = body
      return { ...c }
    },
  }
}

const empty = () => state.emptyIssueState(7)
const cost = (run, usd, extra = {}) => ({ run, flow: 'x', role: 'analyst', model: 'p/m', variant: 'high', usd, at: run, ...extra })
const stateBody = (human, st) => state.render(human, st)
const stateOf = (c) => state.parse(c.body)

test('first write on an empty issue creates the state comment with the signed text', async () => {
  const gh = fakeGh()
  const st = { ...empty(), costs: [cost('r1', 0.5)] }
  const { st: st2, commentId } = await publishResult(gh, 7, { family: 'analysis', human: '### AI analysis\nok', st, run: 'r1', emptyState: empty })
  assert.equal(gh.comments.length, 1)
  assert.equal(commentId, gh.comments[0].id)
  assert.ok(gh.comments[0].body.startsWith(state.MARKER))
  assert.match(gh.comments[0].body, /<sub>🤖 m high usd=0.5<\/sub>/)
  assert.deepEqual(st2.results, [{ family: 'analysis', id: 'state', runs: ['r1'] }])
  assert.deepEqual(stateOf(gh.comments[0]).results, st2.results)
})

test('without any state the empty state is used', async () => {
  const gh = fakeGh()
  const { st } = await publishResult(gh, 7, { family: 'review', human: 'x', run: 'r1', emptyState: empty })
  assert.equal(st.number, 7)
  assert.equal(gh.comments.length, 1)
  assert.equal(gh.comments[0].body.includes('<sub>'), false)
})

test('legacy state: the heading names the owner and its runs skip chat and ci-check', () => {
  const st = { costs: [cost('r1', 1), cost('r1', 1, { role: 'b' }), cost('r2', 1, { flow: 'chat' }), cost('r3', 1, { flow: 'ci-check' }), cost('r4', 1)] }
  const owner = (heading) => legacyResults({ body: `${state.MARKER}\n${heading}\ntext\n\n<!-- ai-autonomous-state-json\n{}\n-->` }, st)
  assert.deepEqual(owner('### AI analysis'), [{ family: 'analysis', id: 'state', runs: ['r1', 'r4'] }])
  assert.equal(owner('### AI update')[0].family, 'implementation')
  assert.equal(owner('### AI implementation')[0].family, 'implementation')
  assert.equal(owner('### AI review')[0].family, 'review')
  assert.deepEqual(owner('### AI Autonomous agent'), [])
  assert.deepEqual(legacyResults(null, st), [])
})

test('legacy owner of the same family keeps the state comment and adds the run', async () => {
  const st = { ...empty(), costs: [cost('r1', 1), cost('r2', 2)] }
  const gh = fakeGh([{ body: stateBody('### AI analysis\nold', st) }])
  const { st: st2, commentId } = await publishResult(gh, 7, { family: 'analysis', human: '### AI analysis\nnew', run: 'r2', st, emptyState: empty })
  assert.equal(gh.comments.length, 1)
  assert.equal(commentId, 100)
  assert.deepEqual(st2.results, [{ family: 'analysis', id: 'state', runs: ['r1', 'r2'] }])
  assert.match(gh.comments[0].body, /new/)
  assert.match(gh.comments[0].body, /usd=3>?<\/sub>/)
})

test('another family gets its own result comment and the state comment keeps its human part', async () => {
  const st = { ...empty(), costs: [cost('r1', 1)] }
  const gh = fakeGh([{ body: stateBody('### AI analysis\nanalysis text', st) }])
  const withRun = { ...st, costs: [...st.costs, cost('r2', 2, { role: 'implementer' })] }
  const { st: st2, commentId } = await publishResult(gh, 7, { family: 'implementation', human: '### AI implementation\nimpl', st: withRun, run: 'r2', emptyState: empty })
  assert.equal(gh.comments.length, 2)
  assert.equal(commentId, gh.comments[1].id)
  assert.ok(gh.comments[1].body.startsWith(resultMarker('implementation') + '\n'))
  assert.equal(gh.comments[1].body.startsWith(state.MARKER), false)
  assert.match(gh.comments[1].body, /usd=2<\/sub>/)
  assert.match(gh.comments[0].body, /analysis text/)
  assert.deepEqual(st2.results, [
    { family: 'analysis', id: 'state', runs: ['r1'] },
    { family: 'implementation', id: commentId, runs: ['r2'] },
  ])
  assert.equal(state.findStateComment(gh.comments), gh.comments[0])
  assert.deepEqual(stateOf(gh.comments[0]).results, st2.results)
})

test('a continuing command edits its comment; a new command edits it only when it is the newest', async () => {
  const st = { ...empty(), costs: [cost('r1', 1)], results: [{ family: 'analysis', id: 'state', runs: ['r1'] }, { family: 'implementation', id: 101, runs: [] }] }
  const gh = fakeGh([
    { body: stateBody('### AI analysis\na', st) },
    { body: `${resultMarker('implementation')}\nold\n` },
  ])
  // Implementation is the newest: a new command edits it.
  let out = await publishResult(gh, 7, { family: 'implementation', human: 'v2', st, run: 'r2', newCommand: true, emptyState: empty })
  assert.equal(out.commentId, 101)
  assert.equal(gh.comments.length, 2)
  // Analysis is not the newest: a continuing write edits it, a new command creates a new comment.
  out = await publishResult(gh, 7, { family: 'analysis', human: 'a2', st: out.st, run: 'r3', newCommand: false, emptyState: empty })
  assert.equal(out.commentId, 100)
  assert.equal(gh.comments.length, 2)
  out = await publishResult(gh, 7, { family: 'analysis', human: 'a3', st: out.st, run: 'r4', newCommand: true, emptyState: empty })
  assert.equal(gh.comments.length, 3)
  assert.equal(out.commentId, gh.comments[2].id)
  const analysis = out.st.results.filter((e) => e.family === 'analysis')
  assert.deepEqual(analysis, [{ family: 'analysis', id: out.commentId, runs: ['r4'] }])
})

test('an entry whose comment was deleted gets a new comment', async () => {
  const st = { ...empty(), results: [{ family: 'review', id: 555, runs: ['r1'] }, { family: 'analysis', id: 'state', runs: [] }] }
  const gh = fakeGh([{ body: stateBody('### AI analysis\na', st) }])
  const out = await publishResult(gh, 7, { family: 'review', human: 'rev', st, run: 'r2', emptyState: empty })
  assert.equal(gh.comments.length, 2)
  assert.equal(out.commentId, gh.comments[1].id)
  assert.deepEqual(out.st.results.find((e) => e.family === 'review'), { family: 'review', id: out.commentId, runs: ['r2'] })
})

test('a placeholder state comment is taken over', async () => {
  const st = { ...empty(), costs: [cost('r1', 1, { flow: 'chat' }), cost('r2', 2)] }
  const gh = fakeGh([{ body: stateBody('### AI Autonomous agent', st) }])
  const out = await publishResult(gh, 7, { family: 'implementation', human: '### AI implementation\nrunning', st, run: 'r2', emptyState: empty })
  assert.equal(gh.comments.length, 1)
  assert.equal(out.commentId, 100)
  assert.deepEqual(out.st.results, [{ family: 'implementation', id: 'state', runs: ['r2'] }])
  assert.match(gh.comments[0].body, /running/)
  assert.match(gh.comments[0].body, /usd=2<\/sub>/)
})

test('the signature sums every run of the comment, each run once', async () => {
  const st = {
    ...empty(),
    costs: [cost('r1', 1, { input: 1000 }), cost('r2', 2, { input: 2000 }), cost('r2', 0.5, { input: 500, role: 'b', at: 'z' }), cost('r3', 9)],
    results: [{ family: 'analysis', id: 'state', runs: ['r1'] }],
  }
  const gh = fakeGh([{ body: stateBody('### AI analysis\na', st) }])
  const out = await publishResult(gh, 7, { family: 'analysis', human: 'a', st, run: 'r2', emptyState: empty })
  assert.deepEqual(out.st.results[0].runs, ['r1', 'r2'])
  assert.match(gh.comments[0].body, /in=3.5k usd=3.5<\/sub>/)
})

test('costs written to the comment since the state was loaded are merged', async () => {
  const onGithub = { ...empty(), costs: [cost('r0', 4, { flow: 'chat', at: 'c' })] }
  const gh = fakeGh([{ body: stateBody('### AI Autonomous agent', onGithub) }])
  const mine = { ...empty(), costs: [cost('r1', 1)] }
  const out = await publishResult(gh, 7, { family: 'analysis', human: 'a', st: mine, run: 'r1', emptyState: empty })
  assert.deepEqual(out.st.costs.map((c) => c.run), ['r0', 'r1'])
  assert.deepEqual(stateOf(gh.comments[0]).costs.map((c) => c.run), ['r0', 'r1'])
  assert.match(gh.comments[0].body, /usd=1<\/sub>/)
})

test('previewResult signs with the records of the run only', () => {
  const st = { costs: [cost('r1', 1), cost('r2', 2)] }
  assert.equal(previewResult({ family: 'analysis', human: 'h', st, run: 'r2' }), 'h\n\n<sub>🤖 m high usd=2</sub>')
  assert.equal(previewResult({ family: 'analysis', human: 'h', st, run: 'none' }), 'h')
})
