#!/usr/bin/env node
/**
 * The command `/agent ci_check [notes]` of the AI Autonomous agent: the root cause of a red CI on a pull request. The
 * `ci-check` job runs this script for a comment of a person with write access on any pull request of the repository,
 * also one from a fork. The pull request of the agent gets one more step at the end.
 *
 *   1. Read the checks of the head commit. CI still runs, CI is green, or there is no check at all: reply, no model.
 *   2. Red: collect the failed jobs and their logs (the collection, the cleaning, the report, and the signature of the
 *      CI gate), and ask the `ci-triager` (read-only) for the verdict: `change`, `flaky`, `infra`, or `unknown`, the
 *      root cause, where to fix it, and the evidence.
 *   3. `flaky` or `infra` with at least medium confidence: rerun the failed jobs. When the pull request is the
 *      agent's and its issue waits (`needs-human` or `waiting-ci`), the issue state goes back to `waiting-ci`, as after
 *      `/agent rerun`, so the CI gate decides again when the checks end. `change` and `unknown` rerun nothing.
 *   4. Reply with the verdict, the cause, the places to fix, the evidence, and what the agent did.
 *
 * The working tree is the default branch, and so are this script and the opencode config. The head of the pull request
 * is fetched, never checked out. The CI report is the output of the code under test, so it reaches the model only
 * inside `untrusted()`. The cost of the model call goes to the state of the pull request, also when the call fails.
 * Reactions on the comment: `eyes` first, then `rocket`, or `confused` for a failure or a rejected rerun. In dry-run
 * nothing is written, rerun, or reacted with; the model still runs, and the job summary shows the reply.
 *
 * Environment: GITHUB_REPOSITORY, GITHUB_TOKEN, OPENAI_API_KEY (red CI only), AGENT_NUMBER (the pull request),
 * AGENT_ISSUE (the issue of an agent pull request; empty otherwise), AGENT_COMMAND (JSON of the parsed command),
 * AGENT_ACTOR (who asked), AGENT_COMMENT_ID, AGENT_PR_HEAD_REF (the local ref of the pull request head), AGENT_RUN_URL,
 * AGENT_OUT, the AGENT_* variables of lib/config.js, GITHUB_STEP_SUMMARY.
 */
'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { loadConfig } = require('./lib/config')
const { createClient } = require('./lib/github')
const state = require('./lib/state')
const usage = require('./lib/usage')
const { callAgent } = require('./lib/agent-call')
const { ContractError } = require('./lib/contract')
const { inline, defuseMentions, clip } = require('./lib/text')
const { untrusted } = require('./lib/prompt')
const { react, commentIdOf } = require('./lib/reactions')
const { agentIssueOf } = require('./route')
const { appendSummary, quoted, fence, costLine } = require('./implement')
const {
  relevantChecks, failedChecks, pendingChecks, allGreen, collectLogs, buildReport, failureSignature, rerunTargets,
  rerunRequestState, checkNames,
} = require('./ci-gate')
const log = require('./lib/log')

const LABEL_NEEDS_HUMAN = 'agent:needs-human'
/** The phases of an agent issue in which a rerun hands the decision back to the CI gate. */
const GATE_PHASES = new Set(['needs-human', 'waiting-ci'])
const MAX_NOTES = 5000
const MAX_PENDING_NAMED = 5

const sum = (items, field) => items.reduce((total, item) => total + (item[field] ?? 0), 0)
/** Text for a Markdown code span: one line, no mention, no backtick that could end the span. */
const code = (text) => inline(text).replace(/`/g, "'")

// ---------------------------------------------------------------------------------------------------------------
// The verdict
// ---------------------------------------------------------------------------------------------------------------

const VERDICT_SENTENCES = {
  change: 'the failure comes from this change',
  flaky: 'a flaky failure, not caused by the change',
  infra: 'an infrastructure failure (network, registry, runner), not caused by the change',
  unknown: 'I could not establish the cause',
}

/**
 * The semantic check of the triage, on top of the schema: a `change` verdict names at least one place to fix. It
 * throws `ContractError`, so `callAgent` records the broken contract like any other.
 */
function checkTriage(triage) {
  if (triage.verdict === 'change' && triage.fixes.length === 0) {
    throw new ContractError('The ciTriage output is invalid: the verdict is change, but fixes is empty', [
      'fixes: a change verdict needs at least one fix',
    ])
  }
}

/**
 * The verdict that decides the rerun: a `flaky` or `infra` verdict with low confidence is a guess, so it counts as
 * `unknown`.
 */
function effectiveVerdict(triage) {
  const notCaused = triage.verdict === 'flaky' || triage.verdict === 'infra'
  return notCaused && triage.confidence === 'low' ? 'unknown' : triage.verdict
}

// ---------------------------------------------------------------------------------------------------------------
// The input of the triager
// ---------------------------------------------------------------------------------------------------------------

/** The merge base of two refs, or `null` when Git cannot compute it. */
function gitMergeBase(base, head) {
  try {
    return execFileSync('git', ['merge-base', base, head], { encoding: 'utf8' }).trim() || null
  } catch (err) {
    log.warn(`The merge base of ${base} and ${head} could not be computed: ${err.message.split('\n')[0]}`)
    return null
  }
}

/**
 * The text of `ci-check-input.md`. The titles and names come from the author of the pull request, and the report is
 * the output of its code, so they sit inside `<untrusted>` blocks.
 *
 * @param {object} input
 * @param {{ number: number, title: string }} input.pull
 * @param {string} input.sha the head commit
 * @param {{ base: string, head: string, mergeBase: string|null }} input.refs
 * @param {object[]} input.failed the failed checks
 * @param {string} input.signature
 * @param {string} input.report the CI report, as `buildReport` wrote it
 * @param {string} input.notes the notes of the person who asked
 * @param {string} input.asker
 */
function renderCheckInput({ pull, sha, refs, failed, signature, report, notes, asker }) {
  const checks = failed.map((f) => `- ${f.name}: ${f.conclusion}${f.url ? ` (${f.url})` : ''}`)
  return [
    `# CI check of pull request #${pull.number}`,
    '',
    `- Asked by: ${asker}`,
    `- Head commit: \`${sha}\``,
    `- Base ref: \`${refs.base}\` (a branch of the clone)`,
    `- Head ref: \`${refs.head}\` (fetched, never checked out: read it with \`git show ${refs.head}:<path>\` and ` +
      `\`git diff ${refs.base}...${refs.head}\`)`,
    refs.mergeBase
      ? `- Merge base: \`${refs.mergeBase}\` (\`git diff ${refs.mergeBase} ${refs.head}\` is the change)`
      : '- Merge base: not computed; use the three-dot diff.',
    `- Failure signature: \`${signature}\``,
    '',
    '## Pull request and failed checks',
    '',
    untrusted(`Title: ${pull.title}\n\nFailed checks:\n${checks.join('\n')}`),
    '',
    '## CI report',
    '',
    untrusted(report),
    '',
    '## Notes of the person who asked',
    '',
    untrusted(notes === '' ? 'No notes.' : clip(notes, MAX_NOTES)),
    '',
  ].join('\n')
}

// ---------------------------------------------------------------------------------------------------------------
// The reply
// ---------------------------------------------------------------------------------------------------------------

const sha12 = (sha) => String(sha).slice(0, 12)

/** The `/agent retry` or `/agent rerun` hint of a verdict, or `null`. `agent` is true for the agent's pull request. */
function hintFor({ verdict, agent }) {
  if (verdict === 'change') return agent ? 'To let the agent fix it, comment `/agent retry` with this guidance.' : null
  if (verdict !== 'unknown') return null
  return agent
    ? 'If you think the failure is flaky, comment `/agent rerun`.'
    : 'If you think the failure is flaky, rerun the failed jobs from the Actions page.'
}

/**
 * The reply with the triage.
 *
 * @param {object} input
 * @param {string} input.actor
 * @param {number} input.pr
 * @param {string} input.sha
 * @param {object} input.triage the validated output of the triager
 * @param {boolean} input.agent true on the pull request of the agent
 * @param {{ kind: 'rerun'|'rejected'|'none', jobs?: object[], notRerun?: object[], error?: string,
 *   rejected?: number, why?: string }} input.did what the agent did
 * @param {string} input.runUrl
 * @param {number} input.checkUsd
 * @param {number} input.totalUsd
 */
function renderTriage({ actor, pr, sha, triage, agent, did, runUrl, checkUsd, totalUsd }) {
  const verdict = effectiveVerdict(triage)
  const lines = [
    `@${actor}, CI check of #${pr} at ${sha12(sha)}: ${VERDICT_SENTENCES[triage.verdict]} ` +
      `(${triage.confidence} confidence).`,
    '',
    `**Root cause.** ${defuseMentions(triage.rootCause.trim())}`,
    '',
  ]
  if (triage.fixes.length > 0) {
    lines.push('**Where to fix.**', '')
    for (const f of triage.fixes) {
      const place = f.line === null ? f.file : `${f.file}:${f.line}`
      lines.push(`- \`${code(place)}\`: ${inline(f.what)}`)
    }
    lines.push('')
  }
  if (triage.evidence.length > 0) {
    lines.push('**Evidence.**', '', fence(triage.evidence.map((line) => inline(line)).join('\n'), 'text'), '')
  }

  if (did.kind === 'rerun') {
    const gate = did.gate ? ' The CI gate decides again when they end.' : ''
    const rest = did.notRerun?.length > 0 ? ` I cannot rerun ${checkNames(did.notRerun)} from here.` : ''
    const partial = did.rejected > 0
      ? ` GitHub rejected the rerun of ${did.rejected} workflow run(s): ${inline(did.error)}`
      : ''
    lines.push(`**What I did.** I reran the failed jobs (${checkNames(did.jobs)}).${gate}${rest}${partial}`)
  } else if (did.kind === 'rejected') {
    lines.push(
      `**What I did.** Nothing: GitHub did not rerun the failed jobs: ${inline(did.error)} ` +
        'Rerun them from the Actions page, or comment `/agent ci_check` again later.',
    )
  } else {
    lines.push(`**What I did.** Nothing: ${did.why}`)
  }
  const hint = hintFor({ verdict, agent })
  if (hint) lines.push(hint)
  lines.push(
    '',
    `<sub>[Run](${runUrl}) · this check cost $${usage.formatUsd(checkUsd)} · ` +
      `AI cost of this pull request so far: $${usage.formatUsd(totalUsd)}</sub>`,
  )
  return lines.join('\n')
}

/** The reply when the triager gave no usable answer. */
function failedCheckReply({ actor, message, runUrl, checkUsd, totalUsd }) {
  return [
    `@${actor}, I could not finish the CI check: ${inline(message)}`,
    '',
    `<sub>[Run](${runUrl}) · this check cost $${usage.formatUsd(checkUsd)} · ` +
      `AI cost of this pull request so far: $${usage.formatUsd(totalUsd)}</sub>`,
  ].join('\n')
}

/** Why the agent did nothing, as the end of "Nothing: ...". */
function nothingBecause({ triage, verdict, noTargets = false }) {
  if (noTargets) return 'the failed checks are not GitHub Actions jobs, so I cannot rerun them from here.'
  if (verdict === 'change') return 'the change causes the failure, so a rerun would fail again.'
  if (triage.verdict !== verdict) return 'my confidence is low, so I do not rerun on a guess.'
  return 'I could not establish the cause, so I do not rerun.'
}

const pendingReply = ({ actor, pr, sha, pending }) => {
  const shown = pending.slice(0, MAX_PENDING_NAMED).map((p) => `\`${code(p.name)}\` ${p.state}`)
  const more = pending.length - shown.length
  const names = `${shown.join(', ')}${more > 0 ? `, and ${more} more` : ''}`
  return `@${actor}, CI still runs on #${pr} at ${sha12(sha)} (${names}). Comment \`/agent ci_check\` again when it ends.`
}

const greenReply = ({ actor, pr, sha }) => `@${actor}, CI is green on #${pr} at ${sha12(sha)}.`

const noChecksReply = ({ actor, pr, sha }) => `@${actor}, no CI check is reported for #${pr} at ${sha12(sha)}.`

// ---------------------------------------------------------------------------------------------------------------
// Loading and writing
// ---------------------------------------------------------------------------------------------------------------

function parseCommandEnv(text) {
  if (!text) return { name: 'ci-check', force: false, notes: '' }
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

/** The state comment of `number` as it is now and its state; `st` is `null` when there is none. */
async function readState(gh, number) {
  const existing = state.findStateComment(await gh.listIssueComments(number))
  return { existing, st: existing ? state.parse(existing.body) : null }
}

/**
 * Posts a reply on the pull request, or, in dry-run, puts it in the job summary. The reply is written to `reply.md`
 * either way.
 */
async function reply(ctx, body) {
  const { config, env, gh, number, out } = ctx
  fs.writeFileSync(path.join(out, 'reply.md'), body)
  if (config.dryRun) {
    appendSummary(env, quoted(`## Dry run: reply to #${number}`, body))
    log.info('dry run: the reply is in the job summary')
    return
  }
  await gh.createIssueComment(number, body)
  log.info('reply posted', { mention: ctx.actor, on: `#${number}` })
}

/**
 * Adds the cost records, and for a finished check the `ciChecks` record, to the state of the pull request: read again,
 * changed, written. In dry-run the state is only computed. Returns the state.
 */
async function recordOnPull(ctx, { costs, ciCheck }) {
  const { config, gh, number } = ctx
  const fresh = await readState(gh, number)
  let st = fresh.st ?? state.emptyPullState(number)
  for (const c of costs) st = state.addCost(st, c)
  if (ciCheck) st = { ...st, ciChecks: [...(st.ciChecks ?? []), ciCheck] }
  if (!config.dryRun && (costs.length > 0 || ciCheck)) {
    if (fresh.existing) {
      await gh.updateIssueComment(fresh.existing.id, state.replaceState(fresh.existing.body, st))
    } else {
      const human = '### AI Autonomous agent\n\nThe agent keeps what its AI calls on this pull request cost in this ' +
        'comment. Comment `/agent cost` for the table.'
      await gh.createIssueComment(number, state.render(human, st))
    }
    log.info('cost recorded', { records: costs.length, total: usage.formatUsd(sum(st.costs ?? [], 'usd')) })
  }
  return st
}

/**
 * The agent's issue of this pull request, or `null`. The router found the number; the marker in the description and the
 * state of the issue must name each other, as in the router.
 */
async function loadAgent(ctx, pull) {
  const { gh, number } = ctx
  if (!ctx.issueNumber) return null
  if (agentIssueOf(pull.body) !== ctx.issueNumber) {
    log.info('agent pull request: no', { why: 'the marker does not name the issue' })
    return null
  }
  const issue = await readState(gh, ctx.issueNumber)
  if (!issue.st || issue.st.pr !== number) {
    log.info('agent pull request: no', { why: `the state of #${ctx.issueNumber} does not name this pull request` })
    return null
  }
  log.info('agent pull request: yes', { issue: ctx.issueNumber, phase: issue.st.phase })
  return { issueNumber: ctx.issueNumber, st: issue.st }
}

/**
 * After an accepted rerun on the agent's pull request: the issue state goes back to `waiting-ci` and loses
 * `ciGate`, and the hand-off label goes, so the CI gate decides again. The state is read again right before the write;
 * a phase other than `needs-human` or `waiting-ci` (a stop, a new attempt) is left alone.
 *
 * @returns {Promise<boolean>} true when the state was changed
 */
async function handBackToGate(ctx, { agent, sha, runs, jobs }) {
  const { gh, number, actor, runUrl } = ctx
  const fresh = await readState(gh, agent.issueNumber)
  if (!fresh.st || fresh.st.pr !== number || !GATE_PHASES.has(fresh.st.phase)) {
    log.info('decision', { action: 'leave the issue state alone', phase: fresh.st?.phase ?? 'none' })
    return false
  }
  const at = new Date().toISOString()
  const st = rerunRequestState(fresh.st, { sha, runs, actor, at, run: runUrl })
  const human = [
    `### AI implementation: waiting for CI on pull request #${number}`,
    '',
    `I reran the failed checks at \`${sha12(sha)}\` after the CI check of \`${code(actor)}\` found a failure that ` +
      `the change did not cause. No new attempt. The failed checks: ${checkNames(jobs)}.`,
    '',
    costLine(runUrl, sum(st.costs ?? [], 'usd'), 'the CI gate decides when the checks end'),
  ].join('\n')
  await gh.updateIssueComment(fresh.existing.id, state.render(human, st))
  log.info('state comment written', { issue: agent.issueNumber, phase: st.phase })
  await gh.removeLabel(agent.issueNumber, LABEL_NEEDS_HUMAN)
  await gh.removeLabel(number, LABEL_NEEDS_HUMAN)
  log.info('label removed', { label: LABEL_NEEDS_HUMAN, on: `#${agent.issueNumber} and #${number}` })
  return true
}

// ---------------------------------------------------------------------------------------------------------------
// The rerun
// ---------------------------------------------------------------------------------------------------------------

/**
 * Reruns the failed Actions jobs of the head commit. In dry-run it only plans. Never throws for a rejected rerun.
 *
 * @returns {Promise<{ accepted: number[], rejected: number, error: Error|null, jobs: object[], notRerun: object[],
 *   targets: number[] }>}
 */
async function rerunFailed(ctx, failed) {
  const { config, gh } = ctx
  const rerunnable = failed.filter((f) => f.runId !== null)
  const notRerun = failed.filter((f) => f.runId === null)
  const targets = rerunTargets(rerunnable, null)
  const result = { accepted: [], rejected: 0, error: null, jobs: [], notRerun, targets }
  if (targets.length === 0) return result
  if (config.dryRun) {
    result.accepted = targets
    result.jobs = rerunnable
    return result
  }
  await log.group('Rerun the failed jobs', async () => {
    for (const id of targets) {
      try {
        await gh.rerunFailedJobs(id)
        result.accepted.push(id)
      } catch (err) {
        result.error ??= err
        result.rejected += 1
        log.error(`The rerun of workflow run ${id} was rejected: ${err.message}`)
      }
    }
    log.info('rerun requested', { runs: result.accepted.join(',') || 'none', rejected: result.rejected })
  })
  result.jobs = rerunnable.filter((f) => result.accepted.includes(f.runId))
  return result
}

// ---------------------------------------------------------------------------------------------------------------
// The command
// ---------------------------------------------------------------------------------------------------------------

/** Replies to a CI that needs no model: still running, green, or without a check. */
async function answerWithoutModel(ctx, { outcome, text }) {
  log.info('decision', { action: `reply: ${outcome}`, model: 'none' })
  await reply(ctx, text)
  return { ok: true, outcome }
}

/**
 * What the agent does with the verdict: `flaky` and `infra` rerun the failed jobs, the others do nothing. The
 * hand-back to the CI gate is only planned here (`handBack`); it happens after the cost is recorded. In dry-run
 * nothing is rerun, and the job summary says what would be.
 *
 * @returns {Promise<{ did: object, runs: number[], handBack: boolean }>}
 */
async function actOnVerdict(ctx, { triage, verdict, failed, agent }) {
  const { config, env } = ctx
  if (verdict !== 'flaky' && verdict !== 'infra') {
    return { did: { kind: 'none', why: nothingBecause({ triage, verdict }) }, runs: [], handBack: false }
  }
  const rerun = await rerunFailed(ctx, failed)
  if (rerun.targets.length === 0) {
    const why = nothingBecause({ triage, verdict, noTargets: true })
    return { did: { kind: 'none', why }, runs: [], handBack: false }
  }
  if (rerun.accepted.length === 0) {
    return { did: { kind: 'rejected', error: rerun.error.message }, runs: [], handBack: false }
  }
  const handBack = agent !== null && GATE_PHASES.has(agent.st.phase)
  if (config.dryRun) {
    appendSummary(env, `- Would rerun the failed jobs of workflow run(s) ${rerun.accepted.join(', ')}.\n`)
    if (handBack) {
      appendSummary(env, `- Would put #${agent.issueNumber} back to \`waiting-ci\` and remove ${LABEL_NEEDS_HUMAN}.\n`)
    }
  }
  const did = {
    kind: 'rerun',
    jobs: rerun.jobs,
    notRerun: rerun.notRerun,
    rejected: rerun.rejected,
    error: rerun.error?.message,
    gate: handBack && config.dryRun,
  }
  return { did, runs: rerun.accepted, handBack: handBack && !config.dryRun }
}

/** The body of the command on a red CI: the logs, the triager, the rerun, the cost, the reply. */
async function triageRed(ctx, { pull, sha, failed }) {
  const { config, env, gh, number, actor, runUrl, out, deps } = ctx
  const { errorsByJob, notes } = await log.group('Read the logs of the failed jobs', () => collectLogs(gh, failed))
  const signature = failureSignature(failed, errorsByJob)
  const report = buildReport({ pr: number, headSha: sha, failed, errorsByJob, notes, signature })
  fs.writeFileSync(path.join(out, 'ci-report.md'), report)
  log.info('ci report', { signature, characters: report.length, failed: failed.length })

  const refs = {
    base: `origin/${pull.base?.ref ?? 'develop'}`,
    head: env.AGENT_PR_HEAD_REF || `refs/remotes/pull/${number}/head`,
    mergeBase: null,
  }
  refs.mergeBase = (deps.mergeBase ?? gitMergeBase)(refs.base, refs.head)
  const inputFile = path.join(out, 'ci-check-input.md')
  await log.group('Build the triager input', async () => {
    const text = renderCheckInput({
      pull: { number, title: pull.title ?? '' },
      sha,
      refs,
      failed,
      signature,
      report,
      notes: String(ctx.command.notes ?? '').trim(),
      asker: actor,
    })
    fs.writeFileSync(inputFile, text)
    log.info('input written', { file: inputFile, characters: text.length })
  })

  const costs = []
  let triage = null
  let failure = null
  try {
    triage = await log.group('Run the triager', () =>
      callAgent({
        flow: 'ci-check',
        role: 'ci-triager',
        agent: 'ci-triager',
        model: config.models.triage,
        message: `Find the root cause of the red CI of pull request #${number}. Your input is the attached ` +
          'ci-check-input.md.',
        inputFile,
        out,
        costs,
        runUrl,
        schema: 'ciTriage',
        check: checkTriage,
        deps,
      }),
    )
  } catch (err) {
    failure = err
    log.error(`The triager failed: ${err.message}`)
  }

  if (failure) {
    // The cost first, also when the answer failed.
    const st = await log.group(config.dryRun ? 'Cost (dry run: not written)' : 'Record the cost', () =>
      recordOnPull(ctx, { costs, ciCheck: null }),
    )
    const checkUsd = sum(costs, 'usd')
    await reply(ctx, failedCheckReply({
      actor, message: failure.message, runUrl, checkUsd, totalUsd: sum(st.costs ?? [], 'usd'),
    }))
    throw failure
  }

  const verdict = effectiveVerdict(triage)
  const agent = await log.group("Check whether the pull request is the agent's", () => loadAgent(ctx, pull))
  log.info('decision', {
    stage: 'triage',
    verdict: triage.verdict,
    confidence: triage.confidence,
    effective: verdict,
    agent: agent ? 'yes' : 'no',
  })

  const action = await actOnVerdict(ctx, { triage, verdict, failed, agent })
  const { did, runs } = action
  const st = await log.group(config.dryRun ? 'Cost (dry run: not written)' : 'Record the cost', () => {
    const { verdict: said, confidence } = triage
    const ciCheck = { at: new Date().toISOString(), actor, sha, verdict: said, confidence, runs }
    return recordOnPull(ctx, { costs, ciCheck })
  })
  if (action.handBack) {
    await log.group('Hand the decision back to the CI gate', async () => {
      did.gate = await handBackToGate(ctx, { agent, sha, runs, jobs: did.jobs })
    })
  }
  const checkUsd = sum(costs, 'usd')
  const totalUsd = sum(st.costs ?? [], 'usd')
  log.info('cost', { thisCheck: usage.formatUsd(checkUsd), total: usage.formatUsd(totalUsd) })
  await reply(ctx, renderTriage({
    actor, pr: number, sha, triage, agent: agent !== null, did, runUrl, checkUsd, totalUsd,
  }))
  return { ok: did.kind !== 'rejected', outcome: 'triaged', verdict: triage.verdict, rerun: runs }
}

/** The body of the command: the checks of the head commit decide which of the replies follows. */
async function checkCi(ctx) {
  const { gh, number, actor } = ctx
  const pull = await log.group('Load the pull request', () => gh.getPull(number))
  const sha = pull.head.sha
  const { checkRuns, statuses } = await log.group('Collect the checks', async () => {
    const runs = relevantChecks(await gh.listCheckRuns(sha))
    const combined = await gh.getCombinedStatus(sha)
    log.info('checks', { sha, checkRuns: runs.length, statuses: combined.statuses.length })
    return { checkRuns: runs, statuses: combined.statuses }
  })
  const failed = failedChecks(checkRuns, statuses)
  const pending = pendingChecks(checkRuns, statuses)
  log.info('decision', {
    stage: 'ci state',
    failed: failed.map((f) => `${f.name}:${f.conclusion}`).join(', ') || 'none',
    pending: pending.map((p) => p.name).join(', ') || 'none',
  })

  if (checkRuns.length + statuses.length === 0) {
    return answerWithoutModel(ctx, { outcome: 'no-checks', text: noChecksReply({ actor, pr: number, sha }) })
  }
  if (pending.length > 0) {
    return answerWithoutModel(ctx, { outcome: 'pending', text: pendingReply({ actor, pr: number, sha, pending }) })
  }
  if (allGreen(checkRuns, statuses)) {
    return answerWithoutModel(ctx, { outcome: 'green', text: greenReply({ actor, pr: number, sha }) })
  }
  return triageRed(ctx, { pull, sha, failed })
}

/**
 * Runs `/agent ci_check`. `deps.gh` and `deps.runAgent` are injectable so that tests never touch the network or start
 * opencode; `deps.mergeBase` replaces the call of `git merge-base`.
 *
 * @returns {Promise<{ ok: boolean, outcome: 'no-checks'|'pending'|'green'|'triaged', verdict?: string,
 *   rerun?: number[] }>} `ok` is false for a rerun that GitHub rejected
 */
async function ciCheck(env = process.env, deps = {}) {
  const config = loadConfig(env)
  const number = Number(requireEnv(env, 'AGENT_NUMBER'))
  const issueNumber = Number(env.AGENT_ISSUE) > 0 ? Number(env.AGENT_ISSUE) : null
  const command = parseCommandEnv(env.AGENT_COMMAND)
  const actor = requireEnv(env, 'AGENT_ACTOR')
  const runUrl = requireEnv(env, 'AGENT_RUN_URL')
  const out = requireEnv(env, 'AGENT_OUT')
  fs.mkdirSync(out, { recursive: true })
  const gh = deps.gh ?? createClient({ token: env.GITHUB_TOKEN, repo: env.GITHUB_REPOSITORY })
  const commentId = commentIdOf(env.AGENT_COMMENT_ID)
  log.info('ci check starts', { pr: number, issue: issueNumber ?? 'none', actor, dryRun: config.dryRun })
  await react({ gh, commentId, content: 'eyes', dryRun: config.dryRun })

  const ctx = { config, env, gh, number, issueNumber, actor, command, runUrl, out, deps }
  let content = 'confused'
  try {
    const result = await checkCi(ctx)
    if (result.ok) content = 'rocket'
    return result
  } finally {
    await react({ gh, commentId, content, dryRun: config.dryRun })
  }
}

async function main(env = process.env, deps = {}) {
  return ciCheck(env, deps)
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
  ciCheck,
  checkTriage,
  effectiveVerdict,
  renderCheckInput,
  renderTriage,
  failedCheckReply,
  hintFor,
}
