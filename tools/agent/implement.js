#!/usr/bin/env node
/**
 * Flow C of the AI Autonomous agent: implement a Bug or Task issue, up to a pull request.
 *
 * Three commands run in two jobs of .github/workflows/ai-autonomous-agent.yml. Model-written code runs in the first
 * job (the tests of the change), as the same user as the script, so that job holds no GitHub token: a token in the
 * environment of the controller would be readable by that code. The tokens live in the second job, which runs no
 * model and no repository code.
 *
 *   node tools/agent/implement.js preflight        (job `implement`, GITHUB_TOKEN and AGENT_PAT, before any model code)
 *     Decides whether the issue may be implemented. A refusal posts one comment that explains it and writes
 *     `proceed=false` to $GITHUB_OUTPUT. Otherwise the state gets the phase `implementing`, so a second command is
 *     refused, `context.json` (the issue, its comments, the state, the Git identity of the PAT owner) goes to
 *     AGENT_OUT, and `proceed=true` follows. With `AGENT_KIND=ci-fix` the CI gate already decided: only the state is
 *     checked.
 *
 *   node tools/agent/implement.js work             (job `implement`, OPENAI_API_KEY only)
 *     One attempt, in stages and without GitHub: the analysis (when the issue changed since the last one), the branch,
 *     rounds of implement (`implementer`), local commit, local checks, and self-review (`self-reviewer`, the other
 *     model), and the diff limits. It writes `outcome.json` (everything `publish` needs, the cost of every model call
 *     included, also when a stage failed) and `branch.bundle` (the commits) to AGENT_OUT.
 *
 *   node tools/agent/implement.js publish          (job `publish`, GITHUB_TOKEN and AGENT_PAT)
 *     Reads the outcome and the bundle from the downloaded artifact, pushes the branch, opens or updates the pull
 *     request, writes the state comment, the labels, and a comment that mentions the person who asked. Without
 *     `outcome.json` (the work step crashed or timed out) it records the failure and the costs it can find.
 *
 * The attempt does not wait for CI: the CI gate (tools/agent/ci-gate.js) does, and it starts the next attempt when CI
 * is red. That attempt runs with `AGENT_KIND=ci-fix`: the state must say `implementing` with `kind: 'ci-fix'`, the
 * work continues the recorded branch, the implementer gets the CI report of the state, and the attempt adds one new
 * commit on top of the branch and pushes without force.
 *
 * A person steers the agent with `AGENT_KIND=human` (`/agent retry`, a free-text change request on a pull request of
 * the agent, or an answer to a hand-off) or `AGENT_KIND=review` (a review with change requests: the unresolved
 * review threads go to the implementer, and `publish` replies in each one after the push). These attempts skip the
 * refusals about the issue type's suitability, give the CI loop a fresh budget (`budgetFrom` in the state), and, when
 * the pull request of an earlier attempt is closed, start a new branch and pull request.
 *
 * `publish` does not trust the work job: it computes the diff of the pushed commits itself and enforces the diff
 * limits and the protected paths, and it opens every pull request as a draft. Only the CI gate marks one ready.
 *
 * The model never gets a token (lib/opencode.js strips them), and neither do the local checks, which run code the
 * model wrote (`cleanEnv`). `AGENT_PAT` is read only by `readPat`, for the Git identity, the push, and the pull
 * request. The push URL holds the token, so it is never logged, and `redact` cleans every message that may echo it.
 * The cost of every model call is recorded in the state, also when a stage fails. In dry-run nothing is pushed or
 * written to GitHub; the job summary shows what would be.
 *
 * Environment: GITHUB_REPOSITORY, GITHUB_TOKEN (`preflight`, `publish`), OPENAI_API_KEY (`work`), AGENT_PAT
 * (`preflight`, `publish`), AGENT_NUMBER (the issue), AGENT_COMMAND (JSON of the parsed command), AGENT_ACTOR (login of
 * the commenter or reviewer; a `ci-fix` attempt takes it from the state), AGENT_KIND (`initial`, the default,
 * `ci-fix`, `human`, or `review`), AGENT_PR (the pull request of a comment or a review), AGENT_COMMENT_ID (the comment
 * that gets the reactions), AGENT_RUN_URL, AGENT_OUT (folder for context, inputs, events, outcome, and bundle), the
 * AGENT_* variables of lib/config.js, GITHUB_OUTPUT, GITHUB_STEP_SUMMARY.
 */
'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { spawn } = require('node:child_process')
const { loadConfig } = require('./lib/config')
const { createClient } = require('./lib/github')
const state = require('./lib/state')
const usage = require('./lib/usage')
const { ContractError, validate } = require('./lib/contract')
const { callAgent } = require('./lib/agent-call')
const { SECRET_ENV } = require('./lib/opencode')
const { untrusted } = require('./lib/prompt')
const { inline, clip, tailLines, stripAnsi } = require('./lib/text')
const {
  runAnalysis,
  labelChanges,
  agentLabelAfter,
  nextState,
  failedState,
  applyLabels,
  renderAnalysis,
} = require('./analyze')
const { react, commentIdOf } = require('./lib/reactions')
const log = require('./lib/log')

const LABEL_UNSUITABLE = 'ai:unsuitable'
const LABEL_SUITABLE = 'ai:suitable'
const LABEL_NEEDS_HUMAN = 'agent:needs-human'
const BASE_BRANCH = 'develop'
/** A fresh start looks for a free branch name up to `<name>-v9`. */
const MAX_BRANCH_VERSION = 9
const BOT_LOGIN = 'github-actions[bot]'

/** The playbook skill, the branch prefix, and the diff limits per issue type. */
const PLAYBOOKS = {
  Bug: { playbook: 'bug-fix', branchPrefix: 'bugfix' },
  Task: { playbook: 'task', branchPrefix: 'feature' },
}
const DIFF_LIMITS = {
  'bug-fix': { files: 20, lines: 600 },
  task: { files: 30, lines: 1000 },
}

/** One check command may run this long; the job has 90 minutes for everything. */
const CHECK_TIMEOUT_MS = 40 * 60 * 1000
const GIT_TIMEOUT_MS = 10 * 60 * 1000
const OUTPUT_TAIL_LINES = 200
const CONTEXT_FILE = 'context.json'
const OUTCOME_FILE = 'outcome.json'
const BUNDLE_FILE = 'branch.bundle'
const DIFF_PREVIEW_LINES = 300
/** One comment or description longer than this is cut, so a pasted log cannot fill the model's context. */
const MAX_TEXT = 20000
const MAX_COMMENTS = 50

const names = (labels) => (labels ?? []).map((label) => (typeof label === 'string' ? label : label?.name))
const isBot = (user) => user?.type === 'Bot' || /\[bot\]$/i.test(user?.login ?? '')
const sameLogin = (a, b) => typeof a === 'string' && typeof b === 'string' && a.toLowerCase() === b.toLowerCase()
const sum = (items, field) => items.reduce((total, item) => total + (item[field] ?? 0), 0)
const formatModel = (m) => `${m.id}${m.variant ? ':' + m.variant : ''}`

// ---------------------------------------------------------------------------------------------------------------
// Preflight: pure decisions and replies
// ---------------------------------------------------------------------------------------------------------------

const time = (iso) => (typeof iso === 'string' ? Date.parse(iso) : NaN)

/**
 * True when the analysis in the state does not cover the issue as it is now: there is none, or the issue was updated
 * after it. A missing time on either side counts as changed, because a wrong "fresh" would skip a needed analysis.
 */
function needsAnalysis(issue, st) {
  const analysis = st?.analysis
  if (!analysis) return true
  const analyzed = time(analysis.issueUpdatedAt)
  const updated = time(issue.updated_at)
  return Number.isNaN(analyzed) || Number.isNaN(updated) || updated > analyzed
}

/** The `analyzeFirst` flag the preflight stored for this run, else whether the analysis is stale now. */
function analyzeFirstOf(issue, st, runUrl) {
  return st.implementing?.run === runUrl ? st.implementing.analyzeFirst : needsAnalysis(issue, st)
}

/**
 * What to do with `/agent implement`. Order matters: the type first, then a running attempt, then the capability
 * label, then the questions the analysis left open.
 *
 * @param {{ issue: object, state: object|null, command: { force?: boolean }|null, config?: object }} input
 * @returns {{ outcome: 'refuse-closed'|'refuse-type'|'refuse-busy'|'refuse-unsuitable'|'refuse-needs-info'
 *   |'analyze-first'|'proceed', forced: boolean }} `forced` is true when `force` overrides `ai:unsuitable`
 */
// An attempt older than this is dead, not running: the implement job times out after 90 minutes. Without the limit,
// a job that died while `implementing` would refuse every later command.
const BUSY_MS = 120 * 60 * 1000

function preflightDecision({ issue, state: st, command, now = Date.now() }) {
  const type = issue.type?.name
  if (issue.state === 'closed') return { outcome: 'refuse-closed', forced: false }
  if (!Object.hasOwn(PLAYBOOKS, type ?? '')) return { outcome: 'refuse-type', forced: false }
  const startedAt = Date.parse(st?.implementing?.at ?? '')
  const running = st?.phase === 'implementing' && !(now - startedAt > BUSY_MS)
  if (running) return { outcome: 'refuse-busy', forced: false }

  const unsuitable = names(issue.labels).includes(LABEL_UNSUITABLE)
  const force = Boolean(command?.force)
  if (unsuitable && !force) return { outcome: 'refuse-unsuitable', forced: false }
  const forced = unsuitable && force

  if (!needsAnalysis(issue, st)) {
    if (st.analysis.verdict === 'needs-info') return { outcome: 'refuse-needs-info', forced }
    return { outcome: 'proceed', forced }
  }
  return { outcome: 'analyze-first', forced }
}

/**
 * What to do with an attempt that a person asked for (`kind` human or review): `/agent retry`, a change request on a
 * pull request of the agent, an answer to a hand-off, or a review with change requests. The person explicitly asked to
 * go on, so the labels and the verdict of the analysis do not refuse it; the issue must be open and typed, and no
 * attempt may be running.
 *
 * A change request or a review needs the open pull request that the state names, because it changes that branch. A
 * retry or an answer continues the open pull request of the earlier attempt, and starts a new branch and pull request
 * (`fresh`) when that pull request is closed or merged.
 *
 * @param {{ issue: object, state: object|null, command: { name?: string }|null, kind: 'human'|'review',
 *   pr: number|null, pull: object|null, now?: number }} input `pull` is the pull request of `state.pr`, or `null`
 * @returns {{ outcome: 'refuse-closed'|'refuse-type'|'refuse-busy'|'refuse-no-branch'|'refuse-pr-closed'|'proceed',
 *   fresh: boolean, changes: boolean }} `changes` is true for an attempt that changes the open pull request
 */
function humanDecision({ issue, state: st, command, kind, pr, pull, now = Date.now() }) {
  const changes = kind === 'review' || command?.name === 'chat'
  const refuse = (outcome) => ({ outcome, fresh: false, changes })
  if (issue.state === 'closed') return refuse('refuse-closed')
  if (!Object.hasOwn(PLAYBOOKS, issue.type?.name ?? '')) return refuse('refuse-type')
  const startedAt = Date.parse(st?.implementing?.at ?? '')
  if (st?.phase === 'implementing' && !(now - startedAt > BUSY_MS)) return refuse('refuse-busy')
  const open = pull?.state === 'open'
  if (changes) {
    if (!st?.branch || !st.pr || st.pr !== pr) return refuse('refuse-no-branch')
    if (!open) return refuse('refuse-pr-closed')
  }
  return { outcome: 'proceed', fresh: !changes && Boolean(st?.pr) && !open, changes }
}

/** The numbered questions of the analysis, one line each. */
const questionLines = (questions) =>
  (questions ?? []).filter((q) => q.trim() !== '').map((q, i) => `${i + 1}. ${inline(q)}`)

/**
 * The comment that explains a refusal. It mentions the person who asked, because only a new comment notifies.
 *
 * @param {{ outcome: string, actor: string, issue: object, state: object|null }} input `state` is the state the
 *   refusal is based on: for a refusal after the analysis of this run, the state that analysis wrote
 */
function refusalReply({ outcome, actor, issue, state: st }) {
  const who = `@${actor}`
  switch (outcome) {
    case 'refuse-closed':
      return `${who}, this issue is closed. Reopen it first if it still needs work.`
    case 'refuse-type':
      return `${who}, I implement Bug and Task issues only; this one is ${issue.type?.name ?? 'untyped'}.`
    case 'refuse-busy': {
      const run = st?.implementing?.run
      return `${who}, an implementation is already running${run ? `: ${run}` : ''}.`
    }
    case 'refuse-unsuitable': {
      const analysis = st?.analysis
      const byAgent = analysis?.labelSetBy === 'agent' && analysis.label === LABEL_UNSUITABLE
      const why = byAgent ? inline(analysis.reason) : 'A person marked this issue ai:unsuitable.'
      return [
        `${who}, I did not start. ${why}`,
        '',
        'If you want me to try anyway, comment `/agent implement force`.',
      ].join('\n')
    }
    case 'refuse-needs-info': {
      const author = issue.user?.login
      return [
        `${who}, the issue needs more information before I can implement it:`,
        '',
        ...questionLines(st?.analysis?.questions),
        '',
        'Answer them, or edit the issue, then comment `/agent implement` again.',
        ...(author && !sameLogin(author, actor) ? ['', `@${author}, these questions are for you.`] : []),
      ].join('\n')
    }
    case 'refuse-no-branch':
      return `${who}, I can change a branch only after an attempt of mine pushed it, and this pull request has no ` +
        'such branch in the state of its issue. Make the change yourself, or comment `/agent retry` on the issue.'
    case 'refuse-pr-closed':
      return `${who}, the pull request is closed, so there is nothing to change on it. Comment ` +
        '`/agent retry` with guidance to start a new pull request.'
    default:
      throw new Error(`No reply for the outcome '${outcome}'`)
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Run: pure helpers
// ---------------------------------------------------------------------------------------------------------------

/** `{ playbook, branchPrefix }` of an issue type; throws for a type the agent does not implement. */
function playbookOf(type) {
  if (!Object.hasOwn(PLAYBOOKS, type ?? '')) throw new Error(`No playbook for the issue type '${type ?? 'none'}'`)
  return PLAYBOOKS[type]
}

/**
 * The branch of an issue: `bugfix/<n>-<slug>` for a Bug, `feature/<n>-<slug>` for a Task. The slug is up to five words
 * of the title, lowercase `[a-z0-9]`, joined by `-`, at most 40 characters.
 */
function branchName(type, number, title) {
  const { branchPrefix } = playbookOf(type)
  const words = String(title ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 5)
  const slug = words.join('-').slice(0, 40).replace(/-+$/, '')
  return `${branchPrefix}/${number}${slug ? `-${slug}` : ''}`
}

/** The commit the remote has for `branch`, from `git ls-remote --heads` output, or `null`. */
function parseLsRemote(stdout, branch) {
  for (const line of String(stdout ?? '').split('\n')) {
    const [sha, ref] = line.trim().split(/\s+/)
    if (ref === `refs/heads/${branch}` && /^[0-9a-f]{40,64}$/.test(sha)) return sha
  }
  return null
}

/** `{ files, insertions, deletions }` from `git diff --shortstat` output; zeros for an empty diff. */
function parseShortstat(text) {
  const number = (re) => Number(re.exec(String(text ?? ''))?.[1] ?? 0)
  return {
    files: number(/(\d+) files? changed/),
    insertions: number(/(\d+) insertions?\(\+\)/),
    deletions: number(/(\d+) deletions?\(-\)/),
  }
}

/** True when the change has outgrown the issue: more files or more changed lines than the playbook allows. */
function diffTooLarge(stat, playbook) {
  const limit = DIFF_LIMITS[playbook]
  if (!limit) throw new Error(`No diff limit for the playbook '${playbook}'`)
  return stat.files > limit.files || stat.insertions + stat.deletions > limit.lines
}

/** The changed files under .github/workflows/, from `git diff --name-only` output. */
function touchedWorkflows(nameOnly) {
  return changedFiles(nameOnly).filter((l) => l.startsWith('.github/workflows/'))
}

// The agent's own instructions and tools. A change to them would steer the next model call of this run (the
// self-reviewer reads skills, rules, and AGENTS.md from the working tree), so a person makes such a change.
const PROTECTED = [/^\.claude\//, /^\.cursor\//, /^tools\/agent\//, /^agent-packages\//, /(^|\/)(AGENTS|CLAUDE)\.md$/]

/** The changed files that belong to the agent's own instructions and tools. */
function touchedAgentFiles(nameOnly) {
  return changedFiles(nameOnly).filter((l) => PROTECTED.some((re) => re.test(l)))
}

/**
 * Why a change may not be pushed, or `null`: it has outgrown the issue (more files or changed lines than the playbook
 * allows), it edits workflow files, or it edits the agent's own instructions or tools. The work step checks it, and
 * `publish` checks it again on the commits it is about to push, because the work step ran code of the change.
 *
 * @param {{ stat: { files: number, insertions: number, deletions: number }, nameOnly: string, playbook: string }} input
 */
function diffBlockReason({ stat, nameOnly, playbook }) {
  const limit = DIFF_LIMITS[playbook]
  if (diffTooLarge(stat, playbook)) {
    return `The change has outgrown the issue: ${stat.files} files and ` +
      `${stat.insertions + stat.deletions} changed lines, and the limit for a ${playbook} is ` +
      `${limit.files} files or ${limit.lines} lines.`
  }
  const workflows = touchedWorkflows(nameOnly)
  if (workflows.length) {
    return `The change edits workflow files (${workflows.join(', ')}), which the agent may not push. ` +
      'A person has to make that part of the change.'
  }
  const agentFiles = touchedAgentFiles(nameOnly)
  if (agentFiles.length) {
    return `The change edits the agent's own instructions or tools (${agentFiles.join(', ')}). ` +
      'A person has to make that part of the change.'
  }
  return null
}

function changedFiles(nameOnly) {
  return String(nameOnly ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
}

/**
 * The commands of the local checks. One Nx command covers Go, Maven, and TypeScript projects. The scripts under
 * `tools/` (this agent included) are no Nx projects, so a change to them also runs `pnpm test:tools`.
 *
 * @param {string} base the branch point
 * @param {string[]} [changedFiles] the files the pull request changes, from `git diff --name-only`
 */
function checkCommands(base, changedFiles = []) {
  const commands = [
    {
      name: 'nx affected',
      file: 'pnpm',
      args: ['exec', 'nx', 'affected', '-t', 'build', 'test', `--base=${base}`, '--head=HEAD', '--parallel=3',
        '--output-style=static'],
    },
  ]
  if (changedFiles.some((file) => file.startsWith('tools/'))) {
    commands.push({ name: 'test:tools', file: 'pnpm', args: ['test:tools'] })
  }
  return commands
}

const commandLine = (c) => [c.file, ...c.args].join(' ')

/** `type(scope): title`, or `type: title` without a scope. A trailing period of the title is dropped. */
function commitTitle({ type, scope, title }) {
  const cleanScope = String(scope ?? '').trim().replace(/[^A-Za-z0-9._/-]+/g, '-').replace(/^-+|-+$/g, '')
  const cleanTitle = String(title).replace(/\s+/g, ' ').trim().replace(/\.+$/, '')
  return `${type}${cleanScope ? `(${cleanScope})` : ''}: ${cleanTitle}`
}

/** The Conventional Commit message: the title, `Closes #<n>.`, and the `Agent-Run` trailer. */
function commitMessage({ type, scope, title, number, runUrl }) {
  return `${commitTitle({ type, scope, title })}\n\nCloses #${number}.\n\nAgent-Run: ${runUrl}`
}

/**
 * The semantic rules of the implementer's answer that the schema cannot express: a `bug-fix` is a `fix`, a blocked
 * or unrelated answer says why, and `unrelated` (the failure is not caused by the change) is for a CI fix only. Throws
 * `ContractError`; returns the answer otherwise.
 *
 * @param {'initial'|'human'|'ci-fix'|'review'} [kind] why the attempt runs
 */
function checkImplementation(output, playbook, kind) {
  const problems = []
  if (playbook === 'bug-fix' && output.commitType !== 'fix') {
    problems.push(`commitType: a bug-fix must use 'fix', got '${output.commitType}'`)
  }
  if (output.status === 'blocked' && output.blockedReason.trim() === '') {
    problems.push('blockedReason: a blocked answer needs a reason')
  }
  if (output.status === 'unrelated') {
    if (kind !== 'ci-fix') problems.push("status: 'unrelated' is allowed only on a CI fix")
    if (output.blockedReason.trim() === '') problems.push('blockedReason: an unrelated answer needs a reason')
  }
  if (problems.length > 0) {
    throw new ContractError(`The implementation is inconsistent: ${problems.join('; ')}`, problems)
  }
  return output
}

/** The rules of the self-review the schema cannot express. Throws `ContractError`. */
function checkSelfReview(review) {
  const problems = []
  if (review.verdict === 'changes' && review.findings.length === 0) {
    problems.push('findings: a changes verdict needs at least one finding')
  }
  if (review.verdict === 'approve' && review.findings.some((f) => f.severity === 'blocker')) {
    problems.push('verdict: an approval cannot carry a blocker finding')
  }
  if (problems.length > 0) {
    throw new ContractError(`The self-review is inconsistent: ${problems.join('; ')}`, problems)
  }
  return review
}

/** Findings that justify a change request: `minor` findings alone do not. */
const openFindings = (review) => review.findings.filter((f) => f.severity !== 'minor')

/** The verdict that counts: `changes` only with a blocker or major finding; minor-only findings count as approve. */
const effectiveVerdict = (review) =>
  review.verdict === 'changes' && openFindings(review).length > 0 ? 'changes' : 'approve'

/** Replaces every secret in `text` with `***`. */
function redact(text, secrets) {
  let result = String(text ?? '')
  for (const secret of secrets) if (secret) result = result.split(secret).join('***')
  return result
}

/** The environment of a child process that runs code of the repository: the parent's, minus tokens and keys. */
function cleanEnv(parentEnv) {
  const env = {}
  for (const [k, v] of Object.entries(parentEnv)) if (!SECRET_ENV.test(k) && k !== 'OPENAI_API_KEY') env[k] = v
  return env
}

/** `text` in a code fence that its own backtick runs cannot close. */
function fence(text, lang = '') {
  const longest = Math.max(2, ...[...String(text).matchAll(/`+/g)].map((m) => m[0].length))
  const mark = '`'.repeat(longest + 1)
  return `${mark}${lang}\n${text}\n${mark}`
}

// ---------------------------------------------------------------------------------------------------------------
// Run: prompt inputs
// ---------------------------------------------------------------------------------------------------------------

const clipText = (text) => clip(text, MAX_TEXT)

/**
 * The plan of the analysis. The analyst wrote it after reading people's text, so it may echo an injection: it goes
 * inside an `<untrusted>` block, like the text it came from.
 */
function renderPlan(plan, analysis) {
  if (!plan) {
    const reason = analysis?.reason ? ` Its reason: ${inline(analysis.reason)}` : ''
    return [untrusted(`There is no plan: the analysis did not find the issue suitable.${reason}`)]
  }
  const lines = [
    `- Modules: ${inline(plan.modules.join(', ') || 'none named')}`,
    `- Approach: ${inline(plan.approach)}`,
    `- Tests: ${inline(plan.tests || 'none named')}`,
    `- Risk: ${plan.risk}`,
  ]
  return [untrusted(lines.join('\n'))]
}

/** What the failing check commands printed, for the implementer of the next round. */
function renderCheckFailures(checks) {
  const out = []
  for (const r of checks.results.filter((x) => x.exitCode !== 0)) {
    const what = r.timedOut ? 'timed out' : `failed with exit code ${r.exitCode}`
    out.push(`Command \`${r.command}\` ${what}. Last lines:`)
    out.push('', untrusted(r.tail), '')
  }
  return out
}

/** The heading above the text a person wrote to steer an attempt. */
const NOTES_HEADING = {
  initial: 'Notes of the maintainer who asked for this implementation',
  'ci-fix': 'Notes of the maintainer who asked for this implementation',
  human: "The maintainer's guidance",
  review: 'The review that asks for changes',
}

/** What the implementer of a CI fix does when the change did not cause the failure. */
const UNRELATED_HINT = 'If the CI report shows that this change did not cause the failure (a flaky or infrastructure ' +
  'failure, a test the change does not touch), change no code and answer with `"status": "unrelated"`. Put the ' +
  'evidence in `blockedReason`: which checks failed and why the change cannot cause them.'

const MAX_THREADS = 30
const MAX_THREAD_COMMENT = 4000

/**
 * The threads the implementer sees: the first `MAX_THREADS`. The state records only these, so `publish` replies in the
 * threads that were shown and in no other. `omitted` is the number of unresolved threads left out.
 */
function limitThreads(threads) {
  const shown = threads.slice(0, MAX_THREADS)
  return { shown, omitted: threads.length - shown.length }
}

/**
 * The unresolved review threads for the implementer: where each one is and what was said in it. People wrote them, and
 * so did the pull request that names the file, so the location goes inside the `<untrusted>` block with the
 * conversation; outside it stands only a counter. `omitted` threads were left out by `limitThreads`.
 */
function renderReviewThreads(threads, omitted = 0) {
  const out = ['## Unresolved review threads', '']
  if (threads.length === 0) return [...out, 'No thread is unresolved. The review text above is all there is.', '']
  if (omitted > 0) {
    out.push(
      `${omitted} more unresolved thread(s) are not shown and stay open. Work on the ${threads.length} shown below.`,
      '',
    )
  }
  threads.forEach((thread, i) => {
    const where = `${thread.path || 'no file'}${thread.line ? `:${thread.line}` : ''}`
    out.push(`### Thread ${i + 1} of ${threads.length}`, '')
    const talk = thread.comments.map((c) => `${c.author}: ${clip(c.body, MAX_THREAD_COMMENT)}`).join('\n\n')
    out.push(untrusted(`Location: ${where}\n\n${talk}`), '')
  })
  return out
}

/**
 * The text of `implement-input.md` for the implementer: facts of the issue, what people wrote inside `<untrusted>`
 * blocks, the plan, earlier attempts, and, from round 2, what the previous round left to fix.
 *
 * @param {object} input
 * @param {string} input.playbook `bug-fix` or `task`
 * @param {'initial'|'human'|'ci-fix'|'review'} input.kind why this attempt runs; `ci-fix` is started by the CI gate,
 *   `human` and `review` by a person
 * @param {object} input.issue
 * @param {object[]} input.comments the comments of the issue without the state comment; bot comments are skipped
 * @param {object|null} input.plan the plan of the analysis
 * @param {object|null} input.analysis the analysis in the state (the reason when there is no plan)
 * @param {string} input.notes the notes after the command
 * @param {object[]} input.attempts earlier attempts from the state
 * @param {number} input.round 1, or more after a self-review or a failed check
 * @param {{ findings: object[], checks: object|null }|null} input.previous the previous round's open results
 * @param {string} [input.ciReport] the CI report of a `ci-fix` attempt, with the log text of failed jobs
 * @param {object[]} [input.reviewThreads] the unresolved review threads of a `review` attempt that the implementer sees
 * @param {number} [input.omittedThreads] how many more unresolved threads were left out
 */
function renderImplementInput({
  playbook, kind, issue, comments, plan, analysis, notes, attempts, round, previous, ciReport, reviewThreads,
  omittedThreads = 0,
}) {
  const people = comments.filter((c) => !isBot(c.user))
  const shown = people.slice(-MAX_COMMENTS)
  const out = [
    `# Implementation of issue #${issue.number}`,
    '',
    `- Playbook: ${playbook}`,
    `- Issue type: ${issue.type?.name ?? 'none'}`,
    `- Attempt: ${(attempts?.length ?? 0) + 1} (${kind})`,
    `- Round: ${round}`,
    ...(kind === 'ci-fix' ? ['- Also load the skill: apihub-ci-failure-triage'] : []),
    '',
    ...(kind === 'ci-fix'
      ? [
        'The pull request of this issue is open and its CI is red. Fix the failure that the CI report names, on top ' +
          'of the branch you have checked out, and nothing else.',
        '',
        UNRELATED_HINT,
        '',
      ]
      : []),
    ...(kind === 'review'
      ? [
        'The pull request of this issue is open, and a reviewer asked for changes. Address every unresolved review ' +
          'thread below, on top of the branch you have checked out, and nothing else. A person resolves the threads.',
        '',
      ]
      : []),
    '## Title and description',
    '',
    `Written by ${issue.user?.login ?? 'unknown'} on ${issue.created_at ?? 'an unknown date'}.`,
    '',
    untrusted(`Title: ${issue.title}\n\n${clipText(issue.body)}`),
    '',
    '## Comments',
    '',
  ]
  if (shown.length === 0) out.push('No comments.', '')
  if (people.length > shown.length) {
    out.push(`Only the last ${shown.length} of ${people.length} comments are shown.`, '')
  }
  for (const c of shown) {
    out.push(`Written by ${c.user?.login ?? 'unknown'} on ${c.created_at ?? 'an unknown date'}.`, '')
    out.push(untrusted(clipText(c.body)), '')
  }
  out.push('## Plan of the analysis', '', ...renderPlan(plan, analysis), '')
  if (notes) out.push(`## ${NOTES_HEADING[kind] ?? NOTES_HEADING.initial}`, '', untrusted(notes), '')
  if (kind === 'review') out.push(...renderReviewThreads(reviewThreads ?? [], omittedThreads))
  if ((attempts ?? []).length > 0) {
    out.push('## Earlier attempts', '')
    for (const a of attempts) {
      out.push(`### Attempt ${a.n} (${a.kind}): ${a.result}`, '', untrusted(clipText(a.notes ?? '')), '')
    }
  }
  if (ciReport) out.push('## CI report', '', untrusted(clipText(ciReport)), '')
  if (previous) {
    out.push(`## Result of round ${round - 1}: fix this first`, '')
    if (previous.findings.length > 0) {
      // The findings are model output about people's text: data, like the text itself.
      const lines = previous.findings.map(
        (f) => `- ${f.severity} at \`${f.file}${f.line ? `:${f.line}` : ''}\`: ${inline(f.body)}`,
      )
      out.push('### Self-review findings', '', untrusted(lines.join('\n')), '')
    }
    if (previous.checks && !previous.checks.passed) {
      out.push('### Local check failures', '', ...renderCheckFailures(previous.checks))
    }
  }
  return out.join('\n')
}

/** The text of `self-review-input.md`: the issue, the plan, the implementer's summary, and the commits to compare. */
function renderSelfReviewInput({ issue, plan, analysis, notes, summary, base, head, kind }) {
  return [
    `# Self-review of the change for issue #${issue.number}`,
    '',
    `- Base commit: ${base}`,
    `- Head commit: ${head}`,
    `- Compare with: \`git diff ${base} ${head}\``,
    ...(kind === 'ci-fix'
      ? [`- This attempt fixes a red CI run: the last commit (\`git show ${head}\`) is the fix, and the comparison ` +
        'above is the whole branch.']
      : []),
    '',
    '## The issue',
    '',
    untrusted(`Title: ${issue.title}\n\n${clipText(issue.body)}`),
    '',
    ...(notes ? ['## Notes of the maintainer', '', untrusted(notes), ''] : []),
    '## Plan of the analysis',
    '',
    ...renderPlan(plan, analysis),
    '',
    "## The implementer's summary",
    '',
    untrusted(summary),
    '',
  ].join('\n')
}

// ---------------------------------------------------------------------------------------------------------------
// Run: texts for GitHub
// ---------------------------------------------------------------------------------------------------------------

const checkNames = (checks) => checks.results.map((r) => `\`${r.command}\``).join(', ')

/** One sentence of `text`, at most 300 characters. */
function firstSentence(text) {
  const flat = inline(text)
  const match = /^.*?[.!?](?=\s|$)/.exec(flat)
  const sentence = match ? match[0] : flat
  return sentence.length > 300 ? `${sentence.slice(0, 297)}...` : sentence
}

/**
 * The pull request description. It follows `.github/pull_request_template.md` (Why, What, How to verify, the
 * checklist) and ends with the self-review result, who asked, and the marker the router trusts.
 */
function prBody({ number, issueTitle, implementation, checks, review, rounds, actor }) {
  const verdict = effectiveVerdict(review)
  const out = [
    '## Why',
    '',
    `${inline(issueTitle)}. ${firstSentence(implementation.summary)}`,
    '',
    `Closes #${number}.`,
    '',
    '## What',
    '',
    inline(implementation.summary),
    '',
    '## How to verify',
    '',
    inline(implementation.verification) || 'No verification was described.',
    '',
    checks.passed
      ? `Local checks passed, as reported by the work job: ${checkNames(checks)}.`
      : 'Local checks failed, as reported by the work job: ' +
        `${checkNames({ results: checks.results.filter((r) => r.exitCode !== 0) })}.`,
    '',
    '## Checklist',
    '',
    '- [x] The issue is linked under Development or with "Closes #XXX".',
    '- [ ] The documentation is updated in this pull request.',
    '- [ ] A breaking change has `!` in the title, or a "BREAKING CHANGE:" footer at the start of a line in this ' +
      'description.',
    '',
    verdict === 'approve'
      ? `Self-review by a second model, as reported by the work job: approved after ${rounds} round(s).`
      : `Self-review by a second model, as reported by the work job: changes were still requested after ${rounds} ` +
        'round(s).',
  ]
  if (review.findings.length > 0) {
    out.push('')
    for (const f of review.findings) {
      out.push(`- ${f.severity} at \`${f.file}${f.line ? `:${f.line}` : ''}\`: ${inline(f.body)}`)
    }
  }
  out.push(
    '',
    `Implemented by the AI Autonomous agent on request of @${actor}.`,
    '',
    `<!-- ai-autonomous-agent issue=${number} -->`,
    '',
  )
  return out.join('\n')
}

const costLine = (runUrl, totalUsd, hint) =>
  `<sub>[Run](${runUrl}) · AI cost of this issue so far: $${usage.formatUsd(totalUsd)} · ${hint}</sub>`

/** The two ways on after a hand-off on a red CI: a rerun of the failed checks, or another fix. */
const WAY_RERUN = 'If the failure is not caused by the change (a flaky test, an outage), comment `/agent rerun`: it ' +
  'reruns the failed checks, with no new attempt and no model cost.'
const WAY_RETRY = 'To try another fix, comment `/agent retry` with guidance.'

/** The lines that close a hand-off on a red CI. */
const waysOnLines = () => ['What you can do:', '', `- ${WAY_RERUN}`, `- ${WAY_RETRY}`]

/**
 * The bullets of a hand-off on a red CI that the agent knows only from the CI report in the state: the failed checks,
 * the first error line, and why the agent stopped. Without a readable report only the reason is left.
 */
function ciHandOffLines(report, reason) {
  // ci-gate.js requires this module, so it is loaded when it is needed.
  const { reportFacts, failureLines } = require('./ci-gate')
  const facts = reportFacts(report)
  const lines = facts.failed.length > 0 ? failureLines(facts.failed, facts.errorsByJob, facts.total) : []
  return [...lines, `Why I stopped: ${inline(reason)}`].map((line) => `- ${line}`)
}

/**
 * The human part of the state comment after the run.
 *
 * @param {object} input
 * @param {'pr-opened'|'draft'|'blocked'|'unrelated'|'error'} input.result
 * @param {string} [input.ciReport] the CI report of a CI fix, for the hand-off texts
 * @param {{ names: string, counted: number, max: number }} [input.rerun] for `unrelated`: the failed checks (as
 *   `checkNames` writes them), the attempts counted so far, and the limit
 */
function renderOutcome({ result, number, pr, branch, attempt, implementation, checks, review, reason, message, runUrl,
  totalUsd, kind, ciReport, rerun }) {
  const retry = 'comment `/agent implement` with guidance to try again'
  if (result === 'unrelated') {
    return [
      '### AI implementation: CI failed, but not because of this change',
      '',
      `Failed on pull request #${pr}: ${rerun.names}.`,
      '',
      `Why I think the change does not cause it: ${inline(reason)}`,
      '',
      `I reran the failed checks (attempt ${rerun.counted} of ${rerun.max}). No code changed; the CI gate decides ` +
        'again.',
      '',
      costLine(runUrl, totalUsd, 'the result of the rerun decides'),
    ].join('\n')
  }
  if (result === 'error') {
    return [
      '### AI implementation failed',
      '',
      `The implementation did not finish: ${inline(message)}`,
      '',
      costLine(runUrl, totalUsd, retry),
    ].join('\n')
  }
  if (result === 'blocked' && kind === 'ci-fix') {
    return [
      '### AI implementation needs a person: CI is red',
      '',
      `I stopped without changing pull request #${pr}.`,
      '',
      ...ciHandOffLines(ciReport, reason),
      '',
      ...(attempt.notes ? ['**What I tried**', '', inline(attempt.notes), ''] : []),
      ...waysOnLines(),
      '',
      costLine(runUrl, totalUsd, 'comment `/agent rerun` to rerun the checks, or `/agent retry` with guidance'),
    ].join('\n')
  }
  if (result === 'blocked') {
    return [
      '### AI implementation is blocked',
      '',
      `I stopped without a pull request: ${inline(reason)}`,
      '',
      ...(attempt.notes ? ['**What I tried**', '', inline(attempt.notes), ''] : []),
      '**What I need from you:** decide or add what is missing, then comment `/agent implement` with guidance.',
      '',
      costLine(runUrl, totalUsd, retry),
    ].join('\n')
  }
  const rounds = `${attempt.rounds} round(s)`
  const ciFix = kind === 'ci-fix'
  const lead = result === 'pr-opened'
    ? [ciFix ? `### AI implementation: CI fix pushed to pull request #${pr}`
      : pr ? `### AI implementation: pull request #${pr} is open` : '### AI implementation: ready for a pull request',
    '', `Branch \`${branch}\`. ${rounds}. CI runs ${ciFix ? 'again ' : ''}on the pull request. It stays a draft ` +
      'until CI is green on GitHub.']
    : [ciFix ? `### AI implementation needs a person: CI fix for pull request #${pr}`
      : pr ? `### AI implementation needs a person: draft pull request #${pr}` : '### AI implementation needs a person',
    '', `Branch \`${branch}\`. I stopped after ${rounds} without a green result.`]
  const out = [
    ...lead,
    '',
    `- Local checks (reported by the work job): ${checks.passed ? 'green' : 'red'}`,
    '- Self-review (reported by the work job): ' +
      `${effectiveVerdict(review) === 'approve' ? 'approved' : 'changes requested'}`,
    `- Summary: ${inline(implementation.summary)}`,
    '',
  ]
  if (result === 'draft') {
    out.push('**What I tried**', '', inline(attempt.notes || implementation.notes || 'No notes.'), '')
    out.push('**What is open**', '')
    if (!checks.passed) {
      for (const r of checks.results.filter((x) => x.exitCode !== 0)) {
        out.push(`- Failing check: \`${r.command}\` (${r.timedOut ? 'timed out' : `exit code ${r.exitCode}`}).`)
      }
    }
    for (const f of openFindings(review)) {
      out.push(`- ${f.severity} at \`${f.file}${f.line ? `:${f.line}` : ''}\`: ${inline(f.body)}`)
    }
    const what = ciFix ? 'pull request' : 'draft pull request'
    out.push('', `**What I need from you:** review the ${what}, push a fix to the branch, or comment ` +
      '`/agent implement` with guidance for another attempt.', '')
  }
  out.push(costLine(runUrl, totalUsd, `closes #${number} when merged`))
  return out.join('\n')
}

/** The short comment that notifies the person who asked. State comment edits notify nobody. */
function actorComment({ result, actor, pr, reason, message, kind, ciReport }) {
  switch (result) {
    case 'draft':
      if (kind === 'ci-fix') {
        return `@${actor}, I pushed a fix to pull request #${pr}, but it is not green yet. ` +
          'The AI implementation comment on this issue says what is open.'
      }
      return `@${actor}, I opened draft pull request ${pr ? `#${pr}` : '(dry run)'}, but it is not green yet. ` +
        'The AI implementation comment on this issue says what is open.'
    case 'unrelated':
      return `@${actor}, CI failed on #${pr}, but I think this change does not cause it: ${inline(reason)} ` +
        'I reran the failed checks; the CI gate decides again.'
    case 'blocked':
      if (kind === 'ci-fix') {
        return [`@${actor}, I could not fix CI on #${pr}.`, '', ...ciHandOffLines(ciReport, reason), '',
          ...waysOnLines()].join('\n')
      }
      return `@${actor}, I could not implement this issue: ${inline(reason)} The AI implementation comment on this ` +
        'issue has the details.'
    case 'error':
      return `@${actor}, the implementation failed: ${inline(message)}`
    default:
      throw new Error(`No comment for the result '${result}'`)
  }
}

/** The attempt record for the state. */
function attemptRecord({ n, kind, run, result, rounds, checks, review, notes, reason, actor, at }) {
  return {
    n,
    kind,
    ...(actor ? { actor } : {}),
    run,
    result,
    rounds,
    checks: checks ? (checks.passed ? 'green' : 'red') : null,
    selfReview: review ? effectiveVerdict(review) : null,
    ...(reason ? { reason } : {}),
    notes,
    at,
  }
}

// ---------------------------------------------------------------------------------------------------------------
// I/O: processes, Git, the token
// ---------------------------------------------------------------------------------------------------------------

/**
 * Runs a process and resolves `{ exitCode, stdout, stderr, timedOut }`; never rejects. The process gets `cleanEnv`.
 * `keep` says which end of a long output survives (`tail` by default, `head` for a diff preview), `stream` copies
 * the output to the job log as it arrives.
 */
function defaultExec(file, args, options = {}) {
  const { cwd = process.cwd(), timeoutMs = 0, keep = 'tail', maxBytes = 1 << 20, stream = false } = options
  return new Promise((resolve) => {
    const child = spawn(file, args, { cwd, env: cleanEnv(process.env), stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    let timedOut = false
    let kill = null
    const add = (buffer, chunk) => {
      const joined = buffer + chunk
      if (joined.length <= maxBytes) return joined
      return keep === 'head' ? joined.slice(0, maxBytes) : joined.slice(-maxBytes)
    }
    const timer = timeoutMs > 0
      ? setTimeout(() => {
        timedOut = true
        child.kill('SIGTERM')
        kill = setTimeout(() => child.kill('SIGKILL'), 10000)
        kill.unref()
      }, timeoutMs)
      : null
    child.stdout.on('data', (d) => {
      if (stream) process.stdout.write(d)
      stdout = add(stdout, d)
    })
    child.stderr.on('data', (d) => {
      if (stream) process.stderr.write(d)
      stderr = add(stderr, d)
    })
    child.on('error', (err) => {
      if (timer) clearTimeout(timer)
      resolve({ exitCode: 127, stdout, stderr: `${stderr}${err.message}`, timedOut: false })
    })
    child.on('close', (code) => {
      if (timer) clearTimeout(timer)
      if (kill) clearTimeout(kill)
      resolve({ exitCode: code ?? 1, stdout, stderr, timedOut })
    })
  })
}

/** Runs `git <args>` and returns the trimmed stdout. A non-zero exit throws, unless `allowFail`. */
async function git(exec, args, { allowFail = false } = {}) {
  const r = await exec('git', args, { timeoutMs: GIT_TIMEOUT_MS })
  if (r.exitCode !== 0 && !allowFail) {
    throw new Error(`git ${args[0]} failed with ${r.exitCode}: ${tailLines(r.stderr, 10)}`)
  }
  return r.stdout.trim()
}

/** The only reader of `AGENT_PAT`: the Git identity, the push, and the pull request come here. */
function readPat(env) {
  if (!env.AGENT_PAT) throw new Error('AGENT_PAT is not set')
  return env.AGENT_PAT
}

// GitHub's private commit address of an account: `<id>+<login>@` and the noreply domain. The CLA check maps it to
// the account.
const BOT_ID = 41898282
const NOREPLY_DOMAIN = 'users.noreply.github.com'
function noreplyEmail(id, login) {
  return `${id}+${login}@${NOREPLY_DOMAIN}`
}

/** The Git identity of the PAT owner, so the CLA check knows the author of the commits. */
async function resolveIdentity({ env, repo, deps, dryRun }) {
  if (dryRun && !deps.patGh && !env.AGENT_PAT) {
    log.warn('AGENT_PAT is not set; the dry run commits as the workflow bot')
    return { name: BOT_LOGIN, email: noreplyEmail(BOT_ID, BOT_LOGIN) }
  }
  const client = deps.patGh ?? createClient({ token: readPat(env), repo })
  const user = await client.getAuthenticatedUser()
  return { name: user.login, email: noreplyEmail(user.id, user.login) }
}

/**
 * Pushes HEAD to `branch` with the PAT. A branch of an earlier attempt gets a lease on the commit that was there, so
 * a push of a person in between is not overwritten. The URL holds the token: it is never logged, and the error
 * text is redacted.
 */
async function pushBranch({ env, repo, branch, previousSha, exec, ref = 'HEAD' }) {
  const pat = readPat(env)
  const url = `https://x-access-token:${pat}@github.com/${repo}.git`
  const args = ['push', '--no-verify']
  if (previousSha) args.push(`--force-with-lease=refs/heads/${branch}:${previousSha}`)
  args.push(url, `${ref}:refs/heads/${branch}`)
  const r = await exec('git', args, { timeoutMs: GIT_TIMEOUT_MS })
  if (r.exitCode !== 0) {
    throw new Error(`git push to ${branch} failed with ${r.exitCode}: ${redact(tailLines(r.stderr, 10), [url, pat])}`)
  }
}

/** Opens the pull request as the PAT owner, so that its events start the workflows of the repository. */
async function openPull({ env, repo, deps, title, head, base, body, draft }) {
  const client = deps.patGh ?? createClient({ token: readPat(env), repo })
  return client.createPull({ title, head, base, body, draft })
}

// ---------------------------------------------------------------------------------------------------------------
// Shared by preflight and run
// ---------------------------------------------------------------------------------------------------------------

function parseCommandEnv(text) {
  if (!text) return { name: 'implement', force: false, notes: '' }
  try {
    return JSON.parse(text)
  } catch (err) {
    throw new Error(`AGENT_COMMAND is not valid JSON: ${err.message}`)
  }
}

function requireEnv(env, name) {
  if (!env[name]) throw new Error(`${name} is not set`)
  return env[name]
}

const ENV_KINDS = new Set(['initial', 'ci-fix', 'human', 'review'])

/**
 * `AGENT_KIND`: `initial` (the default; the run decides between initial and human by the number of earlier attempts),
 * `ci-fix` (started by the CI gate), or `human` and `review` (started by a person).
 */
function attemptKind(env) {
  const kind = env.AGENT_KIND || 'initial'
  if (!ENV_KINDS.has(kind)) throw new Error(`AGENT_KIND must be initial, ci-fix, human, or review, got '${kind}'`)
  return kind
}

/** The kind that the attempt record carries: a second `initial` attempt is a person's attempt, so it is `human`. */
const attemptKindOf = (envKind, attemptNo) => (envKind === 'initial' && attemptNo > 1 ? 'human' : envKind)

/** The attempts a person asked for: they skip the refusals about suitability and give the CI loop a fresh budget. */
const isPersonKind = (kind) => kind === 'human' || kind === 'review'

/** The pull request number from `AGENT_PR`, or `null`. */
const pullOf = (env) => (Number(env.AGENT_PR) > 0 ? Number(env.AGENT_PR) : null)

/**
 * The state a CI fix may start from: the CI gate set the phase `implementing` with `kind: 'ci-fix'`, and the earlier
 * attempt left a branch and a pull request. Throws an Error that says what is missing.
 */
function requireCiFixState(st) {
  if (st.phase !== 'implementing' || st.implementing?.kind !== 'ci-fix') {
    throw new Error(`The state does not hold a CI fix to run (phase '${st.phase}'); the CI gate starts it`)
  }
  if (!st.branch || !st.pr) throw new Error('The state records no branch or pull request for the CI fix')
}

/** Loads the issue, its comments, and its state. */
async function loadIssue(gh, number) {
  const issue = await gh.getIssue(number)
  const all = await gh.listIssueComments(number)
  const existing = state.findStateComment(all)
  const st = (existing && state.parse(existing.body)) || state.emptyIssueState(number)
  log.info('issue loaded', {
    type: issue.type?.name,
    labels: names(issue.labels).join(',') || 'none',
    comments: all.length,
    stateComment: existing ? existing.id : 'none',
    phase: st.phase,
    analyzed: st.analysis ? st.analysis.verdict : 'never',
    attempts: st.attempts?.length ?? 0,
  })
  return { issue, comments: all.filter((c) => c !== existing), existing, st }
}

/** A heading, then `text` as a block quote. */
const quoted = (heading, text) => [heading, '', ...text.split('\n').map((l) => `> ${l}`), ''].join('\n')

function appendSummary(env, text) {
  if (env.GITHUB_STEP_SUMMARY) fs.appendFileSync(env.GITHUB_STEP_SUMMARY, text + '\n')
}

function writeOutputs(env, outputs) {
  const text = Object.entries(outputs).map(([k, v]) => `${k}=${v}`).join('\n') + '\n'
  if (env.GITHUB_OUTPUT) fs.appendFileSync(env.GITHUB_OUTPUT, text)
  else process.stdout.write(text)
}

// ---------------------------------------------------------------------------------------------------------------
// preflight
// ---------------------------------------------------------------------------------------------------------------

/**
 * Everything the `work` step needs from GitHub, as `context.json` in `AGENT_OUT`. The work step has no token, so
 * the preflight, which runs before any model or repository code, reads it all: the issue, its comments, the state, the
 * Git identity of the PAT owner, and the facts of this attempt.
 *
 * @param {object} input
 * @param {string} input.out
 * @param {object} input.loaded the result of `loadIssue`
 * @param {object} input.st the state to work from (the marked one)
 * @param {boolean} [input.fresh] start a new branch and pull request: the one of the earlier attempt is closed
 * @param {boolean} [input.changes] the attempt changes the open pull request (a change request or a review)
 * @param {object[]} [input.reviewThreads] the unresolved review threads of a `review` attempt that the implementer sees
 * @param {number} [input.omittedThreads] how many more unresolved threads were left out
 * @param {{ name: string, email: string }} input.identity
 */
function saveContext({
  out, number, ciFix, kind, actor, command, runUrl, analyzeFirst, loaded, st, identity, fresh = false, changes = false,
  reviewThreads = [], omittedThreads = 0,
}) {
  const context = {
    version: 1,
    number,
    ciFix,
    kind: kind ?? (ciFix ? 'ci-fix' : 'initial'),
    actor,
    command,
    runUrl,
    analyzeFirst,
    fresh,
    changes,
    reviewThreads,
    omittedThreads,
    identity,
    issue: loaded.issue,
    comments: loaded.comments,
    state: st,
  }
  fs.mkdirSync(out, { recursive: true })
  fs.writeFileSync(path.join(out, CONTEXT_FILE), JSON.stringify(context, null, 2))
  log.info('context written', { file: path.join(out, CONTEXT_FILE), comments: loaded.comments.length })
  return context
}

/** Reads `context.json`; a missing or damaged file is an error, because the work step cannot go on without it. */
function readContext(out) {
  const file = path.join(out, CONTEXT_FILE)
  if (!fs.existsSync(file)) throw new Error(`${CONTEXT_FILE} is missing in ${out}: the preflight did not write it`)
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

/**
 * Loads the issue and writes `context.json` the way the preflight does after it marked the state. For the `work`
 * step of a state that already is marked, and for tests.
 */
async function writeContext(env = process.env, deps = {}) {
  const config = loadConfig(env)
  const number = Number(requireEnv(env, 'AGENT_NUMBER'))
  const runUrl = requireEnv(env, 'AGENT_RUN_URL')
  const out = requireEnv(env, 'AGENT_OUT')
  const kind = attemptKind(env)
  const ciFix = kind === 'ci-fix'
  const gh = deps.gh ?? createClient({ token: env.GITHUB_TOKEN, repo: env.GITHUB_REPOSITORY })
  const loaded = await loadIssue(gh, number)
  if (ciFix) requireCiFixState(loaded.st)
  const actor = ciFix ? loaded.st.implementing.actor || env.AGENT_ACTOR : requireEnv(env, 'AGENT_ACTOR')
  const { issue, st: loadedState } = loaded
  const analyzeFirst = ciFix || isPersonKind(kind) ? false : analyzeFirstOf(issue, loadedState, runUrl)
  const identity = await resolveIdentity({ env, repo: env.GITHUB_REPOSITORY, deps, dryRun: config.dryRun })
  const command = parseCommandEnv(env.AGENT_COMMAND)
  return saveContext({
    out, number, ciFix, kind, actor, command, runUrl, analyzeFirst, loaded, st: loaded.st, identity,
    changes: kind === 'review' || command.name === 'chat',
  })
}

/**
 * The state a person's attempt starts from. `budgetFrom` gives the CI loop a fresh budget. A fresh start (the pull
 * request of the earlier attempt is closed) retires the branch and the pull request, and the CI bookkeeping of that
 * pull request. The threads of a review are recorded, so `publish` replies in the ones the implementer saw.
 */
function markedPersonState(st, { runUrl, actor, kind, pr, fresh, threads, at }) {
  const base = { ...st }
  delete base.stoppedBy
  delete base.stoppedAt
  if (fresh) {
    for (const key of ['branch', 'pr', 'ciGate', 'lastCiReport', 'e2eRerun', 'e2eReruns']) delete base[key]
    base.retired = [...(st.retired ?? []), { pr: st.pr, branch: st.branch ?? null }]
  }
  return {
    ...base,
    phase: 'implementing',
    budgetFrom: (st.attempts ?? []).length,
    implementing: {
      run: runUrl,
      actor,
      at,
      kind,
      analyzeFirst: false,
      ...(pr ? { pr } : {}),
      ...(threads.length > 0
        ? { threads: threads.map((t) => ({ id: t.id, commentId: t.comments[0]?.databaseId ?? null })) }
        : {}),
    },
  }
}

/** The comment that ends a refusal without noise: an answer to a hand-off that finds the flow busy says nothing. */
const staysSilent = (command, outcome) => command?.name === 'answer' && outcome === 'refuse-busy'

/**
 * Decides, answers a refusal, marks the issue as being implemented, and writes `context.json` for the work step.
 * `deps.gh` and `deps.patGh` are injectable. A CI fix (`AGENT_KIND=ci-fix`) has no decision: the CI gate made it, so
 * only the state is checked. An attempt that a person asked for (`human`, `review`) has the decision of
 * `humanDecision`. The comment that started the job (`AGENT_COMMENT_ID`) gets an `eyes` reaction at once, and
 * `confused` when the preflight refuses.
 *
 * @returns {Promise<{ proceed: boolean, outcome: string, forced: boolean }>}
 */
async function preflight(env = process.env, deps = {}) {
  const config = loadConfig(env)
  const number = Number(requireEnv(env, 'AGENT_NUMBER'))
  const kind = attemptKind(env)
  const ciFix = kind === 'ci-fix'
  const person = isPersonKind(kind)
  const envActor = ciFix ? env.AGENT_ACTOR : requireEnv(env, 'AGENT_ACTOR')
  const runUrl = requireEnv(env, 'AGENT_RUN_URL')
  const out = requireEnv(env, 'AGENT_OUT')
  const command = parseCommandEnv(env.AGENT_COMMAND)
  const prNumber = pullOf(env)
  const commentId = commentIdOf(env.AGENT_COMMENT_ID)
  const gh = deps.gh ?? createClient({ token: env.GITHUB_TOKEN, repo: env.GITHUB_REPOSITORY })
  log.info('preflight starts', { issue: number, actor: envActor || 'from the state', force: command.force, kind,
    pr: prNumber ?? 'none', dryRun: config.dryRun })
  await react({ gh, commentId, content: 'eyes', dryRun: config.dryRun })

  const loaded = await log.group('Load the issue, its comments, and its state', () => loadIssue(gh, number))
  const { issue, existing, st } = loaded
  if (ciFix) {
    requireCiFixState(st)
    const actor = st.implementing.actor || envActor
    if (!actor) throw new Error('Nobody is recorded as the person who asked for this implementation')
    const identity = await log.group('Git identity', () =>
      resolveIdentity({ env, repo: env.GITHUB_REPOSITORY, deps, dryRun: config.dryRun }),
    )
    saveContext({
      out, number, ciFix: true, kind, actor, command, runUrl, analyzeFirst: false, loaded, st, identity,
    })
    log.info('preflight decision', { outcome: 'ci-fix', note: 'the CI gate decided; no checks of the issue apply' })
    writeOutputs(env, { proceed: 'true', outcome: 'ci-fix' })
    return { proceed: true, outcome: 'ci-fix', forced: false }
  }
  const actor = envActor
  let pull = null
  const decision = await log.group('Decide', async () => {
    let result
    if (person) {
      // The pull request of the state tells a retry whether to continue it or to start again.
      pull = st.pr ? await gh.getPull(st.pr) : null
      result = humanDecision({ issue, state: st, command, kind, pr: prNumber, pull })
    } else {
      result = preflightDecision({ issue, state: st, command, config })
    }
    log.info('preflight decision', { outcome: result.outcome, forced: result.forced ?? false, kind,
      fresh: result.fresh ?? false })
    return result
  })

  if (decision.outcome.startsWith('refuse')) {
    const reply = staysSilent(command, decision.outcome)
      ? null
      : refusalReply({ outcome: decision.outcome, actor, issue, state: st })
    await log.group(config.dryRun ? 'Refuse (dry run: job summary only)' : 'Refuse', async () => {
      if (reply === null) {
        log.info('refusal stays silent: an answer to a hand-off found the flow busy', { outcome: decision.outcome })
        return
      }
      if (config.dryRun) {
        appendSummary(env, quoted(`## Dry run: AI implementation of #${number} refused`, reply))
        log.info('dry run: the reply is in the job summary')
        return
      }
      await gh.createIssueComment(number, reply)
      log.info('reply posted', { mention: actor, outcome: decision.outcome })
    })
    await react({ gh, commentId, content: 'confused', dryRun: config.dryRun })
    writeOutputs(env, { proceed: 'false', outcome: decision.outcome })
    return { proceed: false, ...decision }
  }

  const analyzeFirst = !person && decision.outcome === 'analyze-first'
  const unresolved = kind === 'review'
    ? (await log.group('Read the review threads', () => gh.listReviewThreads(prNumber))).filter((t) => !t.isResolved)
    : []
  // Only the threads the implementer sees are recorded, so `publish` replies in exactly those.
  const { shown: threads, omitted: omittedThreads } = limitThreads(unresolved)
  if (kind === 'review') log.info('unresolved review threads', { count: unresolved.length, shown: threads.length })
  // The identity of the PAT owner: the only use of the PAT before the publish job. No model code has run yet.
  const identity = await log.group('Git identity', () =>
    resolveIdentity({ env, repo: env.GITHUB_REPOSITORY, deps, dryRun: config.dryRun }),
  )
  const at = new Date().toISOString()
  const marked = person
    ? markedPersonState(st, { runUrl, actor, kind, pr: prNumber, fresh: decision.fresh, threads, at })
    : { ...st, phase: 'implementing', implementing: { run: runUrl, actor, at, analyzeFirst } }
  const markTitle = config.dryRun ? 'Mark the issue (dry run: nothing written)' : 'Mark the issue as being implemented'
  await log.group(markTitle, async () => {
    if (config.dryRun) {
      appendSummary(env, `## Dry run: AI implementation of #${number} may proceed\n\n- outcome: ${decision.outcome}\n` +
        `- forced: ${decision.forced ?? false}\n- kind: ${kind}\n`)
      return
    }
    const human = `### AI implementation is running\n\n[The run](${runUrl}) was started by @${actor}.`
    const body = state.render(human, await state.withFreshCosts(gh, number, marked))
    if (existing) await gh.updateIssueComment(existing.id, body)
    else await gh.createIssueComment(number, body)
    log.info('state comment written', { phase: 'implementing', id: existing ? existing.id : 'new' })
  })
  saveContext({
    out, number, ciFix: false, kind, actor, command, runUrl, analyzeFirst, loaded, st: marked, identity,
    fresh: Boolean(decision.fresh), changes: Boolean(decision.changes), reviewThreads: threads,
    omittedThreads,
  })
  writeOutputs(env, { proceed: 'true', outcome: decision.outcome })
  return { proceed: true, ...decision }
}

// ---------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------
// run
// ---------------------------------------------------------------------------------------------------------------

/**
 * Checks out the branch of an earlier attempt, or a new branch from `develop`.
 *
 * The base of the attempt is the branch point of the pull request: the checks, the self-review, and the diff size limit
 * cover the whole pull request, not only what this attempt adds. On a new branch that is `origin/develop`; on a
 * continued branch it is `git merge-base origin/develop HEAD`, after `develop` is fetched. A CI fix (`ciFix`)
 * continues the recorded branch or fails: there is no pull request to fix without it. It has no `previousSha`: the
 * fix is a new commit on top, pushed without force. A change to an open pull request (`mustContinue`: a change request
 * or a review) continues the branch too, but pushes with a lease like any person's attempt. A fresh start (`fresh`: the
 * pull request of the earlier attempt is closed) takes a new branch name, `<name>-v2` and on, when the old one is still
 * on the remote.
 */
async function prepareBranch({ exec, st, type, number, title, ciFix = false, mustContinue = ciFix, fresh = false }) {
  let branch = st.branch ?? branchName(type, number, title)
  const lookup = async () => parseLsRemote(await git(exec, ['ls-remote', '--heads', 'origin', branch]), branch)
  let remote = await lookup()
  if (fresh) {
    const wanted = branch
    for (let version = 2; remote && version <= MAX_BRANCH_VERSION; version += 1) {
      branch = `${wanted}-v${version}`
      remote = await lookup()
    }
    if (remote) throw new Error(`The branches ${wanted} to ${branch} exist on the remote; delete one of them`)
    log.info('branch decision', { branch, note: 'fresh start: the pull request of the earlier attempt is closed' })
  }
  if (mustContinue) {
    const what = ciFix ? 'A CI fix' : 'A change to the pull request'
    const change = ciFix ? 'CI fix' : 'change'
    if (!st.branch) throw new Error(`${what} continues the branch of an earlier attempt, and the state records none`)
    if (!remote) {
      throw new Error(`The branch ${branch} is gone from the remote, so the ${change} has nothing to continue`)
    }
  }
  // A branch the state does not record is not the agent's: pushing to it would need a force over someone's work.
  if (remote && !st.branch) {
    throw new Error(`The branch ${branch} already exists on the remote and no earlier attempt of the agent made it. ` +
      'Delete it or rename it, then comment `/agent implement` again.')
  }
  const continuing = Boolean(st.branch && remote)
  let base
  if (continuing) {
    log.info('branch decision', { branch, action: 'continue the branch of an earlier attempt', remote, ciFix })
    await git(exec, ['fetch', '--no-tags', 'origin', branch])
    await git(exec, ['checkout', '-B', branch, 'FETCH_HEAD'])
    await git(exec, ['fetch', '--no-tags', 'origin', BASE_BRANCH])
    base = await git(exec, ['merge-base', `origin/${BASE_BRANCH}`, 'HEAD'])
    log.info('base commit', { base, note: 'the branch point: the whole pull request' })
  } else {
    log.info('branch decision', { branch, action: `new branch from origin/${BASE_BRANCH}`, remote: remote ?? 'none' })
    await git(exec, ['checkout', '-B', branch, `origin/${BASE_BRANCH}`])
    base = await git(exec, ['rev-parse', 'HEAD'])
    log.info('base commit', { base })
  }
  return { branch, continuing, previousSha: continuing && !ciFix ? remote : null, base }
}

/** Runs the check commands in order and keeps the last lines of each output. Stops at the first failure. */
async function runChecks({ exec, base }) {
  const results = []
  const names = await git(exec, ['diff', '--name-only', base, 'HEAD'])
  const changed = names.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  log.info('changed files', { count: changed.length, tools: changed.some((f) => f.startsWith('tools/')) })
  for (const c of checkCommands(base, changed)) {
    const started = Date.now()
    const r = await exec(c.file, c.args, { timeoutMs: CHECK_TIMEOUT_MS, stream: true })
    const tail = tailLines(stripAnsi(`${r.stdout}\n${r.stderr}`), OUTPUT_TAIL_LINES)
    const result = { command: commandLine(c), exitCode: r.exitCode, timedOut: Boolean(r.timedOut), tail }
    results.push(result)
    log.info('check finished', {
      command: result.command,
      exitCode: result.exitCode,
      timedOut: result.timedOut,
      seconds: ((Date.now() - started) / 1000).toFixed(1),
    })
    if (r.exitCode !== 0) break
  }
  return { passed: results.every((r) => r.exitCode === 0), results }
}

/**
 * The rounds: implement, commit locally, run the local checks, and self-review. They repeat while the checks are red or
 * the self-review asks for changes, up to `maxReviewRounds`. An attempt is always one commit: later rounds amend it.
 *
 * @returns {Promise<{ status: 'done'|'blocked'|'unrelated', rounds: number, reason?: string,
 *   implementation: object|null, checks: object|null, review: object|null, head: string|null }>}
 */
async function implementRounds(ctx) {
  const { config, exec, out, costs, runUrl, deps, issue, number, base } = ctx
  const maxRounds = config.limits.maxReviewRounds
  let previous = null
  let committed = false
  let implementation = null
  let checks = null
  let review = null
  let head = null

  for (let round = 1; ; round += 1) {
    const tag = `Round ${round}`
    const suffix = `-r${round}`
    const common = { out, costs, runUrl, deps, suffix }

    implementation = await log.group(`${tag}: implement`, async () => {
      const inputFile = path.join(out, 'implement-input.md')
      const text = renderImplementInput({
        playbook: ctx.playbook,
        kind: ctx.kind,
        issue,
        comments: ctx.comments,
        plan: ctx.plan,
        analysis: ctx.analysis,
        notes: ctx.command.notes ?? '',
        attempts: ctx.attempts,
        round,
        previous,
        ciReport: ctx.ciReport,
        reviewThreads: ctx.reviewThreads,
        omittedThreads: ctx.omittedThreads,
      })
      fs.writeFileSync(inputFile, text)
      fs.writeFileSync(path.join(out, `implement-input${suffix}.md`), text)
      log.info('input written', { file: inputFile, characters: text.length, round })
      const output = await callAgent({
        ...common,
        flow: 'implement',
        role: 'implementer',
        agent: 'implementer',
        model: config.models.implement,
        message: `Implement issue #${number}. Your input is the attached implement-input.md.`,
        inputFile,
        schema: 'implementation',
        check: (o) => checkImplementation(o, ctx.playbook, ctx.kind),
      })
      log.info('implementer answer', { status: output.status, commitType: output.commitType, title: output.title })
      return output
    })
    if (implementation.status === 'blocked') {
      log.info('decision', { stage: 'implement', action: 'blocked', reason: implementation.blockedReason })
      const reason = implementation.blockedReason
      return { status: 'blocked', rounds: round, reason, implementation, checks, review, head }
    }
    if (implementation.status === 'unrelated') {
      // The failure is not caused by the change: commit nothing, keep nothing of the working tree, run no checks.
      const reason = implementation.blockedReason
      log.info('decision', { stage: 'implement', action: 'unrelated: no commit, no checks, no self-review', reason })
      await log.group(`${tag}: discard the working tree`, async () => {
        await git(exec, ['checkout', '--', '.'])
        await git(exec, ['clean', '-fd'])
      })
      return { status: 'unrelated', rounds: round, reason, implementation, checks, review, head }
    }

    const dirty = await log.group(`${tag}: commit locally`, async () => {
      const porcelain = await git(exec, ['status', '--porcelain'])
      if (porcelain === '' && !committed) {
        log.info('decision', { stage: 'commit', action: 'blocked', reason: 'no changes' })
        return false
      }
      if (porcelain === '') {
        log.info('decision', { stage: 'commit', action: 'keep the commit of the earlier round: no new changes' })
        return true
      }
      const message = commitMessage({
        type: implementation.commitType,
        scope: implementation.scope,
        title: implementation.title,
        number,
        runUrl,
      })
      await git(exec, ['add', '-A'])
      await git(exec, ['commit', '--no-verify', ...(committed ? ['--amend'] : []), '-m', message])
      committed = true
      head = await git(exec, ['rev-parse', 'HEAD'])
      log.info('committed locally', { head, amended: round > 1, files: porcelain.split('\n').length })
      return true
    })
    if (!dirty) {
      return {
        status: 'blocked',
        rounds: round,
        reason: 'The implementer reported done, but the working tree has no changes.',
        implementation,
        checks,
        review,
        head,
      }
    }
    head ??= await git(exec, ['rev-parse', 'HEAD'])

    checks = await log.group(`${tag}: local checks`, () => runChecks({ exec, base }))
    log.info('checks', { passed: checks.passed, failed: checks.results.filter((r) => r.exitCode !== 0).length })

    review = await log.group(`${tag}: self-review`, async () => {
      const inputFile = path.join(out, 'self-review-input.md')
      const text = renderSelfReviewInput({
        issue,
        plan: ctx.plan,
        analysis: ctx.analysis,
        notes: ctx.command.notes ?? '',
        summary: implementation.summary,
        base,
        head,
        kind: ctx.kind,
      })
      fs.writeFileSync(inputFile, text)
      fs.writeFileSync(path.join(out, `self-review-input${suffix}.md`), text)
      const output = await callAgent({
        ...common,
        flow: 'implement',
        role: 'self-reviewer',
        agent: 'self-reviewer',
        model: config.models.review,
        message: `Review the change for issue #${number}. Your input is the attached self-review-input.md.`,
        inputFile,
        schema: 'selfReview',
        check: checkSelfReview,
      })
      log.info('self-review', {
        verdict: output.verdict,
        effective: effectiveVerdict(output),
        findings: output.findings.length,
        open: openFindings(output).length,
      })
      return output
    })

    const green = checks.passed && effectiveVerdict(review) === 'approve'
    if (green) {
      log.info('decision', { stage: 'rounds', action: 'stop: checks green and self-review approved', rounds: round })
      return { status: 'done', rounds: round, implementation, checks, review, head }
    }
    if (round >= maxRounds) {
      log.info('decision', { stage: 'rounds', action: 'stop: no rounds left', rounds: round, max: maxRounds })
      return { status: 'done', rounds: round, implementation, checks, review, head }
    }
    log.info('decision', {
      stage: 'rounds',
      action: 'another round',
      checks: checks.passed ? 'green' : 'red',
      selfReview: effectiveVerdict(review),
    })
    previous = { findings: openFindings(review), checks }
  }
}

/**
 * One attempt, without GitHub: the analysis when needed, the branch, the rounds of implementer, local checks, and
 * self-review, the diff limits, and the local commits. It reads `context.json` (written by the preflight) and writes
 * `outcome.json` and, when there is something to push, `branch.bundle` into `AGENT_OUT`. The environment has the
 * OpenAI key and no GitHub token, because the model's code runs here as the same user; `publish` does the writing.
 *
 * A failure does not throw: it goes to `outcome.failure`, with the cost of every model call that ran, so that
 * `publish` records the attempt as failed. `deps`: `exec` (processes), `runAgent` (opencode).
 *
 * @returns {Promise<object>} the outcome as written to `outcome.json`
 */
async function work(env = process.env, deps = {}) {
  const config = loadConfig(env)
  const out = requireEnv(env, 'AGENT_OUT')
  const context = readContext(out)
  const { number, runUrl, command, actor, issue, comments, state: st, identity } = context
  const exec = deps.exec ?? defaultExec
  const costs = []
  const ciFix = Boolean(context.ciFix)
  const attemptNo = (st.attempts?.length ?? 0) + 1
  const kind = attemptKindOf(context.kind ?? (ciFix ? 'ci-fix' : 'initial'), attemptNo)
  const labelsBefore = names(issue.labels)
  const outcome = {
    version: 1,
    number,
    kind,
    attemptNo,
    at: new Date().toISOString(),
    forced: Boolean(command.force && labelsBefore.includes(LABEL_UNSUITABLE)),
    playbook: null,
    analysis: null,
    stopped: null,
    failure: null,
    result: null,
    blockedReason: null,
    rounds: 0,
    implementation: null,
    checks: null,
    review: null,
    branchInfo: null,
    diff: null,
    bundle: false,
    costs,
  }
  log.info('implementation starts', {
    issue: number,
    kind,
    actor,
    force: command.force,
    dryRun: config.dryRun,
    implement: formatModel(config.models.implement),
    review: formatModel(config.models.review),
    maxReviewRounds: config.limits.maxReviewRounds,
  })

  let stage = 'setup'
  try {
    const type = issue.type?.name
    outcome.playbook = playbookOf(type).playbook
    log.info('playbook', { type, playbook: outcome.playbook, attempt: attemptNo, kind })

    // 1. Analysis, when the issue changed since the last one. Publishing it is the job of `publish`.
    let analysis = null
    if (context.analyzeFirst) {
      stage = 'analysis'
      const verdict = await log.group('Analysis', async () => {
        const result = await runAnalysis({ issue, comments, st, trigger: 'command', config, out, costs, runUrl, deps })
        outcome.analysis = { ...result, issueUpdatedAt: issue.updated_at }
        analysis = result
        return result.verdict
      })
      // A person's `ai:suitable` outweighs the analysis; the label is the agent's only if the state said so.
      const before = st.analysis
      const agentSuitable = before?.labelSetBy === 'agent' && before.label === LABEL_SUITABLE
      const personSuitable = labelsBefore.includes(LABEL_SUITABLE) && !agentSuitable
      log.info('analysis finished', { verdict, personSuitable })
      if (verdict === 'needs-info') {
        outcome.stopped = 'refuse-needs-info'
      } else if (verdict === 'unsuitable' && !personSuitable) {
        if (command.force) outcome.forced = true
        else outcome.stopped = 'refuse-unsuitable'
      }
    }
    stage = 'implementation'
    if (outcome.stopped) {
      log.info('decision', { action: 'stop after the analysis', outcome: outcome.stopped })
    } else {
      Object.assign(outcome, await workOnIssue({
        config, deps, exec, issue, comments, st, command, out, runUrl, costs, type, playbook: outcome.playbook, kind,
        number, identity, analysis, ciFix, fresh: Boolean(context.fresh), changes: Boolean(context.changes),
        reviewThreads: context.reviewThreads ?? [], omittedThreads: context.omittedThreads ?? 0,
      }))
    }
  } catch (err) {
    outcome.failure = { message: err.message, stage }
    log.error(`Implementation failed: ${err.message}`)
  }

  fs.writeFileSync(path.join(out, OUTCOME_FILE), JSON.stringify(outcome, null, 2))
  log.info('outcome written', {
    file: path.join(out, OUTCOME_FILE),
    result: outcome.result ?? 'none',
    stopped: outcome.stopped ?? 'no',
    failure: outcome.failure ? 'yes' : 'no',
    bundle: outcome.bundle,
    costs: costs.length,
  })
  return outcome
}

/** Stages 2 to 9: branch, identity, rounds, limits, bundle. Returns the fields of the outcome; pushes nothing. */
async function workOnIssue(ctx) {
  const { deps, exec, issue, st, command, number, costs, config, identity, out } = ctx

  const branchInfo = await log.group('Branch', () =>
    prepareBranch({
      exec,
      st,
      type: ctx.type,
      number,
      title: issue.title,
      ciFix: ctx.ciFix,
      mustContinue: ctx.ciFix || ctx.changes,
      fresh: ctx.fresh,
    }),
  )

  await log.group('Git identity', async () => {
    await git(exec, ['config', 'user.name', identity.name])
    await git(exec, ['config', 'user.email', identity.email])
    log.info('git identity', { name: identity.name, email: identity.email })
  })

  const analysis = ctx.analysis ?? st.analysis ?? null
  const rounds = await implementRounds({
    config,
    exec,
    out,
    costs,
    runUrl: ctx.runUrl,
    deps,
    issue,
    number,
    base: branchInfo.base,
    playbook: ctx.playbook,
    kind: ctx.kind,
    comments: ctx.comments,
    plan: analysis?.plan ?? null,
    analysis,
    command,
    attempts: st.attempts ?? [],
    ciReport: ctx.ciFix ? st.lastCiReport ?? '' : '',
    reviewThreads: ctx.reviewThreads,
    omittedThreads: ctx.omittedThreads,
  })
  const base = branchInfo.base
  const info = { ...branchInfo, head: rounds.head }

  if (rounds.status === 'unrelated') {
    // Nothing to push: `publish` reruns the failed checks instead.
    log.info('decision', { stage: 'publish', result: 'unrelated', reason: rounds.reason })
    return {
      result: 'unrelated',
      blockedReason: rounds.reason,
      rounds: rounds.rounds,
      implementation: rounds.implementation,
      checks: null,
      review: null,
      branchInfo: info,
      diff: null,
      bundle: false,
    }
  }

  let blockedReason = rounds.status === 'blocked' ? rounds.reason : null
  if (!blockedReason) {
    await log.group('Diff size', async () => {
      const shortstat = await git(exec, ['diff', '--shortstat', base, 'HEAD'])
      const stat = parseShortstat(shortstat)
      const limit = DIFF_LIMITS[ctx.playbook]
      log.info('diff size', { ...stat, limitFiles: limit.files, limitLines: limit.lines,
        tooLarge: diffTooLarge(stat, ctx.playbook) })
      // AGENT_PAT has no Workflows permission, so GitHub would reject the push; say why instead of failing on it.
      const nameOnly = await git(exec, ['diff', '--name-only', base, 'HEAD'])
      log.info('protected files changed', {
        workflows: touchedWorkflows(nameOnly),
        agentFiles: touchedAgentFiles(nameOnly),
      })
      blockedReason = diffBlockReason({ stat, nameOnly, playbook: ctx.playbook })
    })
  }
  const green = !blockedReason && rounds.checks.passed && effectiveVerdict(rounds.review) === 'approve'
  const result = blockedReason ? 'blocked' : green ? 'pr-opened' : 'draft'
  log.info('decision', { stage: 'publish', result, reason: blockedReason ?? 'none' })

  let diff = null
  let bundle = false
  if (result !== 'blocked') {
    // The bundle holds the commits of the whole pull request on top of the branch point; `publish` fetches it.
    await log.group('Bundle and diff preview', async () => {
      await git(exec, ['bundle', 'create', path.join(out, BUNDLE_FILE), `${base}..HEAD`])
      bundle = true
      const stat = await git(exec, ['diff', '--stat', base, 'HEAD'], { allowFail: true })
      const full = await exec('git', ['diff', base, 'HEAD'], { keep: 'head', maxBytes: 200000 })
      diff = { stat, preview: full.stdout.split('\n').slice(0, DIFF_PREVIEW_LINES).join('\n') }
      log.info('bundle written', { file: path.join(out, BUNDLE_FILE), head: rounds.head })
    })
  }
  return {
    result,
    blockedReason,
    rounds: rounds.rounds,
    implementation: rounds.implementation,
    checks: rounds.checks,
    review: rounds.review,
    branchInfo: info,
    diff,
    bundle,
  }
}

// ---------------------------------------------------------------------------------------------------------------
// publish: GitHub writes, with the tokens, and no model or repository code
// ---------------------------------------------------------------------------------------------------------------

const EVENT_FILES = [
  { pattern: /^analyst(-r\d+)?\.jsonl$/, flow: 'analyze', role: 'analyst', model: 'light' },
  { pattern: /^implementer(-r\d+)?\.jsonl$/, flow: 'implement', role: 'implementer', model: 'implement' },
  { pattern: /^self-reviewer(-r\d+)?\.jsonl$/, flow: 'implement', role: 'self-reviewer', model: 'review' },
]

/**
 * The cost of the model calls that left an event file in `out`, for a work step that wrote no outcome: it crashed,
 * timed out, or was cancelled. The files are what the artifact still holds.
 */
function recoverCosts(out, config, runUrl) {
  const records = []
  if (!fs.existsSync(out)) return records
  for (const file of fs.readdirSync(out).sort()) {
    const kind = EVENT_FILES.find((k) => k.pattern.test(file))
    if (!kind) continue
    const summary = usage.summarize(usage.parseEvents(fs.readFileSync(path.join(out, file), 'utf8')))
    const model = config.models[kind.model]
    records.push(usage.costRecord({
      run: runUrl, flow: kind.flow, role: kind.role, model: model.id, variant: model.variant, summary,
    }))
  }
  return records
}

/** An outcome that only says the attempt failed: the work step left none, or its outcome cannot be trusted. */
function failedOutcome({ kind, attemptNo, message, costs }) {
  return {
    version: 1,
    kind,
    attemptNo,
    at: new Date().toISOString(),
    forced: false,
    playbook: null,
    analysis: null,
    stopped: null,
    failure: { message, stage: 'work' },
    result: null,
    blockedReason: null,
    rounds: 0,
    implementation: null,
    checks: null,
    review: null,
    branchInfo: null,
    diff: null,
    bundle: false,
    costs,
  }
}

/** Reads \`outcome.json\`, or \`null\` when the work step wrote none. */
function readOutcome(out) {
  const file = path.join(out, OUTCOME_FILE)
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null
}

const COMMIT_ID = /^[0-9a-f]{40,64}$/
const RESULTS = new Set(['blocked', 'pr-opened', 'draft', 'unrelated'])

/**
 * True when `branch` is the branch `publish` derives. A fresh start, which the state shows by no recorded branch, may
 * also take `<expected>-v<n>`, because the old name can still be on the remote after its pull request closed.
 */
function branchAllowed(branch, expected, mayBeVersioned) {
  if (branch === expected) return true
  if (!mayBeVersioned || !expected || !branch.startsWith(`${expected}-v`)) return false
  return /^[0-9]+$/.test(branch.slice(expected.length + 2))
}

/**
 * What is wrong with an outcome that came out of the work job. That job ran code the model wrote, as the same user
 * as the script, so `outcome.json` and the bundle are data of a source that may lie. The publish job pushes only to
 * the branch it derives itself (the state, else the issue), and the texts it builds from the outcome must have the
 * shape the contracts promise.
 *
 * `unrelated` is a result of a CI fix only, and has no code: no bundle, no checks, no self-review. `kind` is the kind
 * the publish job derived itself; without it the outcome's own claim is used.
 *
 * @returns {string[]} the problems; empty when the outcome may be published
 */
function outcomeProblems({ outcome, st, issue, number, kind = outcome.kind }) {
  const problems = []
  const hasCode = outcome.result === 'pr-opened' || outcome.result === 'draft'
  if (outcome.result !== null && !RESULTS.has(outcome.result)) problems.push(`result '${outcome.result}' is unknown`)
  if (outcome.result === 'unrelated') {
    if (kind !== 'ci-fix') problems.push("result 'unrelated' is allowed only on a CI fix")
    if (String(outcome.blockedReason ?? '').trim() === '') problems.push('an unrelated result needs a reason')
    if (outcome.bundle) problems.push('an unrelated result carries no code')
  }
  if (outcome.stopped !== null && outcome.stopped !== 'refuse-needs-info' && outcome.stopped !== 'refuse-unsuitable') {
    problems.push(`stopped '${outcome.stopped}' is unknown`)
  }
  if (outcome.branchInfo) {
    const type = issue.type?.name
    const expected = st.branch ?? (Object.hasOwn(PLAYBOOKS, type ?? '') ? branchName(type, number, issue.title) : null)
    if (!branchAllowed(outcome.branchInfo.branch, expected, !st.branch)) {
      problems.push(`the branch '${outcome.branchInfo.branch}' is not '${expected}'`)
    }
    const head = outcome.branchInfo.head
    if ((head || hasCode) && !COMMIT_ID.test(String(head ?? ''))) problems.push('the head commit is not a commit id')
    if (outcome.branchInfo.previousSha && !COMMIT_ID.test(String(outcome.branchInfo.previousSha))) {
      problems.push('the previous commit is not a commit id')
    }
  }
  const check = (name, schema, value) => {
    try {
      validate(schema, value)
    } catch (err) {
      problems.push(`${name}: ${err.message}`)
    }
  }
  if (outcome.implementation) check('implementation', 'implementation', outcome.implementation)
  if (outcome.review) check('review', 'selfReview', outcome.review)
  if (outcome.analysis) {
    const { issueUpdatedAt: _at, ...analysis } = outcome.analysis
    check('analysis', 'analysis', analysis)
  }
  if (outcome.checks && !(Array.isArray(outcome.checks.results) && typeof outcome.checks.passed === 'boolean')) {
    problems.push('checks have no results')
  }
  if (hasCode && !(outcome.implementation && outcome.review && outcome.checks && outcome.branchInfo)) {
    problems.push('a result with code lacks the implementation, the review, the checks, or the branch')
  }
  return problems
}

/**
 * Brings the commits of the work step into this checkout from the bundle. The commit must be the one the outcome
 * names: the bundle comes from a job that ran model-written code.
 */
async function fetchBundle({ exec, file, head }) {
  if (!fs.existsSync(file)) throw new Error(`${BUNDLE_FILE} is missing: there is nothing to push`)
  await git(exec, ['fetch', '--no-tags', file, 'HEAD'])
  const fetched = await git(exec, ['rev-parse', 'FETCH_HEAD'])
  if (fetched !== head) throw new Error(`The bundle holds ${fetched}, but the outcome names ${head}`)
  log.info('bundle fetched', { head })
}

/**
 * Makes an open pull request match the new outcome: its title and description (not for a CI fix or a review, which keep
 * the description of the change as a whole), and its draft state in one direction only. A ready pull request goes back
 * to draft when the attempt is not green. `publish` never marks one ready: only the CI gate does, after the checks on
 * GitHub are green, because the local results come from a job that ran code of the change. Done as the PAT owner, so
 * the events start the workflows of the repository.
 */
async function updateOpenPull({ client, open, title, body, toDraft, kind }) {
  if (kind !== 'ci-fix' && kind !== 'review') {
    await client.updatePull(open.number, { title, body })
    log.info('pull request updated', { pr: open.number, title })
  }
  if (toDraft && !open.draft) {
    await client.convertPullToDraft(open.node_id)
    log.info('pull request is a draft again', { pr: open.number })
  }
}

/**
 * Why the commits that were just fetched from the bundle may not be pushed, or `null`. The work step ran code of the
 * change, so its claims about the diff are not evidence: this measures the diff itself, from the branch point of the
 * pull request, and applies the limits of the playbook and the protected paths.
 */
async function pushedDiffProblem({ exec, head, type }) {
  const base = await git(exec, ['merge-base', `origin/${BASE_BRANCH}`, head])
  const stat = parseShortstat(await git(exec, ['diff', '--shortstat', base, head]))
  const nameOnly = await git(exec, ['diff', '--name-only', base, head])
  const reason = diffBlockReason({ stat, nameOnly, playbook: playbookOf(type).playbook })
  log.info('diff of the bundle', { base, ...stat, blocked: reason ? 'yes' : 'no' })
  return reason
}

/**
 * Publishes the outcome of the work step: the analysis labels and state, the push of the bundle, the pull request, the
 * state comment, the labels, and the comment that mentions the person. It holds `GITHUB_TOKEN` and `AGENT_PAT` and
 * runs no model and no repository code. Without \`outcome.json\` it records the failure and the costs it can find.
 * `deps`: `gh` (GITHUB_TOKEN client), `patGh` (PAT client), `exec` (git).
 *
 * Throws after it has written the state when the attempt failed.
 */
async function publish(env = process.env, deps = {}) {
  const config = loadConfig(env)
  const gh = deps.gh ?? createClient({ token: env.GITHUB_TOKEN, repo: env.GITHUB_REPOSITORY })
  let content = 'confused'
  try {
    const result = await publishAttempt(env, { ...deps, gh })
    // Only a pull request that the local checks and the self-review passed, or a rerun of checks that the change did
    // not break, ends well; the CI gate decides the rest.
    if (result.result === 'pr-opened' || result.result === 'unrelated') content = 'rocket'
    return result
  } finally {
    await react({ gh, commentId: commentIdOf(env.AGENT_COMMENT_ID), content, dryRun: config.dryRun })
  }
}

async function publishAttempt(env, deps) {
  const config = loadConfig(env)
  const number = Number(requireEnv(env, 'AGENT_NUMBER'))
  const runUrl = requireEnv(env, 'AGENT_RUN_URL')
  const out = requireEnv(env, 'AGENT_OUT')
  const repo = env.GITHUB_REPOSITORY
  const envKind = attemptKind(env)
  const ciFix = envKind === 'ci-fix'
  const envActor = ciFix ? env.AGENT_ACTOR : requireEnv(env, 'AGENT_ACTOR')
  const gh = deps.gh
  const exec = deps.exec ?? defaultExec
  const command = parseCommandEnv(env.AGENT_COMMAND)
  log.info('publish starts', { issue: number, kind: envKind, dryRun: config.dryRun })

  const loaded = await log.group('Load the issue, its comments, and its state', () => loadIssue(gh, number))
  const { issue } = loaded
  let st = loaded.st
  // Nothing is written before this check: a state that is not ours to continue stays as it is.
  if (ciFix) requireCiFixState(st)
  const actor = ciFix ? st.implementing.actor || envActor : envActor
  if (!actor) throw new Error('Nobody is recorded as the person who asked for this implementation')
  const attemptNo = (st.attempts?.length ?? 0) + 1
  const kind = attemptKindOf(envKind, attemptNo)

  let outcome = readOutcome(out)
  if (!outcome) {
    log.warn(`${OUTCOME_FILE} is missing: the work step crashed, timed out, or was cancelled`)
    outcome = failedOutcome({
      kind,
      attemptNo,
      message: 'The work step left no outcome: it crashed, timed out, or was cancelled. Its job log has the details.',
      costs: recoverCosts(out, config, runUrl),
    })
  }
  const problems = outcomeProblems({ outcome, st, issue, number, kind })
  if (problems.length > 0) {
    // Keep the costs that have the right shape; drop the rest of an outcome that cannot be trusted.
    const costs = (outcome.costs ?? []).filter((c) => typeof c?.usd === 'number')
    const message = `The outcome of the work step is not trusted: ${problems.join('; ')}`
    outcome = failedOutcome({ kind, attemptNo, message, costs })
    log.error(message)
  }
  const costs = outcome.costs ?? []
  const at = outcome.at ?? new Date().toISOString()
  let failure = outcome.failure ? new Error(outcome.failure.message) : null
  const progress = { branch: outcome.branchInfo?.branch ?? st.branch ?? null, pr: st.pr ?? null, pushed: false }
  log.info('outcome', {
    result: outcome.result ?? 'none', stopped: outcome.stopped ?? 'no', failure: outcome.failure ? 'yes' : 'no',
    kind, costs: costs.length,
  })

  // A person stopped this very run (`/agent stop` wrote the phase and left `implementing` alone): record the costs and
  // the attempt, and write nothing else. A dry run never marks the state, so it never matches.
  if (st.phase === 'stopped' && st.implementing?.run === runUrl) {
    return publishStopped({ gh, loaded, st, costs, outcome, kind, attemptNo, actor, runUrl, at, out })
  }

  // The analysis of this run: its labels and its place in the state, like a run of `analyze.js`.
  if (outcome.failure?.stage === 'analysis') {
    st = failedState(st, { run: runUrl, at, trigger: 'command' })
  } else if (outcome.analysis) {
    const changes = labelChanges(issue.labels, st, outcome.analysis.verdict)
    log.info('label changes of the analysis', {
      add: changes.add.join(',') || 'none',
      remove: changes.remove.join(',') || 'none',
    })
    let applied = changes
    if (!config.dryRun) {
      const result = await log.group('Apply the labels of the analysis', () => applyLabels(gh, number, changes))
      applied = result.applied
      failure ??= result.error
    }
    st = nextState(st, {
      analysis: outcome.analysis,
      label: agentLabelAfter(issue.labels, st, applied),
      issueUpdatedAt: outcome.analysis.issueUpdatedAt,
      at,
      run: runUrl,
      trigger: 'command',
    })
  }
  for (const c of costs) st = state.addCost(st, c)

  if (outcome.stopped) {
    return publishStop({ config, env, gh, loaded, st, issue, outcome, actor, runUrl, number, out, failure })
  }

  return finish({
    config, env, deps, gh, exec, issue, st, commentId: loaded.existing?.id ?? null, costs, outcome, failure, progress,
    attemptNo, kind, actor, runUrl, number, at, out, repo,
    changesPull: kind === 'review' || command.name === 'chat',
  })
}

/**
 * The run was stopped by `/agent stop`: the state keeps the phase `stopped`, gets the cost records and the attempt as
 * `stopped`, and loses `implementing`. Nothing is pushed, no label changes, and no comment is posted.
 */
async function publishStopped({ gh, loaded, st: state0, costs, outcome, kind, attemptNo, actor, runUrl, at, out }) {
  let st = state0
  for (const c of costs) st = state.addCost(st, c)
  const { implementing: _running, ...rest } = st
  const entry = attemptRecord({
    n: attemptNo,
    kind,
    run: runUrl,
    result: 'stopped',
    rounds: outcome.rounds ?? 0,
    checks: null,
    review: null,
    notes: `${st.stoppedBy ? `@${st.stoppedBy}` : 'A person'} stopped this attempt.`,
    actor,
    at,
  })
  const next = { ...rest, attempts: [...(rest.attempts ?? []), entry] }
  fs.writeFileSync(path.join(out, 'summary.md'), `The attempt was stopped; ${costs.length} cost record(s) are kept.`)
  await log.group('Record the stopped attempt', async () => {
    // Read again right before the write: a cost record that chat added since the state was loaded must survive.
    const merged = await state.withFreshCosts(gh, next.number ?? 0, next)
    if (loaded.existing) {
      await gh.updateIssueComment(loaded.existing.id, state.replaceState(loaded.existing.body, merged))
    } else {
      await gh.createIssueComment(merged.number ?? 0, state.render('### AI implementation was stopped', merged))
    }
    log.info('state comment written', { phase: next.phase, attempts: next.attempts.length, costs: costs.length })
  })
  return { stopped: 'stopped' }
}

/** The run ended after the analysis (needs-info, unsuitable): the state of the analysis and the reply that explains. */
async function publishStop(ctx) {
  const { config, env, gh, loaded, issue, outcome, actor, runUrl, number, out, failure } = ctx
  const state0 = ctx.st
  const { implementing: _running, ...st } = state0
  const totalUsd = sum(st.costs, 'usd')
  const human = renderAnalysis({ analysis: outcome.analysis, runUrl, totalUsd })
  const reply = refusalReply({ outcome: outcome.stopped, actor, issue, state: st })
  fs.writeFileSync(path.join(out, 'summary.md'), human)
  await log.group(config.dryRun ? 'Reply (dry run: job summary only)' : 'Reply', async () => {
    if (config.dryRun) {
      appendSummary(env, [`## Dry run: AI implementation of #${number} stopped after the analysis`, '',
        ...reply.split('\n').map((l) => `> ${l}`), ''].join('\n'))
      return
    }
    const body = state.render(human, await state.withFreshCosts(gh, number, st))
    if (loaded.existing) await gh.updateIssueComment(loaded.existing.id, body)
    else await gh.createIssueComment(number, body)
    log.info('state comment written', { phase: st.phase })
    await gh.createIssueComment(number, reply)
    log.info('reply posted', { mention: actor, outcome: outcome.stopped })
  })
  if (failure) throw failure
  return { stopped: outcome.stopped }
}

/** The helpers of ci-gate.js that the texts of a CI fix need; loaded when used, see `rerunnableChecks`. */
const ciChecks = () => require('./ci-gate')

/**
 * The failed checks of the head commit of the pull request that a rerun can start: the Actions jobs among them, and
 * the workflow runs they belong to. For a CI fix that found the failure `unrelated` to the change. Throws when the
 * pull request is not open.
 *
 * @returns {Promise<{ sha: string, failed: object[], targets: number[] }>}
 */
async function rerunnableChecks({ gh, pr }) {
  // ci-gate.js requires this module, so it is loaded when it is needed.
  const { relevantChecks, failedChecks, rerunTargets } = ciChecks()
  const pull = await gh.getPull(pr)
  if (pull.state !== 'open') throw new Error(`Pull request #${pr} is not open, so there is nothing to rerun`)
  const sha = pull.head.sha
  const checkRuns = relevantChecks(await gh.listCheckRuns(sha))
  const { statuses } = await gh.getCombinedStatus(sha)
  const failed = failedChecks(checkRuns, statuses).filter((f) => f.runId !== null)
  return { sha, failed, targets: rerunTargets(failed, null) }
}

/** The state, the push and the pull request, the labels, and the comments. */
async function finish(ctx) {
  const { config, env, deps, gh, exec, issue, costs, failure, progress, attemptNo, kind, actor, runUrl, number,
    at, repo, out, changesPull } = ctx
  // `publish` may block the attempt itself, when the commits it is about to push break a limit.
  let outcome = ctx.outcome
  let st = ctx.st
  // The threads that the implementer of a review attempt saw: the preflight recorded them in the state.
  const threads = st.implementing?.threads ?? []
  let commentId = ctx.commentId
  const existing = commentId !== null

  // Pull request: opened after the push, so a failure of either leaves the state with what exists.
  let pr = progress.pr
  // Every pull request opens as a draft: only the CI gate marks one ready, after real CI is green on GitHub.
  const published = { title: null, body: null, draft: true, toDraft: false }
  const hasCode = !failure && (outcome.result === 'pr-opened' || outcome.result === 'draft')

  async function publishCode() {
    if (!hasCode) return
    const { implementation, checks, review, branchInfo } = outcome
    published.title = commitTitle({
      type: implementation.commitType,
      scope: implementation.scope,
      title: implementation.title,
    })
    published.body = prBody({
      number,
      issueTitle: issue.title,
      implementation,
      checks,
      review,
      rounds: outcome.rounds,
      actor,
    })
    // An open pull request that is ready stays so after a green attempt and goes back to draft after any other.
    published.toDraft = outcome.result !== 'pr-opened'
    if (config.dryRun) return
    let blockedBy = null
    await log.group('Push the branch', async () => {
      await fetchBundle({ exec, file: path.join(out, BUNDLE_FILE), head: branchInfo.head })
      blockedBy = await pushedDiffProblem({ exec, head: branchInfo.head, type: issue.type?.name })
      if (blockedBy) {
        log.info('decision', { stage: 'publish', action: 'no push: the commits break a limit', reason: blockedBy })
        return
      }
      await pushBranch({
        env, repo, branch: branchInfo.branch, previousSha: branchInfo.previousSha, exec, ref: branchInfo.head,
      })
      progress.pushed = true
      log.info('branch pushed', { branch: branchInfo.branch, leased: Boolean(branchInfo.previousSha) })
    })
    if (blockedBy) {
      outcome = { ...outcome, result: 'blocked', blockedReason: blockedBy, bundle: false }
      return
    }
    await log.group('Pull request', async () => {
      const open = progress.pr ? await gh.getPull(progress.pr) : null
      if (open && open.state === 'open') {
        pr = open.number
        const client = deps.patGh ?? createClient({ token: readPat(env), repo })
        await updateOpenPull({
          client, open, title: published.title, body: published.body, toDraft: published.toDraft, kind,
        })
        return
      }
      // A CI fix belongs to the pull request that is red, and so does a change request; a new one would be a
      // different change.
      if (kind === 'ci-fix' || changesPull) {
        throw new Error(`Pull request #${progress.pr} is not open, so the ${kind === 'ci-fix' ? 'CI fix' : 'change'} ` +
          'has no place to go')
      }
      const created = await openPull({
        env, repo, deps, title: published.title, head: branchInfo.branch, base: BASE_BRANCH, body: published.body,
        draft: published.draft,
      })
      pr = created.number
      progress.pr = pr
      log.info('pull request opened', { pr, draft: published.draft })
    })
  }

  // A CI fix that found the failure `unrelated` pushes nothing: it reruns the failed checks of the pull request.
  let rerun = null
  async function rerunUnrelated() {
    if (failure || outcome.result !== 'unrelated') return
    rerun = await log.group('Find the failed checks', () => rerunnableChecks({ gh, pr: progress.pr }))
    log.info('failed checks', {
      sha: rerun.sha,
      failed: rerun.failed.map((f) => f.name).join(', ') || 'none',
      runs: rerun.targets.join(',') || 'none',
    })
    if (rerun.targets.length === 0 || config.dryRun) return
    await log.group('Rerun the failed checks', async () => {
      for (const id of rerun.targets) await gh.rerunFailedJobs(id)
      log.info('rerun requested', { runs: rerun.targets.join(',') })
    })
  }

  let publishFailure = null
  let replyError = null
  try {
    await publishCode()
    await rerunUnrelated()
  } catch (err) {
    publishFailure = err
    log.error(`Publishing failed: ${err.message}`)
  }
  const error = failure ?? publishFailure
  // With nothing to rerun, an unrelated verdict is a hand-off like a blocked answer.
  if (!error && outcome.result === 'unrelated' && (rerun?.targets.length ?? 0) === 0) {
    const why = outcome.blockedReason.replace(/[.\s]+$/, '')
    outcome = {
      ...outcome,
      result: 'blocked',
      blockedReason: `${why}. I think this change does not cause the failure, but I found no failed check that I ` +
        'can rerun.',
    }
    log.info('decision', { stage: 'publish', action: 'unrelated, but nothing to rerun: hand over as blocked' })
  }
  const ciReport = st.lastCiReport ?? ''

  const human = await log.group('Prepare the state', async () => {
    const totalUsd = sum(st.costs, 'usd')
    const result = error ? 'error' : outcome.result
    const reason = outcome.blockedReason
    const notes = error
      ? `The attempt failed: ${error.message}`
      : outcome.implementation?.notes || reason
    const entry = attemptRecord({
      n: attemptNo,
      kind,
      run: runUrl,
      result,
      rounds: outcome.rounds ?? 0,
      checks: outcome.checks,
      review: outcome.review,
      notes,
      reason: result === 'blocked' || result === 'unrelated' ? reason : undefined,
      actor,
      at,
    })
    const { implementing: _running, ciGate: decidedBefore, ...rest } = st
    const green = !error && outcome.result === 'pr-opened'
    const rerunning = !error && outcome.result === 'unrelated'
    st = {
      ...rest,
      // The gate decided this commit before; after a rerun it decides the commit again.
      ...(rerunning || !decidedBefore ? {} : { ciGate: decidedBefore }),
      phase: green || rerunning ? 'waiting-ci' : 'needs-human',
      // The branch is the state's only once it exists on the remote; a dry run or a blocked attempt leaves it alone.
      ...(progress.pushed ? { branch: progress.branch } : {}),
      ...(pr ? { pr } : {}),
      ...(outcome.playbook ? { playbook: outcome.playbook } : {}),
      forced: Boolean(outcome.forced) || Boolean(st.forced),
      attempts: [...(st.attempts ?? []), entry],
    }
    log.info('state', { phase: st.phase, result, attempts: st.attempts.length, branch: st.branch, pr: st.pr })
    log.info('cost', { thisRun: usage.formatUsd(sum(costs, 'usd')), total: usage.formatUsd(totalUsd) })
    const text = renderOutcome({
      result,
      number,
      pr,
      branch: progress.branch,
      attempt: entry,
      implementation: outcome.implementation,
      checks: outcome.checks,
      review: outcome.review,
      reason,
      message: error?.message,
      runUrl,
      totalUsd,
      kind,
      ciReport,
      rerun: result === 'unrelated'
        ? {
          names: ciChecks().checkNames(rerun.failed),
          counted: ciChecks().countedAttempts(st.attempts, st.budgetFrom),
          max: config.limits.maxAttempts,
        }
        : undefined,
    })
    fs.writeFileSync(path.join(out, 'summary.md'), text)
    return text
  })

  const result = error ? 'error' : outcome.result
  const labelChanges = result === 'pr-opened' || result === 'unrelated'
    ? { add: [], remove: [LABEL_NEEDS_HUMAN] }
    : { add: [LABEL_NEEDS_HUMAN], remove: [] }
  const note = result === 'pr-opened' || result === 'unrelated'
    ? null
    : actorComment({ result, actor, pr, reason: outcome.blockedReason, message: error?.message, kind, ciReport })
  // Without a mention: this comment and the state comment tell the pull request why its CI runs again.
  const prNote = result === 'unrelated'
    ? `CI failed in ${ciChecks().checkNames(rerun.failed)}, which this change does not cause: ` +
      `${inline(outcome.blockedReason).replace(/[.\s]+$/, '')}. I reran the failed checks; the CI gate decides again.`
    : null

  if (config.dryRun) {
    await log.group('Write the dry-run report', async () => {
      const report = [`## Dry run: AI implementation of #${number}`, '', human, '']
      if (published.title) {
        report.push('### Commit message', '', fence(commitMessage({
          type: outcome.implementation.commitType,
          scope: outcome.implementation.scope,
          title: outcome.implementation.title,
          number,
          runUrl,
        })), '')
        report.push('### Pull request (a draft; only the CI gate marks it ready)', '', `Title: ${published.title}`, '',
          fence(published.body, 'markdown'), '')
        if (kind === 'review') {
          report.push('Would reply in each review thread that the implementer saw, after the push.', '')
        }
      }
      report.push('### Labels', '', `- add: ${labelChanges.add.join(', ') || 'none'}`,
        `- remove: ${labelChanges.remove.join(', ') || 'none'}`, '')
      if (result === 'unrelated') {
        report.push(`Would rerun the failed jobs of workflow run(s) ${rerun.targets.join(', ')}.`, '')
        report.push(quoted(`### Comment that would go on pull request #${pr}`, prNote))
      }
      if (note) report.push(quoted('### Comment that would notify the person who asked', note))
      report.push('### State', '', fence(JSON.stringify(st, null, 2), 'json'), '')
      if (hasCode && outcome.diff) {
        report.push('### Diff', '', fence(outcome.diff.stat), '', `First ${DIFF_PREVIEW_LINES} lines of the diff:`, '',
          fence(outcome.diff.preview, 'diff'), '')
      }
      appendSummary(env, report.join('\n'))
      log.info('dry run: written to the job summary')
    })
  } else {
    // The state first: it holds the cost record and the pull request number, which must survive a failed label call.
    await log.group('Write the state comment', async () => {
      // Read again right before the write: chat may have added a cost record since the state was loaded.
      const merged = await state.withFreshCosts(gh, number, st)
      const text = state.render(human, merged)
      if (existing) {
        await gh.updateIssueComment(commentId, text)
      } else {
        commentId = (await gh.createIssueComment(number, text))?.id ?? null
      }
      log.info('state comment written', { id: commentId ?? 'new' })
    })
    await log.group('Apply the labels', async () => {
      if (labelChanges.add.length) await gh.addLabels(number, labelChanges.add)
      for (const label of labelChanges.remove) await gh.removeLabel(number, label)
      log.info('labels applied', {
        add: labelChanges.add.join(',') || 'none',
        remove: labelChanges.remove.join(',') || 'none',
      })
    })
    if (note) {
      await log.group('Tell the person who asked', async () => {
        await gh.createIssueComment(number, note)
        log.info('comment posted', { mention: actor, result })
      })
    }
    if (prNote) {
      await log.group('Tell the pull request', async () => {
        await gh.createIssueComment(pr, prNote)
        log.info('comment posted', { on: `#${pr}`, result })
      })
    }
    if (kind === 'review' && progress.pushed && !error && threads.length > 0) {
      replyError = await log.group('Reply in the review threads', () =>
        replyInThreads({ gh, pr, threads, head: outcome.branchInfo.head }),
      )
    }
  }
  if (error) throw error
  if (replyError) throw replyError
  return { result, pr, branch: progress.branch }
}

/**
 * One reply in each review thread that the implementer saw: the commit that answers the review. The agent never
 * resolves a thread; a person does. A failed reply is logged and the others still go out.
 *
 * @returns {Promise<Error|null>} the first error
 */
async function replyInThreads({ gh, pr, threads, head }) {
  const sha = String(head).slice(0, 7)
  const text = `The AI Autonomous agent pushed ${sha} for this review. A person resolves the thread.`
  let first = null
  for (const thread of threads) {
    if (!thread.commentId) {
      log.warn(`The review thread ${thread.id} has no first comment to reply to`)
      continue
    }
    try {
      await gh.replyToReviewComment(pr, thread.commentId, text)
      log.info('replied in the review thread', { thread: thread.id, comment: thread.commentId })
    } catch (err) {
      first ??= err
      log.error(`The reply in the review thread ${thread.id} failed: ${err.message}`)
    }
  }
  return first
}

// ---------------------------------------------------------------------------------------------------------------

/** `argv` is `['preflight']`, `['work']`, or `['publish']`. */
async function main(argv = process.argv.slice(2), env = process.env, deps = {}) {
  const [what] = argv
  if (what === 'preflight') return preflight(env, deps)
  if (what === 'work') return work(env, deps)
  if (what === 'publish') return publish(env, deps)
  throw new Error(`Usage: node tools/agent/implement.js preflight|work|publish (got '${what ?? ''}')`)
}

if (require.main === module) {
  main().catch((err) => {
    log.error(err?.message ?? String(err))
    console.error(err)
    process.exit(1)
  })
}

module.exports = {
  main,
  preflight,
  writeContext,
  work,
  publish,
  recoverCosts,
  outcomeProblems,
  attemptKind,
  attemptKindOf,
  humanDecision,
  diffBlockReason,
  prepareBranch,
  branchAllowed,
  renderReviewThreads,
  limitThreads,
  requireCiFixState,
  appendSummary,
  writeOutputs,
  quoted,
  costLine,
  waysOnLines,
  BUSY_MS,
  loadIssue,
  needsAnalysis,
  preflightDecision,
  refusalReply,
  playbookOf,
  branchName,
  parseLsRemote,
  parseShortstat,
  diffTooLarge,
  touchedWorkflows,
  touchedAgentFiles,
  noreplyEmail,
  checkCommands,
  commitTitle,
  commitMessage,
  checkImplementation,
  checkSelfReview,
  effectiveVerdict,
  redact,
  cleanEnv,
  fence,
  renderImplementInput,
  renderSelfReviewInput,
  prBody,
  renderOutcome,
  actorComment,
  attemptRecord,
  defaultExec,
  runChecks,
  pushBranch,
  resolveIdentity,
}
