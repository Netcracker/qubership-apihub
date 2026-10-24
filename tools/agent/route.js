#!/usr/bin/env node
/**
 * Router of the AI Autonomous agent: turns a GitHub event into one decision for the workflow.
 *
 * `decide` is pure. It looks at the event, the configuration, the permission of the person behind the event, and the
 * state of the pull request or issue, and returns
 * `{ action, number, reason, command?, trigger?, pr?, headSha?, kind? }`. The actions are `review` (phase 1), `analyze`
 * (phase 2), `implement` (phase 3; phase 5 adds `kind`: `human` or `review`), `ci-gate` (phase 4), `chat` (phase 5),
 * `stop` (a `/agent stop` command; the `stop` job has no concurrency group), `rerun` (a `/agent rerun` command: the
 * failed CI checks of the agent's pull request run again, no model), and `skip`. Later phases add actions by
 * registering more rules in EVENT_HANDLERS and COMMAND_HANDLERS; `decide` itself does not change.
 *
 * The CLI (`node tools/agent/route.js`) gathers the facts that need the GitHub API, but only when the event calls
 * for them: the permission of a commenter who wrote a command, the state comment of a pull request that became
 * ready for review, the state comment of an issue that may be waiting for information or for a person, the issue state
 * of a pull request of the agent that got a comment or a review, and, for a finished workflow run, the open pull
 * request of its branch with the state of the issue it names. It then writes `action`, `number`, `reason`, and
 * `command` (JSON, or empty) to `$GITHUB_OUTPUT`, plus `trigger` for an `analyze` decision, `pr` and `head_sha` for a
 * `ci-gate` decision, `pr` and `kind` for an `implement` decision that a person asked for, `pr` for a `rerun`
 * decision on a pull request, and one line to
 * `$GITHUB_STEP_SUMMARY`. It logs the event, the gathered facts,
 * and the decision.
 *
 * Environment: GITHUB_EVENT_NAME, GITHUB_EVENT_PATH, GITHUB_REPOSITORY, GITHUB_TOKEN, GITHUB_OUTPUT,
 * GITHUB_STEP_SUMMARY, and the AGENT_* variables of lib/config.js.
 */
'use strict'

const fs = require('node:fs')
const { loadConfig, isActorAllowed } = require('./lib/config')
const { parseCommand } = require('./lib/commands')
const { createClient, hasWriteAccess } = require('./lib/github')
const { findStateComment, parse: parseState, actorOf } = require('./lib/state')
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

/** `pull_request` events: review a new pull request that the agent should look at without being asked. */
function decidePullRequest({ payload, config, pullState }) {
  const pr = payload.pull_request
  if (!pr) throw new TypeError('A pull_request event must carry a pull_request payload')
  const number = pr.number

  if (payload.action !== 'opened' && payload.action !== 'ready_for_review') {
    return skip(number, `pull_request action '${payload.action}' is not handled`)
  }
  if (pr.draft) return skip(number, 'draft pull request')
  // A fork cannot be reviewed on its own: the job would run with the token of the base repository.
  if (!sameRepo(pr.head?.repo?.full_name, pr.base?.repo?.full_name)) {
    return skip(number, 'fork pull requests run only on /agent review')
  }
  const author = pr.user?.login
  if (isBot(author)) return skip(number, `pull request author '${author}' is a bot`)
  if (typeof pr.body === 'string' && pr.body.includes(AGENT_PR_MARKER)) {
    return skip(number, 'pull request was opened by the agent')
  }
  if (!isActorAllowed(config, author)) return skip(number, `author '${author}' is not in AGENT_ALLOWED_ACTORS`)
  if (payload.action === 'ready_for_review' && pullState?.reviews?.length > 0) {
    return skip(number, 'already reviewed; use /agent review')
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

/**
 * The analysis is read-only (it writes a label and comments), so it needs no write access. During the proof of
 * concept it still answers only the listed users: the issue author must pass `isActorAllowed`.
 */
function analyzeIssue({ number, author, config, issueState, trigger, reason }) {
  if (!isActorAllowed(config, author)) return skip(number, `author '${author}' is not in AGENT_ALLOWED_ACTORS`)
  return checkAnalysisLimit({ number, config, issueState, trigger }) ?? { action: 'analyze', number, reason, trigger }
}

/** `issues` events: analyze a new Bug or Task, or an issue whose author edited it after the agent asked questions. */
function decideIssues({ payload, config, issueState }) {
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
    return analyzeIssue({ number, author, config, issueState, trigger: 'edited', reason: 'author edited the issue' })
  }

  const wrongType = checkAnalyzedType(number, issue.type?.name)
  if (wrongType) return wrongType
  if (labelNames(issue).some((name) => DECISION_LABELS.includes(name))) {
    return skip(number, 'a person already set ai:suitable or ai:unsuitable')
  }
  return analyzeIssue({ number, author, config, issueState, trigger: action, reason: `issue ${action}` })
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
  const author = issue.user.login
  return analyzeIssue({
    number,
    author,
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
}

/**
 * @param {{ eventName: string, payload: object, config: object, actorPermission?: string,
 *   pullState?: object|null, issueState?: object|null, ciFacts?: object|null, agentFacts?: object|null }} input
 * @returns {{ action: string, number: number|null, reason: string, command?: object, trigger?: string,
 *   pr?: number, headSha?: string, kind?: string }}
 */
function decide(input) {
  const { eventName, payload, config } = input
  if (!config.enabled) return skip(numberOf(payload), 'AGENT_ENABLED is not true')
  const handler = EVENT_HANDLERS[eventName]
  if (!handler) return skip(numberOf(payload), `event '${eventName}' is not handled`)
  return handler({
    actorPermission: 'none', pullState: null, issueState: null, ciFacts: null, agentFacts: null, ...input,
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
const AGENT_PULL_COMMANDS = new Set(['retry', 'rerun', 'stop', 'chat'])

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
 * Resolves the inputs of `decide` that need the GitHub API. `getClient` is called only when a call is needed, so an
 * event that needs nothing works without a token.
 */
async function gather({ eventName, payload, config, getClient }) {
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
  return extra
}

/** Output values must stay on one line; GitHub reads `key=value` per line. */
const oneLine = (value) => String(value).replace(/[\r\n]+/g, ' ')

/**
 * The `key=value` lines for `$GITHUB_OUTPUT`. `command` is JSON on one line, or empty. `trigger` is written only for
 * a decision that has one, `pr` and `head_sha` for a `ci-gate` decision, and `kind` for an attempt that a person asked
 * for, so the outputs of the earlier actions stay as they were.
 */
function formatOutputs(decision) {
  return [
    `action=${decision.action}`,
    `number=${decision.number ?? ''}`,
    `reason=${oneLine(decision.reason)}`,
    `command=${decision.command ? JSON.stringify(decision.command) : ''}`,
    ...(decision.trigger ? [`trigger=${decision.trigger}`] : []),
    ...(decision.pr ? [`pr=${decision.pr}`] : []),
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

/** Reads the event, decides, and writes the outputs. Returns the decision. Throws on bad config or payload. */
async function main(env = process.env) {
  const eventName = requireVariable(env, 'GITHUB_EVENT_NAME')
  const payload = JSON.parse(fs.readFileSync(requireVariable(env, 'GITHUB_EVENT_PATH'), 'utf8'))
  const config = loadConfig(env)
  let client = null
  const getClient = () => {
    client ??= createClient({
      token: requireVariable(env, 'GITHUB_TOKEN'),
      repo: requireVariable(env, 'GITHUB_REPOSITORY'),
    })
    return client
  }
  log.info('event', {
    name: eventName,
    action: payload.action,
    number: numberOf(payload),
    sender: payload.sender?.login,
    enabled: config.enabled,
    dryRun: config.dryRun,
    allowedActors: config.allowedActors ? config.allowedActors.join(',') : 'everyone',
  })
  const extra = await log.group('Gather facts', () => gather({ eventName, payload, config, getClient }))
  const decision = decide({ eventName, payload, config, ...extra })
  log.info('decision', {
    action: decision.action,
    number: decision.number,
    reason: decision.reason,
    trigger: decision.trigger,
    kind: decision.kind,
    command: decision.command?.name,
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
  isHandOffAnswer,
  agentIssueOf,
  formatOutputs,
  formatSummary,
  main,
}
