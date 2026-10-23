#!/usr/bin/env node
/**
 * Router of the AI Autonomous agent: turns a GitHub event into one decision for the workflow.
 *
 * `decide` is pure. It looks at the event, the configuration, the permission of the person behind the event, and the
 * state of the pull request, and returns `{ action, number, reason, command? }`. Phase 1 knows two actions:
 * `review` and `skip`. Later phases add actions by registering more rules in EVENT_HANDLERS and COMMAND_HANDLERS;
 * `decide` itself does not change.
 *
 * The CLI (`node tools/agent/route.js`) gathers the two facts that need the GitHub API, but only when the event
 * calls for them: the permission of a commenter who wrote a command, and the state comment of a pull request that
 * became ready for review. It then writes `action`, `number`, `reason`, and `command` (JSON, or empty) to
 * `$GITHUB_OUTPUT` and one line to `$GITHUB_STEP_SUMMARY`.
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

/** The agent writes this at the top of the body of every pull request it opens. */
const AGENT_PR_MARKER = '<!-- ai-autonomous-agent '

const isBot = (login) => typeof login === 'string' && /\[bot\]$/i.test(login)
const sameRepo = (a, b) => typeof a === 'string' && typeof b === 'string' && a.toLowerCase() === b.toLowerCase()

const skip = (number, reason) => ({ action: 'skip', number, reason })

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
  // PHASE 2+: analyze, implement, retry, stop, cost, help, and chat get their rules here.
}

/** `issue_comment` events: a person with write access gives the agent a command. */
function decideIssueComment({ payload, config, actorPermission }) {
  const { issue, comment } = payload
  if (!issue || !comment) throw new TypeError('An issue_comment event must carry issue and comment payloads')
  const number = issue.number

  if (payload.action !== 'created') return skip(number, `issue_comment action '${payload.action}' is not handled`)
  const commenter = comment.user?.login
  if (isBot(commenter)) return skip(number, `comment author '${commenter}' is a bot`)
  const command = parseCommand(comment.body)
  if (command === null) return skip(number, 'not a command')
  if (!isActorAllowed(config, commenter)) return skip(number, `commenter '${commenter}' is not in AGENT_ALLOWED_ACTORS`)
  if (!hasWriteAccess(actorPermission)) return skip(number, `commenter '${commenter}' has no write access`)

  const handler = COMMAND_HANDLERS[command.name]
  if (!handler) return skip(number, `/agent ${command.name} is not available yet`)
  return handler({ number, isPull: Boolean(issue.pull_request), command })
}

/** Rules per event name. Later phases add `issues` and `workflow_run` here. */
const EVENT_HANDLERS = {
  pull_request: decidePullRequest,
  issue_comment: decideIssueComment,
}

/**
 * @param {{ eventName: string, payload: object, config: object, actorPermission?: string,
 *   pullState?: object|null }} input
 * @returns {{ action: string, number: number|null, reason: string, command?: object }}
 */
function decide(input) {
  const { eventName, payload, config } = input
  if (!config.enabled) return skip(numberOf(payload), 'AGENT_ENABLED is not true')
  const handler = EVENT_HANDLERS[eventName]
  if (!handler) return skip(numberOf(payload), `event '${eventName}' is not handled`)
  return handler({ actorPermission: 'none', pullState: null, ...input })
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
 * Resolves the inputs of `decide` that need the GitHub API. `getClient` is called only when a call is needed, so an
 * event that needs nothing works without a token.
 */
async function gather({ eventName, payload, config, getClient }) {
  const extra = { actorPermission: 'none', pullState: null }
  if (!config.enabled) return extra
  if (needsActorPermission(eventName, payload)) {
    extra.actorPermission = await getClient().getPermission(payload.comment.user.login)
  }
  if (needsPullState(eventName, payload)) {
    const comments = await getClient().listIssueComments(payload.pull_request.number)
    const stateComment = findStateComment(comments)
    extra.pullState = stateComment ? parseState(stateComment.body) : null
  }
  return extra
}

/** Output values must stay on one line; GitHub reads `key=value` per line. */
const oneLine = (value) => String(value).replace(/[\r\n]+/g, ' ')

/** The `key=value` lines for `$GITHUB_OUTPUT`. `command` is JSON on one line, or empty. */
function formatOutputs(decision) {
  return [
    `action=${decision.action}`,
    `number=${decision.number ?? ''}`,
    `reason=${oneLine(decision.reason)}`,
    `command=${decision.command ? JSON.stringify(decision.command) : ''}`,
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
  const extra = await gather({ eventName, payload, config, getClient })
  const decision = decide({ eventName, payload, config, ...extra })

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
  formatOutputs,
  formatSummary,
  main,
}
