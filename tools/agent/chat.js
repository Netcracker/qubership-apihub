#!/usr/bin/env node
/**
 * Flow D of the AI Autonomous agent: the conversation. The `chat` job runs this script for a comment that asks the
 * agent something without asking for a change: `/agent help`, `/agent cost`, `/agent stop`, and `/agent <question>`.
 * `/agent stop` runs in its own `stop` job of the workflow, which has no concurrency group and runs this same script
 * without the model, so a stop never queues behind an answer.
 *
 *   help      replies with the commands that work where the comment is (an issue, a pull request of a person, a pull
 *             request of the agent).
 *   cost      replies with the table of the AI calls recorded in the states of the issue and its pull request.
 *   stop      writes the phase `stopped` to the state of the issue first, then cancels the workflow run of a running
 *             attempt (`implement.js publish` finds the phase and records the attempt as stopped), removes
 *             `agent:needs-human`, and says what was stopped and how to start again.
 *   question  the `assistant` (the light model, read-only) answers from the issue or pull request, its last comments,
 *             and the code; for a pull request it also sees the diff against the pull request head, which is fetched
 *             but never checked out. The answer is a reply comment that mentions the person who asked.
 *
 * The working tree is the default branch, and so are this script and the opencode config. The job changes nothing but
 * its reply, the state of an issue it stops, the cost records of an answer, and reactions on the comment. The cost of
 * an answer goes to the state of the issue or pull request, also when the answer fails. That is a read-modify-write of
 * the state comment after the model call, kept short, because this job does not wait for the other agent jobs of the
 * number: a `/agent stop` must not queue behind a running attempt.
 *
 * Environment: GITHUB_REPOSITORY, GITHUB_TOKEN, OPENAI_API_KEY (questions only), AGENT_NUMBER (the issue or pull
 * request), AGENT_COMMAND (JSON of the parsed command), AGENT_ACTOR (who asked), AGENT_COMMENT_ID (the comment that
 * gets the reactions), AGENT_PR_HEAD_REF (the local ref of the pull request head, for a question on a pull request),
 * AGENT_RUN_URL, AGENT_OUT (folder for inputs, events, and answers), the AGENT_* variables of lib/config.js,
 * GITHUB_STEP_SUMMARY.
 */
'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { loadConfig } = require('./lib/config')
const { createClient } = require('./lib/github')
const state = require('./lib/state')
const usage = require('./lib/usage')
const { callAgent } = require('./lib/agent-call')
const { inline, defuseMentions, clip } = require('./lib/text')
const { untrusted } = require('./lib/prompt')
const { react, commentIdOf } = require('./lib/reactions')
const { agentIssueOf } = require('./route')
const { appendSummary, quoted, costLine } = require('./implement')
const log = require('./lib/log')

const LABEL_NEEDS_HUMAN = 'agent:needs-human'
const MAX_TABLE_ROWS = 50
const MAX_COMMENTS = 20
const MAX_TEXT = 20000
const MAX_COMMENT_TEXT = 5000

const sum = (items, field) => items.reduce((total, item) => total + (item[field] ?? 0), 0)
/** Text for a table cell: one line, no pipe, no mention. */
const cell = (text) => inline(text ?? '').replace(/\|/g, '\\|')
const count = (n) => Number(n ?? 0).toLocaleString('en-US')
const modelOf = (r) => `${r.model ?? 'unknown'}${r.variant ? `:${r.variant}` : ''}`

// ---------------------------------------------------------------------------------------------------------------
// /agent help
// ---------------------------------------------------------------------------------------------------------------

const HELP_COMMON = [
  ['`/agent cost`', 'Show what the AI calls here have cost.'],
  ['`/agent help`', 'Show this list.'],
]

const REVIEW_WHAT = 'Review this pull request again. `review force` also reviews a diff above the size limit.'
const CI_CHECK_WHAT = 'Find the root cause of a red CI; rerun the failed jobs when it is flaky or an outage.'

/** The commands per place. The wording follows docs/development/autonomous-agent.md. */
const HELP = {
  issue: [
    ['`/agent analyze`', 'Assess a Bug or Task issue again.'],
    ['`/agent implement [notes]`', 'Implement a Bug or Task up to a pull request. `implement force` starts on an ' +
      '`ai:unsuitable` issue.'],
    ['`/agent retry [notes]`', 'Try again after a hand-off, with a fresh attempt budget. The notes are guidance.'],
    ['`/agent rerun`', "Rerun the failed CI checks of the agent's pull request; no new attempt, no model."],
    ['`/agent stop`', 'Stop the work of the agent on this issue.'],
    ...HELP_COMMON,
    ['`/agent <question>`', 'Ask about this issue. The assistant answers and changes nothing.'],
  ],
  pull: [
    ['`/agent review [notes]`', REVIEW_WHAT],
    ['`/agent ci_check [notes]`', CI_CHECK_WHAT],
    ...HELP_COMMON,
    ['`/agent <question>`', 'Ask about this pull request. The assistant answers and changes nothing.'],
  ],
  agentPull: [
    ['`/agent review [notes]`', REVIEW_WHAT],
    ['`/agent retry [notes]`', 'Try again after a hand-off, with a fresh attempt budget. The notes are guidance.'],
    ['`/agent rerun`', "Rerun the failed CI checks of the agent's pull request; no new attempt, no model."],
    ['`/agent ci_check [notes]`', CI_CHECK_WHAT],
    ['`/agent stop`', 'Stop the work of the agent on this pull request and its issue.'],
    ...HELP_COMMON,
    ['`/agent <text>`', 'A change request: the agent makes one attempt on the branch of this pull request.'],
  ],
}

const HELP_NOTES = {
  issue: 'A comment without a command answers a hand-off (`agent:needs-human`) and starts the next attempt.',
  pull: 'Only a person with write access can use these commands.',
  agentPull: 'A review with change requests makes the agent address every unresolved thread. A comment without a ' +
    'command answers a hand-off and starts the next attempt.',
}

/** The reply to `/agent help`; `place` is `issue`, `pull`, or `agentPull`. */
function helpReply({ asker, place }) {
  const rows = HELP[place]
  if (!rows) throw new Error(`No help for the place '${place}'`)
  return [
    `@${asker}, these commands work here:`,
    '',
    '| Command | What it does |',
    '|---|---|',
    ...rows.map(([command, what]) => `| ${command} | ${what} |`),
    '',
    `${HELP_NOTES[place]} Only a person with write access can use them.`,
  ].join('\n')
}

// ---------------------------------------------------------------------------------------------------------------
// /agent cost
// ---------------------------------------------------------------------------------------------------------------

/**
 * The cost records as a Markdown table and the totals. The table shows the last `max` records by time; the totals
 * cover all of them.
 *
 * @param {object[]} records the `costs` of one or more states
 * @param {{ max?: number }} [options]
 * @returns {{ markdown: string, total: number, calls: number, omitted: number, perFlow: Array<{ flow: string,
 *   calls: number, usd: number }> }}
 */
function costTable(records, { max = MAX_TABLE_ROWS } = {}) {
  const all = [...(records ?? [])].sort((a, b) => String(a.at ?? '').localeCompare(String(b.at ?? '')))
  const shown = all.slice(Math.max(0, all.length - max))
  const omitted = all.length - shown.length
  const flows = new Map()
  for (const r of all) {
    const flow = r.flow ?? 'unknown'
    const entry = flows.get(flow) ?? { flow, calls: 0, usd: 0 }
    entry.calls += 1
    entry.usd += r.usd ?? 0
    flows.set(flow, entry)
  }
  const perFlow = [...flows.values()].sort((a, b) => (a.flow < b.flow ? -1 : a.flow > b.flow ? 1 : 0))
  const total = sum(all, 'usd')
  const lines = [
    '| When | Flow | Role | Model | Uncached | Cached | Output | USD |',
    '|---|---|---|---|---:|---:|---:|---:|',
    ...shown.map((r) =>
      `| ${cell(String(r.at ?? '').slice(0, 10))} | ${cell(r.flow)} | ${cell(r.role)} | ${cell(modelOf(r))} | ` +
      `${count(r.input)} | ${count(r.cached)} | ${count(r.output)} | $${usage.formatUsd(r.usd)} |`,
    ),
  ]
  if (omitted > 0) {
    lines.push('', `${omitted} older record(s) are left out of the table. The totals include them.`)
  }
  lines.push(
    '',
    ...perFlow.map((f) => `- ${f.flow}: ${f.calls} call(s), $${usage.formatUsd(f.usd)}`),
    '',
    `**Total: $${usage.formatUsd(total)}** in ${all.length} call(s).`,
  )
  return { markdown: lines.join('\n'), total, calls: all.length, omitted, perFlow }
}

/**
 * The reply to `/agent cost`.
 *
 * @param {{ asker: string, scope: string, records: object[] }} input `scope` names what the records cover, for
 *   example `issue #200 and pull request #70`
 */
function costReply({ asker, scope, records }) {
  if ((records ?? []).length === 0) return `@${asker}, no AI call is recorded for ${scope} yet.`
  const table = costTable(records)
  return [
    `@${asker}, the AI calls recorded for ${scope}:`,
    '',
    table.markdown,
    '',
    'These numbers are estimates from the price table that opencode uses. The OpenAI bill is the authority: a ' +
      'promotional price or a failed API call can make it differ.',
  ].join('\n')
}

// ---------------------------------------------------------------------------------------------------------------
// /agent stop
// ---------------------------------------------------------------------------------------------------------------

/** The id of the workflow run of this repository that a run link names, or `null`. */
function runIdOf(runUrl, repo) {
  const match = /\/([^/]+\/[^/]+)\/actions\/runs\/(\d+)/.exec(String(runUrl ?? ''))
  if (!match || match[1].toLowerCase() !== String(repo ?? '').toLowerCase()) return null
  return Number(match[2])
}

/** The state after `/agent stop`. `implementing` stays, so `publish` can tell that this very run was stopped. */
function stoppedState(st, { actor, at }) {
  return { ...st, phase: 'stopped', stoppedBy: actor, stoppedAt: at }
}

/** What the agent was doing when it was stopped, in a sentence. */
function stoppedWhat(phase, { cancelled, runId, pr }) {
  switch (phase) {
    case 'implementing':
      if (runId === null) return 'An attempt was marked as running, but its run is not one of this repository.'
      return cancelled ? `I cancelled the running attempt (run ${runId}).` : `The run ${runId} had already finished.`
    case 'waiting-ci':
      return `I stopped waiting for CI${pr ? ` on pull request #${pr}` : ''}. The CI gate will not act on it.`
    case 'needs-human':
      return 'The agent was waiting for a person. It stays quiet now.'
    default:
      return `The agent was in the phase '${phase}'. It does nothing more.`
  }
}

const RESTART = 'To start again, comment `/agent implement` on the issue, or `/agent retry` with guidance.'

/** The human part of the state comment of a stopped issue. */
function renderStopped({ actor, what, runUrl, totalUsd }) {
  return [
    '### AI implementation was stopped',
    '',
    `@${actor} stopped the agent. ${what}`,
    '',
    RESTART,
    '',
    costLine(runUrl, totalUsd, 'comment `/agent retry` to start again'),
  ].join('\n')
}

/** The reply to `/agent stop`. */
function stopReply({ asker, what, cancelError }) {
  return [
    `@${asker}, I stopped. ${what}`,
    ...(cancelError
      ? ['', `I could not cancel the run: ${inline(cancelError)} Cancel it by hand if it still runs.`]
      : []),
    '',
    RESTART,
  ].join('\n')
}

// ---------------------------------------------------------------------------------------------------------------
// The assistant
// ---------------------------------------------------------------------------------------------------------------

/** The state of the agent as short facts, for the assistant. It holds model text, so the caller wraps it. */
function stateSummary(st) {
  if (!st) return 'The agent has no state for this issue or pull request.'
  const lines = [`Phase: ${st.phase ?? 'none'}`]
  if (st.analysis) lines.push(`Analysis verdict: ${st.analysis.verdict}. Reason: ${inline(st.analysis.reason ?? '')}`)
  if (st.pr) lines.push(`Pull request of the agent: #${st.pr}`)
  for (const a of st.attempts ?? []) lines.push(`Attempt ${a.n} (${a.kind}): ${a.result}. ${inline(a.notes ?? '')}`)
  if ((st.reviews ?? []).length > 0) lines.push(`Reviews by the agent: ${st.reviews.length}`)
  return lines.join('\n')
}

/**
 * The text of `chat-input.md` for the assistant. Everything people or models wrote is inside an `<untrusted>` block.
 *
 * @param {object} input
 * @param {'issue'|'pull request'} input.where
 * @param {object} input.target the issue (its pull request fields come from the issues API)
 * @param {string} input.question
 * @param {string} input.asker
 * @param {object[]} input.comments the comments without the state comment; the last ones are shown
 * @param {object|null} input.st the state of the issue or pull request
 * @param {{ base: string, head: string }|null} input.refs for a pull request: the base ref and the local head ref
 */
function renderChatInput({ where, target, question, asker, comments, st, refs }) {
  const shown = comments.slice(-MAX_COMMENTS)
  const out = [
    `# Question on ${where} #${target.number}`,
    '',
    `- Asked by: ${asker}`,
    `- State: ${target.state ?? 'unknown'}`,
    ...(refs
      ? [
        `- Base ref: \`${refs.base}\` (a branch of the clone)`,
        `- Head ref: \`${refs.head}\` (fetched, never checked out: read it with \`git show ${refs.head}:<path>\` and ` +
          `\`git diff ${refs.base}...${refs.head}\`)`,
      ]
      : ['- The working tree is the default branch of the repository.']),
    '',
    '## The question',
    '',
    untrusted(clip(question, MAX_TEXT)),
    '',
    '## Title and description',
    '',
    `Written by ${target.user?.login ?? 'unknown'} on ${target.created_at ?? 'an unknown date'}.`,
    '',
    untrusted(`Title: ${target.title}\n\n${clip(target.body, MAX_TEXT)}`),
    '',
    '## Comments',
    '',
  ]
  if (shown.length === 0) out.push('No comments.', '')
  if (comments.length > shown.length) out.push(`Only the last ${shown.length} of ${comments.length} comments.`, '')
  for (const c of shown) {
    out.push(`Written by ${c.user?.login ?? 'unknown'} on ${c.created_at ?? 'an unknown date'}.`, '')
    out.push(untrusted(clip(c.body, MAX_COMMENT_TEXT)), '')
  }
  out.push('## State of the agent', '', untrusted(stateSummary(st)), '')
  return out.join('\n')
}

/** The cost line at the end of an answer. */
function answerCostLine({ runUrl, answerUsd, totalUsd, noun }) {
  return `<sub>[Run](${runUrl}) · This answer: $${usage.formatUsd(answerUsd)} · ` +
    `all AI calls on this ${noun} so far: $${usage.formatUsd(totalUsd)} · comment \`/agent cost\` for the table</sub>`
}

/** The reply that carries the answer of the model: it starts with the mention of the asker and ends with the cost. */
function answerReply({ asker, answer, runUrl, answerUsd, totalUsd, noun }) {
  return [`@${asker}`, '', defuseMentions(answer.trim()), '', answerCostLine({ runUrl, answerUsd, totalUsd, noun })]
    .join('\n')
}

/** The reply when the assistant gave no usable answer. */
function failedAnswerReply({ asker, message, runUrl, answerUsd, totalUsd, noun }) {
  return [
    `@${asker}, I could not answer: ${inline(message)} Ask again, or rephrase the question.`,
    '',
    answerCostLine({ runUrl, answerUsd, totalUsd, noun }),
  ].join('\n')
}

// ---------------------------------------------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------------------------------------------

function parseCommandEnv(text) {
  if (!text) return { name: 'chat', force: false, notes: '' }
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

/** The comments of `number`, its state comment, and its state (an empty one of `kind` when there is none). */
async function loadState(gh, number, kind) {
  const comments = await gh.listIssueComments(number)
  const existing = state.findStateComment(comments)
  const parsed = existing ? state.parse(existing.body) : null
  const st = parsed ?? (kind === 'pull' ? state.emptyPullState(number) : state.emptyIssueState(number))
  return { comments: comments.filter((c) => c !== existing), existing, st, found: parsed !== null }
}

/**
 * The issue or pull request of the comment, with its state; for a pull request of the agent also the issue it names
 * and the issue's state. The marker in the description is text anyone can edit, so the issue must name this pull
 * request in its own state.
 */
async function loadTarget(gh, number) {
  const target = await gh.getIssue(number)
  const isPull = Boolean(target.pull_request)
  const own = await loadState(gh, number, isPull ? 'pull' : 'issue')
  let agent = null
  if (isPull) {
    const issueNumber = agentIssueOf(target.body)
    if (issueNumber !== null) {
      const issue = await loadState(gh, issueNumber, 'issue')
      if (issue.found && issue.st.pr === number) agent = { issueNumber, ...issue }
    }
  }
  log.info('target loaded', {
    kind: isPull ? 'pull request' : 'issue',
    state: target.state,
    comments: own.comments.length,
    phase: own.st.phase,
    agent: agent ? `issue #${agent.issueNumber}` : 'no',
  })
  return { target, isPull, own, agent }
}

// ---------------------------------------------------------------------------------------------------------------
// The commands
// ---------------------------------------------------------------------------------------------------------------

/** Posts a reply, or, in dry-run, puts it in the job summary. */
async function reply(ctx, body) {
  const { config, env, gh, number } = ctx
  fs.writeFileSync(path.join(ctx.out, 'reply.md'), body)
  if (config.dryRun) {
    appendSummary(env, quoted(`## Dry run: reply to #${number}`, body))
    log.info('dry run: the reply is in the job summary')
    return
  }
  await gh.createIssueComment(number, body)
  log.info('reply posted', { mention: ctx.actor, on: `#${number}` })
}

async function doHelp(ctx, loaded) {
  const place = loaded.isPull ? (loaded.agent ? 'agentPull' : 'pull') : 'issue'
  log.info('help', { place })
  await reply(ctx, helpReply({ asker: ctx.actor, place }))
  return { ok: true }
}

async function doCost(ctx, loaded) {
  const { gh, number } = ctx
  const { isPull, own, agent } = loaded
  const sources = [{ label: `${isPull ? 'pull request' : 'issue'} #${number}`, records: own.st.costs ?? [] }]
  if (isPull && agent) {
    sources.push({ label: `issue #${agent.issueNumber}`, records: agent.st.costs ?? [] })
  } else if (!isPull && own.st.pr) {
    const pull = await loadState(gh, own.st.pr, 'pull')
    sources.push({ label: `pull request #${own.st.pr}`, records: pull.st.costs ?? [] })
  }
  const records = sources.flatMap((s) => s.records)
  log.info('cost sources', Object.fromEntries(sources.map((s) => [s.label, s.records.length])))
  const scope = sources.length > 1 ? `${sources[0].label} and ${sources[1].label}` : sources[0].label
  await reply(ctx, costReply({ asker: ctx.actor, scope, records }))
  return { ok: true }
}

async function doStop(ctx, loaded) {
  const { config, gh, number, actor, runUrl, env } = ctx
  const { isPull, agent } = loaded
  if (isPull && !agent) {
    await reply(ctx, `@${actor}, I can stop the work on an issue or on a pull request of the agent, not on this one.`)
    return { ok: false }
  }
  const issueNumber = isPull ? agent.issueNumber : number
  // The state is read again here, right before it is written, so the window for a lost update stays short.
  const fresh = await loadState(gh, issueNumber, 'issue')
  if (!fresh.existing || !fresh.st.phase) {
    await reply(ctx, `@${actor}, there is nothing to stop: the agent has done no work on #${issueNumber}.`)
    return { ok: false }
  }
  if (fresh.st.phase === 'stopped') {
    await reply(ctx, `@${actor}, the work on #${issueNumber} is already stopped. ${RESTART}`)
    return { ok: false }
  }
  const before = fresh.st
  const next = stoppedState(before, { actor, at: new Date().toISOString() })
  const runId = before.phase === 'implementing' ? runIdOf(before.implementing?.run, env.GITHUB_REPOSITORY) : null
  log.info('stop', { issue: issueNumber, phase: before.phase, run: runId ?? 'none', dryRun: config.dryRun })

  let cancelled = false
  let cancelError = null
  if (!config.dryRun) {
    // The phase first: the publish job of the cancelled run reads it to see that a person stopped the run.
    await log.group('Write the state comment', async () => {
      const human = renderStopped({
        actor, what: stoppedWhat(before.phase, { cancelled: true, runId, pr: before.pr }), runUrl,
        totalUsd: sum(next.costs ?? [], 'usd'),
      })
      await gh.updateIssueComment(fresh.existing.id, state.render(human, next))
      log.info('state comment written', { phase: next.phase })
    })
    if (runId !== null) {
      await log.group('Cancel the running attempt', async () => {
        try {
          cancelled = await gh.cancelRun(runId)
          log.info('cancel requested', { run: runId, cancelled })
        } catch (err) {
          cancelError = err
          log.error(`The run ${runId} could not be cancelled: ${err.message}`)
        }
      })
    }
    await log.group('Remove the hand-off label', async () => {
      await gh.removeLabel(issueNumber, LABEL_NEEDS_HUMAN)
      if (before.pr) await gh.removeLabel(before.pr, LABEL_NEEDS_HUMAN)
      const on = before.pr ? `#${issueNumber} and #${before.pr}` : `#${issueNumber}`
      log.info('label removed', { label: LABEL_NEEDS_HUMAN, on })
    })
  }
  const what = stoppedWhat(before.phase, { cancelled, runId, pr: before.pr })
  await reply(ctx, stopReply({ asker: actor, what, cancelError: cancelError?.message }))
  if (cancelError) throw cancelError
  return { ok: true }
}

/** Adds the cost records to the state of the issue or pull request: read again, changed, written. */
async function recordCosts(ctx, { isPull, costs }) {
  const { config, gh, number } = ctx
  const fresh = await loadState(gh, number, isPull ? 'pull' : 'issue')
  let st = fresh.st
  for (const c of costs) st = state.addCost(st, c)
  if (!config.dryRun && costs.length > 0) {
    if (fresh.existing) {
      await gh.updateIssueComment(fresh.existing.id, state.replaceState(fresh.existing.body, st))
    } else {
      const noun = isPull ? 'pull request' : 'issue'
      const human = `### AI Autonomous agent\n\nThe agent keeps what its AI calls on this ${noun} cost in this ` +
        'comment. Comment `/agent cost` for the table.'
      await gh.createIssueComment(number, state.render(human, st))
    }
    log.info('cost recorded', { records: costs.length, total: usage.formatUsd(sum(st.costs, 'usd')) })
  }
  return st
}

async function doQuestion(ctx, loaded) {
  const { config, gh, number, actor, runUrl, out, deps } = ctx
  const { target, isPull, own } = loaded
  const question = String(ctx.command.notes ?? '').trim()
  const where = isPull ? 'pull request' : 'issue'
  let refs = null
  if (isPull) {
    const pull = await log.group('Load the pull request', () => gh.getPull(number))
    refs = {
      base: `origin/${pull.base?.ref ?? 'develop'}`,
      head: ctx.env.AGENT_PR_HEAD_REF || `refs/remotes/pull/${number}/head`,
    }
  }
  const inputFile = path.join(out, 'chat-input.md')
  await log.group('Build the assistant input', async () => {
    const text = renderChatInput({
      where, target, question, asker: actor, comments: own.comments, st: own.found ? own.st : null, refs,
    })
    fs.writeFileSync(inputFile, text)
    log.info('input written', { file: inputFile, characters: text.length })
  })

  const costs = []
  let answer = null
  let failure = null
  try {
    answer = await log.group('Run the assistant', () =>
      callAgent({
        flow: 'chat',
        role: 'assistant',
        agent: 'assistant',
        model: config.models.light,
        message: `Answer the question on ${where} #${number}. Your input is the attached chat-input.md.`,
        inputFile,
        out,
        costs,
        runUrl,
        schema: 'chatAnswer',
        deps,
      }),
    )
  } catch (err) {
    failure = err
    log.error(`The assistant failed: ${err.message}`)
  }

  // The cost first, also when the answer failed.
  const st = await log.group(config.dryRun ? 'Cost (dry run: not written)' : 'Record the cost', () =>
    recordCosts(ctx, { isPull, costs }),
  )
  const answerUsd = sum(costs, 'usd')
  const totalUsd = sum(st.costs ?? [], 'usd')
  log.info('cost', { thisAnswer: usage.formatUsd(answerUsd), total: usage.formatUsd(totalUsd) })
  const shared = { asker: actor, runUrl, answerUsd, totalUsd, noun: where }
  await reply(ctx, failure
    ? failedAnswerReply({ ...shared, message: failure.message })
    : answerReply({ ...shared, answer: answer.answer }))
  if (failure) throw failure
  return { ok: true }
}

// ---------------------------------------------------------------------------------------------------------------

const COMMANDS = { help: doHelp, cost: doCost, stop: doStop, chat: doQuestion }

/**
 * Runs the command of the comment. `deps.gh` and `deps.runAgent` are injectable so that tests never touch the network
 * or start opencode.
 *
 * @returns {Promise<{ command: string, ok: boolean }>} `ok` is false when the agent refused or had nothing to do
 */
async function chat(env = process.env, deps = {}) {
  const config = loadConfig(env)
  const number = Number(requireEnv(env, 'AGENT_NUMBER'))
  const command = parseCommandEnv(env.AGENT_COMMAND)
  const actor = requireEnv(env, 'AGENT_ACTOR')
  const runUrl = requireEnv(env, 'AGENT_RUN_URL')
  const out = requireEnv(env, 'AGENT_OUT')
  const handler = COMMANDS[command.name]
  if (!handler) throw new Error(`The chat job does not handle the command '${command.name}'`)
  fs.mkdirSync(out, { recursive: true })
  const gh = deps.gh ?? createClient({ token: env.GITHUB_TOKEN, repo: env.GITHUB_REPOSITORY })
  const commentId = commentIdOf(env.AGENT_COMMENT_ID)
  log.info('chat starts', { number, command: command.name, actor, dryRun: config.dryRun })
  await react({ gh, commentId, content: 'eyes', dryRun: config.dryRun })

  const ctx = { config, env, gh, number, actor, command, runUrl, out, deps }
  let content = 'confused'
  try {
    const loaded = await log.group('Load the issue or pull request', () => loadTarget(gh, number))
    const result = await handler(ctx, loaded)
    if (result.ok) content = 'rocket'
    return { command: command.name, ok: result.ok }
  } finally {
    await react({ gh, commentId, content, dryRun: config.dryRun })
  }
}

async function main(env = process.env, deps = {}) {
  return chat(env, deps)
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
  chat,
  helpReply,
  costTable,
  costReply,
  runIdOf,
  stoppedState,
  stoppedWhat,
  renderStopped,
  stopReply,
  stateSummary,
  renderChatInput,
  answerReply,
  failedAnswerReply,
  loadTarget,
}
