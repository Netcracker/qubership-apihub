#!/usr/bin/env node
/**
 * Flow B of the AI Autonomous agent: decide whether a Bug or Task issue is suitable for AI implementation.
 *
 * The working tree is the default branch, and so are this script and the opencode config, so the instructions the
 * analyst reads are trusted (see the `analyze` job of .github/workflows/ai-autonomous-agent.yml). Steps:
 *
 *   1. load the issue, its comments, and its state comment;
 *   2. `analyst` (the light model) reads the issue and the code and answers with `analysis` JSON;
 *   3. publish: the `ai:suitable` or `ai:unsuitable` label (or `agent:needs-human` for missing information), read
 *      again after the model call so that a label a person set meanwhile wins; then the state comment of the issue
 *      rewritten with the verdict and with the labels that were really changed; and, for `needs-info`, a separate
 *      comment that mentions the author, because only a new comment notifies people. In dry-run, the job summary
 *      instead.
 *
 * The cost of the run is recorded in the state, also when the analysis or a label call fails. The agent never
 * changes an `ai:suitable` or `ai:unsuitable` label that a person set. `implement.js` calls `analyze` when the issue
 * changed since its last analysis.
 *
 * Environment: GITHUB_REPOSITORY, GITHUB_TOKEN, OPENAI_API_KEY, AGENT_NUMBER (the issue), AGENT_TRIGGER (why the
 * job runs: opened, typed, edited, author-reply, or command), AGENT_RUN_URL, AGENT_OUT (folder for inputs, events,
 * and outputs), the AGENT_* variables of lib/config.js, GITHUB_STEP_SUMMARY.
 */
'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { loadConfig } = require('./lib/config')
const { createClient } = require('./lib/github')
const state = require('./lib/state')
const usage = require('./lib/usage')
const { ContractError } = require('./lib/contract')
const { callAgent } = require('./lib/agent-call')
const { inline, clip: clipText } = require('./lib/text')
const { untrusted } = require('./lib/prompt')
const log = require('./lib/log')

const LABEL_SUITABLE = 'ai:suitable'
const LABEL_UNSUITABLE = 'ai:unsuitable'
const LABEL_NEEDS_HUMAN = 'agent:needs-human'
const DECISION_LABELS = [LABEL_SUITABLE, LABEL_UNSUITABLE]
/** One comment or description longer than this is cut, so a pasted log cannot fill the model's context. */
const MAX_TEXT = 20000

const VERDICT_WORDS = {
  suitable: 'Suitable for AI implementation',
  unsuitable: 'Not suitable for AI implementation',
  'needs-info': 'More information needed',
}

const names = (labels) => (labels ?? []).map((label) => (typeof label === 'string' ? label : label?.name))

/**
 * The semantic rules the schema cannot express: `needs-info` asks at least one question, and `suitable` brings a
 * plan. Throws `ContractError`; returns the analysis otherwise.
 */
function checkAnalysis(analysis) {
  const problems = []
  if (analysis.verdict === 'needs-info' && !analysis.questions.some((q) => q.trim() !== '')) {
    problems.push('questions: a needs-info verdict needs at least one question')
  }
  if (analysis.verdict === 'suitable' && analysis.plan === null) {
    problems.push('plan: a suitable verdict needs a plan')
  }
  if (problems.length > 0) throw new ContractError(`The analysis is inconsistent: ${problems.join('; ')}`, problems)
  return analysis
}

/**
 * The labels to add to and remove from the issue after an analysis.
 *
 * @param {Array<string|{name: string}>} issueLabels the labels on the issue now
 * @param {object|null} st the state of the issue before this analysis
 * @param {'suitable'|'unsuitable'|'needs-info'} verdict
 * @returns {{ add: string[], remove: string[] }}
 */
function labelChanges(issueLabels, st, verdict) {
  const have = names(issueLabels)
  const add = []
  const remove = []

  // The label belongs to the agent only if the state says the agent set exactly this label.
  const agentSet = st?.analysis?.labelSetBy === 'agent' ? st.analysis.label : null
  const personDecided = have.some((name) => DECISION_LABELS.includes(name) && name !== agentSet)
  if (!personDecided && verdict !== 'needs-info') {
    const wanted = verdict === 'suitable' ? LABEL_SUITABLE : LABEL_UNSUITABLE
    const opposite = verdict === 'suitable' ? LABEL_UNSUITABLE : LABEL_SUITABLE
    if (!have.includes(wanted)) add.push(wanted)
    // Without a person's decision, every decision label on the issue is the agent's.
    if (have.includes(opposite)) remove.push(opposite)
  }

  if (verdict === 'needs-info') {
    if (!have.includes(LABEL_NEEDS_HUMAN)) add.push(LABEL_NEEDS_HUMAN)
  } else if (have.includes(LABEL_NEEDS_HUMAN)) {
    remove.push(LABEL_NEEDS_HUMAN)
  }
  return { add, remove }
}

/**
 * The `ai:suitable` or `ai:unsuitable` label that is the agent's after `changes` are applied, or `null` when the
 * issue has none or a person set it. The state keeps it, so a later analysis knows what it may change.
 */
function agentLabelAfter(issueLabels, st, changes) {
  const added = changes.add.find((name) => DECISION_LABELS.includes(name))
  if (added) return added
  const before = st?.analysis?.labelSetBy === 'agent' ? st.analysis.label : null
  const have = names(issueLabels).filter((name) => !changes.remove.includes(name))
  return before !== null && have.includes(before) ? before : null
}

/**
 * Applies label changes one call at a time. A failed call is logged and does not stop the others.
 *
 * @returns {Promise<{ applied: { add: string[], remove: string[] }, error: Error|null }>} what really changed, and the
 *   first error
 */
async function applyLabels(gh, number, changes) {
  const applied = { add: [], remove: [] }
  let error = null
  const attempt = async (what, labels, call, into) => {
    try {
      await call()
      into.push(...labels)
    } catch (err) {
      error ??= err
      log.error(`The label call failed (${what} ${labels.join(', ')}): ${err.message}`)
    }
  }
  if (changes.add.length) await attempt('add', changes.add, () => gh.addLabels(number, changes.add), applied.add)
  for (const label of changes.remove) {
    await attempt('remove', [label], () => gh.removeLabel(number, label), applied.remove)
  }
  log.info('labels applied', {
    add: applied.add.join(',') || 'none',
    remove: applied.remove.join(',') || 'none',
    failed: error ? 'yes' : 'no',
  })
  return { applied, error }
}

/** The state of the issue after a finished analysis. The input is not changed. */
function nextState(st, { analysis, label, issueUpdatedAt, run, at, trigger }) {
  return {
    ...st,
    phase: analysis.verdict === 'needs-info' ? 'needs-info' : 'analyzed',
    analysis: {
      verdict: analysis.verdict,
      reason: analysis.reason,
      questions: analysis.questions,
      plan: analysis.plan,
      label,
      labelSetBy: label === null ? null : 'agent',
      issueUpdatedAt,
      at,
      run,
    },
    analyses: [...(st.analyses ?? []), { at, run, verdict: analysis.verdict, trigger }],
  }
}

/**
 * The state after an analysis that failed: the phase and the last analysis stay, so the issue keeps waiting for what
 * it waited for. The failed run still counts toward the limit of analyses, because it spent money.
 */
function failedState(st, { run, at, trigger }) {
  return { ...st, analyses: [...(st.analyses ?? []), { at, run, verdict: 'failed', trigger }] }
}

/** Numbered questions as Markdown lines, one line per question. */
const questionLines = (questions) =>
  questions.filter((q) => q.trim() !== '').map((q, i) => `${i + 1}. ${inline(q)}`)

/**
 * The human part of the state comment: verdict, reason, then the plan or the questions, and the cost so far.
 *
 * @param {{ analysis: object, runUrl: string, totalUsd: number }} input
 */
function renderAnalysis({ analysis, runUrl, totalUsd }) {
  const out = ['### AI analysis', '', `**${VERDICT_WORDS[analysis.verdict]}.** ${inline(analysis.reason)}`, '']
  if (analysis.verdict === 'suitable' && analysis.plan) {
    const plan = analysis.plan
    out.push(
      '**Plan**',
      '',
      `- Modules: ${inline(plan.modules.join(', ') || 'none named')}`,
      `- Approach: ${inline(plan.approach)}`,
      `- Tests: ${inline(plan.tests || 'none named')}`,
      `- Risk: ${plan.risk}`,
      '',
    )
  }
  if (analysis.verdict === 'needs-info') {
    out.push('**Questions**', '', ...questionLines(analysis.questions), '')
    out.push('Answer in a comment or edit the issue; the agent reads it again.', '')
  } else {
    out.push('Comment `/agent implement` to start the implementation.', '')
  }
  out.push(
    `<sub>[Run](${runUrl}) · AI cost of this issue so far: $${usage.formatUsd(totalUsd)} · ` +
      'comment `/agent analyze` to analyze again</sub>',
  )
  return out.join('\n')
}

/** The state comment text for an analysis that did not finish. */
function renderFailure({ message, runUrl, totalUsd }) {
  return [
    '### AI analysis failed',
    '',
    `The analysis did not finish: ${inline(message)}`,
    '',
    `<sub>[Run](${runUrl}) · AI cost of this issue so far: $${usage.formatUsd(totalUsd)} · ` +
      'comment `/agent analyze` to try again</sub>',
  ].join('\n')
}

/** The separate comment that notifies the issue author of the questions. */
function questionsComment({ author, questions }) {
  return [
    `@${author}, the AI agent needs more information before it can tell whether this issue is suitable for AI ` +
      'implementation:',
    '',
    ...questionLines(questions),
    '',
    'Answer in a comment or edit the issue; the agent reads it again.',
  ].join('\n')
}

const clip = (text) => clipText(text, MAX_TEXT)

/**
 * The text of `analysis-input.md`: facts of the issue, then everything people wrote inside `<untrusted>` blocks, then
 * what the agent concluded and asked the last time. `comments` must not hold the state comment.
 */
function renderInput({ issue, comments, st, trigger }) {
  const prior = st?.analysis
  const out = [
    `# Issue #${issue.number}`,
    '',
    `- Type: ${issue.type?.name ?? 'none'}`,
    `- Labels: ${names(issue.labels).join(', ') || 'none'}`,
    `- Analysis trigger: ${trigger}`,
    '',
    '## Title and description',
    '',
    `Written by ${issue.user?.login ?? 'unknown'} on ${issue.created_at ?? 'an unknown date'}.`,
    '',
    untrusted(`Title: ${issue.title}\n\n${clip(issue.body)}`),
    '',
    '## Comments',
    '',
  ]
  if (comments.length === 0) out.push('No comments.', '')
  for (const c of comments) {
    out.push(`Written by ${c.user?.login ?? 'unknown'} on ${c.created_at ?? 'an unknown date'}.`, '')
    out.push(untrusted(clip(c.body)), '')
  }
  if (prior) {
    // The reason and the questions are model output, written after reading people's text: they may echo it.
    out.push('## Previous analysis', '')
    out.push(`- Verdict: ${prior.verdict}`, `- At: ${prior.at}`, '')
    out.push('Reason:', '', untrusted(prior.reason), '')
    if (prior.questions?.length) {
      out.push('Questions asked:', '', untrusted(questionLines(prior.questions).join('\n')), '')
    }
  }
  return out.join('\n')
}

/**
 * Runs the analysis and publishes it. `deps.gh` and `deps.runAgent` are injectable so that tests never touch the
 * network or start opencode.
 *
 * A failed analysis does not throw: the failure state is written like any state, and the result carries `failure`,
 * so a caller that goes on (the implementation, Flow C) can still use the state and the comment id. `askAuthor: false`
 * leaves out the separate comment with the questions, for a caller that tells the person who asked.
 *
 * @returns {Promise<{ state: object, analysis: object|null, failure: Error|null, commentId: number|null,
 *   issue: object }>} the state as written (in dry-run: as it would be written)
 */
async function analyze(env = process.env, deps = {}, { askAuthor = true } = {}) {
  const config = loadConfig(env)
  const number = Number(env.AGENT_NUMBER)
  const trigger = env.AGENT_TRIGGER || 'unknown'
  const out = env.AGENT_OUT
  const runUrl = env.AGENT_RUN_URL
  fs.mkdirSync(out, { recursive: true })
  const gh = deps.gh ?? createClient({ token: env.GITHUB_TOKEN, repo: env.GITHUB_REPOSITORY })
  log.info('analysis starts', {
    issue: number,
    trigger,
    dryRun: config.dryRun,
    model: `${config.models.light.id}${config.models.light.variant ? ':' + config.models.light.variant : ''}`,
  })

  const loaded = await log.group('Load the issue, its comments, and its state', async () => {
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
      analyses: st.analyses?.length ?? 0,
    })
    return { issue, comments: all.filter((c) => c !== existing), existing, st }
  })
  const { issue, comments, existing } = loaded

  let st = loaded.st
  const costs = []
  let analysis = null
  let failure = null
  let changes = { add: [], remove: [] }
  // The labels of the issue when the changes are computed: fetched again after the model call, which takes minutes,
  // so a label that a person set during the run wins.
  let labelsNow = issue.labels
  const at = new Date().toISOString()

  try {
    const inputFile = path.join(out, 'analysis-input.md')
    await log.group('Build the analyst input', async () => {
      const text = renderInput({ issue, comments, st, trigger })
      fs.writeFileSync(inputFile, text)
      log.info('input written', { file: inputFile, characters: text.length })
    })
    analysis = await log.group('Run the analyst', () =>
      callAgent({
        flow: 'analyze',
        role: 'analyst',
        agent: 'analyst',
        model: config.models.light,
        message: `Analyze issue #${number}. Your input is the attached analysis-input.md.`,
        inputFile,
        out,
        costs,
        runUrl,
        schema: 'analysis',
        check: checkAnalysis,
        deps,
      }),
    )
    log.json('Analysis', analysis)
    labelsNow = (await log.group('Read the labels again', () => gh.getIssue(number))).labels
    changes = labelChanges(labelsNow, st, analysis.verdict)
    log.info('label changes', { add: changes.add.join(',') || 'none', remove: changes.remove.join(',') || 'none' })
  } catch (err) {
    failure = err
    log.error(`Analysis failed: ${err.message}`)
  }

  // The labels first, then the state: the state records which `ai:*` label is the agent's, and it must say what the
  // calls really did. A failed call is logged, the state keeps the previous ownership, and the cost is still written.
  let applied = changes
  let labelFailure = null
  if (!config.dryRun) {
    const result = await log.group('Apply the labels', () => applyLabels(gh, number, changes))
    applied = result.applied
    labelFailure = result.error
  }

  const human = await log.group('Prepare the state', async () => {
    for (const c of costs) st = state.addCost(st, c)
    const totalUsd = st.costs.reduce((sum, c) => sum + c.usd, 0)
    const phaseBefore = st.phase
    let text
    if (failure) {
      st = failedState(st, { run: runUrl, at, trigger })
      text = renderFailure({ message: failure.message, runUrl, totalUsd })
    } else {
      const label = agentLabelAfter(labelsNow, st, applied)
      st = nextState(st, { analysis, label, issueUpdatedAt: issue.updated_at, at, run: runUrl, trigger })
      text = renderAnalysis({ analysis, runUrl, totalUsd })
    }
    log.info('state', { phaseBefore, phaseAfter: st.phase, label: st.analysis?.label, analyses: st.analyses.length })
    const runUsd = costs.reduce((sum, c) => sum + c.usd, 0)
    log.info('cost', { thisRun: usage.formatUsd(runUsd), total: usage.formatUsd(totalUsd) })
    fs.writeFileSync(path.join(out, 'summary.md'), text)
    return text
  })
  const body = state.render(human, st)
  const author = issue.user?.login
  const asksAuthor = !failure && analysis.verdict === 'needs-info'
  let commentId = existing?.id ?? null
  const questions = asksAuthor && askAuthor ? questionsComment({ author, questions: analysis.questions }) : null

  if (config.dryRun) {
    await log.group('Write the dry-run report', async () => {
      const report = [`## Dry run: AI analysis of #${number}`, '', human, '']
      report.push(`- labels to add: ${changes.add.join(', ') || 'none'}`)
      report.push(`- labels to remove: ${changes.remove.join(', ') || 'none'}`)
      if (questions) {
        report.push('', 'Comment that would notify the author:', '', ...questions.split('\n').map((l) => `> ${l}`))
      }
      if (env.GITHUB_STEP_SUMMARY) fs.appendFileSync(env.GITHUB_STEP_SUMMARY, report.join('\n') + '\n')
      log.info('dry run: nothing written to GitHub')
    })
  } else {
    await log.group('Write the state comment', async () => {
      if (existing) {
        await gh.updateIssueComment(existing.id, body)
      } else {
        commentId = (await gh.createIssueComment(number, body))?.id ?? null
      }
      log.info('state comment written', { id: commentId ?? 'new' })
    })
    if (questions) {
      await log.group('Ask the author', async () => {
        await gh.createIssueComment(number, questions)
        log.info('questions posted', { mention: author, count: analysis.questions.length })
      })
    }
  }
  return { state: st, analysis, failure: failure ?? labelFailure, commentId, issue }
}

/** The entry point of the `analyze` job: the analysis, and a failed job when the analysis failed. */
async function main(env = process.env, deps = {}) {
  const result = await analyze(env, deps)
  if (result.failure) throw result.failure
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
  analyze,
  applyLabels,
  checkAnalysis,
  labelChanges,
  agentLabelAfter,
  nextState,
  failedState,
  renderAnalysis,
  renderFailure,
  renderInput,
  questionsComment,
}
