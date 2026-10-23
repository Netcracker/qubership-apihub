#!/usr/bin/env node
/**
 * Router of the AI Autonomous agent: turns a GitHub event into one decision for the workflow.
 *
 * `decide` is pure. It looks at the event, the configuration, the permission of the person behind the event, and the
 * state of the pull request or issue, and returns `{ action, number, reason, command?, trigger? }`. The actions are
 * `review` (phase 1), `analyze` (phase 2), and `skip`. Later phases add actions by registering more rules in
 * EVENT_HANDLERS and COMMAND_HANDLERS; `decide` itself does not change.
 *
 * The CLI (`node tools/agent/route.js`) gathers the facts that need the GitHub API, but only when the event calls
 * for them: the permission of a commenter who wrote a command, the state comment of a pull request that became
 * ready for review, and the state comment of an issue that may be waiting for information. It then writes `action`,
 * `number`, `reason`, and `command` (JSON, or empty) to `$GITHUB_OUTPUT`, plus `trigger` for an `analyze` decision,
 * and one line to `$GITHUB_STEP_SUMMARY`. It logs the event, the gathered facts, and the decision.
 *
 * Environment: GITHUB_EVENT_NAME, GITHUB_EVENT_PATH, GITHUB_REPOSITORY, GITHUB_TOKEN, GITHUB_OUTPUT,
 * GITHUB_STEP_SUMMARY, and the AGENT_* variables of lib/config.js.
 */
'use strict'

const fs = require('node:fs')
const { loadConfig, isActorAllowed } = require('./lib/config')
const { parseCommand } = require('./lib/commands')
const { createClient, hasWriteAccess } = require('./lib/github')
const { findStateComment, parse: parseState } = require('./lib/state')
const log = require('./lib/log')

/** The agent writes this at the top of the body of every pull request it opens. */
const AGENT_PR_MARKER = '<!-- ai-autonomous-agent '

const isBot = (login) => typeof login === 'string' && /\[bot\]$/i.test(login)
const sameRepo = (a, b) => typeof a === 'string' && typeof b === 'string' && a.toLowerCase() === b.toLowerCase()

const sameLogin = (a, b) => typeof a === 'string' && typeof b === 'string' && a.toLowerCase() === b.toLowerCase()

const skip = (number, reason) => ({ action: 'skip', number, reason })

/** Issue types the analysis covers. */
const ANALYZED_TYPES = new Set(['Bug', 'Task'])
/** Labels a person sets to decide the question the analysis answers; the agent then leaves the issue alone. */
const DECISION_LABELS = ['ai:suitable', 'ai:unsuitable']

const labelNames = (issue) => (issue.labels ?? []).map((label) => (typeof label === 'string' ? label : label?.name))

/** The number of the pull request or issue the event is about, or `null`. */
function numberOf(payload) {
  return payload?.pull_request?.number ?? payload?.issue?.number ?? null
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
  review: ({ number, isPull, command }) => {
    // Fork pull requests are reviewed only on request: the person who asks has write access.
    if (!isPull) return skip(number, 'review works on pull requests')
    return { action: 'review', number, reason: '/agent review', command }
  },
  analyze: ({ number, isPull, command }) => {
    if (isPull) return skip(number, 'analyze works on issues')
    return { action: 'analyze', number, reason: '/agent analyze', trigger: 'command', command }
  },
  // PHASE 3+: implement, retry, stop, cost, help, and chat get their rules here.
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
    // An edit counts only as an answer: the author edits the issue while it waits for information.
    if (issueState?.phase !== 'needs-info') return skip(number, 'issue is not waiting for information')
    const editor = payload.sender?.login
    if (!sameLogin(editor, author)) return skip(number, `'${editor}' edited the issue, not its author`)
    return analyzeIssue({ number, author, config, issueState, trigger: 'edited', reason: 'author edited the issue' })
  }

  const typeName = issue.type?.name
  if (!ANALYZED_TYPES.has(typeName)) {
    return skip(number, `analysis covers Bug and Task issues, not '${typeName ?? 'no type'}'`)
  }
  if (labelNames(issue).some((name) => DECISION_LABELS.includes(name))) {
    return skip(number, 'a person already set ai:suitable or ai:unsuitable')
  }
  return analyzeIssue({ number, author, config, issueState, trigger: action, reason: `issue ${action}` })
}

/**
 * A comment that is not a command. On an issue that waits for information, the comment of its author is the answer.
 * Everything else keeps the phase 1 outcome: not a command.
 */
function decideCommentWithoutCommand({ payload, config, issueState }) {
  const { issue, comment } = payload
  const number = issue.number
  if (issue.pull_request || !sameLogin(comment.user?.login, issue.user?.login)) return skip(number, 'not a command')
  if (issueState?.phase !== 'needs-info') {
    return skip(number, 'not a command, and the issue is not waiting for information')
  }
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
function decideIssueComment({ payload, config, actorPermission, issueState }) {
  const { issue, comment } = payload
  if (!issue || !comment) throw new TypeError('An issue_comment event must carry issue and comment payloads')
  const number = issue.number

  if (payload.action !== 'created') return skip(number, `issue_comment action '${payload.action}' is not handled`)
  const commenter = comment.user?.login
  if (isBot(commenter)) return skip(number, `comment author '${commenter}' is a bot`)
  const command = parseCommand(comment.body)
  if (command === null) return decideCommentWithoutCommand({ payload, config, issueState })
  if (!isActorAllowed(config, commenter)) return skip(number, `commenter '${commenter}' is not in AGENT_ALLOWED_ACTORS`)
  if (!hasWriteAccess(actorPermission)) return skip(number, `commenter '${commenter}' has no write access`)

  const handler = COMMAND_HANDLERS[command.name]
  if (!handler) return skip(number, `/agent ${command.name} is not available yet`)
  return handler({ number, isPull: Boolean(issue.pull_request), command })
}

/** Rules per event name. Later phases add `workflow_run` here. */
const EVENT_HANDLERS = {
  pull_request: decidePullRequest,
  issue_comment: decideIssueComment,
  issues: decideIssues,
}

/**
 * @param {{ eventName: string, payload: object, config: object, actorPermission?: string,
 *   pullState?: object|null, issueState?: object|null }} input
 * @returns {{ action: string, number: number|null, reason: string, command?: object, trigger?: string }}
 */
function decide(input) {
  const { eventName, payload, config } = input
  if (!config.enabled) return skip(numberOf(payload), 'AGENT_ENABLED is not true')
  const handler = EVENT_HANDLERS[eventName]
  if (!handler) return skip(numberOf(payload), `event '${eventName}' is not handled`)
  return handler({ actorPermission: 'none', pullState: null, issueState: null, ...input })
}

/** True when `decide` needs the permission of the commenter: a human wrote a command. */
function needsActorPermission(eventName, payload) {
  if (eventName !== 'issue_comment' || payload?.action !== 'created') return false
  if (isBot(payload.comment?.user?.login)) return false
  return parseCommand(payload.comment?.body) !== null
}

/** True when `decide` needs the state comment: a pull request just left the draft state. */
function needsPullState(eventName, payload) {
  return eventName === 'pull_request' && payload?.action === 'ready_for_review'
}

/**
 * True when `decide` needs the state comment of an issue, to see whether it waits for information or has used its
 * analyses. A new issue has no state, so `opened` needs none; an edit or a comment matters only from the author.
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
    return !isBot(commenter) && parseCommand(payload.comment?.body) === null && sameLogin(commenter, author)
  }
  return false
}

/**
 * Resolves the inputs of `decide` that need the GitHub API. `getClient` is called only when a call is needed, so an
 * event that needs nothing works without a token.
 */
async function gather({ eventName, payload, config, getClient }) {
  const extra = { actorPermission: 'none', pullState: null }
  if (!config.enabled) return extra
  if (needsActorPermission(eventName, payload)) {
    extra.actorPermission = await getClient().getPermission(payload.comment.user.login)
    log.info('permission resolved', { login: payload.comment.user.login, permission: extra.actorPermission })
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
  return extra
}

/** Output values must stay on one line; GitHub reads `key=value` per line. */
const oneLine = (value) => String(value).replace(/[\r\n]+/g, ' ')

/**
 * The `key=value` lines for `$GITHUB_OUTPUT`. `command` is JSON on one line, or empty. `trigger` is written only for
 * a decision that has one, so the outputs of the phase 1 actions stay as they were.
 */
function formatOutputs(decision) {
  return [
    `action=${decision.action}`,
    `number=${decision.number ?? ''}`,
    `reason=${oneLine(decision.reason)}`,
    `command=${decision.command ? JSON.stringify(decision.command) : ''}`,
    ...(decision.trigger ? [`trigger=${decision.trigger}`] : []),
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
  formatOutputs,
  formatSummary,
  main,
}
