#!/usr/bin/env node
/**
 * Router of the AI Autonomous agent: turns a GitHub event into one decision for the workflow.
 *
 * `decide` is pure. It looks at the event, the configuration, the permission of the person behind the event, the
 * state of the pull request or issue, and the count of automatic work in the last 24 hours, and returns
 * `{ action, number, reason, command?, trigger?, pr?, headSha?, kind?, numbers? }`. The actions are `review` (phase 1),
 * `analyze`
 * (phase 2), `implement` (phase 3; phase 5 adds `kind`: `human` or `review`), `ci-gate` (phase 4), `chat` (phase 5),
 * `stop` (a `/agent stop` command; the `stop` job has no concurrency group), `rerun` (a `/agent rerun` command: the
 * failed CI checks of the agent's pull request run again, no model), `ci-check` (a `/agent ci_check` command: the
 * root cause of a red CI on any pull request), and `skip`. Later phases add actions by
 * registering more rules in EVENT_HANDLERS and COMMAND_HANDLERS; `decide` itself does not change.
 *
 * The CLI (`node tools/agent/route.js`) gathers the facts that need the GitHub API, but only when the event calls
 * for them: the permission of a commenter who wrote a command, the state comment of a pull request that became
 * ready for review, the state comment of an issue that may be waiting for information or for a person, the issue state
 * of a pull request of the agent that got a comment or a review, and, for a finished workflow run, the open pull
 * request of its branch with the state of the issue it names. An event that may start an automatic analysis or review
 * also gets the count of such work in the last 24 hours (the daily caps), and the `schedule` event, the sweep, gets the
 * new issues past the grace period that no analysis has seen (the usage is counted only when there is one; in dry run
 * the sweep searches for nothing and the decision is a skip). It then writes `action`, `number`, `reason`, and
 * `command` (JSON, or empty) to `$GITHUB_OUTPUT`, plus `trigger` and `numbers` (a JSON array of the issues to analyze:
 * one for an event, up to five for the sweep) for an `analyze` decision, `pr` and `head_sha` for a
 * `ci-gate` decision, `pr` and `kind` for an `implement` decision that a person asked for, `pr` for a `rerun`
 * decision on a pull request, `issue` for a `ci-check` decision on a pull request of the agent, and one line to
 * `$GITHUB_STEP_SUMMARY`. It logs the event, the gathered facts,
 * and the decision.
 *
 * One command at a time: when a person's command would start a worker job (`review`, `analyze`, `implement`, `rerun`,
 * `ci-check`, or a `chat` question; also the answer to a hand-off and a change request in a review), the router looks
 * for an older run of this workflow that is still active on the same issue or pull request (the title of a run ends
 * with `#<number>`, see `run-name` in the workflow). When there is one, the decision becomes a `skip` with the reason
 * `busy: ...`, the router answers on the issue or pull request with one comment, and reacts with `confused`. `stop`,
 * `help`, `cost`, and the automatic events are never declined.
 *
 * Environment: GITHUB_EVENT_NAME, GITHUB_EVENT_PATH, GITHUB_REPOSITORY, GITHUB_TOKEN, GITHUB_RUN_ID (for a command
 * that starts a worker job), GITHUB_OUTPUT, GITHUB_STEP_SUMMARY, and the AGENT_* variables of lib/config.js.
 */
'use strict'

const fs = require('node:fs')
const { loadConfig, isActorAllowed } = require('./lib/config')
const daily = require('./lib/daily-usage')
const { parseCommand } = require('./lib/commands')
const { createClient, hasWriteAccess } = require('./lib/github')
const { findStateComment, parse: parseState, actorOf } = require('./lib/state')
const { react, commentIdOf } = require('./lib/reactions')
const log = require('./lib/log')

/** The agent writes this at the top of the body of every pull request it opens. */
const AGENT_PR_MARKER = '<!-- ai-autonomous-agent '
/** The whole marker with the issue the pull request implements. */
const AGENT_PR_ISSUE = /<!--\s*ai-autonomous-agent\s+issue=(\d+)\s*-->/

const isBot = (login) => typeof login === 'string' && /\[bot\]$/i.test(login)
/** Dependabot, as the login appears in an event (`dependabot[bot]`) or in some API responses (`dependabot`). */
const isDependabot = (login) => typeof login === 'string' && /^dependabot(\[bot\])?$/i.test(login)
const sameRepo = (a, b) => typeof a === 'string' && typeof b === 'string' && a.toLowerCase() === b.toLowerCase()

const sameLogin = (a, b) => typeof a === 'string' && typeof b === 'string' && a.toLowerCase() === b.toLowerCase()

const skip = (number, reason) => ({ action: 'skip', number, reason })

/** Days back the sweep looks for new issues; an older issue that no analysis saw is left alone. */
const SWEEP_LOOKBACK_DAYS = 7
/** The most issues one sweep run analyzes; the rest wait for the next run. */
const MAX_SWEEP = 5
/** The triggers of an analysis that nobody asked for, so the daily cap applies. */
const AUTOMATIC_TRIGGERS = new Set(['opened', 'typed'])

/** Issue types the analysis covers. */
const ANALYZED_TYPES = new Set(['Bug', 'Task'])
/** Labels a person sets to decide the question the analysis answers; the agent then leaves the issue alone. */
const DECISION_LABELS = ['ai:suitable', 'ai:unsuitable']

/** A skip decision when the analysis does not cover the issue type, else `null`. */
function checkAnalyzedType(number, typeName) {
  if (ANALYZED_TYPES.has(typeName)) return null
  return skip(number, `analysis covers Bug and Task issues, not '${typeName ?? 'no type'}'`)
}

const labelNames = (issue) => (issue.labels ?? []).map((label) => (typeof label === 'string' ? label : label?.name))

/** The number of the pull request or issue the event is about, or `null`. */
function numberOf(payload) {
  return payload?.pull_request?.number ?? payload?.issue?.number ?? payload?.workflow_run?.pull_requests?.[0]?.number ??
    null
}

/** The issue number from the marker in the body of a pull request the agent opened, or `null`. */
function agentIssueOf(body) {
  const match = AGENT_PR_ISSUE.exec(typeof body === 'string' ? body : '')
  return match ? Number(match[1]) : null
}

/**
 * The issue of an agent pull request, or `null`. The marker is text in a description that anyone can edit, so the state
 * of the issue it names must name this very pull request, as the CI gate demands.
 *
 * @param {{ issueNumber: number, issueState: object|null }|null|undefined} agentFacts
 * @returns {{ issueNumber: number, issueState: object }|null}
 */
function agentPullOf(agentFacts, pullNumber) {
  const st = agentFacts?.issueState
  if (!agentFacts || !st || st.pr !== pullNumber) return null
  return { issueNumber: agentFacts.issueNumber, issueState: st }
}

/** Why a command on a Dependabot pull request does nothing. */
const NO_DEPENDABOT = 'dependency update pull requests are not handled'

/** The longest comment or review text the router puts into a job output; the job env has a size limit. */
const MAX_NOTES = 8000
const clipNotes = (text) => (text.length > MAX_NOTES ? `${text.slice(0, MAX_NOTES)}\n[cut: the text is longer]` : text)

/** An `implement` decision for an attempt that a person asked for; `pr` is set when the person is on a pull request. */
const humanAttempt = ({ number, pr, kind = 'human', reason, command }) => ({
  action: 'implement',
  number,
  ...(pr ? { pr } : {}),
  kind,
  reason,
  command,
})

/** True when the run of the workflow was made from a branch of another repository, or of a deleted one. */
function isForkRun(run, repository) {
  const base = run?.repository?.full_name ?? repository?.full_name
  return !sameRepo(run?.head_repository?.full_name, base)
}

/**
 * Why a pull request is not reviewed automatically, or `null`. The author may be anyone, not only a listed actor:
 * the review writes a comment and a label, nothing else.
 */
function pullRequestSkipReason(pr) {
  if (pr.draft) return 'draft pull request'
  // A fork cannot be reviewed on its own: the job would run with the token of the base repository.
  if (!sameRepo(pr.head?.repo?.full_name, pr.base?.repo?.full_name)) {
    return 'fork pull requests run only on /agent review'
  }
  const author = pr.user?.login
  if (isBot(author)) return `pull request author '${author}' is a bot`
  if (typeof pr.body === 'string' && pr.body.includes(AGENT_PR_MARKER)) return 'pull request was opened by the agent'
  return null
}

/** `pull_request` events: review a new pull request that the agent should look at without being asked. */
function decidePullRequest({ payload, config, pullState, dailyUsage }) {
  const pr = payload.pull_request
  if (!pr) throw new TypeError('A pull_request event must carry a pull_request payload')
  const number = pr.number

  if (payload.action !== 'opened' && payload.action !== 'ready_for_review') {
    return skip(number, `pull_request action '${payload.action}' is not handled`)
  }
  const why = pullRequestSkipReason(pr)
  if (why) return skip(number, why)
  // A review skipped for the size of the diff is a review entry too: only `/agent review` asks again.
  if (payload.action === 'ready_for_review' && pullState?.reviews?.length > 0) {
    return skip(number, 'already reviewed; use /agent review')
  }
  const cap = config.limits.dailyReviews
  if ((dailyUsage?.reviews ?? 0) >= cap) {
    return skip(number, `daily limit of ${cap} automatic reviews reached; comment /agent review`)
  }
  return { action: 'review', number, reason: `pull request ${payload.action}` }
}

/**
 * Rules per command name. A rule gets `{ number, isPull, command }` and returns a decision. A command without a rule
 * is known to the parser but not implemented yet.
 */
const COMMAND_HANDLERS = {
  review: ({ number, isPull, command, issue }) => {
    // Fork pull requests are reviewed only on request: the person who asks has write access.
    if (!isPull) return skip(number, 'review works on pull requests')
    // Nothing to review in a dependency bump, and a review costs money, also when a person asks for it.
    if (isDependabot(issue?.user?.login)) return skip(number, 'dependency update pull requests are not reviewed')
    return { action: 'review', number, reason: '/agent review', command }
  },
  analyze: ({ number, isPull, command, issue }) => {
    if (isPull) return skip(number, 'analyze works on issues')
    const wrongType = checkAnalyzedType(number, issue?.type?.name)
    if (wrongType) return wrongType
    return { action: 'analyze', number, reason: '/agent analyze', trigger: 'command', command }
  },
  // The router does not look at the type, the labels, or the state of the issue: `implement.js preflight` does, and
  // it answers the person in a comment, because a refusal must be explained.
  implement: ({ number, isPull, command }) => {
    if (isPull) return skip(number, 'implement works on issues')
    const reason = command.force ? '/agent implement force' : '/agent implement'
    return { action: 'implement', number, reason, command }
  },
  // Phase 5: a person steers the agent. Retry and a change request start a new attempt (`kind: 'human'`); stop is the
  // `stop` job, which has no concurrency group so that it never queues; the rest is the `chat` job, which reads or
  // answers.
  retry: ({ number, isPull, command, issue, agentFacts }) => {
    if (!isPull) return humanAttempt({ number, reason: '/agent retry', command })
    if (isDependabot(issue?.user?.login)) return skip(number, NO_DEPENDABOT)
    const agent = agentPullOf(agentFacts, number)
    if (!agent) return skip(number, 'retry works on issues and on pull requests of the agent')
    return humanAttempt({ number: agent.issueNumber, pr: number, reason: '/agent retry', command })
  },
  // Rerun the failed checks of the pull request of the agent and let the CI gate decide; no attempt, no model.
  rerun: ({ number, isPull, command, issue, agentFacts }) => {
    if (!isPull) return { action: 'rerun', number, reason: '/agent rerun', command }
    if (isDependabot(issue?.user?.login)) return skip(number, NO_DEPENDABOT)
    const agent = agentPullOf(agentFacts, number)
    if (!agent) return skip(number, 'rerun works on an issue or a pull request of the agent')
    return { action: 'rerun', number: agent.issueNumber, pr: number, reason: '/agent rerun', command }
  },
  // Read the CI of the head commit of a pull request, find the root cause of a red result, and rerun a flaky one. It
  // works on any pull request, also a Dependabot one (a red dependency bump is what people ask it about); `issue` is
  // set when the pull request is the agent's, so the job can hand the decision back to the CI gate.
  'ci-check': ({ number, isPull, command, agentFacts }) => {
    if (!isPull) return skip(number, 'ci_check works on a pull request')
    const agent = agentPullOf(agentFacts, number)
    return {
      action: 'ci-check',
      number,
      ...(agent ? { issue: agent.issueNumber } : {}),
      reason: '/agent ci_check',
      command,
    }
  },
  stop: ({ number, isPull, command, issue, agentFacts }) => {
    if (isPull && isDependabot(issue?.user?.login)) return skip(number, NO_DEPENDABOT)
    if (isPull && !agentPullOf(agentFacts, number)) {
      return skip(number, 'stop works on issues and on pull requests of the agent')
    }
    return { action: 'stop', number, reason: '/agent stop', command }
  },
  cost: ({ number, isPull, command, issue }) => answerOnly({ number, isPull, command, issue, reason: '/agent cost' }),
  help: ({ number, isPull, command, issue }) => answerOnly({ number, isPull, command, issue, reason: '/agent help' }),
  // Free text: a question for the assistant, or, on a pull request of the agent, a change request.
  chat: ({ number, isPull, command, issue, agentFacts }) => {
    if (!isPull) return { action: 'chat', number, reason: '/agent <question>', command }
    if (isDependabot(issue?.user?.login)) return skip(number, NO_DEPENDABOT)
    const agent = agentPullOf(agentFacts, number)
    if (agent) {
      return humanAttempt({
        number: agent.issueNumber, pr: number, reason: 'change request on a pull request of the agent', command,
      })
    }
    return { action: 'chat', number, reason: '/agent <question>', command }
  },
}

/** A `chat` decision for a command that only reads: help and cost. A Dependabot pull request stays ignored. */
function answerOnly({ number, isPull, command, issue, reason }) {
  if (isPull && isDependabot(issue?.user?.login)) return skip(number, NO_DEPENDABOT)
  return { action: 'chat', number, reason, command }
}

/**
 * A new analysis is allowed while the issue has analyses left; a command from a person with write access bypasses
 * the limit. Returns a skip decision, or `null` when the analysis may run.
 */
function checkAnalysisLimit({ number, config, issueState, trigger }) {
  if (trigger === 'command') return null
  if ((issueState?.analyses?.length ?? 0) < config.limits.maxAnalyses) return null
  return skip(number, 'analysis limit reached; comment /agent analyze')
}

/** A skip decision when the automatic analyses of the last 24 hours reached the cap, else `null`. */
function checkDailyAnalyses({ number, config, dailyUsage }) {
  const cap = config.limits.dailyAnalyses
  if ((dailyUsage?.analyses ?? 0) < cap) return null
  return skip(number, `daily limit of ${cap} automatic analyses reached`)
}

/**
 * The analysis is read-only (it writes a label and comments), so it needs no write access, and it runs for the author
 * of any issue: AGENT_ALLOWED_ACTORS limits commands and implementation, not this. A new issue (`opened`, `typed`) also
 * counts toward the daily cap of automatic analyses; the sweep picks it up later.
 */
function analyzeIssue({ number, config, issueState, trigger, reason, dailyUsage }) {
  const limited = checkAnalysisLimit({ number, config, issueState, trigger })
  if (limited) return limited
  if (AUTOMATIC_TRIGGERS.has(trigger)) {
    const capped = checkDailyAnalyses({ number, config, dailyUsage })
    if (capped) return capped
  }
  return { action: 'analyze', number, reason, trigger }
}

/** `issues` events: analyze a new Bug or Task, or an issue whose author edited it after the agent asked questions. */
function decideIssues({ payload, config, issueState, dailyUsage }) {
  const issue = payload.issue
  if (!issue) throw new TypeError('An issues event must carry an issue payload')
  const number = issue.number
  const action = payload.action
  if (action !== 'opened' && action !== 'typed' && action !== 'edited') {
    return skip(number, `issues action '${action}' is not handled`)
  }
  const author = issue.user?.login
  if (issue.pull_request) return skip(number, 'a pull request is not an issue')
  if (isBot(author)) return skip(number, `issue author '${author}' is a bot`)

  if (action === 'edited') {
    // The type may have changed since the agent asked its questions.
    const wrongType = checkAnalyzedType(number, issue.type?.name)
    if (wrongType) return wrongType
    // An edit counts only as an answer: the author edits the issue while it waits for information.
    if (issueState?.phase !== 'needs-info') return skip(number, 'issue is not waiting for information')
    const editor = payload.sender?.login
    if (!sameLogin(editor, author)) return skip(number, `'${editor}' edited the issue, not its author`)
    return analyzeIssue({ number, config, issueState, trigger: 'edited', reason: 'author edited the issue' })
  }

  const wrongType = checkAnalyzedType(number, issue.type?.name)
  if (wrongType) return wrongType
  if (labelNames(issue).some((name) => DECISION_LABELS.includes(name))) {
    return skip(number, 'a person already set ai:suitable or ai:unsuitable')
  }
  // People keep editing a new issue for a while: the sweep analyzes it once the grace period is over.
  const grace = config.limits.analysisGraceMinutes
  if (grace > 0) return skip(number, `the sweep analyzes it after the grace period of ${grace} minutes`)
  return analyzeIssue({ number, config, issueState, trigger: action, reason: `issue ${action}`, dailyUsage })
}

/**
 * How many issues one sweep run may take: at most `MAX_SWEEP`, and not more than the daily cap of automatic analyses
 * leaves. Zero or less means none.
 */
function sweepBudget(config, dailyUsage) {
  return Math.min(MAX_SWEEP, config.limits.dailyAnalyses - (dailyUsage?.analyses ?? 0))
}

/**
 * `schedule` events: the sweep. `sweep.numbers` are the new Bug and Task issues past the grace period that no analysis
 * has seen, oldest first (the facts gathered for this event). In dry run the sweep does nothing: an analysis writes no
 * state, so the next run would pick the same issues again and the daily cap would never fill.
 */
function decideSchedule({ config, dailyUsage, sweep }) {
  if (config.dryRun) {
    return skip(
      null,
      'the sweep needs AGENT_DRY_RUN=false: a dry-run analysis writes no state, so the same issues would be ' +
        'analyzed again and again; use /agent analyze',
    )
  }
  if (sweepBudget(config, dailyUsage) <= 0) {
    return skip(null, `daily limit of ${config.limits.dailyAnalyses} automatic analyses reached`)
  }
  const numbers = (sweep?.numbers ?? []).slice(0, sweepBudget(config, dailyUsage))
  if (numbers.length === 0) return skip(null, 'no new issue is past the grace period')
  return {
    action: 'analyze',
    number: numbers[0],
    numbers,
    reason: `the grace period is over for ${numbers.length} new issue(s): ${numbers.map((n) => `#${n}`).join(', ')}`,
    trigger: 'sweep',
  }
}

/**
 * A person with write access answers the hand-off of the agent (the phase `needs-human`, the stop of an implementation;
 * not the `needs-info` of the analysis): the comment resumes the flow once, with or without `/agent`. Later comments
 * find the phase `implementing` and are skipped.
 */
function answerHandOff({ number, issueNumber, pr, commenter, comment, config, actorPermission }) {
  if (!isActorAllowed(config, commenter)) return skip(number, `commenter '${commenter}' is not in AGENT_ALLOWED_ACTORS`)
  if (!hasWriteAccess(actorPermission)) return skip(number, `commenter '${commenter}' has no write access`)
  const command = { name: 'answer', force: false, notes: clipNotes(String(comment.body ?? '').trim()) }
  const reason = `answer to the hand-off of the agent from ${commenter}`
  return humanAttempt({ number: issueNumber, pr, reason, command })
}

/**
 * A comment that is not a command. On an issue or a pull request of the agent that waits for a person, the comment of a
 * person with write access is the answer. On an issue that waits for information, the comment of its author is the
 * answer to the analysis. Everything else keeps the phase 1 outcome: not a command.
 */
function decideCommentWithoutCommand({ payload, config, actorPermission, issueState, agentFacts }) {
  const { issue, comment } = payload
  const number = issue.number
  const commenter = comment.user?.login
  if (issue.pull_request) {
    const agent = agentPullOf(agentFacts, number)
    if (!agent || agent.issueState.phase !== 'needs-human') return skip(number, 'not a command')
    return answerHandOff({
      number, issueNumber: agent.issueNumber, pr: number, commenter, comment, config, actorPermission,
    })
  }
  if (issueState?.phase === 'needs-human') {
    return answerHandOff({ number, issueNumber: number, pr: undefined, commenter, comment, config, actorPermission })
  }
  if (!sameLogin(commenter, issue.user?.login)) return skip(number, 'not a command')
  if (issueState?.phase !== 'needs-info') {
    return skip(number, 'not a command, and the issue is not waiting for information')
  }
  const wrongType = checkAnalyzedType(number, issue.type?.name)
  if (wrongType) return wrongType
  return analyzeIssue({
    number,
    config,
    issueState,
    trigger: 'author-reply',
    reason: 'author replied to the questions',
  })
}

/** `issue_comment` events: a person with write access gives the agent a command. */
function decideIssueComment({ payload, config, actorPermission, issueState, agentFacts }) {
  const { issue, comment } = payload
  if (!issue || !comment) throw new TypeError('An issue_comment event must carry issue and comment payloads')
  const number = issue.number

  if (payload.action !== 'created') return skip(number, `issue_comment action '${payload.action}' is not handled`)
  const commenter = comment.user?.login
  if (isBot(commenter)) return skip(number, `comment author '${commenter}' is a bot`)
  const command = parseCommand(comment.body)
  if (command === null) {
    return decideCommentWithoutCommand({ payload, config, actorPermission, issueState, agentFacts })
  }
  if (!isActorAllowed(config, commenter)) return skip(number, `commenter '${commenter}' is not in AGENT_ALLOWED_ACTORS`)
  if (!hasWriteAccess(actorPermission)) return skip(number, `commenter '${commenter}' has no write access`)

  const handler = COMMAND_HANDLERS[command.name]
  if (!handler) return skip(number, `/agent ${command.name} is not available yet`)
  return handler({ number, isPull: Boolean(issue.pull_request), command, issue, agentFacts })
}

/**
 * `workflow_run` events: a CI workflow finished on a branch. The gate acts only on the open pull request that the
 * agent made, that its issue's state names, and that waits for CI at this very commit.
 *
 * @param {{ payload: object, config: object, ciFacts?: { pull: object|null, issueState: object|null } }} input
 */
function decideWorkflowRun({ payload, config, ciFacts }) {
  const run = payload.workflow_run
  if (!run) throw new TypeError('A workflow_run event must carry a workflow_run payload')
  const pull = ciFacts?.pull ?? null
  const unknown = pull?.number ?? run.pull_requests?.[0]?.number ?? null

  if (payload.action !== 'completed') return skip(unknown, `workflow_run action '${payload.action}' is not handled`)
  if (isForkRun(run, payload.repository)) return skip(unknown, 'the workflow ran for a branch of a fork')
  if (!pull || pull.state !== 'open') return skip(unknown, `no open pull request for the branch '${run.head_branch}'`)
  const issueNumber = agentIssueOf(pull.body)
  if (issueNumber === null) return skip(pull.number, "the pull request is not the agent's: it has no marker")

  // The marker is text in a description that anyone can edit; the state is written by the workflow bot.
  const st = ciFacts.issueState
  if (!st) return skip(pull.number, `issue #${issueNumber} has no state comment`)
  if (st.pr !== pull.number) {
    return skip(pull.number, `the state of issue #${issueNumber} names pull request #${st.pr ?? 'none'}, not this one`)
  }
  if (st.phase !== 'waiting-ci') return skip(pull.number, `the issue is in the phase '${st.phase}', not 'waiting-ci'`)
  const headSha = pull.head?.sha
  if (run.head_sha !== headSha) return skip(pull.number, 'a newer commit is on the branch; its checks decide')
  const actor = actorOf(st)
  if (!actor) return skip(pull.number, 'the state records nobody who asked for the implementation')
  if (!isActorAllowed(config, actor)) return skip(pull.number, `'${actor}' is not in AGENT_ALLOWED_ACTORS`)
  return {
    action: 'ci-gate',
    number: issueNumber,
    pr: pull.number,
    headSha,
    reason: `${run.name ?? 'a workflow'} finished for pull request #${pull.number}`,
  }
}

/**
 * `pull_request_review` events: a person with write access asks for changes on a pull request of the agent. The agent
 * makes one attempt over the unresolved threads. A review of any other pull request changes nothing.
 */
function decidePullRequestReview({ payload, config, actorPermission, agentFacts }) {
  const pr = payload.pull_request
  const review = payload.review
  if (!pr || !review) throw new TypeError('A pull_request_review event must carry pull_request and review payloads')
  const number = pr.number
  if (payload.action !== 'submitted') {
    return skip(number, `pull_request_review action '${payload.action}' is not handled`)
  }
  if (String(review.state).toLowerCase() !== 'changes_requested') {
    return skip(number, `a review in the state '${review.state}' asks for no changes`)
  }
  const reviewer = review.user?.login
  if (isBot(reviewer)) return skip(number, `review author '${reviewer}' is a bot`)
  if (!sameRepo(pr.head?.repo?.full_name, pr.base?.repo?.full_name)) {
    return skip(number, 'the pull request is from a fork')
  }
  if (isDependabot(pr.user?.login)) return skip(number, NO_DEPENDABOT)
  const agent = agentPullOf(agentFacts, number)
  if (!agent) return skip(number, "the pull request is not the agent's, or its issue does not name it")
  if (!isActorAllowed(config, reviewer)) return skip(number, `reviewer '${reviewer}' is not in AGENT_ALLOWED_ACTORS`)
  if (!hasWriteAccess(actorPermission)) return skip(number, `reviewer '${reviewer}' has no write access`)
  const command = { name: 'review-changes', force: false, notes: clipNotes(String(review.body ?? '').trim()) }
  return humanAttempt({
    number: agent.issueNumber, pr: number, kind: 'review', reason: `${reviewer} asked for changes`, command,
  })
}

/** Rules per event name. */
const EVENT_HANDLERS = {
  pull_request: decidePullRequest,
  issue_comment: decideIssueComment,
  issues: decideIssues,
  workflow_run: decideWorkflowRun,
  pull_request_review: decidePullRequestReview,
  schedule: decideSchedule,
}

/**
 * @param {{ eventName: string, payload: object, config: object, actorPermission?: string,
 *   pullState?: object|null, issueState?: object|null, ciFacts?: object|null, agentFacts?: object|null,
 *   dailyUsage?: { analyses?: number, reviews?: number }|null, sweep?: { numbers: number[] }|null }} input
 * @returns {{ action: string, number: number|null, reason: string, command?: object, trigger?: string,
 *   pr?: number, headSha?: string, kind?: string, issue?: number, numbers?: number[] }}
 */
function decide(input) {
  const { eventName, payload, config } = input
  if (!config.enabled) return skip(numberOf(payload), 'AGENT_ENABLED is not true')
  const handler = EVENT_HANDLERS[eventName]
  if (!handler) return skip(numberOf(payload), `event '${eventName}' is not handled`)
  return handler({
    actorPermission: 'none',
    pullState: null,
    issueState: null,
    ciFacts: null,
    agentFacts: null,
    dailyUsage: null,
    sweep: null,
    ...input,
  })
}

/** The login of the person behind a comment or a review event. */
const personOf = (payload) => payload.comment?.user?.login ?? payload.review?.user?.login

/** True when a person asks for changes in a review: the state `changes_requested`, submitted by someone but a bot. */
function isChangeRequest(eventName, payload) {
  return eventName === 'pull_request_review' && payload?.action === 'submitted' &&
    String(payload.review?.state).toLowerCase() === 'changes_requested' && !isBot(payload.review?.user?.login)
}

/**
 * True when `decide` needs the permission of the person: a human wrote a command, or asked for changes in a review. The
 * permission of someone who answers a hand-off without a command is looked up later, once the state shows a hand-off.
 */
function needsActorPermission(eventName, payload) {
  if (isChangeRequest(eventName, payload)) return true
  if (eventName !== 'issue_comment' || payload?.action !== 'created') return false
  if (isBot(payload.comment?.user?.login)) return false
  return parseCommand(payload.comment?.body) !== null
}

/** True when `decide` needs the state comment: a pull request just left the draft state. */
function needsPullState(eventName, payload) {
  return eventName === 'pull_request' && payload?.action === 'ready_for_review'
}

/**
 * True when `decide` needs the state comment of an issue, to see whether it waits for information, waits for a person,
 * or has used its analyses. A new issue has no state, so `opened` needs none; an edit matters only from the author, and
 * a comment without a command from anyone, because a person answers the hand-off of the agent.
 */
function needsIssueState(eventName, payload) {
  const issue = payload?.issue
  if (!issue || issue.pull_request) return false
  const author = issue.user?.login
  if (isBot(author)) return false
  if (eventName === 'issues') {
    if (payload.action === 'edited') return sameLogin(payload.sender?.login, author)
    return payload.action === 'typed' && ANALYZED_TYPES.has(issue.type?.name)
  }
  if (eventName === 'issue_comment' && payload.action === 'created') {
    const commenter = payload.comment?.user?.login
    return !isBot(commenter) && parseCommand(payload.comment?.body) === null
  }
  return false
}

/** The commands that read the issue state of an agent pull request. */
const AGENT_PULL_COMMANDS = new Set(['retry', 'rerun', 'ci-check', 'stop', 'chat'])

/**
 * True when `decide` needs the issue that a pull request of the agent names, with its state: a change request in a
 * review, or a comment on a pull request that carries the marker and is a command that works on the agent's pull
 * requests, or no command (a possible answer to a hand-off).
 */
function needsAgentFacts(eventName, payload) {
  if (isChangeRequest(eventName, payload)) return agentIssueOf(payload.pull_request?.body) !== null
  const issue = payload?.issue
  if (eventName !== 'issue_comment' || payload?.action !== 'created' || !issue?.pull_request) return false
  if (isBot(payload.comment?.user?.login) || agentIssueOf(issue.body) === null) return false
  const command = parseCommand(payload.comment?.body)
  return command === null || AGENT_PULL_COMMANDS.has(command.name)
}

/** True when `decide` needs the pull request of the branch: a workflow finished in this repository. */
function needsCiFacts(eventName, payload) {
  return eventName === 'workflow_run' && payload?.action === 'completed' &&
    !isForkRun(payload.workflow_run, payload.repository)
}

/**
 * The open pull request of the branch of a finished workflow run and the state of the issue its marker names. The
 * state is read only for a pull request that carries the agent's marker.
 */
async function gatherCiFacts({ payload, getClient }) {
  const run = payload.workflow_run
  const gh = getClient()
  const listed = run.pull_requests?.[0]
  let pull = null
  if (listed) {
    pull = await gh.getPull(listed.number)
  } else {
    const owner = String(run.head_repository.full_name).split('/')[0]
    pull = (await gh.listPulls({ head: `${owner}:${run.head_branch}`, state: 'open' }))[0] ?? null
  }
  const issueNumber = pull && pull.state === 'open' ? agentIssueOf(pull.body) : null
  let issueState = null
  if (issueNumber !== null) {
    const stateComment = findStateComment(await gh.listIssueComments(issueNumber))
    issueState = stateComment ? parseState(stateComment.body) : null
  }
  log.info('pull request of the branch resolved', {
    branch: run.head_branch,
    pr: pull?.number ?? 'none',
    state: pull?.state,
    issue: issueNumber ?? 'none',
    phase: issueState?.phase,
    statePr: issueState?.pr,
  })
  return { pull, issueState }
}

/** The issue that the marker of a pull request of the agent names, with its state. */
async function gatherAgentFacts({ payload, getClient }) {
  const body = payload.pull_request?.body ?? payload.issue?.body
  const issueNumber = agentIssueOf(body)
  const stateComment = findStateComment(await getClient().listIssueComments(issueNumber))
  const issueState = stateComment ? parseState(stateComment.body) : null
  log.info('issue of the agent pull request resolved', {
    issue: issueNumber, phase: issueState?.phase, statePr: issueState?.pr ?? 'none',
  })
  return { issueNumber, issueState }
}

/**
 * True when a comment without a command lands on an issue or a pull request of the agent that waits for a person: the
 * only case in which `decide` needs the permission of someone who wrote no command.
 */
function isHandOffAnswer(eventName, payload, { issueState, agentFacts }) {
  const issue = payload?.issue
  if (eventName !== 'issue_comment' || payload?.action !== 'created' || !issue) return false
  if (isBot(payload.comment?.user?.login) || parseCommand(payload.comment?.body) !== null) return false
  if (issue.pull_request) {
    const agent = agentPullOf(agentFacts, issue.number)
    return agent !== null && agent.issueState.phase === 'needs-human'
  }
  return issueState?.phase === 'needs-human'
}

/**
 * Which daily count `decide` needs, `'analyses'` or `'reviews'`, or `null`. Only an event that would start an
 * automatic analysis or review needs one, so no other event spends the searches. `extra` holds the facts gathered so
 * far (the state of a pull request that left the draft).
 */
function dailyCountNeeded(eventName, payload, config, extra) {
  // The sweep counts for itself, and only when it found a candidate (see `gatherSweep`).
  if (eventName === 'schedule') return null
  if (eventName === 'pull_request') {
    const pr = payload?.pull_request
    if (!pr || (payload.action !== 'opened' && payload.action !== 'ready_for_review')) return null
    if (pullRequestSkipReason(pr) !== null) return null
    if (payload.action === 'ready_for_review' && extra.pullState?.reviews?.length > 0) return null
    return 'reviews'
  }
  const issue = payload?.issue
  // With a grace period above 0 the event is skipped, and the sweep counts for itself.
  if (eventName !== 'issues' || !issue || config.limits.analysisGraceMinutes > 0) return null
  if (payload.action !== 'opened' && payload.action !== 'typed') return null
  if (issue.pull_request || isBot(issue.user?.login) || !ANALYZED_TYPES.has(issue.type?.name)) return null
  if (labelNames(issue).some((name) => DECISION_LABELS.includes(name))) return null
  return 'analyses'
}

/**
 * The automatic analyses or reviews of the last 24 hours, counted from the state comments of the issues or pull
 * requests that were updated in that time and carry a label the agent leaves behind: `agent:pr-reviewed` for a review,
 * `ai:suitable`, `ai:unsuitable`, or `agent:needs-human` for an analysis (a comma list is an OR in a search). A failed
 * review sets no label, so it is found only on a pull request that an earlier review labeled; the count may miss the
 * others. The newest come first (`sort:updated-desc`). At most `MAX_STATES_READ` of them are read; the log says when
 * that cap cuts the list.
 *
 * @returns {Promise<number>}
 */
async function countDaily({ kind, repository, now, getClient }) {
  const gh = getClient()
  const since = daily.windowStart(now)
  const scope = kind === 'analyses'
    ? 'is:issue label:"ai:suitable","ai:unsuitable","agent:needs-human"'
    : 'is:pr label:"agent:pr-reviewed"'
  const found = await gh.searchIssues(
    `repo:${repository} ${scope} updated:>=${daily.toSearchTime(since)} sort:updated-desc`,
  )
  const read = found.slice(0, daily.MAX_STATES_READ)
  if (found.length > read.length) {
    log.warn(`${found.length} ${kind === 'analyses' ? 'issues' : 'pull requests'} were updated in the last 24 hours; ` +
      `only ${read.length} state comments are read, so the count may be too low`)
  }
  const states = []
  for (const item of read) {
    const stateComment = findStateComment(await gh.listIssueComments(item.number))
    if (!stateComment) continue
    try {
      const parsed = parseState(stateComment.body)
      if (parsed) states.push(parsed)
    } catch (error) {
      log.warn(`The state comment of #${item.number} is unreadable and not counted: ${error.message}`)
    }
  }
  const count = kind === 'analyses' ? daily.countAnalyses(states, since) : daily.countReviews(states, since)
  log.info('daily count', { kind, count, searched: found.length, read: read.length, since: daily.toSearchTime(since) })
  return count
}

/**
 * The new Bug and Task issues past the grace period that no analysis has seen: created between `SWEEP_LOOKBACK_DAYS`
 * ago and the grace period ago, without a decision label, opened by a person, and without an entry in the `analyses` of
 * their state comment. Oldest first, at most the budget that the daily cap leaves.
 *
 * The candidates are searched first and the daily usage is counted only when there is at least one, so a sweep with
 * nothing to do spends no state reads. A state comment that cannot be read leaves that candidate out.
 *
 * @returns {Promise<{ numbers: number[], found: number, left: number, dailyUsage?: { analyses: number } }>} `left`
 *   counts the candidates not looked at; `dailyUsage` is set when the usage was counted
 */
async function gatherSweep({ config, repository, now, getClient }) {
  const gh = getClient()
  const day = 24 * 60 * 60 * 1000
  const to = daily.toSearchTime(new Date(now.getTime() - config.limits.analysisGraceMinutes * 60 * 1000))
  const from = daily.toSearchTime(new Date(now.getTime() - SWEEP_LOOKBACK_DAYS * day))
  const found = new Map()
  for (const type of ['Bug', 'Task']) {
    const query = `repo:${repository} is:issue is:open type:${type} -label:"ai:suitable" -label:"ai:unsuitable" ` +
      `created:${from}..${to}`
    for (const item of await gh.searchIssues(query)) found.set(item.number, item)
  }
  const candidates = [...found.values()]
    .filter((item) => !item.pull_request && !isBot(item.user?.login))
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)) || a.number - b.number)
  if (candidates.length === 0) {
    log.info('sweep candidates', { from, to, candidates: 0, picked: 'none', left: 0 })
    return { numbers: [], found: 0, left: 0 }
  }
  const dailyUsage = { analyses: await countDaily({ kind: 'analyses', repository, now, getClient }) }
  const budget = sweepBudget(config, dailyUsage)
  const numbers = []
  let looked = 0
  for (const item of candidates) {
    if (numbers.length >= budget) break
    looked += 1
    const stateComment = findStateComment(await gh.listIssueComments(item.number))
    let st = null
    try {
      st = stateComment ? parseState(stateComment.body) : null
    } catch (error) {
      log.warn(`The state comment of #${item.number} is unreadable and the issue is left out of the sweep: ${error.message}`)
      continue
    }
    if ((st?.analyses?.length ?? 0) > 0) continue
    numbers.push(item.number)
  }
  const left = candidates.length - looked
  log.info('sweep candidates', { from, to, candidates: candidates.length, picked: numbers.join(',') || 'none', left, budget })
  return { numbers, found: candidates.length, left, dailyUsage }
}

/**
 * Resolves the inputs of `decide` that need the GitHub API. `getClient` is called only when a call is needed, so an
 * event that needs nothing works without a token. `repository` (`owner/name`) and `now` are for the searches of the
 * daily caps and of the sweep; `now` is injectable so that a test fixes the clock.
 */
async function gather({ eventName, payload, config, getClient, repository, now = new Date() }) {
  const extra = { actorPermission: 'none', pullState: null }
  if (!config.enabled) return extra
  if (needsActorPermission(eventName, payload)) {
    const login = personOf(payload)
    extra.actorPermission = await getClient().getPermission(login)
    log.info('permission resolved', { login, permission: extra.actorPermission })
  }
  if (needsPullState(eventName, payload)) {
    const comments = await getClient().listIssueComments(payload.pull_request.number)
    const stateComment = findStateComment(comments)
    extra.pullState = stateComment ? parseState(stateComment.body) : null
    log.info('pull request state resolved', { found: stateComment !== null, reviews: extra.pullState?.reviews?.length })
  }
  // Set only when resolved, so an event that needs no issue state keeps the shape of phase 1.
  if (needsIssueState(eventName, payload)) {
    const comments = await getClient().listIssueComments(payload.issue.number)
    const stateComment = findStateComment(comments)
    extra.issueState = stateComment ? parseState(stateComment.body) : null
    log.info('issue state resolved', {
      found: stateComment !== null,
      phase: extra.issueState?.phase,
      analyses: extra.issueState?.analyses?.length,
    })
  }
  if (needsAgentFacts(eventName, payload)) {
    extra.agentFacts = await gatherAgentFacts({ payload, getClient })
  }
  if (needsCiFacts(eventName, payload)) extra.ciFacts = await gatherCiFacts({ payload, getClient })
  if (extra.actorPermission === 'none' && isHandOffAnswer(eventName, payload, extra)) {
    const login = personOf(payload)
    extra.actorPermission = await getClient().getPermission(login)
    log.info('permission resolved', { login, permission: extra.actorPermission })
  }
  const kind = dailyCountNeeded(eventName, payload, config, extra)
  if (kind !== null) {
    if (!repository) throw new Error('GITHUB_REPOSITORY is not set')
    extra.dailyUsage = { [kind]: await countDaily({ kind, repository, now, getClient }) }
  }
  // In dry run the decision is a skip, so the sweep searches for nothing.
  if (eventName === 'schedule' && !config.dryRun) {
    if (!repository) throw new Error('GITHUB_REPOSITORY is not set')
    const { dailyUsage, ...sweep } = await gatherSweep({ config, repository, now, getClient })
    extra.sweep = sweep
    if (dailyUsage) extra.dailyUsage = dailyUsage
  }
  return extra
}

/** The workflow file whose runs the busy check lists. */
const WORKFLOW_FILE = 'ai-autonomous-agent.yml'
/** How far back the busy check looks for runs; an older run is long dead or stuck, not working. */
const BUSY_WINDOW_MS = 6 * 60 * 60 * 1000
/** The statuses of a run that has not finished. */
const ACTIVE_RUN_STATUSES = new Set(['queued', 'in_progress', 'waiting', 'pending', 'requested'])
/** The actions that start a worker job and can be declined. `stop`, `ci-gate`, and `skip` never are. */
const WORKER_ACTIONS = new Set(['review', 'analyze', 'implement', 'rerun', 'ci-check', 'chat'])

/**
 * True for a decision about a command of a person that starts a worker job: a comment with a parsed command, the
 * answer to a hand-off, or a change request in a review. `chat` counts only for a question; `help` and `cost` are
 * answered at once. The automatic events carry no command.
 */
function isWorkerCommand(eventName, decision) {
  if (eventName !== 'issue_comment' && eventName !== 'pull_request_review') return false
  if (!decision.command || !WORKER_ACTIONS.has(decision.action)) return false
  return decision.action !== 'chat' || decision.command.name === 'chat'
}

/**
 * The issue and pull request numbers that one piece of work covers: where the command was written, the number of the
 * decision, and the pull request or issue it is linked to when the router knows it. `linked` holds numbers found by
 * other means (the pull request that the state of an issue names).
 *
 * @returns {Set<number>}
 */
function workNumbers(decision, payload, linked = []) {
  const all = [numberOf(payload), decision.number, decision.pr, decision.issue, ...linked]
  return new Set(all.map(Number).filter((n) => Number.isSafeInteger(n) && n > 0))
}

/** The number a run works on: the `#<number>` that ends its title (`run-name`), or `null`. */
function runNumberOf(run) {
  const match = /#(\d+)$/.exec(String(run?.display_title ?? '').trim())
  return match ? Number(match[1]) : null
}

/**
 * The oldest run that is still active, was created inside the window, works on one of `numbers`, and is older than
 * this run (a smaller id). A newer run is ignored: it declines itself, so the first comment wins. This run is ignored.
 *
 * @returns {{ run: object, number: number }|null}
 */
function findBusyRun(runs, { numbers, ownRunId, now }) {
  const since = now.getTime() - BUSY_WINDOW_MS
  const busy = []
  for (const run of runs) {
    const id = Number(run.id)
    if (!ACTIVE_RUN_STATUSES.has(run.status) || !Number.isFinite(id) || id >= ownRunId) continue
    if (!(Date.parse(run.created_at) >= since)) continue
    const number = runNumberOf(run)
    if (number !== null && numbers.has(number)) busy.push({ run, number })
  }
  return busy.sort((a, b) => a.run.id - b.run.id)[0] ?? null
}

/** What the agent did not do, as the end of "so I did not ...". */
function declinedAction(command) {
  if (command.name === 'ci-check') return 'start `/agent ci_check`'
  if (command.name === 'chat') return 'answer your question'
  if (command.name === 'answer') return 'act on your answer'
  if (command.name === 'review-changes') return 'act on your change request'
  return `start \`/agent ${command.name}\``
}

/** The comment of the router that declines a command because a run already works on the issue or pull request. */
function declineComment({ actor, number, runId, runUrl, command }) {
  return `@${actor}, I am already working on #${number} ([run ${runId}](${runUrl})), so I did not ` +
    `${declinedAction(command)}. Comment it again when that run ends.`
}

/**
 * The pull request that the state comment of the issue names, for a command written on an issue, else `[]`. A run on
 * that pull request (titled with its number) is work on the issue too. The read is guarded: an unreadable state or a
 * failed call leaves the issue alone, as if it had no pull request, and the log says so.
 *
 * @returns {Promise<number[]>}
 */
async function linkedPullOf({ eventName, payload, gh }) {
  const issue = payload?.issue
  if (eventName !== 'issue_comment' || !issue || issue.pull_request) return []
  try {
    const stateComment = findStateComment(await gh.listIssueComments(issue.number))
    const pr = Number((stateComment ? parseState(stateComment.body) : null)?.pr)
    log.info('pull request of the issue state', { issue: issue.number, pr: pr > 0 ? pr : 'none' })
    return pr > 0 ? [pr] : []
  } catch (error) {
    log.warn(`The state of #${issue.number} could not be read, so its pull request is not checked: ${error.message}`)
    return []
  }
}

/**
 * One command at a time per issue or pull request. Returns `decision` unchanged, or a `skip` when an older run of the
 * workflow still works on the same piece of work (for a command on an issue, also on the pull request that the state of
 * the issue names); then it comments where the command was written and reacts with
 * `confused` (in dry run it only says in the job summary what it would post). A failed listing or comment throws, so
 * the job fails and no worker starts: a command is never run on a guess.
 *
 * @param {{ eventName: string, payload: object, decision: object, config: object, env: object,
 *   getClient: Function, now: Date }} input
 */
async function declineIfBusy({ eventName, payload, decision, config, env, getClient, now }) {
  if (!isWorkerCommand(eventName, decision)) return decision
  const ownRunId = Number(requireVariable(env, 'GITHUB_RUN_ID'))
  const gh = getClient()
  const numbers = workNumbers(decision, payload, await linkedPullOf({ eventName, payload, gh }))
  const created = `>=${daily.toSearchTime(new Date(now.getTime() - BUSY_WINDOW_MS))}`
  const runs = await gh.listWorkflowRuns(WORKFLOW_FILE, { created })
  const busy = findBusyRun(runs, { numbers, ownRunId, now })
  log.info('busy check', {
    numbers: [...numbers].join(','),
    runs: runs.length,
    own: ownRunId,
    busy: busy ? `${busy.run.id} on #${busy.number}` : 'none',
  })
  if (!busy) return decision

  const reason = `busy: run ${busy.run.id} works on #${busy.number}`
  const actor = payload.comment?.user?.login ?? payload.review?.user?.login
  const target = numberOf(payload)
  const runUrl = busy.run.html_url ?? `https://github.com/${env.GITHUB_REPOSITORY}/actions/runs/${busy.run.id}`
  const text = declineComment({ actor, number: busy.number, runId: busy.run.id, runUrl, command: decision.command })
  if (config.dryRun) {
    if (env.GITHUB_STEP_SUMMARY) {
      const quote = text.split('\n').map((line) => `> ${line}`).join('\n')
      fs.appendFileSync(
        env.GITHUB_STEP_SUMMARY,
        `## Dry run: decline on #${target}\n\nWould post this comment and react with confused:\n\n${quote}\n\n`,
      )
    }
    log.info('dry run: the decline is in the job summary', { on: `#${target}` })
  } else {
    await gh.createIssueComment(target, text)
    log.info('decline posted', { mention: actor, on: `#${target}`, run: busy.run.id })
  }
  // A review has no comment to react to.
  await react({ gh, commentId: commentIdOf(payload.comment?.id), content: 'confused', dryRun: config.dryRun })
  return skip(decision.number, reason)
}

/** Output values must stay on one line; GitHub reads `key=value` per line. */
const oneLine = (value) => String(value).replace(/[\r\n]+/g, ' ')

/**
 * The `key=value` lines for `$GITHUB_OUTPUT`. `command` is JSON on one line, or empty. `trigger` is written only for
 * a decision that has one, `numbers` for every `analyze` decision, `pr` and `head_sha` for a `ci-gate` decision, `issue` for a `ci-check` decision on a pull
 * request of the agent, and `kind` for an attempt that a person asked for, so the outputs of the earlier actions stay
 * as they were.
 */
function formatOutputs(decision) {
  return [
    `action=${decision.action}`,
    `number=${decision.number ?? ''}`,
    `reason=${oneLine(decision.reason)}`,
    `command=${decision.command ? JSON.stringify(decision.command) : ''}`,
    ...(decision.trigger ? [`trigger=${decision.trigger}`] : []),
    // The job that analyzes runs once per number, so it always gets a list.
    ...(decision.action === 'analyze' ? [`numbers=${JSON.stringify(decision.numbers ?? [decision.number])}`] : []),
    ...(decision.pr ? [`pr=${decision.pr}`] : []),
    ...(decision.issue ? [`issue=${decision.issue}`] : []),
    ...(decision.headSha ? [`head_sha=${decision.headSha}`] : []),
    ...(decision.kind ? [`kind=${decision.kind}`] : []),
    '',
  ].join('\n')
}

/** One Markdown line for the job summary. */
function formatSummary(decision) {
  const target = decision.number === null ? '' : ` for #${decision.number}`
  return `- AI Autonomous agent chose \`${decision.action}\`${target}: ${oneLine(decision.reason)}\n`
}

function requireVariable(env, name) {
  if (!env[name]) throw new Error(`${name} is not set`)
  return env[name]
}

/**
 * Reads the event, decides, and writes the outputs. Returns the decision. Throws on bad config or payload.
 * `deps.getClient` and `deps.now` are injectable so that a test uses no network and fixes the clock.
 */
async function main(env = process.env, deps = {}) {
  const eventName = requireVariable(env, 'GITHUB_EVENT_NAME')
  const payload = JSON.parse(fs.readFileSync(requireVariable(env, 'GITHUB_EVENT_PATH'), 'utf8'))
  const config = loadConfig(env)
  let client = null
  const getClient = deps.getClient ?? (() => {
    client ??= createClient({
      token: requireVariable(env, 'GITHUB_TOKEN'),
      repo: requireVariable(env, 'GITHUB_REPOSITORY'),
    })
    return client
  })
  log.info('event', {
    name: eventName,
    action: payload.action,
    number: numberOf(payload),
    sender: payload.sender?.login,
    enabled: config.enabled,
    dryRun: config.dryRun,
    allowedActors: config.allowedActors ? config.allowedActors.join(',') : 'everyone',
  })
  const now = deps.now ?? new Date()
  const extra = await log.group('Gather facts', () =>
    gather({ eventName, payload, config, getClient, repository: env.GITHUB_REPOSITORY, now }))
  const decided = decide({ eventName, payload, config, ...extra })
  const decision = await log.group('Check for a busy run', () =>
    declineIfBusy({ eventName, payload, decision: decided, config, env, getClient, now }))
  log.info('decision', {
    action: decision.action,
    number: decision.number,
    reason: decision.reason,
    trigger: decision.trigger,
    kind: decision.kind,
    command: decision.command?.name,
    numbers: decision.numbers?.join(','),
    // The daily caps count only automatic work; they are shown when this event needed a count.
    dailyAnalyses: extra.dailyUsage?.analyses === undefined
      ? undefined
      : `${extra.dailyUsage.analyses}/${config.limits.dailyAnalyses}`,
    dailyReviews: extra.dailyUsage?.reviews === undefined
      ? undefined
      : `${extra.dailyUsage.reviews}/${config.limits.dailyReviews}`,
  })

  if (env.GITHUB_OUTPUT) fs.appendFileSync(env.GITHUB_OUTPUT, formatOutputs(decision))
  else process.stdout.write(formatOutputs(decision))
  if (env.GITHUB_STEP_SUMMARY) fs.appendFileSync(env.GITHUB_STEP_SUMMARY, formatSummary(decision))
  return decision
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}

module.exports = {
  decide,
  gather,
  needsActorPermission,
  needsPullState,
  needsIssueState,
  needsAgentFacts,
  needsCiFacts,
  dailyCountNeeded,
  countDaily,
  gatherSweep,
  sweepBudget,
  SWEEP_LOOKBACK_DAYS,
  MAX_SWEEP,
  isHandOffAnswer,
  agentIssueOf,
  formatOutputs,
  formatSummary,
  main,
  declineIfBusy,
  isWorkerCommand,
  workNumbers,
  findBusyRun,
  WORKFLOW_FILE,
  BUSY_WINDOW_MS,
}
