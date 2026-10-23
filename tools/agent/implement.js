#!/usr/bin/env node
/**
 * Flow C of the AI Autonomous agent: implement a Bug or Task issue, up to a pull request.
 *
 * Two commands run as two steps of the `implement` job (.github/workflows/ai-autonomous-agent.yml), because the
 * preflight can stop the job before the slow toolchain setup:
 *
 *   node tools/agent/implement.js preflight
 *     Decides whether the issue may be implemented. A refusal posts one comment that explains it and writes
 *     `proceed=false` to $GITHUB_OUTPUT. Otherwise the state gets the phase `implementing`, so a second command is
 *     refused, and `proceed=true` follows.
 *
 *   node tools/agent/implement.js run
 *     One attempt, in stages: analysis (when the issue changed since the last one), branch, Git identity, then rounds
 *     of implement (`implementer`), local commit, local checks, and self-review (`self-reviewer`, the other model);
 *     the diff size limit; and the publication: push and pull request with `AGENT_PAT`, the state comment, the
 *     labels, and a comment that mentions the person who asked. Nothing waits for CI: the CI gate is a later phase.
 *
 * The model never gets a token (lib/opencode.js strips them), and neither do the local checks, which run code the
 * model wrote (`cleanEnv`). `AGENT_PAT` is read only by `readPat`, for the Git identity, the push, and the pull
 * request. The push URL holds the token, so it is never logged, and `redact` cleans every message that may echo it.
 * The cost of every model call is recorded in the state, also when a stage fails. In dry-run nothing is pushed or
 * written to GitHub; the job summary shows what would be.
 *
 * Environment: GITHUB_REPOSITORY, GITHUB_TOKEN, OPENAI_API_KEY (`run`), AGENT_PAT (`run`), AGENT_NUMBER (the issue),
 * AGENT_COMMAND (JSON of the parsed command), AGENT_ACTOR (login of the commenter), AGENT_RUN_URL, AGENT_OUT (folder
 * for inputs, events, and outputs), the AGENT_* variables of lib/config.js, GITHUB_OUTPUT, GITHUB_STEP_SUMMARY.
 */
'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { spawn } = require('node:child_process')
const { loadConfig } = require('./lib/config')
const { createClient } = require('./lib/github')
const state = require('./lib/state')
const usage = require('./lib/usage')
const { ContractError } = require('./lib/contract')
const { callAgent } = require('./lib/agent-call')
const { SECRET_ENV } = require('./lib/opencode')
const { untrusted } = require('./lib/prompt')
const { inline, clip, tailLines, stripAnsi } = require('./lib/text')
const { analyze } = require('./analyze')
const log = require('./lib/log')

const LABEL_UNSUITABLE = 'ai:unsuitable'
const LABEL_SUITABLE = 'ai:suitable'
const LABEL_NEEDS_HUMAN = 'agent:needs-human'
const BASE_BRANCH = 'develop'
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
  return String(nameOnly ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith('.github/workflows/'))
}

/** The commands of the local checks. One Nx command covers Go, Maven, and TypeScript projects. */
function checkCommands(base) {
  return [
    {
      name: 'nx affected',
      file: 'pnpm',
      args: ['exec', 'nx', 'affected', '-t', 'build', 'test', `--base=${base}`, '--head=HEAD', '--parallel=3',
        '--output-style=static'],
    },
  ]
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
 * The semantic rules of the implementer's answer that the schema cannot express: a `bug-fix` is a `fix`, and a
 * blocked answer says why. Throws `ContractError`; returns the answer otherwise.
 */
function checkImplementation(output, playbook) {
  const problems = []
  if (playbook === 'bug-fix' && output.commitType !== 'fix') {
    problems.push(`commitType: a bug-fix must use 'fix', got '${output.commitType}'`)
  }
  if (output.status === 'blocked' && output.blockedReason.trim() === '') {
    problems.push('blockedReason: a blocked answer needs a reason')
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

function renderPlan(plan, analysis) {
  if (!plan) {
    const reason = analysis?.reason ? ` Its reason: ${inline(analysis.reason)}` : ''
    return [`There is no plan: the analysis did not find the issue suitable.${reason}`]
  }
  return [
    `- Modules: ${inline(plan.modules.join(', ') || 'none named')}`,
    `- Approach: ${inline(plan.approach)}`,
    `- Tests: ${inline(plan.tests || 'none named')}`,
    `- Risk: ${plan.risk}`,
  ]
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

/**
 * The text of `implement-input.md` for the implementer: facts of the issue, what people wrote inside `<untrusted>`
 * blocks, the plan, earlier attempts, and, from round 2, what the previous round left to fix.
 *
 * @param {object} input
 * @param {string} input.playbook `bug-fix` or `task`
 * @param {'initial'|'human'|'ci-fix'} input.kind why this attempt runs; `ci-fix` is for the CI gate of a later phase
 * @param {object} input.issue
 * @param {object[]} input.comments the comments of the issue without the state comment; bot comments are skipped
 * @param {object|null} input.plan the plan of the analysis
 * @param {object|null} input.analysis the analysis in the state (the reason when there is no plan)
 * @param {string} input.notes the notes after the command
 * @param {object[]} input.attempts earlier attempts from the state
 * @param {number} input.round 1, or more after a self-review or a failed check
 * @param {{ findings: object[], checks: object|null }|null} input.previous the previous round's open results
 * @param {string} [input.ciReport] the CI report of a `ci-fix` attempt
 */
function renderImplementInput({
  playbook, kind, issue, comments, plan, analysis, notes, attempts, round, previous, ciReport,
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
    '',
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
  if (notes) out.push('## Notes of the maintainer who asked for this implementation', '', untrusted(notes), '')
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
      out.push('### Self-review findings', '')
      for (const f of previous.findings) {
        out.push(`- ${f.severity} at \`${f.file}${f.line ? `:${f.line}` : ''}\`: ${inline(f.body)}`)
      }
      out.push('')
    }
    if (previous.checks && !previous.checks.passed) {
      out.push('### Local check failures', '', ...renderCheckFailures(previous.checks))
    }
  }
  return out.join('\n')
}

/** The text of `self-review-input.md`: the issue, the plan, the implementer's summary, and the commits to compare. */
function renderSelfReviewInput({ issue, plan, analysis, notes, summary, base, head }) {
  return [
    `# Self-review of the change for issue #${issue.number}`,
    '',
    `- Base commit: ${base}`,
    `- Head commit: ${head}`,
    `- Compare with: \`git diff ${base} ${head}\``,
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
    summary,
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
      ? `Local checks passed: ${checkNames(checks)}.`
      : `Local checks failed: ${checkNames({ results: checks.results.filter((r) => r.exitCode !== 0) })}.`,
    '',
    '## Checklist',
    '',
    '- [x] The issue is linked under Development or with "Closes #123".',
    '- [ ] The documentation is updated in this pull request.',
    '- [ ] A breaking change has `!` in the title, or a "BREAKING CHANGE:" footer at the start of a line in this ' +
      'description.',
    '',
    verdict === 'approve'
      ? `Self-review by a second model: approved after ${rounds} round(s).`
      : `Self-review by a second model: changes were still requested after ${rounds} round(s).`,
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

/**
 * The human part of the state comment after the run.
 *
 * @param {object} input
 * @param {'pr-opened'|'draft'|'blocked'|'error'} input.result
 */
function renderOutcome({ result, number, pr, branch, attempt, implementation, checks, review, reason, message, runUrl,
  totalUsd }) {
  const retry = 'comment `/agent implement` with guidance to try again'
  if (result === 'error') {
    return [
      '### AI implementation failed',
      '',
      `The implementation did not finish: ${inline(message)}`,
      '',
      costLine(runUrl, totalUsd, retry),
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
  const lead = result === 'pr-opened'
    ? [pr ? `### AI implementation: pull request #${pr} is open` : '### AI implementation: ready for a pull request',
      '', `Branch \`${branch}\`. ${rounds}. CI runs on the pull request.`]
    : [pr ? `### AI implementation needs a person: draft pull request #${pr}` : '### AI implementation needs a person',
      '', `Branch \`${branch}\`. I stopped after ${rounds} without a green result.`]
  const out = [
    ...lead,
    '',
    `- Local checks: ${checks.passed ? 'green' : 'red'}`,
    `- Self-review: ${effectiveVerdict(review) === 'approve' ? 'approved' : 'changes requested'}`,
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
    out.push('', '**What I need from you:** review the draft pull request, push a fix to the branch, or comment ' +
      '`/agent implement` with guidance for another attempt.', '')
  }
  out.push(costLine(runUrl, totalUsd, `closes #${number} when merged`))
  return out.join('\n')
}

/** The short comment that notifies the person who asked. State comment edits notify nobody. */
function actorComment({ result, actor, pr, reason, message }) {
  switch (result) {
    case 'draft':
      return `@${actor}, I opened draft pull request ${pr ? `#${pr}` : '(dry run)'}, but it is not green yet. ` +
        'The AI implementation comment on this issue says what is open.'
    case 'blocked':
      return `@${actor}, I could not implement this issue: ${inline(reason)} The AI implementation comment on this ` +
        'issue has the details.'
    case 'error':
      return `@${actor}, the implementation failed: ${inline(message)}`
    default:
      throw new Error(`No comment for the result '${result}'`)
  }
}

/** The attempt record for the state. */
function attemptRecord({ n, kind, run, result, rounds, checks, review, notes, reason, at }) {
  return {
    n,
    kind,
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
async function pushBranch({ env, repo, branch, previousSha, exec }) {
  const pat = readPat(env)
  const url = `https://x-access-token:${pat}@github.com/${repo}.git`
  const args = ['push', '--no-verify']
  if (previousSha) args.push(`--force-with-lease=refs/heads/${branch}:${previousSha}`)
  args.push(url, `HEAD:refs/heads/${branch}`)
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
 * Decides, answers a refusal, and marks the issue as being implemented. `deps.gh` is injectable.
 *
 * @returns {Promise<{ proceed: boolean, outcome: string, forced: boolean }>}
 */
async function preflight(env = process.env, deps = {}) {
  const config = loadConfig(env)
  const number = Number(requireEnv(env, 'AGENT_NUMBER'))
  const actor = requireEnv(env, 'AGENT_ACTOR')
  const runUrl = requireEnv(env, 'AGENT_RUN_URL')
  const command = parseCommandEnv(env.AGENT_COMMAND)
  const gh = deps.gh ?? createClient({ token: env.GITHUB_TOKEN, repo: env.GITHUB_REPOSITORY })
  log.info('preflight starts', { issue: number, actor, force: command.force, dryRun: config.dryRun })

  const { issue, existing, st } = await log.group('Load the issue, its comments, and its state', () =>
    loadIssue(gh, number),
  )
  const decision = await log.group('Decide', async () => {
    const result = preflightDecision({ issue, state: st, command, config })
    log.info('preflight decision', { outcome: result.outcome, forced: result.forced })
    return result
  })

  if (decision.outcome.startsWith('refuse')) {
    const reply = refusalReply({ outcome: decision.outcome, actor, issue, state: st })
    await log.group(config.dryRun ? 'Refuse (dry run: job summary only)' : 'Refuse', async () => {
      if (config.dryRun) {
        appendSummary(env, quoted(`## Dry run: AI implementation of #${number} refused`, reply))
        log.info('dry run: the reply is in the job summary')
        return
      }
      await gh.createIssueComment(number, reply)
      log.info('reply posted', { mention: actor, outcome: decision.outcome })
    })
    writeOutputs(env, { proceed: 'false', outcome: decision.outcome })
    return { proceed: false, ...decision }
  }

  const analyzeFirst = decision.outcome === 'analyze-first'
  const marked = {
    ...st,
    phase: 'implementing',
    implementing: { run: runUrl, actor, at: new Date().toISOString(), analyzeFirst },
  }
  const markTitle = config.dryRun ? 'Mark the issue (dry run: nothing written)' : 'Mark the issue as being implemented'
  await log.group(markTitle, async () => {
    if (config.dryRun) {
      appendSummary(env, `## Dry run: AI implementation of #${number} may proceed\n\n- outcome: ${decision.outcome}\n` +
        `- forced: ${decision.forced}\n`)
      return
    }
    const human = `### AI implementation is running\n\n[The run](${runUrl}) was started by @${actor}.`
    const body = state.render(human, marked)
    if (existing) await gh.updateIssueComment(existing.id, body)
    else await gh.createIssueComment(number, body)
    log.info('state comment written', { phase: 'implementing', id: existing ? existing.id : 'new' })
  })
  writeOutputs(env, { proceed: 'true', outcome: decision.outcome })
  return { proceed: true, ...decision }
}

// ---------------------------------------------------------------------------------------------------------------
// run
// ---------------------------------------------------------------------------------------------------------------

/** Checks out the branch of an earlier attempt, or a new branch from `develop`. */
async function prepareBranch({ exec, st, type, number, title }) {
  const branch = st.branch ?? branchName(type, number, title)
  const remote = parseLsRemote(await git(exec, ['ls-remote', '--heads', 'origin', branch]), branch)
  // A branch the state does not record is not the agent's: pushing to it would need a force over someone's work.
  if (remote && !st.branch) {
    throw new Error(`The branch ${branch} already exists on the remote and no earlier attempt of the agent made it. ` +
      'Delete it or rename it, then comment `/agent implement` again.')
  }
  const continuing = Boolean(st.branch && remote)
  if (continuing) {
    log.info('branch decision', { branch, action: 'continue the branch of an earlier attempt', remote })
    await git(exec, ['fetch', '--no-tags', 'origin', branch])
    await git(exec, ['checkout', '-B', branch, 'FETCH_HEAD'])
  } else {
    log.info('branch decision', { branch, action: `new branch from origin/${BASE_BRANCH}`, remote: remote ?? 'none' })
    await git(exec, ['checkout', '-B', branch, `origin/${BASE_BRANCH}`])
  }
  const base = await git(exec, ['rev-parse', 'HEAD'])
  log.info('base commit', { base })
  return { branch, continuing, previousSha: continuing ? remote : null, base }
}

/** Runs the check commands in order and keeps the last lines of each output. Stops at the first failure. */
async function runChecks({ exec, base }) {
  const results = []
  for (const c of checkCommands(base)) {
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
 * @returns {Promise<{ status: 'done'|'blocked', rounds: number, reason?: string, implementation: object|null,
 *   checks: object|null, review: object|null, head: string|null }>}
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
        check: (o) => checkImplementation(o, ctx.playbook),
      })
      log.info('implementer answer', { status: output.status, commitType: output.commitType, title: output.title })
      return output
    })
    if (implementation.status === 'blocked') {
      log.info('decision', { stage: 'implement', action: 'blocked', reason: implementation.blockedReason })
      const reason = implementation.blockedReason
      return { status: 'blocked', rounds: round, reason, implementation, checks, review, head }
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
 * One attempt. `deps`: `gh` (GITHUB_TOKEN client), `patGh` (PAT client), `exec` (processes), `runAgent` (opencode).
 * Throws after it has written the state when the attempt failed.
 */
async function run(env = process.env, deps = {}) {
  const config = loadConfig(env)
  const number = Number(requireEnv(env, 'AGENT_NUMBER'))
  const actor = requireEnv(env, 'AGENT_ACTOR')
  const runUrl = requireEnv(env, 'AGENT_RUN_URL')
  const out = requireEnv(env, 'AGENT_OUT')
  const repo = env.GITHUB_REPOSITORY
  const command = parseCommandEnv(env.AGENT_COMMAND)
  fs.mkdirSync(out, { recursive: true })
  const gh = deps.gh ?? createClient({ token: env.GITHUB_TOKEN, repo })
  const exec = deps.exec ?? defaultExec
  log.info('implementation starts', {
    issue: number,
    actor,
    force: command.force,
    dryRun: config.dryRun,
    implement: formatModel(config.models.implement),
    review: formatModel(config.models.review),
    maxReviewRounds: config.limits.maxReviewRounds,
  })

  const loaded = await log.group('Load the issue, its comments, and its state', () => loadIssue(gh, number))
  const { issue, comments } = loaded
  let st = loaded.st
  let commentId = loaded.existing?.id ?? null
  const costs = []
  const at = new Date().toISOString()
  const progress = { branch: st.branch ?? null, pr: st.pr ?? null, pushed: false }
  let outcome = null
  let failure = null
  let stop = null
  const attemptNo = (st.attempts?.length ?? 0) + 1
  const kind = attemptNo === 1 ? 'initial' : 'human'
  const labelsBefore = names(issue.labels)
  let forced = Boolean(command.force && labelsBefore.includes(LABEL_UNSUITABLE))
  let playbook = null

  try {
    const type = issue.type?.name
    playbook = playbookOf(type).playbook
    log.info('playbook', { type, playbook, attempt: attemptNo, kind })

    // 1. Analysis, when the issue changed since the last one.
    const analyzeFirst = st.implementing?.run === runUrl ? st.implementing.analyzeFirst : needsAnalysis(issue, st)
    if (analyzeFirst) {
      const result = await log.group('Analysis', async () => {
        const analysisEnv = { ...env, AGENT_TRIGGER: 'command' }
        return analyze(analysisEnv, { gh, runAgent: deps.runAgent }, { askAuthor: false })
      })
      st = result.state
      commentId = result.commentId ?? commentId
      if (result.failure) throw result.failure
      const verdict = result.analysis.verdict
      // A person's `ai:suitable` outweighs the analysis; the label is the agent's only if the state said so.
      const before = loaded.st.analysis
      const agentSuitable = before?.labelSetBy === 'agent' && before.label === LABEL_SUITABLE
      const personSuitable = labelsBefore.includes(LABEL_SUITABLE) && !agentSuitable
      log.info('analysis finished', { verdict, personSuitable })
      if (verdict === 'needs-info') {
        stop = { outcome: 'refuse-needs-info' }
      } else if (verdict === 'unsuitable' && !personSuitable) {
        if (command.force) forced = true
        else stop = { outcome: 'refuse-unsuitable' }
      }
    }
    if (stop) {
      log.info('decision', { action: 'stop after the analysis', outcome: stop.outcome })
    } else {
      outcome = await workOnIssue({
        config, env, deps, gh, exec, issue, comments, st, command, actor, out, runUrl, repo, costs, progress, at, type,
        playbook, kind, attemptNo, number, forced,
      })
    }
  } catch (err) {
    failure = err
    log.error(`Implementation failed: ${err.message}`)
  }

  if (stop) {
    const reply = refusalReply({ outcome: stop.outcome, actor, issue, state: st })
    await log.group(config.dryRun ? 'Reply (dry run: job summary only)' : 'Reply', async () => {
      if (config.dryRun) {
        appendSummary(env, [`## Dry run: AI implementation of #${number} stopped after the analysis`, '',
          ...reply.split('\n').map((l) => `> ${l}`), ''].join('\n'))
        return
      }
      await gh.createIssueComment(number, reply)
      log.info('reply posted', { mention: actor, outcome: stop.outcome })
    })
    return { stopped: stop.outcome }
  }

  return finish({ config, env, deps, gh, st, commentId, existing: loaded.existing, issue, costs, outcome, failure,
    progress, attemptNo, kind, forced, playbook, actor, runUrl, number, at, out, exec, repo })
}

/** Stages 2 to 8: everything up to the decision what to publish. Returns the outcome; publishes nothing. */
async function workOnIssue(ctx) {
  const { env, deps, exec, issue, st, command, number, costs, repo, config } = ctx

  const branchInfo = await log.group('Branch', () =>
    prepareBranch({ exec, st, type: ctx.type, number, title: issue.title }),
  )
  ctx.progress.branch = branchInfo.branch

  await log.group('Git identity', async () => {
    const id = await resolveIdentity({ env, repo, deps, dryRun: config.dryRun })
    await git(exec, ['config', 'user.name', id.name])
    await git(exec, ['config', 'user.email', id.email])
    log.info('git identity', { name: id.name, email: id.email })
  })

  const analysis = ctx.st.analysis ?? null
  const rounds = await implementRounds({
    config,
    exec,
    out: ctx.out,
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
    ciReport: '',
  })

  let blockedReason = rounds.status === 'blocked' ? rounds.reason : null
  let diff = null
  if (!blockedReason) {
    diff = await log.group('Diff size', async () => {
      const shortstat = await git(exec, ['diff', '--shortstat', branchInfo.base, 'HEAD'])
      const stat = parseShortstat(shortstat)
      const limit = DIFF_LIMITS[ctx.playbook]
      const tooLarge = diffTooLarge(stat, ctx.playbook)
      log.info('diff size', { ...stat, limitFiles: limit.files, limitLines: limit.lines, tooLarge })
      if (tooLarge) {
        blockedReason = `The change has outgrown the issue: ${stat.files} files and ` +
          `${stat.insertions + stat.deletions} changed lines, and the limit for a ${ctx.playbook} is ` +
          `${limit.files} files or ${limit.lines} lines.`
      }
      // AGENT_PAT has no Workflows permission, so GitHub would reject the push; say why instead of failing on it.
      const workflows = touchedWorkflows(await git(exec, ['diff', '--name-only', branchInfo.base, 'HEAD']))
      log.info('workflow files changed', { count: workflows.length, files: workflows })
      if (!blockedReason && workflows.length) {
        blockedReason = `The change edits workflow files (${workflows.join(', ')}), which the agent may not push. ` +
          'A person has to make that part of the change.'
      }
      return stat
    })
  }
  const green = !blockedReason && rounds.checks.passed && effectiveVerdict(rounds.review) === 'approve'
  const result = blockedReason ? 'blocked' : green ? 'pr-opened' : 'draft'
  log.info('decision', { stage: 'publish', result, reason: blockedReason ?? 'none' })
  return { ...rounds, blockedReason, diff, green, result, branchInfo }
}

/** Stage 9 and 10: the state, the push and the pull request, the labels, and the comments. */
async function finish(ctx) {
  const { config, env, deps, gh, exec, issue, costs, outcome, failure, progress, attemptNo, kind, actor, runUrl, number,
    at, repo, out } = ctx
  let st = ctx.st
  let commentId = ctx.commentId

  // Pull request: opened after the push, so a failure of either leaves the state with what exists.
  let pr = progress.pr
  const published = { title: null, body: null, draft: false }

  async function publishCode() {
    if (!outcome || outcome.result === 'blocked' || failure) return
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
    published.draft = outcome.result !== 'pr-opened'
    if (config.dryRun) return
    await log.group('Push the branch', async () => {
      await pushBranch({ env, repo, branch: branchInfo.branch, previousSha: branchInfo.previousSha, exec })
      progress.pushed = true
      log.info('branch pushed', { branch: branchInfo.branch, leased: Boolean(branchInfo.previousSha) })
    })
    await log.group('Pull request', async () => {
      const open = progress.pr ? await gh.getPull(progress.pr) : null
      if (open && open.state === 'open') {
        pr = open.number
        log.info('pull request kept', { pr, note: 'the push updated it' })
        return
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

  let publishFailure = null
  try {
    await publishCode()
  } catch (err) {
    publishFailure = err
    log.error(`Publishing failed: ${err.message}`)
  }
  const error = failure ?? publishFailure

  const human = await log.group('Prepare the state', async () => {
    for (const c of costs) st = state.addCost(st, c)
    const totalUsd = sum(st.costs, 'usd')
    const result = error ? 'error' : outcome.result
    const reason = outcome?.blockedReason
    const notes = error
      ? `The attempt failed: ${error.message}`
      : outcome.implementation?.notes || reason
    const entry = attemptRecord({
      n: attemptNo,
      kind,
      run: runUrl,
      result,
      rounds: outcome?.rounds ?? 0,
      checks: outcome?.checks,
      review: outcome?.review,
      notes,
      reason: result === 'blocked' ? reason : undefined,
      at,
    })
    const { implementing: _running, ...rest } = st
    const green = !error && outcome.result === 'pr-opened'
    st = {
      ...rest,
      phase: green ? 'waiting-ci' : 'needs-human',
      // The branch is the state's only once it exists on the remote; a dry run or a blocked attempt leaves it alone.
      ...(progress.pushed ? { branch: progress.branch } : {}),
      ...(pr ? { pr } : {}),
      ...(ctx.playbook ? { playbook: ctx.playbook } : {}),
      forced: ctx.forced || Boolean(st.forced),
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
      implementation: outcome?.implementation,
      checks: outcome?.checks,
      review: outcome?.review,
      reason,
      message: error?.message,
      runUrl,
      totalUsd,
    })
    fs.writeFileSync(path.join(out, 'summary.md'), text)
    return text
  })

  const result = error ? 'error' : outcome.result
  const labelChanges = result === 'pr-opened'
    ? { add: [], remove: [LABEL_NEEDS_HUMAN] }
    : { add: [LABEL_NEEDS_HUMAN], remove: [] }
  const note = result === 'pr-opened'
    ? null
    : actorComment({ result, actor, pr, reason: outcome?.blockedReason, message: error?.message })
  const body = state.render(human, st)

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
        const kindOfPull = published.draft ? 'draft' : 'ready for review'
        report.push(`### Pull request (${kindOfPull})`, '', `Title: ${published.title}`, '',
          fence(published.body, 'markdown'), '')
      }
      report.push('### Labels', '', `- add: ${labelChanges.add.join(', ') || 'none'}`,
        `- remove: ${labelChanges.remove.join(', ') || 'none'}`, '')
      if (note) report.push(quoted('### Comment that would notify the person who asked', note))
      report.push('### State', '', fence(JSON.stringify(st, null, 2), 'json'), '')
      if (outcome && outcome.result !== 'blocked' && !failure) {
        const stat = await git(exec, ['diff', '--stat', outcome.branchInfo.base, 'HEAD'], { allowFail: true })
        const full = await exec('git', ['diff', outcome.branchInfo.base, 'HEAD'], { keep: 'head', maxBytes: 200000 })
        const preview = full.stdout.split('\n').slice(0, DIFF_PREVIEW_LINES).join('\n')
        report.push('### Diff', '', fence(stat), '', `First ${DIFF_PREVIEW_LINES} lines of the diff:`, '',
          fence(preview, 'diff'), '')
      }
      appendSummary(env, report.join('\n'))
      log.info('dry run: written to the job summary')
    })
  } else {
    // The state first: it holds the cost record and the pull request number, which must survive a failed label call.
    await log.group('Write the state comment', async () => {
      if (commentId) {
        await gh.updateIssueComment(commentId, body)
      } else {
        commentId = (await gh.createIssueComment(number, body))?.id ?? null
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
  }
  if (error) throw error
  return { result, pr, branch: progress.branch }
}

// ---------------------------------------------------------------------------------------------------------------

/** `argv` is `['preflight']` or `['run']`. */
async function main(argv = process.argv.slice(2), env = process.env, deps = {}) {
  const [what] = argv
  if (what === 'preflight') return preflight(env, deps)
  if (what === 'run') return run(env, deps)
  throw new Error(`Usage: node tools/agent/implement.js preflight|run (got '${what ?? ''}')`)
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
  run,
  needsAnalysis,
  preflightDecision,
  refusalReply,
  playbookOf,
  branchName,
  parseLsRemote,
  parseShortstat,
  diffTooLarge,
  touchedWorkflows,
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
