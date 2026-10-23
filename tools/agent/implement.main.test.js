'use strict'
// preflight() and run() of implement.js over a fake GitHub client, a fake opencode, and a fake command runner. The
// pure functions are in implement.test.js.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const log = require('./lib/log')
const state = require('./lib/state')
const { nextState } = require('./analyze')
const { preflight, run, main } = require('./implement')
const { noreplyEmail } = require('./implement')

const logged = []
log.setWriter((line) => logged.push(line))

const FENCE = '```'
const RUN = 'https://github.com/o/r/actions/runs/7'
const PAT = 'fake-pat-value-0123456789'
const BASE = 'a'.repeat(40)
const sha = (n) => String(n).padStart(40, '0')

const plan = { modules: ['portal-backend'], approach: 'Guard the nil changelog.', tests: 'A unit test.', risk: 'low' }
const suitable = { verdict: 'suitable', reason: 'The bug is located.', questions: [], plan }
const unsuitable = { verdict: 'unsuitable', reason: 'It needs a production cluster.', questions: [], plan: null }
const needsInfo = {
  verdict: 'needs-info',
  reason: 'The version is missing.',
  questions: ['Which version is affected?', 'Does it happen in the UI?'],
  plan: null,
}

const bug = {
  number: 200,
  title: 'Changelog is empty for a package with no operations',
  body: 'Steps: publish, open the changelog.',
  type: { name: 'Bug' },
  user: { login: 'alice' },
  created_at: '2026-10-01T09:00:00Z',
  updated_at: '2026-10-03T00:00:00Z',
}

const done = {
  status: 'done',
  summary: 'Guards the nil changelog in the builder. A test covers it.',
  commitType: 'fix',
  scope: 'portal-backend',
  title: 'guard the nil changelog',
  verification: 'Added TestBuildNilChangelog; go test ./... passes.',
  notes: 'The nil came from an empty package.',
  blockedReason: '',
}
const blocked = { ...done, status: 'blocked', blockedReason: 'The issue does not say which API to change.' }
const approve = { verdict: 'approve', findings: [] }
const changes = {
  verdict: 'changes',
  findings: [{ severity: 'major', file: 'backend/x.go', line: 12, body: 'The error is swallowed.' }],
}

/** The state of an issue whose analysis the agent wrote after `issue.updated_at`. */
function analyzed(analysis, { label = null, issueUpdatedAt = bug.updated_at, extra = {} } = {}) {
  return {
    ...nextState(state.emptyIssueState(200), {
      analysis,
      label,
      issueUpdatedAt,
      run: RUN,
      at: '2026-10-03T01:00:00Z',
      trigger: 'opened',
    }),
    ...extra,
  }
}

function eventsFor(answer) {
  const text = typeof answer === 'string' ? answer : `Done.\n${FENCE}json\n${JSON.stringify(answer)}\n${FENCE}`
  const step = { type: 'step_finish', part: { tokens: { input: 100, output: 20, cache: { read: 50 } }, cost: 0.01 } }
  return [step, { type: 'text', part: { text } }].map((e) => JSON.stringify(e)).join('\n')
}

/** A GitHub client that keeps the comments, like the real one, and records every write. */
function fakeGh({ issueOverrides = {}, labels = [], comments = [], pulls = {} } = {}) {
  const calls = []
  const store = comments.map((c) => ({ ...c }))
  let nextId = 1000
  return {
    calls,
    store,
    getIssue: async () => ({ ...bug, ...issueOverrides, labels: labels.map((name) => ({ name })) }),
    listIssueComments: async () => store.map((c) => ({ ...c })),
    createIssueComment: async (n, body) => {
      const comment = { id: nextId++, user: { login: 'github-actions[bot]' }, body }
      store.push(comment)
      calls.push(['createIssueComment', n, body])
      return comment
    },
    updateIssueComment: async (id, body) => {
      store.find((c) => c.id === id).body = body
      calls.push(['updateIssueComment', id, body])
    },
    addLabels: async (n, add) => calls.push(['addLabels', n, add]),
    removeLabel: async (n, label) => calls.push(['removeLabel', n, label]),
    getPull: async (n) => pulls[n] ?? { number: n, state: 'closed' },
  }
}

function fakePatGh() {
  const calls = []
  return {
    calls,
    getAuthenticatedUser: async () => ({ login: 'pat-owner', id: 4242 }),
    createPull: async (options) => {
      calls.push(options)
      return { number: 77 }
    },
  }
}

/** A command runner: records each call and answers like Git and pnpm would, from the options. */
function fakeExec({
  porcelain = null,
  checks = [],
  shortstat = ' 2 files changed, 30 insertions(+), 5 deletions(-)',
  remote = '',
  pushFails = false,
} = {}) {
  const calls = []
  let head = BASE
  let commits = 0
  let statusCalls = 0
  let checkCalls = 0
  const ok = (stdout = '') => ({ exitCode: 0, stdout, stderr: '', timedOut: false })
  const exec = async (file, args, options = {}) => {
    calls.push({ file, args, options })
    if (file === 'pnpm') {
      const code = checks[checkCalls++] ?? 0
      const stdout = code ? 'FAIL packages/x\n' : 'ok\n'
      return { exitCode: code, stdout, stderr: code ? 'Error: tests failed' : '', timedOut: false }
    }
    switch (args[0]) {
      case 'ls-remote':
        return ok(remote)
      case 'rev-parse':
        return ok(`${head}\n`)
      case 'status':
        statusCalls += 1
        return ok(porcelain ? (porcelain[statusCalls - 1] ?? '') : 'M backend/x.go\n')
      case 'commit':
        commits += 1
        head = sha(commits)
        return ok()
      case 'diff':
        if (args.includes('--shortstat')) return ok(shortstat)
        if (args.includes('--stat')) return ok(' backend/x.go | 2 +-')
        return ok('diff --git a/backend/x.go b/backend/x.go\n+changed\n')
      case 'push':
        if (pushFails) {
          const url = args.find((a) => a.startsWith('https://'))
          return { exitCode: 1, stdout: '', stderr: `fatal: unable to access '${url}'`, timedOut: false }
        }
        return ok()
      default:
        return ok()
    }
  }
  exec.calls = calls
  exec.git = (name) => calls.filter((c) => c.file === 'git' && c.args[0] === name)
  return exec
}

/** An opencode that answers each agent from its queue and keeps the input text it was given. */
function fakeRunAgent(answers) {
  const queues = Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, [...v]]))
  const runs = []
  const runAgent = async (options) => {
    const inputText = fs.readFileSync(options.files[0], 'utf8')
    runs.push({ agent: options.agent, model: options.model, inputText })
    const next = queues[options.agent]?.shift()
    assert.ok(next !== undefined, `unexpected call of ${options.agent}`)
    if (next instanceof Error) throw next
    if (next.exitCode !== undefined) return { stderrTail: '', eventsText: '', ...next }
    return { exitCode: 0, eventsText: eventsFor(next), stderrTail: '' }
  }
  runAgent.runs = runs
  return runAgent
}

function setup({ env = {}, command = { name: 'implement', force: false, notes: '' }, ...options } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'implement-test-'))
  const fullEnv = {
    GITHUB_REPOSITORY: 'o/r',
    AGENT_NUMBER: '200',
    AGENT_ACTOR: 'carol',
    AGENT_COMMAND: JSON.stringify(command),
    AGENT_RUN_URL: RUN,
    AGENT_OUT: path.join(dir, 'out'),
    AGENT_DRY_RUN: 'false',
    AGENT_PAT: PAT,
    GITHUB_STEP_SUMMARY: path.join(dir, 'summary'),
    GITHUB_OUTPUT: path.join(dir, 'output'),
    ...env,
  }
  const gh = options.gh ?? fakeGh()
  const exec = options.exec ?? fakeExec()
  const patGh = fakePatGh()
  const runAgent = fakeRunAgent(options.agents ?? {})
  const cleanup = () => fs.rmSync(dir, { recursive: true, force: true })
  const read = (file) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '')
  return {
    env: fullEnv,
    deps: { gh, exec, patGh, runAgent },
    gh,
    exec,
    patGh,
    runAgent,
    cleanup,
    summary: () => read(fullEnv.GITHUB_STEP_SUMMARY),
    outputs: () => read(fullEnv.GITHUB_OUTPUT),
    outFiles: () => fs.readdirSync(fullEnv.AGENT_OUT).sort(),
  }
}

/** Runs `fn(ctx)` with a prepared context and always cleans up. */
async function withContext(options, fn) {
  logged.length = 0
  const ctx = setup(options)
  try {
    return await fn(ctx)
  } finally {
    ctx.cleanup()
  }
}

/** The state comment of the fake store, parsed. */
const savedState = (gh) => state.parse(gh.store.find((c) => state.parse(c.body)).body)
const botComment = (id, st, human = 'old') => ({
  id,
  user: { login: 'github-actions[bot]' },
  body: state.render(human, st),
})
const running = (st, analyzeFirst = false) => ({
  ...st,
  phase: 'implementing',
  implementing: { run: RUN, analyzeFirst },
})
const everything = (ctx) => JSON.stringify([ctx.gh.calls, ctx.patGh.calls, logged, ctx.summary()])

// ------------------------------------------------------------------------------------------------ preflight

test('preflight: a fresh suitable analysis proceeds and marks the state as implementing', async () => {
  const comments = [botComment(5, analyzed(suitable, { label: 'ai:suitable' }))]
  await withContext({ gh: fakeGh({ comments }) }, async (ctx) => {
    const result = await preflight(ctx.env, ctx.deps)
    assert.deepEqual([result.proceed, result.outcome], [true, 'proceed'])
    assert.equal(ctx.outputs(), 'proceed=true\noutcome=proceed\n')
    assert.deepEqual(ctx.gh.calls.map((c) => c.slice(0, 2)), [['updateIssueComment', 5]])
    const saved = savedState(ctx.gh)
    assert.equal(saved.phase, 'implementing')
    assert.deepEqual(
      [saved.implementing.run, saved.implementing.actor, saved.implementing.analyzeFirst],
      [RUN, 'carol', false],
    )
    assert.equal(saved.analysis.verdict, 'suitable')
  })
})

test('preflight: no analysis yet means analyze first, and the state comment is created', async () => {
  await withContext({}, async (ctx) => {
    const result = await preflight(ctx.env, ctx.deps)
    assert.deepEqual([result.proceed, result.outcome], [true, 'analyze-first'])
    assert.equal(ctx.outputs(), 'proceed=true\noutcome=analyze-first\n')
    assert.deepEqual(ctx.gh.calls.map((c) => c[0]), ['createIssueComment'])
    assert.equal(savedState(ctx.gh).implementing.analyzeFirst, true)
  })
})

test('preflight: an issue of another type is refused with one comment that mentions the person', async () => {
  const gh = fakeGh({ issueOverrides: { type: { name: 'Feature' } } })
  await withContext({ gh }, async (ctx) => {
    const result = await preflight(ctx.env, ctx.deps)
    assert.deepEqual([result.proceed, result.outcome], [false, 'refuse-type'])
    assert.equal(ctx.outputs(), 'proceed=false\noutcome=refuse-type\n')
    assert.deepEqual(gh.calls.map((c) => [c[0], c[1]]), [['createIssueComment', 200]])
    assert.equal(gh.calls[0][2], '@carol, I implement Bug and Task issues only; this one is Feature.')
  })
  const untyped = fakeGh({ issueOverrides: { type: null } })
  await withContext({ gh: untyped }, async (ctx) => {
    await preflight(ctx.env, ctx.deps)
    assert.match(untyped.calls[0][2], /this one is untyped\.$/)
  })
})

test('preflight: a running implementation is refused with the link to its run', async () => {
  const other = 'https://github.com/o/r/actions/runs/3'
  const st = { ...analyzed(suitable), phase: 'implementing', implementing: { run: other } }
  const gh = fakeGh({ comments: [botComment(5, st)] })
  await withContext({ gh }, async (ctx) => {
    const result = await preflight(ctx.env, ctx.deps)
    assert.equal(result.outcome, 'refuse-busy')
    assert.equal(gh.calls.length, 1)
    assert.equal(gh.calls[0][2], `@carol, an implementation is already running: ${other}.`)
  })
})

test('preflight: ai:unsuitable set by the agent is refused with its reasons and the force hint', async () => {
  const st = analyzed(unsuitable, { label: 'ai:unsuitable' })
  const gh = fakeGh({ labels: ['ai:unsuitable'], comments: [botComment(5, st)] })
  await withContext({ gh }, async (ctx) => {
    const result = await preflight(ctx.env, ctx.deps)
    assert.deepEqual([result.proceed, result.outcome], [false, 'refuse-unsuitable'])
    assert.match(gh.calls[0][2], /^@carol, I did not start\. It needs a production cluster\.\n\n/)
    assert.match(gh.calls[0][2], /If you want me to try anyway, comment `\/agent implement force`\.$/)
  })
})

test('preflight: ai:unsuitable set by a person says so', async () => {
  const gh = fakeGh({ labels: ['ai:unsuitable'] })
  await withContext({ gh }, async (ctx) => {
    await preflight(ctx.env, ctx.deps)
    assert.match(gh.calls[0][2], /A person marked this issue ai:unsuitable\./)
  })
})

test('preflight: force overrides ai:unsuitable and keeps the label', async () => {
  const st = analyzed(unsuitable, { label: 'ai:unsuitable' })
  const gh = fakeGh({ labels: ['ai:unsuitable'], comments: [botComment(5, st)] })
  await withContext({ gh, command: { name: 'implement', force: true, notes: '' } }, async (ctx) => {
    const result = await preflight(ctx.env, ctx.deps)
    assert.deepEqual([result.proceed, result.outcome, result.forced], [true, 'proceed', true])
    assert.deepEqual(gh.calls.map((c) => c[0]), ['updateIssueComment'])
    assert.equal(ctx.outputs(), 'proceed=true\noutcome=proceed\n')
  })
})

test('preflight: an unanswered needs-info analysis is refused with the open questions', async () => {
  const st = analyzed(needsInfo)
  const gh = fakeGh({ comments: [botComment(5, st)] })
  await withContext({ gh }, async (ctx) => {
    const result = await preflight(ctx.env, ctx.deps)
    assert.deepEqual([result.proceed, result.outcome], [false, 'refuse-needs-info'])
    const text = gh.calls[0][2]
    assert.match(text, /^@carol, the issue needs more information/)
    assert.match(text, /1\. Which version is affected\?\n2\. Does it happen in the UI\?/)
    assert.match(text, /Answer them, or edit the issue, then comment `\/agent implement` again\./)
    assert.match(text, /@alice, these questions are for you\./)
  })
})

test('preflight: an issue edited after a needs-info analysis is analyzed again', async () => {
  const st = analyzed(needsInfo, { issueUpdatedAt: '2026-10-02T00:00:00Z' })
  const gh = fakeGh({ comments: [botComment(5, st)] })
  await withContext({ gh }, async (ctx) => {
    const result = await preflight(ctx.env, ctx.deps)
    assert.deepEqual([result.proceed, result.outcome], [true, 'analyze-first'])
  })
})

test('preflight in dry-run writes nothing to GitHub and reports in the summary', async () => {
  const refused = fakeGh({ issueOverrides: { type: { name: 'Feature' } } })
  await withContext({ gh: refused, env: { AGENT_DRY_RUN: 'true' } }, async (ctx) => {
    const result = await preflight(ctx.env, ctx.deps)
    assert.equal(result.proceed, false)
    assert.deepEqual(refused.calls, [])
    assert.match(ctx.summary(), /^## Dry run: AI implementation of #200 refused\n\n> @carol, I implement Bug and Task/)
  })
  await withContext({ env: { AGENT_DRY_RUN: 'true' } }, async (ctx) => {
    const result = await preflight(ctx.env, ctx.deps)
    assert.equal(result.proceed, true)
    assert.deepEqual(ctx.gh.calls, [])
    assert.equal(ctx.outputs(), 'proceed=true\noutcome=analyze-first\n')
    assert.match(ctx.summary(), /may proceed/)
  })
})

test('preflight needs the actor and the run URL', async () => {
  await withContext({ env: { AGENT_ACTOR: '' } }, async (ctx) => {
    await assert.rejects(preflight(ctx.env, ctx.deps), /AGENT_ACTOR is not set/)
  })
})

test('main dispatches to preflight and run, and rejects anything else', async () => {
  await withContext({}, async (ctx) => {
    const result = await main(['preflight'], ctx.env, ctx.deps)
    assert.equal(result.outcome, 'analyze-first')
    await assert.rejects(main(['deploy'], ctx.env, ctx.deps), /Usage: node tools\/agent\/implement\.js preflight\|run/)
    await assert.rejects(main([], ctx.env, ctx.deps), /Usage/)
  })
})

// ------------------------------------------------------------------------------------------------ run

/** The context of a run on an issue whose analysis is fresh and says suitable. */
function readyToRun(extra = {}) {
  const st = running(analyzed(suitable, { label: 'ai:suitable' }), false)
  return { gh: fakeGh({ comments: [botComment(5, st)], labels: ['ai:suitable', 'agent:needs-human'] }), ...extra }
}

test('run, green path: branch, identity, implement, checks, self-review, push, PR, state, labels', async () => {
  const agents = { implementer: [done], 'self-reviewer': [approve] }
  await withContext({ ...readyToRun(), agents }, async (ctx) => {
    const result = await run(ctx.env, ctx.deps)
    assert.deepEqual(result, { result: 'pr-opened', pr: 77, branch: 'bugfix/200-changelog-is-empty-for-a' })

    // Git: new branch from develop, identity of the PAT owner, one local commit, then the push.
    const git = ctx.exec.calls.filter((c) => c.file === 'git').map((c) => c.args)
    assert.deepEqual(git[0], ['ls-remote', '--heads', 'origin', 'bugfix/200-changelog-is-empty-for-a'])
    assert.deepEqual(git[1], ['checkout', '-B', 'bugfix/200-changelog-is-empty-for-a', 'origin/develop'])
    assert.deepEqual(git.filter((a) => a[0] === 'config'), [
      ['config', 'user.name', 'pat-owner'],
      ['config', 'user.email', noreplyEmail(4242, 'pat-owner')],
    ])
    const commit = ctx.exec.git('commit')
    assert.equal(commit.length, 1)
    assert.deepEqual(commit[0].args.slice(0, 3), ['commit', '--no-verify', '-m'])
    assert.equal(
      commit[0].args[3],
      `fix(portal-backend): guard the nil changelog\n\nCloses #200.\n\nAgent-Run: ${RUN}`,
    )

    // The checks run against the base commit.
    const nx = ctx.exec.calls.find((c) => c.file === 'pnpm')
    assert.deepEqual(nx.args.slice(0, 5), ['exec', 'nx', 'affected', '-t', 'build'])
    assert.ok(nx.args.includes(`--base=${BASE}`))

    // The push uses the PAT in the URL, a plain refspec, and no lease for a new branch.
    const push = ctx.exec.git('push')
    assert.equal(push.length, 1)
    assert.deepEqual(push[0].args, [
      'push',
      '--no-verify',
      `https://x-access-token:${PAT}@github.com/o/r.git`,
      'HEAD:refs/heads/bugfix/200-changelog-is-empty-for-a',
    ])

    // The pull request is made with the PAT client.
    assert.equal(ctx.patGh.calls.length, 1)
    const pull = ctx.patGh.calls[0]
    assert.deepEqual(
      [pull.title, pull.head, pull.base, pull.draft],
      ['fix(portal-backend): guard the nil changelog', 'bugfix/200-changelog-is-empty-for-a', 'develop', false],
    )
    assert.match(pull.body, /^## Why\n\nChangelog is empty for a package with no operations\. Guards the nil changelog/)
    assert.match(pull.body, /\nCloses #200\.\n/)
    assert.match(pull.body, /\n- \[x\] The issue is linked/)
    assert.match(
      pull.body,
      /\nImplemented by the AI Autonomous agent on request of @carol\.\n\n<!-- ai-autonomous-agent issue=200 -->\n$/,
    )

    // State: written once, with the cost of both models; then the labels; no comment to the person.
    assert.deepEqual(ctx.gh.calls.map((c) => c[0]), ['updateIssueComment', 'removeLabel'])
    assert.equal(ctx.gh.calls[1][2], 'agent:needs-human')
    const saved = savedState(ctx.gh)
    assert.equal(saved.phase, 'waiting-ci')
    assert.deepEqual(
      [saved.pr, saved.branch, saved.playbook, saved.forced],
      [77, 'bugfix/200-changelog-is-empty-for-a', 'bug-fix', false],
    )
    assert.equal(saved.implementing, undefined)
    assert.equal(saved.attempts.length, 1)
    assert.deepEqual(
      { ...saved.attempts[0], at: 'x' },
      {
        n: 1, kind: 'initial', run: RUN, result: 'pr-opened', rounds: 1, checks: 'green', selfReview: 'approve',
        notes: 'The nil came from an empty package.', at: 'x',
      },
    )
    assert.deepEqual(
      saved.costs.map((c) => [c.flow, c.role]),
      [['implement', 'implementer'], ['implement', 'self-reviewer']],
    )
    assert.match(ctx.gh.store[0].body, /### AI implementation: pull request #77 is open/)

    // The models: the implementer and the reviewer differ, and each sees its input.
    assert.deepEqual(ctx.runAgent.runs.map((r) => [r.agent, r.model.id]), [
      ['implementer', 'openai/gpt-6.1-sol'],
      ['self-reviewer', 'openai/gpt-6-luna'],
    ])
    assert.match(ctx.runAgent.runs[0].inputText, /- Playbook: bug-fix\n/)
    assert.match(ctx.runAgent.runs[0].inputText, /Approach: Guard the nil changelog\./)
    assert.match(ctx.runAgent.runs[1].inputText, new RegExp(`git diff ${BASE} ${sha(1)}`))
    assert.ok(ctx.outFiles().includes('implement-input.md'))
    assert.ok(ctx.outFiles().includes('implementer-r1.final.md'))
  })
})

test('run never lets the PAT reach a comment, the state, the summary, a log line, or a non-push call', async () => {
  await withContext({ ...readyToRun(), agents: { implementer: [done], 'self-reviewer': [approve] } }, async (ctx) => {
    await run(ctx.env, ctx.deps)
    assert.ok(!everything(ctx).includes(PAT))
    // Only the push call carries it, and no child process other than the push gets AGENT_PAT in its options.
    const withPat = ctx.exec.calls.filter((c) => JSON.stringify(c).includes(PAT))
    assert.deepEqual(withPat.map((c) => c.args[0]), ['push'])
    const files = fs.readdirSync(ctx.env.AGENT_OUT)
    assert.ok(!files.some((f) => fs.readFileSync(path.join(ctx.env.AGENT_OUT, f), 'utf8').includes(PAT)))
  })
})

test('run: a Task uses the task playbook and a feature branch', async () => {
  const st = running(analyzed(suitable))
  const issueOverrides = { type: { name: 'Task' }, title: 'Move the release scripts to tools/release' }
  const gh = fakeGh({ issueOverrides, comments: [botComment(5, st)] })
  const task = { ...done, commitType: 'refactor', scope: '' }
  await withContext({ gh, agents: { implementer: [task], 'self-reviewer': [approve] } }, async (ctx) => {
    const result = await run(ctx.env, ctx.deps)
    assert.equal(result.branch, 'feature/200-move-the-release-scripts-to')
    assert.match(ctx.runAgent.runs[0].inputText, /- Playbook: task\n/)
    assert.equal(ctx.patGh.calls[0].title, 'refactor: guard the nil changelog')
    assert.equal(savedState(ctx.gh).playbook, 'task')
  })
})

test('run: a bug-fix that is not typed fix breaks the contract and fails with the cost recorded', async () => {
  await withContext({ ...readyToRun(), agents: { implementer: [{ ...done, commitType: 'feat' }] } }, async (ctx) => {
    await assert.rejects(run(ctx.env, ctx.deps), /a bug-fix must use 'fix'/)
    const saved = savedState(ctx.gh)
    assert.equal(saved.phase, 'needs-human')
    assert.equal(saved.costs.length, 1)
    assert.equal(saved.attempts[0].result, 'error')
    assert.deepEqual(ctx.exec.git('push'), [])
  })
})

test('run: the self-review asks for changes, the second round fixes them, and one commit remains', async () => {
  const second = { ...done, title: 'guard the nil changelog in the builder' }
  const agents = { implementer: [done, second], 'self-reviewer': [changes, approve] }
  await withContext({ ...readyToRun(), agents }, async (ctx) => {
    const result = await run(ctx.env, ctx.deps)
    assert.equal(result.result, 'pr-opened')
    // Round 2 sees the finding; the first commit is amended with the new message.
    assert.match(ctx.runAgent.runs[2].inputText, /- Round: 2\n/)
    assert.match(
      ctx.runAgent.runs[2].inputText,
      new RegExp(
        [
          '## Result of round 1: fix this first\\n\\n### Self-review findings\\n\\n',
          '- major at `backend\\/x\\.go:12`: The error is swallowed\\.',
        ].join(''),
      ),
    )
    const commits = ctx.exec.git('commit')
    assert.deepEqual(commits.map((c) => c.args.includes('--amend')), [false, true])
    assert.match(commits[1].args.at(-1), /^fix\(portal-backend\): guard the nil changelog in the builder\n/)
    assert.equal(ctx.exec.calls.filter((c) => c.file === 'pnpm').length, 2)
    const saved = savedState(ctx.gh)
    assert.deepEqual(
      [saved.phase, saved.attempts[0].rounds, saved.attempts[0].selfReview],
      ['waiting-ci', 2, 'approve'],
    )
    assert.equal(ctx.patGh.calls[0].draft, false)
    assert.deepEqual(
      ctx.runAgent.runs.map((r) => r.agent),
      ['implementer', 'self-reviewer', 'implementer', 'self-reviewer'],
    )
    assert.ok(ctx.outFiles().includes('implementer-r2.final.md'))
  })
})

test('run: minor findings alone count as approval', async () => {
  const minorOnly = { verdict: 'changes', findings: [{ severity: 'minor', file: 'a', line: null, body: 'Rename x.' }] }
  await withContext({ ...readyToRun(), agents: { implementer: [done], 'self-reviewer': [minorOnly] } }, async (ctx) => {
    const result = await run(ctx.env, ctx.deps)
    assert.equal(result.result, 'pr-opened')
    assert.equal(savedState(ctx.gh).attempts[0].rounds, 1)
  })
})

test('run: checks red in every round give a draft pull request, needs-human, and a hand-off', async () => {
  const agents = { implementer: [done, done], 'self-reviewer': [approve, approve] }
  await withContext({ ...readyToRun(), exec: fakeExec({ checks: [1, 1] }), agents }, async (ctx) => {
    await assert.doesNotReject(run(ctx.env, ctx.deps))
    assert.equal(ctx.patGh.calls[0].draft, true)
    assert.match(ctx.patGh.calls[0].body, /Local checks failed: `pnpm exec nx affected/)
    // Round 2 sees the output of the failed check.
    assert.match(
      ctx.runAgent.runs[2].inputText,
      /### Local check failures\n\nCommand `pnpm exec nx affected .*` failed with exit code 1\./,
    )
    assert.match(ctx.runAgent.runs[2].inputText, /<untrusted>\nFAIL packages\/x/)
    const saved = savedState(ctx.gh)
    assert.equal(saved.phase, 'needs-human')
    assert.equal(saved.pr, 77)
    assert.deepEqual(
      [saved.attempts[0].result, saved.attempts[0].checks, saved.attempts[0].rounds],
      ['draft', 'red', 2],
    )
    assert.deepEqual(ctx.gh.calls.map((c) => c[0]), ['updateIssueComment', 'addLabels', 'createIssueComment'])
    assert.match(ctx.gh.calls[2][2], /^@carol, I opened draft pull request #77, but it is not green yet\./)
    assert.match(ctx.gh.store[0].body, /needs a person: draft pull request #77/)
    assert.match(ctx.gh.store[0].body, /Failing check: `pnpm exec nx affected/)
    assert.match(ctx.gh.store[0].body, /\*\*What I need from you:\*\*/)
  })
})

test('run: the self-review still asks for changes after the last round, so the pull request is a draft', async () => {
  const agents = { implementer: [done, done], 'self-reviewer': [changes, changes] }
  await withContext({ ...readyToRun(), agents }, async (ctx) => {
    await run(ctx.env, ctx.deps)
    assert.equal(ctx.patGh.calls[0].draft, true)
    assert.match(ctx.patGh.calls[0].body, /changes were still requested after 2 round\(s\)\./)
    assert.match(ctx.patGh.calls[0].body, /- major at `backend\/x\.go:12`: The error is swallowed\./)
    assert.match(ctx.gh.store[0].body, /- major at `backend\/x\.go:12`: The error is swallowed\./)
    assert.equal(savedState(ctx.gh).attempts[0].selfReview, 'changes')
  })
})

test('run: AGENT_MAX_REVIEW_ROUNDS limits the rounds', async () => {
  const agents = { implementer: [done], 'self-reviewer': [changes] }
  await withContext({ ...readyToRun(), agents, env: { AGENT_MAX_REVIEW_ROUNDS: '1' } }, async (ctx) => {
    await run(ctx.env, ctx.deps)
    assert.equal(savedState(ctx.gh).attempts[0].rounds, 1)
    assert.equal(ctx.runAgent.runs.length, 2)
  })
})

test('run: a blocked implementer pushes nothing, opens nothing, labels the issue, and tells the person', async () => {
  await withContext({ ...readyToRun(), agents: { implementer: [blocked] } }, async (ctx) => {
    const result = await run(ctx.env, ctx.deps)
    assert.equal(result.result, 'blocked')
    assert.deepEqual(ctx.exec.git('push'), [])
    assert.deepEqual(ctx.exec.git('commit'), [])
    assert.deepEqual(ctx.patGh.calls, [])
    assert.deepEqual(ctx.gh.calls.map((c) => c[0]), ['updateIssueComment', 'addLabels', 'createIssueComment'])
    assert.deepEqual(ctx.gh.calls[1][2], ['agent:needs-human'])
    assert.match(
      ctx.gh.calls[2][2],
      /^@carol, I could not implement this issue: The issue does not say which API to change\./,
    )
    const saved = savedState(ctx.gh)
    assert.equal(saved.phase, 'needs-human')
    assert.equal(saved.pr, undefined)
    assert.equal(saved.attempts[0].result, 'blocked')
    assert.equal(saved.attempts[0].reason, 'The issue does not say which API to change.')
    assert.match(ctx.gh.store[0].body, /### AI implementation is blocked/)
  })
})

test('run: a blocked answer without a reason breaks the contract', async () => {
  await withContext({ ...readyToRun(), agents: { implementer: [{ ...blocked, blockedReason: ' ' }] } }, async (ctx) => {
    await assert.rejects(run(ctx.env, ctx.deps), /a blocked answer needs a reason/)
    assert.equal(savedState(ctx.gh).attempts[0].result, 'error')
  })
})

test('run: done without changes in the working tree is treated as blocked', async () => {
  const options = { ...readyToRun(), exec: fakeExec({ porcelain: [''] }), agents: { implementer: [done] } }
  await withContext(options, async (ctx) => {
    const result = await run(ctx.env, ctx.deps)
    assert.equal(result.result, 'blocked')
    assert.deepEqual(ctx.exec.git('commit'), [])
    assert.equal(ctx.exec.calls.filter((c) => c.file === 'pnpm').length, 0)
    assert.match(savedState(ctx.gh).attempts[0].reason, /no changes/)
  })
})

test('run: a diff over the limit is blocked with the numbers, and nothing is pushed', async () => {
  const exec = fakeExec({ shortstat: ' 25 files changed, 100 insertions(+), 3 deletions(-)' })
  const agents = { implementer: [done], 'self-reviewer': [approve] }
  await withContext({ ...readyToRun(), exec, agents }, async (ctx) => {
    const result = await run(ctx.env, ctx.deps)
    assert.equal(result.result, 'blocked')
    assert.deepEqual(ctx.exec.git('push'), [])
    assert.deepEqual(ctx.patGh.calls, [])
    const reason = savedState(ctx.gh).attempts[0].reason
    assert.match(reason, /outgrown the issue: 25 files and 103 changed lines/)
    assert.match(reason, /limit for a bug-fix is 20 files or 600 lines/)
    // The model calls were made and their cost is in the state.
    assert.equal(savedState(ctx.gh).costs.length, 2)
  })
})

test('run: an analysis that says needs-info stops the run with the questions, once', async () => {
  const gh = fakeGh({ comments: [botComment(5, running(state.emptyIssueState(200), true))] })
  await withContext({ gh, agents: { analyst: [needsInfo] } }, async (ctx) => {
    const result = await run(ctx.env, ctx.deps)
    assert.deepEqual(result, { stopped: 'refuse-needs-info' })
    assert.deepEqual(ctx.exec.calls, [])
    assert.equal(ctx.runAgent.runs.length, 1)
    // The analysis wrote its label and state; the only comment is the reply that mentions the person.
    const comments = gh.calls.filter((c) => c[0] === 'createIssueComment')
    assert.equal(comments.length, 1)
    assert.match(comments[0][2], /^@carol, the issue needs more information/)
    assert.doesNotMatch(comments[0][2], /^@alice, the AI agent needs more information/)
    assert.deepEqual(gh.calls.find((c) => c[0] === 'addLabels')[2], ['agent:needs-human'])
    assert.equal(savedState(gh).phase, 'needs-info')
    assert.equal(savedState(gh).analysis.verdict, 'needs-info')
  })
})

test('run: an analysis that says unsuitable stops the run unless force is set', async () => {
  const stateOf = () => botComment(5, running(state.emptyIssueState(200), true))
  const gh = fakeGh({ comments: [stateOf()] })
  await withContext({ gh, agents: { analyst: [unsuitable] } }, async (ctx) => {
    const result = await run(ctx.env, ctx.deps)
    assert.deepEqual(result, { stopped: 'refuse-unsuitable' })
    assert.deepEqual(ctx.exec.calls, [])
    const reply = gh.calls.filter((c) => c[0] === 'createIssueComment').at(-1)[2]
    assert.match(reply, /^@carol, I did not start\. It needs a production cluster\./)
    assert.match(reply, /comment `\/agent implement force`\./)
  })
  const forcedGh = fakeGh({ comments: [stateOf()] })
  const agents = { analyst: [unsuitable], implementer: [done], 'self-reviewer': [approve] }
  const command = { name: 'implement', force: true, notes: 'Mind the old API.' }
  await withContext({ gh: forcedGh, agents, command }, async (ctx) => {
    const result = await run(ctx.env, ctx.deps)
    assert.equal(result.result, 'pr-opened')
    const saved = savedState(forcedGh)
    assert.equal(saved.forced, true)
    assert.equal(saved.phase, 'waiting-ci')
    assert.match(
      ctx.runAgent.runs[1].inputText,
      /There is no plan: the analysis did not find the issue suitable\. Its reason: It needs a production cluster\./,
    )
    assert.match(
      ctx.runAgent.runs[1].inputText,
      /## Notes of the maintainer who asked for this implementation\n\n<untrusted>\nMind the old API\.\n<\/untrusted>/,
    )
    // The cost of the analysis and of both implement calls is in one state.
    assert.deepEqual(saved.costs.map((c) => c.flow), ['analyze', 'implement', 'implement'])
  })
})

test('run: an analysis that says suitable goes on to implement with the new plan', async () => {
  const gh = fakeGh({ comments: [botComment(5, running(state.emptyIssueState(200), true))] })
  const agents = { analyst: [suitable], implementer: [done], 'self-reviewer': [approve] }
  await withContext({ gh, agents }, async (ctx) => {
    const result = await run(ctx.env, ctx.deps)
    assert.equal(result.result, 'pr-opened')
    assert.deepEqual(ctx.runAgent.runs.map((r) => r.agent), ['analyst', 'implementer', 'self-reviewer'])
    assert.match(ctx.runAgent.runs[1].inputText, /Approach: Guard the nil changelog\./)
    const saved = savedState(gh)
    assert.equal(saved.analysis.verdict, 'suitable')
    assert.deepEqual(saved.analyses.map((a) => a.trigger), ['command'])
    // One state comment all along: the analysis updated it, and so did the implementation.
    assert.equal(gh.store.filter((c) => state.parse(c.body)).length, 1)
  })
})

test('run: a failed analysis fails the run with the state of the analysis kept and the cost recorded', async () => {
  const gh = fakeGh({ comments: [botComment(5, running(state.emptyIssueState(200), true))] })
  await withContext({ gh, agents: { analyst: ['I could not decide.'] } }, async (ctx) => {
    await assert.rejects(run(ctx.env, ctx.deps), /answer holds no JSON|not valid JSON|no ```json block/)
    const saved = savedState(gh)
    assert.equal(saved.phase, 'needs-human')
    assert.equal(saved.attempts[0].result, 'error')
    assert.equal(saved.costs.length, 1)
    assert.deepEqual(ctx.exec.calls, [])
  })
})

test('run: a later attempt continues the earlier branch, leases the push, and keeps the open PR', async () => {
  const earlier = {
    n: 1, kind: 'initial', run: 'r1', result: 'draft', rounds: 2, checks: 'red', selfReview: 'approve',
    notes: 'Tried a guard in the builder; the nx test of portal-backend still failed.', at: 't',
  }
  const extra = { branch: 'bugfix/200-changelog-is-empty-for-a', pr: 70, attempts: [earlier] }
  const st = running(analyzed(suitable, { extra }))
  const gh = fakeGh({ comments: [botComment(5, st)], pulls: { 70: { number: 70, state: 'open' } } })
  const remote = `${sha(900)}\trefs/heads/bugfix/200-changelog-is-empty-for-a\n`
  const agents = { implementer: [done], 'self-reviewer': [approve] }
  const command = { name: 'implement', force: false, notes: 'Look at the nil map.' }
  await withContext({ gh, exec: fakeExec({ remote }), agents, command }, async (ctx) => {
    const result = await run(ctx.env, ctx.deps)
    assert.deepEqual(result, { result: 'pr-opened', pr: 70, branch: 'bugfix/200-changelog-is-empty-for-a' })
    const git = ctx.exec.calls.filter((c) => c.file === 'git').map((c) => c.args)
    assert.deepEqual(git[1], ['fetch', '--no-tags', 'origin', 'bugfix/200-changelog-is-empty-for-a'])
    assert.deepEqual(git[2], ['checkout', '-B', 'bugfix/200-changelog-is-empty-for-a', 'FETCH_HEAD'])
    const lease = `--force-with-lease=refs/heads/bugfix/200-changelog-is-empty-for-a:${sha(900)}`
    assert.ok(ctx.exec.git('push')[0].args.includes(lease))
    assert.deepEqual(ctx.patGh.calls, [])
    assert.match(ctx.runAgent.runs[0].inputText, /- Attempt: 2 \(human\)/)
    assert.match(ctx.runAgent.runs[0].inputText, /### Attempt 1 \(initial\): draft\n\n<untrusted>\nTried a guard/)
    assert.match(ctx.runAgent.runs[0].inputText, /<untrusted>\nLook at the nil map\.\n<\/untrusted>/)
    const saved = savedState(gh)
    assert.deepEqual(
      [saved.phase, saved.pr, saved.attempts.length, saved.attempts[1].kind],
      ['waiting-ci', 70, 2, 'human'],
    )
  })
})

test('run: a closed pull request of an earlier attempt gets a new one', async () => {
  const extra = { branch: 'bugfix/200-changelog-is-empty-for-a', pr: 70, attempts: [{ n: 1 }] }
  const st = running(analyzed(suitable, { extra }))
  const gh = fakeGh({ comments: [botComment(5, st)], pulls: { 70: { number: 70, state: 'closed' } } })
  const remote = `${sha(900)}\trefs/heads/bugfix/200-changelog-is-empty-for-a\n`
  const agents = { implementer: [done], 'self-reviewer': [approve] }
  await withContext({ gh, exec: fakeExec({ remote }), agents }, async (ctx) => {
    const result = await run(ctx.env, ctx.deps)
    assert.equal(result.pr, 77)
    assert.equal(ctx.patGh.calls.length, 1)
  })
})

test('run: a branch that exists on the remote without an earlier attempt is not overwritten', async () => {
  const remote = `${sha(900)}\trefs/heads/bugfix/200-changelog-is-empty-for-a\n`
  await withContext({ ...readyToRun(), exec: fakeExec({ remote }) }, async (ctx) => {
    await assert.rejects(run(ctx.env, ctx.deps), /already exists on the remote and no earlier attempt/)
    assert.deepEqual(ctx.exec.git('push'), [])
    assert.equal(savedState(ctx.gh).phase, 'needs-human')
  })
})

test('run: a branch of the state that is gone from the remote starts again from develop without a lease', async () => {
  const st = running(analyzed(suitable, { extra: { branch: 'bugfix/200-old', attempts: [{ n: 1 }] } }))
  const gh = fakeGh({ comments: [botComment(5, st)] })
  await withContext({ gh, agents: { implementer: [done], 'self-reviewer': [approve] } }, async (ctx) => {
    const result = await run(ctx.env, ctx.deps)
    assert.equal(result.branch, 'bugfix/200-old')
    assert.deepEqual(
      ctx.exec.calls.filter((c) => c.file === 'git')[1].args,
      ['checkout', '-B', 'bugfix/200-old', 'origin/develop'],
    )
    assert.ok(!ctx.exec.git('push')[0].args.some((a) => a.startsWith('--force-with-lease')))
  })
})

test('run: a failed push is redacted, recorded, and fails the run after the state is written', async () => {
  const agents = { implementer: [done], 'self-reviewer': [approve] }
  await withContext({ ...readyToRun(), exec: fakeExec({ pushFails: true }), agents }, async (ctx) => {
    await assert.rejects(run(ctx.env, ctx.deps), (err) => {
      assert.match(err.message, /git push to bugfix\/200-changelog-is-empty-for-a failed with 1/)
      assert.ok(!err.message.includes(PAT))
      return true
    })
    assert.ok(!everything(ctx).includes(PAT))
    assert.deepEqual(ctx.patGh.calls, [])
    const saved = savedState(ctx.gh)
    assert.equal(saved.phase, 'needs-human')
    assert.equal(saved.attempts[0].result, 'error')
    assert.equal(saved.branch, undefined)
    assert.equal(saved.costs.length, 2)
    assert.deepEqual(ctx.gh.calls.map((c) => c[0]), ['updateIssueComment', 'addLabels', 'createIssueComment'])
    assert.match(ctx.gh.calls[2][2], /^@carol, the implementation failed: /)
  })
})

test('run: a crash of the model run records the cost and the error', async () => {
  const crash = { exitCode: 3, eventsText: eventsFor('').split('\n')[0], stderrTail: 'out of quota' }
  const agents = { implementer: [crash] }
  await withContext({ ...readyToRun(), agents }, async (ctx) => {
    await assert.rejects(run(ctx.env, ctx.deps), /implementer exited with 3: out of quota/)
    const saved = savedState(ctx.gh)
    assert.equal(saved.costs.length, 1)
    assert.match(saved.attempts[0].notes, /out of quota/)
    assert.match(ctx.gh.store[0].body, /### AI implementation failed/)
  })
})

test('run in dry-run: commits locally, writes nothing to GitHub, and puts everything in the summary', async () => {
  const agents = { implementer: [done], 'self-reviewer': [approve] }
  await withContext({ ...readyToRun(), agents, env: { AGENT_DRY_RUN: 'true' } }, async (ctx) => {
    const result = await run(ctx.env, ctx.deps)
    assert.equal(result.result, 'pr-opened')
    assert.deepEqual(ctx.gh.calls, [])
    assert.deepEqual(ctx.patGh.calls, [])
    assert.deepEqual(ctx.exec.git('push'), [])
    assert.equal(ctx.exec.git('commit').length, 1)
    const summary = ctx.summary()
    assert.match(summary, /^## Dry run: AI implementation of #200\n/)
    assert.match(summary, /### Commit message\n\n```\nfix\(portal-backend\): guard the nil changelog\n\nCloses #200\./)
    assert.match(
      summary,
      /### Pull request \(ready for review\)\n\nTitle: fix\(portal-backend\): guard the nil changelog/,
    )
    assert.match(summary, /<!-- ai-autonomous-agent issue=200 -->/)
    assert.match(summary, /### Labels\n\n- add: none\n- remove: agent:needs-human/)
    assert.match(summary, /### State\n\n```json\n\{/)
    assert.match(summary, /"phase": "waiting-ci"/)
    assert.match(summary, /### Diff\n\n```\nbackend\/x\.go \| 2 \+-\n```/)
    assert.match(summary, /```diff\ndiff --git a\/backend\/x\.go/)
    assert.ok(!everything(ctx).includes(PAT))
  })
})

test('run in dry-run without a PAT commits as the workflow bot', async () => {
  const agents = { implementer: [done], 'self-reviewer': [approve] }
  const ctxOptions = { ...readyToRun(), agents, env: { AGENT_DRY_RUN: 'true', AGENT_PAT: '' } }
  await withContext(ctxOptions, async (ctx) => {
    ctx.deps.patGh = undefined
    await run(ctx.env, ctx.deps)
    const config = ctx.exec.git('config').map((c) => c.args)
    assert.deepEqual(config[0], ['config', 'user.name', 'github-actions[bot]'])
  })
})

test('run without a PAT outside dry-run fails before any model call', async () => {
  await withContext({ ...readyToRun(), env: { AGENT_PAT: '' } }, async (ctx) => {
    ctx.deps.patGh = undefined
    await assert.rejects(run(ctx.env, ctx.deps), /AGENT_PAT is not set/)
    assert.equal(ctx.runAgent.runs.length, 0)
    assert.equal(savedState(ctx.gh).phase, 'needs-human')
  })
})

test('run: a Feature issue that slipped past the preflight fails clearly', async () => {
  const gh = fakeGh({ issueOverrides: { type: { name: 'Feature' } } })
  await withContext({ gh }, async (ctx) => {
    await assert.rejects(run(ctx.env, ctx.deps), /No playbook for the issue type 'Feature'/)
    assert.equal(ctx.runAgent.runs.length, 0)
  })
})

test('run: an issue that changed after a fresh preflight is not analyzed again', async () => {
  // The preflight's own state write bumps updated_at of the real issue, so the run trusts the preflight's flag.
  const st = running(analyzed(suitable, { issueUpdatedAt: '2026-10-01T00:00:00Z' }), false)
  const gh = fakeGh({ comments: [botComment(5, st)] })
  await withContext({ gh, agents: { implementer: [done], 'self-reviewer': [approve] } }, async (ctx) => {
    await run(ctx.env, ctx.deps)
    assert.deepEqual(ctx.runAgent.runs.map((r) => r.agent), ['implementer', 'self-reviewer'])
  })
})
