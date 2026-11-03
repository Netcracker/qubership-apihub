'use strict'
// chat() of chat.js over a fake GitHub client and a fake opencode. The pure functions are in chat.test.js.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const log = require('./lib/log')
const state = require('./lib/state')
const { GitHubError } = require('./lib/github')
const { chat, main } = require('./chat')

log.setWriter(() => {})

const FENCE = '```'
const RUN = 'https://github.com/o/r/actions/runs/7'
const RUNNING = 'https://github.com/o/r/actions/runs/555'
const BRANCH = 'bugfix/200-changelog-is-empty-for-a'

const issue = {
  number: 200,
  state: 'open',
  title: 'Changelog is empty for a package with no operations',
  body: 'Steps: publish, open the changelog.',
  type: { name: 'Bug' },
  user: { login: 'alice' },
  created_at: '2026-10-01T09:00:00Z',
}
const agentPull = {
  number: 70,
  state: 'open',
  title: 'fix(portal-backend): guard the nil changelog',
  body: 'Closes #200.\n\n<!-- ai-autonomous-agent issue=200 -->\n',
  user: { login: 'agent-owner' },
  pull_request: { url: 'x' },
}
const personPull = {
  number: 123,
  state: 'open',
  title: 'feat(ui): add search box',
  body: 'Adds a search box.',
  user: { login: 'alice' },
  pull_request: { url: 'x' },
}

const cost = (extra = {}) => ({
  run: RUN, flow: 'implement', role: 'implementer', model: 'openai/gpt-6.1-sol', variant: 'high',
  input: 100, cached: 50, output: 20, reasoning: 0, usd: 1, at: '2026-10-21T10:00:00.000Z', ...extra,
})
const issueState = (extra = {}) => ({
  schema: 1,
  kind: 'issue',
  number: 200,
  phase: 'needs-human',
  branch: BRANCH,
  pr: 70,
  attempts: [{ n: 1, kind: 'initial', actor: 'carol', result: 'draft', notes: 'Tried a guard.' }],
  costs: [cost(), cost({ flow: 'analyze', role: 'analyst', usd: 0.25, at: '2026-10-20T10:00:00.000Z' })],
  ...extra,
})
const pullState = (extra = {}) => ({
  ...state.emptyPullState(70),
  costs: [cost({ flow: 'review', role: 'pr-reviewer', usd: 2, at: '2026-10-22T10:00:00.000Z' })],
  reviews: [{ sha: 'a' }],
  ...extra,
})
const botComment = (id, st, human = 'The human part.') => ({
  id, user: { login: 'github-actions[bot]' }, body: state.render(human, st),
})

/**
 * A GitHub client over targets by number: `targets[n]` is `{ issue, comments }`. It keeps the comments like GitHub does
 * and records every write in order.
 */
function fakeGh(targets, { cancel = true, cancelError = null, reactionFails = false } = {}) {
  const calls = []
  let nextId = 1000
  const at = (n) => {
    assert.ok(targets[n], `unexpected number ${n}`)
    return targets[n]
  }
  return {
    calls,
    targets,
    getIssue: async (n) => ({ ...at(n).issue }),
    listIssueComments: async (n) => at(n).comments.map((c) => ({ ...c })),
    getPull: async (n) => (calls.push(['getPull', n]), { number: n, base: { ref: 'develop' }, head: { sha: 'abc' } }),
    createIssueComment: async (n, body) => {
      const created = { id: nextId++, user: { login: 'github-actions[bot]' }, body }
      at(n).comments.push(created)
      calls.push(['createIssueComment', n, body])
      return created
    },
    updateIssueComment: async (id, body) => {
      for (const t of Object.values(targets)) {
        const found = t.comments.find((c) => c.id === id)
        if (found) found.body = body
      }
      calls.push(['updateIssueComment', id, body])
    },
    removeLabel: async (n, label) => calls.push(['removeLabel', n, label]),
    cancelRun: async (id) => {
      calls.push(['cancelRun', id])
      if (cancelError) throw cancelError
      return cancel
    },
    addReaction: async (id, content) => {
      if (reactionFails) throw new Error('Resource not accessible')
      calls.push(['addReaction', id, content])
    },
  }
}

function eventsFor(answer) {
  const text = typeof answer === 'string' ? answer : `Here.\n${FENCE}json\n${JSON.stringify(answer)}\n${FENCE}`
  const step = { type: 'step_finish', part: { tokens: { input: 100, output: 20, cache: { read: 50 } }, cost: 0.01 } }
  return [step, { type: 'text', part: { text } }].map((e) => JSON.stringify(e)).join('\n')
}

/** An opencode that answers from a queue and keeps the input text it was given. */
function fakeRunAgent(answers) {
  const queue = [...answers]
  const runs = []
  const runAgent = async (options) => {
    runs.push({ agent: options.agent, model: options.model, inputText: fs.readFileSync(options.files[0], 'utf8') })
    const next = queue.shift()
    assert.ok(next !== undefined, 'unexpected call of the assistant')
    return { exitCode: 0, eventsText: eventsFor(next), stderrTail: '' }
  }
  runAgent.runs = runs
  return runAgent
}

function setup({ targets, number = 200, command, env = {}, runAgent, ...options }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-test-'))
  const fullEnv = {
    GITHUB_REPOSITORY: 'o/r',
    AGENT_NUMBER: String(number),
    AGENT_COMMAND: JSON.stringify(command),
    AGENT_ACTOR: 'carol',
    AGENT_COMMENT_ID: '9101',
    AGENT_RUN_URL: RUN,
    AGENT_OUT: path.join(dir, 'out'),
    AGENT_DRY_RUN: 'false',
    GITHUB_STEP_SUMMARY: path.join(dir, 'summary'),
    ...env,
  }
  const gh = fakeGh(targets, options)
  return {
    env: fullEnv,
    gh,
    deps: { gh, runAgent },
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
    summary: () => {
      const file = fullEnv.GITHUB_STEP_SUMMARY
      return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
    },
    out: (name) => fs.readFileSync(path.join(fullEnv.AGENT_OUT, name), 'utf8'),
  }
}

async function withContext(options, fn) {
  const ctx = setup(options)
  try {
    return await fn(ctx)
  } finally {
    ctx.cleanup()
  }
}

const cmd = (name, notes = '') => ({ name, force: false, notes })
const writes = (gh) => gh.calls.filter((c) => c[0] !== 'addReaction' && c[0] !== 'getPull')
const reactions = (gh) => gh.calls.filter((c) => c[0] === 'addReaction').map((c) => c[2])
const issueOnly = (comments = []) => ({ 200: { issue, comments } })

// ------------------------------------------------------------------------------------------------ help

test('help on an issue replies with the commands of an issue and reacts with eyes, then a rocket', async () => {
  await withContext({ targets: issueOnly(), command: cmd('help') }, async (ctx) => {
    assert.deepEqual(await chat(ctx.env, ctx.deps), { command: 'help', ok: true })
    const [reply] = writes(ctx.gh)
    assert.deepEqual(reply.slice(0, 2), ['createIssueComment', 200])
    assert.match(reply[2], /^@carol, these commands work here:/)
    assert.ok(reply[2].includes('`/agent implement [notes]`'))
    assert.deepEqual(reactions(ctx.gh), ['eyes', 'rocket'])
    assert.deepEqual(ctx.gh.calls.filter((c) => c[0] === 'addReaction')[0].slice(0, 2), ['addReaction', 9101])
  })
})

test('help on a pull request of a person and on a pull request of the agent differ', async () => {
  const targets = {
    123: { issue: personPull, comments: [] },
    70: { issue: agentPull, comments: [botComment(5, pullState())] },
    200: { issue, comments: [botComment(6, issueState())] },
  }
  await withContext({ targets, number: 123, command: cmd('help') }, async (ctx) => {
    await chat(ctx.env, ctx.deps)
    assert.ok(writes(ctx.gh)[0][2].includes('`/agent review [notes]`'))
    assert.ok(!writes(ctx.gh)[0][2].includes('/agent stop'))
  })
  await withContext({ targets, number: 70, command: cmd('help') }, async (ctx) => {
    await chat(ctx.env, ctx.deps)
    assert.ok(writes(ctx.gh)[0][2].includes('`/agent <text>`'))
  })
  // A marker that the issue state does not confirm is a pull request of a person.
  const forged = { ...targets, 200: { issue, comments: [botComment(6, issueState({ pr: 99 }))] } }
  await withContext({ targets: forged, number: 70, command: cmd('help') }, async (ctx) => {
    await chat(ctx.env, ctx.deps)
    assert.ok(writes(ctx.gh)[0][2].includes('`/agent <question>`'))
  })
})

// ------------------------------------------------------------------------------------------------ cost

test('cost on an issue adds the cost records of its pull request', async () => {
  const targets = {
    200: { issue, comments: [botComment(6, issueState())] },
    70: { issue: agentPull, comments: [botComment(5, pullState())] },
  }
  await withContext({ targets, command: cmd('cost') }, async (ctx) => {
    await chat(ctx.env, ctx.deps)
    const text = writes(ctx.gh)[0][2]
    assert.match(text, /^@carol, the AI calls recorded for issue #200 and pull request #70:/)
    assert.ok(text.includes('**Total: $3.25** in 3 call(s).'))
    assert.ok(text.includes('- analyze: 1 call(s), $0.25'))
    assert.ok(text.includes('- review: 1 call(s), $2.00'))
    // The rows are in time order across both states.
    const rows = text.split('\n').filter((l) => l.startsWith('| 2026'))
    assert.deepEqual(rows.map((r) => r.slice(2, 12)), ['2026-10-20', '2026-10-21', '2026-10-22'])
    // The sum of the table is the sum of the records in the states.
    assert.equal(
      issueState().costs.concat(pullState().costs).reduce((total, c) => total + c.usd, 0),
      3.25,
    )
  })
})

test('cost on a pull request of the agent adds its issue; on a pull request of a person it is that alone', async () => {
  const targets = {
    200: { issue, comments: [botComment(6, issueState())] },
    70: { issue: agentPull, comments: [botComment(5, pullState())] },
    123: { issue: personPull, comments: [botComment(7, { ...state.emptyPullState(123), costs: [cost({ usd: 4 })] })] },
  }
  await withContext({ targets, number: 70, command: cmd('cost') }, async (ctx) => {
    await chat(ctx.env, ctx.deps)
    const text = writes(ctx.gh)[0][2]
    assert.match(text, /recorded for pull request #70 and issue #200:/)
    assert.ok(text.includes('**Total: $3.25** in 3 call(s).'))
  })
  await withContext({ targets, number: 123, command: cmd('cost') }, async (ctx) => {
    await chat(ctx.env, ctx.deps)
    const text = writes(ctx.gh)[0][2]
    assert.match(text, /recorded for pull request #123:/)
    assert.ok(text.includes('**Total: $4.00** in 1 call(s).'))
  })
})

test('cost with no record says so', async () => {
  await withContext({ targets: issueOnly(), command: cmd('cost') }, async (ctx) => {
    await chat(ctx.env, ctx.deps)
    assert.equal(writes(ctx.gh)[0][2], '@carol, no AI call is recorded for issue #200 yet.')
  })
})

// ------------------------------------------------------------------------------------------------ stop

test('stop with a running attempt: the phase first, then the cancel, the labels, and the reply', async () => {
  const running = issueState({ phase: 'implementing', implementing: { run: RUNNING, actor: 'carol', at: 't' } })
  const targets = { 200: { issue, comments: [botComment(6, running)] } }
  await withContext({ targets, command: cmd('stop') }, async (ctx) => {
    assert.deepEqual(await chat(ctx.env, ctx.deps), { command: 'stop', ok: true })
    assert.deepEqual(writes(ctx.gh).map((c) => c[0]), [
      'updateIssueComment', 'cancelRun', 'removeLabel', 'removeLabel', 'createIssueComment',
    ])
    const saved = state.parse(targets[200].comments[0].body)
    assert.equal(saved.phase, 'stopped')
    assert.equal(saved.stoppedBy, 'carol')
    assert.match(saved.stoppedAt, /^\d{4}-\d\d-\d\dT/)
    // The running attempt stays in the state: publish compares its run with its own.
    assert.equal(saved.implementing.run, RUNNING)
    assert.equal(saved.pr, 70)
    assert.ok(saved.costs.length === 2 && saved.attempts.length === 1)
    assert.match(targets[200].comments[0].body, /^<!-- ai-autonomous-state -->\n### AI implementation was stopped/)
    assert.deepEqual(writes(ctx.gh).filter((c) => c[0] === 'cancelRun')[0], ['cancelRun', 555])
    assert.deepEqual(
      writes(ctx.gh).filter((c) => c[0] === 'removeLabel').map((c) => c.slice(1)),
      [[200, 'agent:needs-human'], [70, 'agent:needs-human']],
    )
    const reply = writes(ctx.gh).at(-1)[2]
    assert.match(reply, /^@carol, I stopped\. I cancelled the running attempt \(run 555\)\./)
    assert.match(reply, /`\/agent implement` on the issue, or `\/agent retry`/)
    assert.deepEqual(reactions(ctx.gh), ['eyes', 'rocket'])
  })
})

test('stop on a pull request of the agent stops the flow of its issue', async () => {
  const waiting = issueState({ phase: 'waiting-ci' })
  const targets = {
    200: { issue, comments: [botComment(6, waiting)] },
    70: { issue: agentPull, comments: [] },
  }
  await withContext({ targets, number: 70, command: cmd('stop') }, async (ctx) => {
    await chat(ctx.env, ctx.deps)
    assert.equal(state.parse(targets[200].comments[0].body).phase, 'stopped')
    assert.ok(writes(ctx.gh).every((c) => c[0] !== 'cancelRun'))
    const reply = writes(ctx.gh).at(-1)
    assert.deepEqual(reply.slice(0, 2), ['createIssueComment', 70])
    assert.match(reply[2], /stopped waiting for CI on pull request #70/)
  })
})

test('stop: a finished run (409) is no error; a run of another repository is not cancelled', async () => {
  const running = issueState({ phase: 'implementing', implementing: { run: RUNNING, actor: 'carol', at: 't' } })
  const finished = { 200: { issue, comments: [botComment(6, running)] } }
  await withContext({ targets: finished, command: cmd('stop'), cancel: false }, async (ctx) => {
    await chat(ctx.env, ctx.deps)
    assert.match(writes(ctx.gh).at(-1)[2], /The run 555 had already finished\./)
  })
  const foreign = issueState({
    phase: 'implementing', implementing: { run: 'https://github.com/other/repo/actions/runs/9', at: 't' },
  })
  await withContext({ targets: { 200: { issue, comments: [botComment(6, foreign)] } }, command: cmd('stop') },
    async (ctx) => {
      await chat(ctx.env, ctx.deps)
      assert.ok(writes(ctx.gh).every((c) => c[0] !== 'cancelRun'))
      assert.match(writes(ctx.gh).at(-1)[2], /not one of this repository/)
    })
})

test('stop: a failed cancel is reported in the reply, the state is already stopped, and the job fails', async () => {
  const running = issueState({ phase: 'implementing', implementing: { run: RUNNING, actor: 'carol', at: 't' } })
  const targets = { 200: { issue, comments: [botComment(6, running)] } }
  const cancelError = new GitHubError('GitHub POST failed with 403: nope', { status: 403 })
  await withContext({ targets, command: cmd('stop'), cancelError }, async (ctx) => {
    await assert.rejects(chat(ctx.env, ctx.deps), /403/)
    assert.equal(state.parse(targets[200].comments[0].body).phase, 'stopped')
    assert.match(writes(ctx.gh).at(-1)[2], /I could not cancel the run: GitHub POST failed with 403/)
    assert.deepEqual(reactions(ctx.gh), ['eyes', 'confused'])
  })
})

test('stop: nothing to stop, already stopped, and a pull request of a person change nothing', async () => {
  await withContext({ targets: issueOnly(), command: cmd('stop') }, async (ctx) => {
    assert.equal((await chat(ctx.env, ctx.deps)).ok, false)
    assert.match(writes(ctx.gh)[0][2], /nothing to stop: the agent has done no work on #200/)
    assert.deepEqual(reactions(ctx.gh), ['eyes', 'confused'])
  })
  const stopped = issueState({ phase: 'stopped' })
  await withContext({ targets: { 200: { issue, comments: [botComment(6, stopped)] } }, command: cmd('stop') },
    async (ctx) => {
      await chat(ctx.env, ctx.deps)
      assert.deepEqual(writes(ctx.gh).map((c) => c[0]), ['createIssueComment'])
      assert.match(writes(ctx.gh)[0][2], /already stopped/)
    })
  await withContext({ targets: { 123: { issue: personPull, comments: [] } }, number: 123, command: cmd('stop') },
    async (ctx) => {
      assert.equal((await chat(ctx.env, ctx.deps)).ok, false)
      assert.match(writes(ctx.gh)[0][2], /not on this one/)
    })
})

test('stop in dry-run writes nothing to GitHub and puts the reply in the job summary', async () => {
  const running = issueState({ phase: 'implementing', implementing: { run: RUNNING, actor: 'carol', at: 't' } })
  const targets = { 200: { issue, comments: [botComment(6, running)] } }
  await withContext({ targets, command: cmd('stop'), env: { AGENT_DRY_RUN: 'true' } }, async (ctx) => {
    await chat(ctx.env, ctx.deps)
    assert.deepEqual(ctx.gh.calls, [])
    assert.match(ctx.summary(), /## Dry run: reply to #200\n\n> @carol, I stopped\./)
    assert.equal(state.parse(targets[200].comments[0].body).phase, 'implementing')
  })
})

// ------------------------------------------------------------------------------------------------ the assistant

test('a question on an issue: the assistant answers in a reply, and the cost goes to the state', async () => {
  const targets = {
    200: { issue, comments: [
      { id: 1, user: { login: 'bob' }, created_at: '2026-10-02T00:00:00Z', body: 'Same here.' },
      botComment(6, issueState({ phase: 'analyzed' }), '### AI analysis\n\nSuitable.'),
    ] },
  }
  const runAgent = fakeRunAgent([{ answer: 'The builder returns `null` in `changelog.go`. Ask @bob.' }])
  const command = cmd('chat', 'Why is the changelog empty?')
  await withContext({ targets, command, runAgent }, async (ctx) => {
    assert.deepEqual(await chat(ctx.env, ctx.deps), { command: 'chat', ok: true })
    assert.equal(runAgent.runs.length, 1)
    assert.equal(runAgent.runs[0].agent, 'assistant')
    assert.deepEqual(runAgent.runs[0].model, { id: 'openai/gpt-6-luna', variant: 'medium' })
    const input = runAgent.runs[0].inputText
    assert.match(input, /# Question on issue #200/)
    assert.match(input, /<untrusted>\nWhy is the changelog empty\?\n<\/untrusted>/)
    assert.match(input, /Same here\./)
    assert.match(input, /Phase: analyzed/)
    // The state comment is not one of the comments the assistant reads as people's.
    assert.ok(!input.includes('ai-autonomous-state'))
    assert.equal(ctx.out('chat-input.md'), input)

    // The state first: costs of the answer are added and the human part stays.
    const [first, second] = writes(ctx.gh)
    assert.equal(first[0], 'updateIssueComment')
    assert.match(first[2], /^<!-- ai-autonomous-state -->\n### AI analysis\n\nSuitable\./)
    const saved = state.parse(first[2])
    assert.equal(saved.costs.length, 3)
    assert.deepEqual(
      [saved.costs[2].flow, saved.costs[2].role, saved.costs[2].model, saved.costs[2].variant],
      ['chat', 'assistant', 'openai/gpt-6-luna', 'medium'],
    )
    assert.equal(saved.phase, 'analyzed')
    assert.equal(second[0], 'createIssueComment')
    const lines = second[2].split('\n')
    assert.equal(lines[0], '@carol')
    assert.equal(lines[2], 'The builder returns `null` in `changelog.go`. Ask @​bob.')
    assert.match(lines.at(-1), /^<sub>\[Run\]\(https:\/\/github.com\/o\/r\/actions\/runs\/7\) · /)
    assert.match(lines.at(-1), /This answer: \$0\.01 · /)
    assert.match(lines.at(-1), /all AI calls on this issue so far: \$1\.26 · /)
    assert.deepEqual(reactions(ctx.gh), ['eyes', 'rocket'])
  })
})

test('a question on a pull request: the input names the head ref; a pull request gets a state comment', async () => {
  const targets = { 123: { issue: personPull, comments: [] } }
  const runAgent = fakeRunAgent([{ answer: 'Yes, it is safe.' }])
  const env = { AGENT_PR_HEAD_REF: 'refs/remotes/pull/123/head' }
  await withContext({ targets, number: 123, command: cmd('chat', 'Is it safe?'), runAgent, env }, async (ctx) => {
    await chat(ctx.env, ctx.deps)
    const input = runAgent.runs[0].inputText
    assert.match(input, /# Question on pull request #123/)
    assert.ok(input.includes('git diff origin/develop...refs/remotes/pull/123/head'))
    assert.deepEqual(ctx.gh.calls.filter((c) => c[0] === 'getPull'), [['getPull', 123]])
    const [created, reply] = writes(ctx.gh)
    assert.equal(created[0], 'createIssueComment')
    const saved = state.parse(created[2])
    assert.deepEqual([saved.kind, saved.number, saved.costs.length, saved.reviews], ['pull', 123, 1, []])
    assert.match(created[2], /^<!-- ai-autonomous-state -->\n### AI Autonomous agent\n\nThe agent keeps what/)
    assert.match(reply[2], /all AI calls on this pull request so far: \$0\.01/)
  })
})

test('a question in dry-run: the assistant runs, nothing is written, and the reply is in the job summary', async () => {
  const targets = issueOnly()
  const runAgent = fakeRunAgent([{ answer: 'It is a bug.' }])
  await withContext({ targets, command: cmd('chat', 'What is it?'), runAgent, env: { AGENT_DRY_RUN: 'true' } },
    async (ctx) => {
      await chat(ctx.env, ctx.deps)
      assert.deepEqual(ctx.gh.calls, [])
      assert.match(ctx.summary(), /> @carol\n> \n> It is a bug\./)
      assert.match(ctx.out('reply.md'), /^@carol\n\nIt is a bug\./)
    })
})

test('an answer that breaks the contract: the cost is recorded, the person is told, and the job fails', async () => {
  const targets = { 200: { issue, comments: [botComment(6, issueState({ phase: 'analyzed' }))] } }
  const runAgent = fakeRunAgent(['I think it is fine.'])
  await withContext({ targets, command: cmd('chat', 'q'), runAgent }, async (ctx) => {
    await assert.rejects(chat(ctx.env, ctx.deps), /not JSON|no JSON/)
    const [first, second] = writes(ctx.gh)
    assert.equal(first[0], 'updateIssueComment')
    assert.equal(state.parse(first[2]).costs.length, 3)
    assert.match(second[2], /^@carol, I could not answer: /)
    assert.match(second[2], /This answer: \$0\.01/)
    assert.deepEqual(reactions(ctx.gh), ['eyes', 'confused'])
  })
  const tooLong = fakeRunAgent([{ answer: 'x'.repeat(6001) }])
  await withContext({ targets: issueOnly(), command: cmd('chat', 'q'), runAgent: tooLong }, async (ctx) => {
    await assert.rejects(chat(ctx.env, ctx.deps), /answer: expected at most 6000 character/)
    assert.match(writes(ctx.gh).at(-1)[2], /I could not answer: .*at most 6000/)
  })
})

// ------------------------------------------------------------------------------------------------ the rest

test('a failed reaction does not fail the job', async () => {
  await withContext({ targets: issueOnly(), command: cmd('help'), reactionFails: true }, async (ctx) => {
    assert.equal((await chat(ctx.env, ctx.deps)).ok, true)
    assert.equal(writes(ctx.gh).length, 1)
  })
})

test('no comment id means no reaction, and a command the job does not handle is an error', async () => {
  await withContext({ targets: issueOnly(), command: cmd('help'), env: { AGENT_COMMENT_ID: '' } }, async (ctx) => {
    await chat(ctx.env, ctx.deps)
    assert.deepEqual(reactions(ctx.gh), [])
  })
  await withContext({ targets: issueOnly(), command: cmd('review') }, async (ctx) => {
    await assert.rejects(chat(ctx.env, ctx.deps), /does not handle the command 'review'/)
    assert.deepEqual(ctx.gh.calls, [])
  })
})

test('the environment is checked: number, actor, run link, and folder are required; a bad command fails', async () => {
  for (const name of ['AGENT_NUMBER', 'AGENT_ACTOR', 'AGENT_RUN_URL', 'AGENT_OUT']) {
    await withContext({ targets: issueOnly(), command: cmd('help'), env: { [name]: '' } }, async (ctx) => {
      await assert.rejects(chat(ctx.env, ctx.deps), new RegExp(`${name} is not set`))
    })
  }
  await withContext({ targets: issueOnly(), command: cmd('help'), env: { AGENT_COMMAND: '{nope' } }, async (ctx) => {
    await assert.rejects(chat(ctx.env, ctx.deps), /AGENT_COMMAND is not valid JSON/)
  })
})

test('main runs the job with the given environment', async () => {
  await withContext({ targets: issueOnly(), command: cmd('help') }, async (ctx) => {
    assert.deepEqual(await main(ctx.env, ctx.deps), { command: 'help', ok: true })
  })
})
