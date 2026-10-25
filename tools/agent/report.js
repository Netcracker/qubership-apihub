#!/usr/bin/env node
/**
 * The weekly report of the AI Autonomous agent: how far the team has come toward autonomy, in numbers. It uses no
 * model and costs nothing.
 *
 * The workflow (.github/workflows/ai-autonomous-report.yml) runs on a schedule and on demand. Steps:
 *
 *   1. search GitHub for the issues and pull requests of the period: `Bug` and `Task` issues created, pull requests
 *      merged, pull requests opened by the agent, and pull requests the agent reviewed;
 *   2. read the state comment (lib/state.js) of each of them, and of the issues the agent pull requests close, because
 *      the attempts and the implementation costs live in the state of the issue;
 *   3. aggregate with the pure functions below and render Markdown.
 *
 * The report always goes to the job summary. When `AGENT_REPORT_ISSUE` is set and the run is not a dry run, it also
 * becomes a new comment on that issue. The report holds numbers only, no names of people.
 *
 * Environment: GITHUB_REPOSITORY, GITHUB_TOKEN, AGENT_REPORT_DAYS (default 7), AGENT_REPORT_ISSUE (optional), the
 * AGENT_* variables of lib/config.js, GITHUB_STEP_SUMMARY.
 */
'use strict'

const fs = require('node:fs')
const { loadConfig } = require('./lib/config')
const { createClient } = require('./lib/github')
const state = require('./lib/state')
const usage = require('./lib/usage')
const log = require('./lib/log')
const { LEVELS, levelOfLabels } = require('./levels')
const { agentIssueOf } = require('./route')

const REPORT_MARKER = '<!-- ai-autonomous-report -->'
const DEFAULT_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000

const LABEL_SUITABLE = 'ai:suitable'
const LABEL_UNSUITABLE = 'ai:unsuitable'
const LABEL_NEEDS_HUMAN = 'agent:needs-human'
const LABEL_COMPLETED = 'agent:completed'
const LABEL_REVIEWED = 'agent:pr-reviewed'

/** The flows and attempt results that the report lists in this order; anything else follows, sorted by name. */
const FLOWS = ['review', 'analyze', 'implement', 'ci-fix', 'ci-check', 'chat']
const RESULTS = ['pr-opened', 'draft', 'blocked', 'unrelated', 'ci-green', 'ci-red', 'error', 'stopped']

const labelNames = (item) => (item?.labels ?? []).map((l) => (typeof l === 'string' ? l : l?.name))
const hasLabel = (item, name) => labelNames(item).includes(name)
const share = (count, total) => (total === 0 ? 0 : count / total)
const percent = (fraction) => `${Math.round(fraction * 100)}%`
const cell = (text) => String(text ?? '').replace(/\s*\n\s*/g, ' ').replace(/\|/g, '\\|')
const count = (n) => Number(n ?? 0).toLocaleString('en-US')
const usd = (n) => `$${usage.formatUsd(n)}`
const isoSeconds = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z')
const plural = (n, noun) => `${n} ${noun}${n === 1 ? '' : 's'}`
const were = (n) => (n === 1 ? 'was' : 'were')
const byName = (a, b) => (a < b ? -1 : a > b ? 1 : 0)

// ---------------------------------------------------------------------------------------------------------------
// The period
// ---------------------------------------------------------------------------------------------------------------

/**
 * The period that ends at `now` and covers `days` days. `from` and `to` are UTC timestamps without milliseconds, the
 * form that GitHub search takes.
 *
 * @param {Date|number|string} now
 * @param {number} days a positive integer
 * @returns {{ from: string, to: string, days: number }}
 */
function periodOf(now, days) {
  if (!Number.isSafeInteger(days) || days < 1) throw new Error(`days: expected a positive integer, got '${days}'`)
  const end = new Date(now).getTime()
  if (!Number.isFinite(end)) throw new Error(`now: expected a valid date, got '${now}'`)
  const to = Math.floor(end / 1000) * 1000
  return { from: isoSeconds(to - days * DAY_MS), to: isoSeconds(to), days }
}

/** True when the timestamp `at` falls in the period, ends included. An invalid or missing `at` never does. */
function inPeriod(at, period) {
  if (typeof at !== 'string') return false
  const t = Date.parse(at)
  return Number.isFinite(t) && t >= Date.parse(period.from) && t <= Date.parse(period.to)
}

// ---------------------------------------------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------------------------------------------

/**
 * What the analysis decided about the issues. An issue with both labels counts as unsuitable: the cautious reading.
 * `needsHuman` counts issues that carry `agent:needs-human` now, whatever their `ai:*` label is.
 *
 * @returns {{ total: number, suitable: number, unsuitable: number, unlabeled: number, needsHuman: number }}
 */
function issueCounts(issues) {
  const counts = { total: 0, suitable: 0, unsuitable: 0, unlabeled: 0, needsHuman: 0 }
  for (const issue of issues ?? []) {
    counts.total += 1
    if (hasLabel(issue, LABEL_UNSUITABLE)) counts.unsuitable += 1
    else if (hasLabel(issue, LABEL_SUITABLE)) counts.suitable += 1
    else counts.unlabeled += 1
    if (hasLabel(issue, LABEL_NEEDS_HUMAN)) counts.needsHuman += 1
  }
  return counts
}

/**
 * Merged pull requests by execution level. A pull request with two levels counts with the lower one, as in levels.js.
 * `rows` lists every level from the least to the most autonomous, then the pull requests without a level (`level:
 * null`); `share` is a fraction of `total`.
 *
 * @returns {{ total: number, rows: Array<{ level: string|null, count: number, share: number }> }}
 */
function levelCounts(pulls) {
  const tally = new Map([...LEVELS, null].map((level) => [level, 0]))
  let total = 0
  for (const pull of pulls ?? []) {
    const level = levelOfLabels(pull?.labels)
    tally.set(level, tally.get(level) + 1)
    total += 1
  }
  return { total, rows: [...tally].map(([level, n]) => ({ level, count: n, share: share(n, total) })) }
}

/**
 * How the pull requests opened by the agent fared. The groups overlap: a pull request can be a draft and merged.
 * `pulls` are search items: `draft` and `pull_request.merged_at` come from the search API.
 *
 * @returns {{ opened: number, completed: number, draftOrNeedsHuman: number, merged: number }}
 */
function agentPrCounts(pulls) {
  const counts = { opened: 0, completed: 0, draftOrNeedsHuman: 0, merged: 0 }
  for (const pull of pulls ?? []) {
    counts.opened += 1
    if (hasLabel(pull, LABEL_COMPLETED)) counts.completed += 1
    if (pull?.draft === true || hasLabel(pull, LABEL_NEEDS_HUMAN)) counts.draftOrNeedsHuman += 1
    if (pull?.pull_request?.merged_at || pull?.merged_at) counts.merged += 1
  }
  return counts
}

const modelOf = (r) => `${r?.model ?? 'unknown'}${r?.variant ? `:${r.variant}` : ''}`

function tally(records, keyOf, order) {
  const rows = new Map()
  for (const r of records) {
    const key = keyOf(r)
    const row = rows.get(key) ?? { key, calls: 0, usd: 0 }
    row.calls += 1
    row.usd += Number.isFinite(r?.usd) ? r.usd : 0
    rows.set(key, row)
  }
  const rank = (key) => (order.includes(key) ? order.indexOf(key) : order.length)
  return [...rows.values()].sort((a, b) => rank(a.key) - rank(b.key) || byName(a.key, b.key))
}

/**
 * The cost records that fall in the period, summed by flow (known flows first), by model (with its variant), and in
 * total. A record with a missing or invalid `at` is left out.
 *
 * @param {object[]} records the `costs` of the states
 * @returns {{ flows: Array<{ flow: string, calls: number, usd: number }>,
 *   models: Array<{ model: string, calls: number, usd: number }>, total: { calls: number, usd: number } }}
 */
function costByFlow(records, period) {
  const inside = (records ?? []).filter((r) => inPeriod(r?.at, period))
  const flows = tally(inside, (r) => r.flow ?? 'unknown', FLOWS).map(({ key, calls, usd: sum }) => ({
    flow: key,
    calls,
    usd: sum,
  }))
  const models = tally(inside, modelOf, []).map(({ key, calls, usd: sum }) => ({ model: key, calls, usd: sum }))
  return {
    flows,
    models,
    total: { calls: inside.length, usd: inside.reduce((s, r) => s + (Number.isFinite(r?.usd) ? r.usd : 0), 0) },
  }
}

/**
 * The attempts recorded in the period, by result, and how many of them were forced. An attempt is the entry of
 * `attempts` in a state; a CI verdict replaces the result of the attempt it judges, so an attempt counts once with its
 * latest result. The state keeps one `forced` flag for the whole issue, so every attempt of a forced issue counts as
 * forced.
 *
 * @param {object[]} states the states of issues
 * @returns {{ total: number, results: Array<{ result: string, count: number }>, forced: number }}
 */
function attemptCounts(states, period) {
  const results = new Map()
  let total = 0
  let forced = 0
  for (const st of states ?? []) {
    for (const attempt of st?.attempts ?? []) {
      if (!inPeriod(attempt?.at, period)) continue
      total += 1
      if (st.forced === true) forced += 1
      const result = attempt.result ?? 'unknown'
      results.set(result, (results.get(result) ?? 0) + 1)
    }
  }
  const rank = (key) => (RESULTS.includes(key) ? RESULTS.indexOf(key) : RESULTS.length)
  const sorted = [...results]
    .sort((a, b) => rank(a[0]) - rank(b[0]) || byName(a[0], b[0]))
    .map(([result, n]) => ({ result, count: n }))
  return { total, results: sorted, forced }
}

// ---------------------------------------------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------------------------------------------

const table = (head, rows) => [
  `| ${head.join(' | ')} |`,
  `|---|${head.slice(1).map(() => '---:').join('|')}|`,
  ...rows.map((row) => `| ${row.map(cell).join(' | ')} |`),
]

/**
 * The report as Markdown: a heading with the period, one paragraph, then a table per topic. The first line is a hidden
 * marker so that people and scripts can find the comments of this report.
 *
 * @param {{ period: object, issues: object, levels: object, agentPrs: object, reviewed: number, costs: object,
 *   attempts: object, sources?: { read: number, unreadable: number } }} data the results of the functions above
 */
function renderReport({ period, issues, levels, agentPrs, reviewed, costs, attempts, sources }) {
  const day = (iso) => iso.slice(0, 10)
  const lines = [
    REPORT_MARKER,
    `## AI Autonomous report: ${day(period.from)} to ${day(period.to)}`,
    '',
    `In the last ${plural(period.days, 'day')} (UTC), ${plural(issues.total, 'Bug and Task issue')} ` +
      `${were(issues.total)} created, and ${issues.suitable} ${were(issues.suitable)} assessed as suitable for the ` +
      `agent. ${plural(levels.total, 'pull request')} ${were(levels.total)} merged. The agent opened ` +
      `${plural(agentPrs.opened, 'pull request')}, ${agentPrs.completed} of them reached ` +
      `\`${LABEL_COMPLETED}\`, and it reviewed ${plural(reviewed, 'pull request')}. It made ` +
      `${plural(costs.total.calls, 'AI call')} that cost about ${usd(costs.total.usd)}. Costs are estimates from ` +
      'the price table of opencode; the OpenAI bill is the authority.',
    '',
    '### Issues created',
    '',
    ...table(['Measure', 'Count'], [
      ['Bug and Task issues created', issues.total],
      [`Suitable (\`${LABEL_SUITABLE}\`)`, issues.suitable],
      [`Unsuitable (\`${LABEL_UNSUITABLE}\`)`, issues.unsuitable],
      ['Not assessed yet', issues.unlabeled],
      [`Waiting for a person now (\`${LABEL_NEEDS_HUMAN}\`)`, issues.needsHuman],
    ]),
    '',
    '### Merged pull requests by execution level',
    '',
    ...table(
      ['Level', 'Pull requests', 'Share'],
      levels.rows.map((r) => [r.level ? `\`${r.level}\`` : 'No level', r.count, percent(r.share)]),
    ),
    '',
    `Total: ${levels.total} merged pull requests.`,
    '',
    '### Pull requests of the agent',
    '',
    ...table(['Measure', 'Count'], [
      ['Opened in the period', agentPrs.opened],
      [`Reached \`${LABEL_COMPLETED}\``, agentPrs.completed],
      [`Draft or \`${LABEL_NEEDS_HUMAN}\``, agentPrs.draftOrNeedsHuman],
      ['Merged', agentPrs.merged],
      [`Reviewed by the agent (\`${LABEL_REVIEWED}\`)`, reviewed],
    ]),
    '',
    '### Attempts',
    '',
    ...(attempts.total === 0
      ? ['No attempt was recorded in the period.']
      : [
        ...table(['Result', 'Attempts'], attempts.results.map((r) => [`\`${r.result}\``, r.count])),
        '',
        `Total: ${plural(attempts.total, 'attempt')}, ${attempts.forced} of them forced.`,
      ]),
    '',
    '### AI calls',
    '',
    ...(costs.total.calls === 0
      ? ['No AI call was recorded in the period.']
      : [
        ...table(['Flow', 'Calls', 'USD'], costs.flows.map((f) => [f.flow, f.calls, usd(f.usd)])),
        '',
        ...table(['Model', 'Calls', 'USD'], costs.models.map((m) => [`\`${m.model}\``, m.calls, usd(m.usd)])),
        '',
        `**Total: ${usd(costs.total.usd)}** in ${plural(costs.total.calls, 'call')}.`,
      ]),
  ]
  if (sources) {
    lines.push(
      '',
      `State comments read: ${sources.read}.` +
        (sources.unreadable > 0 ? ` ${sources.unreadable} could not be read and are left out.` : ''),
    )
  }
  return lines.join('\n') + '\n'
}

// ---------------------------------------------------------------------------------------------------------------
// The script
// ---------------------------------------------------------------------------------------------------------------

/** A positive integer from a variable; blank means `fallback`. */
function readNumber(env, name, fallback) {
  const raw = typeof env[name] === 'string' ? env[name].trim() : ''
  if (raw === '') return fallback
  if (!/^[0-9]+$/.test(raw) || !Number.isSafeInteger(Number(raw)) || Number(raw) < 1) {
    throw new Error(`${name}: expected a positive integer, got '${raw}'`)
  }
  return Number(raw)
}

/** The search queries of the report. A timestamp with a colon needs no quotes; a label with a colon does. */
function queriesOf(repo, period) {
  const base = `repo:${repo}`
  return {
    bugs: `${base} is:issue type:Bug created:>=${period.from}`,
    tasks: `${base} is:issue type:Task created:>=${period.from}`,
    merged: `${base} is:pr is:merged merged:>=${period.from}`,
    // The marker is an HTML comment, which search may not index: take all pull requests of the period and filter.
    opened: `${base} is:pr created:>=${period.from}`,
    reviewed: `${base} is:pr label:"${LABEL_REVIEWED}" updated:>=${period.from}`,
  }
}

/** The items of `lists` without repeats, by number. Issues and pull requests share one numbering. */
function unique(...lists) {
  const byNumber = new Map()
  for (const item of lists.flat()) if (!byNumber.has(item.number)) byNumber.set(item.number, item)
  return [...byNumber.values()]
}

/** `gh` and `now` are injectable so that tests never touch the network or the clock. */
async function main(
  env = process.env,
  gh = createClient({ token: env.GITHUB_TOKEN, repo: env.GITHUB_REPOSITORY }),
  now = new Date(),
) {
  const config = loadConfig(env)
  const days = readNumber(env, 'AGENT_REPORT_DAYS', DEFAULT_DAYS)
  const reportIssue = readNumber(env, 'AGENT_REPORT_ISSUE', null)
  log.info('report start', { days, issue: reportIssue ?? 'none', enabled: config.enabled, dryRun: config.dryRun })
  if (!config.enabled) {
    log.info('decision', { action: 'skip', reason: 'AGENT_ENABLED is not true' })
    return
  }

  const period = periodOf(now, days)
  const queries = queriesOf(env.GITHUB_REPOSITORY, period)
  const found = await log.group('Search issues and pull requests', async () => {
    const result = {
      bugs: await gh.searchIssues(queries.bugs),
      tasks: await gh.searchIssues(queries.tasks),
      merged: await gh.searchIssues(queries.merged),
      opened: await gh.searchIssues(queries.opened),
      reviewed: await gh.searchIssues(queries.reviewed),
    }
    result.agentPrs = result.opened.filter((pull) => agentIssueOf(pull.body) !== null)
    result.issues = unique(result.bugs, result.tasks)
    log.info('found', {
      issues: result.issues.length,
      merged: result.merged.length,
      agentPrs: result.agentPrs.length,
      reviewed: result.reviewed.length,
    })
    return result
  })

  // The attempts and the implementation costs live in the state of the issue, which may be older than the period.
  const linked = found.agentPrs.map((pull) => agentIssueOf(pull.body))
  const numbers = [...new Set([
    ...found.issues.map((i) => i.number),
    ...found.merged.map((p) => p.number),
    ...found.agentPrs.map((p) => p.number),
    ...found.reviewed.map((p) => p.number),
    ...linked,
  ])]
  const states = []
  let unreadable = 0
  await log.group(`Read the state comments of ${numbers.length} issues and pull requests`, async () => {
    for (const number of numbers) {
      const comment = state.findStateComment(await gh.listIssueComments(number))
      if (!comment) continue
      try {
        const parsed = state.parse(comment.body)
        if (parsed) states.push(parsed)
      } catch (error) {
        unreadable += 1
        log.warn(`The state comment of #${number} is damaged and left out: ${error.message}`)
      }
    }
    log.info('states read', { states: states.length, unreadable })
  })

  const report = renderReport({
    period,
    issues: issueCounts(found.issues),
    levels: levelCounts(found.merged),
    agentPrs: agentPrCounts(found.agentPrs),
    reviewed: found.reviewed.length,
    costs: costByFlow(states.flatMap((st) => st.costs ?? []), period),
    attempts: attemptCounts(states.filter((st) => st.kind !== 'pull'), period),
    sources: { read: states.length, unreadable },
  })

  const posting = reportIssue !== null && !config.dryRun
  const note = config.dryRun
    ? reportIssue === null
      ? 'Dry run: nothing is posted.'
      : `Dry run: the report would be posted to #${reportIssue}.`
    : reportIssue === null
      ? 'No AGENT_REPORT_ISSUE is set: the report stays in the job summary.'
      : `Posted to #${reportIssue}.`
  if (env.GITHUB_STEP_SUMMARY) fs.appendFileSync(env.GITHUB_STEP_SUMMARY, `${report}\n${note}\n`)
  if (posting) {
    await log.group(`Post the report to #${reportIssue}`, async () => {
      await gh.createIssueComment(reportIssue, report)
    })
  }
  log.info('report done', { posted: posting, note })
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
  REPORT_MARKER,
  periodOf,
  inPeriod,
  issueCounts,
  levelCounts,
  agentPrCounts,
  costByFlow,
  attemptCounts,
  renderReport,
  queriesOf,
}
