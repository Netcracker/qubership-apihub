#!/usr/bin/env node
/**
 * Flow A of the AI Autonomous agent: review a pull request and assess its impact.
 *
 * The working tree is the head of the pull request; this script and the opencode config come from a trusted checkout
 * (see the `review` job of .github/workflows/ai-autonomous-agent.yml). Steps:
 *
 *   1. facts by script: changed files, modules, risk flags, the merge base;
 *   2. `pr-reviewer` (the review model) writes the review as JSON;
 *   3. `verifier` (the verify model, a different one) confirms or rejects each finding;
 *   4. publish: one review with inline comments on the lines a review comment can target, the state comment of the
 *      pull request rewritten with the summary, and the `agent:pr-reviewed` label. In dry-run, the job summary instead.
 *
 * The cost of every opencode run is recorded in the state, also when a later step fails.
 *
 * Environment: GITHUB_REPOSITORY, GITHUB_TOKEN, OPENAI_API_KEY, AGENT_NUMBER (the pull request), AGENT_RUN_URL,
 * AGENT_LABELER (path of .github/labeler.yml), AGENT_OUT (folder for inputs, events, and outputs), the AGENT_*
 * variables of lib/config.js, GITHUB_STEP_SUMMARY.
 */
'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { loadConfig } = require('./lib/config')
const { createClient } = require('./lib/github')
const state = require('./lib/state')
const usage = require('./lib/usage')
const { extractJson, validate } = require('./lib/contract')
const { commentableLines } = require('./lib/diff')
const { computeFacts } = require('./lib/facts')
const { runAgent } = require('./lib/opencode')

const SEVERITY_ORDER = ['blocker', 'major', 'minor', 'nit']
const SEVERITY_ICON = { blocker: '🛑', major: '🔴', minor: '🟡', nit: '⚪' }

/** Keeps the findings the verifier did not reject, marks the plausible ones, and sorts them by severity. */
function selectFindings(findings, verdicts) {
  const byId = new Map(verdicts.map((v) => [v.id, v]))
  // A finding the verifier skipped stays, marked plausible: dropping it would hide a possibly real problem.
  return findings
    .map((f) => ({ ...f, verdict: byId.get(f.id)?.verdict ?? 'plausible', verdictReason: byId.get(f.id)?.reason ?? '' }))
    .filter((f) => f.verdict !== 'rejected')
    .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity))
}

/** Splits findings into inline review comments (a line inside the diff) and the rest, which go to the summary. */
function placeFindings(findings, files) {
  const lines = new Map(files.map((f) => [f.filename, commentableLines(f.patch)]))
  const inline = []
  const other = []
  for (const f of findings) {
    if (f.line !== null && lines.get(f.file)?.has(f.line)) inline.push(f)
    else other.push(f)
  }
  return { inline, other }
}

function findingBody(f) {
  const tag = f.verdict === 'plausible' ? ' (plausible, not confirmed)' : ''
  return `${SEVERITY_ICON[f.severity]} **${f.severity}**${tag}: ${f.title}\n\n${f.body}`
}

const yesNo = (b) => (b ? 'yes' : 'no')
// Model text in a table cell: one line, and a pipe must not end the cell.
const cell = (s) => String(s).replace(/\s*\n\s*/g, ' ').replace(/\|/g, '\\|')

/** The human part of the state comment: impact, findings outside the diff lines, and the cost so far. */
function renderSummary({ review, other, inlineCount, headSha, runUrl, totalUsd }) {
  const i = review.impact
  const changed = (x) => `changed: ${yesNo(x.changed)}${'breaking' in x ? `, breaking: ${yesNo(x.breaking)}` : ''}`
  const out = [
    `### AI review of ${headSha.slice(0, 7)}`,
    '',
    review.summary,
    '',
    `**Risk: ${review.risk}.** ${review.riskReason}`,
    '',
    '| Impact | |',
    '|---|---|',
    `| Modules | ${cell(i.modules.join(', ') || 'none')} |`,
    `| Images | ${cell(i.images.join(', ') || 'none')} |`,
    `| REST API | ${changed(i.restApi)}. ${cell(i.restApi.notes)} |`,
    `| Database | ${changed(i.database)}. ${cell(i.database.notes)} |`,
    `| Deployment | ${changed(i.deploy)}. ${cell(i.deploy.notes)} |`,
    `| E2E | ${cell(i.e2e.collections.join(', ') || 'none named')}. ${cell(i.e2e.notes)} |`,
    '',
  ]
  if (inlineCount) out.push(`${inlineCount} finding(s) are inline comments on the diff.`, '')
  if (other.length) {
    out.push('**Findings outside the diff lines**', '')
    // A list item is one paragraph: every line break of the model text becomes a space.
    for (const f of other) {
      out.push(`- \`${f.file}${f.line ? `:${f.line}` : ''}\`: ${findingBody(f).replace(/\s*\n\s*/g, ' ')}`)
    }
    out.push('')
  }
  if (!inlineCount && !other.length) out.push('No findings.', '')
  out.push(
    `<sub>[Run](${runUrl}) · AI cost of this pull request so far: $${usage.formatUsd(totalUsd)} · ` +
      'comment `/agent review` to review again, `/agent cost` for details</sub>',
  )
  return out.join('\n')
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim()
}

/** One opencode call; returns the parsed JSON output and appends the cost record, whatever happens. */
async function callAgent({ role, agent, model, message, inputFile, out, costs, runUrl, schema }) {
  const eventsFile = path.join(out, `${agent}.jsonl`)
  const run = await runAgent({ agent, model, message, files: [inputFile], cwd: process.cwd(), eventsFile })
  const summary = usage.summarize(usage.parseEvents(run.eventsText))
  costs.push(usage.costRecord({ run: runUrl, flow: 'review', role, model: model.id, variant: model.variant, summary }))
  fs.writeFileSync(path.join(out, `${agent}.final.md`), summary.finalText)
  if (run.exitCode !== 0 && !summary.finalText) {
    throw new Error(`${agent} exited with ${run.exitCode}: ${run.stderrTail.slice(-500)}`)
  }
  return validate(schema, extractJson(summary.finalText))
}

async function main() {
  const env = process.env
  const config = loadConfig(env)
  const number = Number(env.AGENT_NUMBER)
  const out = env.AGENT_OUT
  const runUrl = env.AGENT_RUN_URL
  fs.mkdirSync(out, { recursive: true })
  const gh = createClient({ token: env.GITHUB_TOKEN, repo: env.GITHUB_REPOSITORY })

  const pr = await gh.getPull(number)
  const files = await gh.listPullFiles(number)
  git(['fetch', '--no-tags', 'origin', pr.base.ref])
  const mergeBase = git(['merge-base', 'FETCH_HEAD', 'HEAD'])
  const headSha = git(['rev-parse', 'HEAD'])
  const facts = computeFacts({
    files: files.map((f) => f.filename),
    labelerYaml: fs.readFileSync(env.AGENT_LABELER, 'utf8'),
    title: pr.title,
    body: pr.body ?? '',
  })

  const comments = await gh.listIssueComments(number)
  const existing = state.findStateComment(comments)
  let st = (existing && state.parse(existing.body)) || state.emptyPullState(number)
  const costs = []
  let human = null
  let failure = null
  let review = null
  let inline = []

  try {
    const reviewInput = path.join(out, 'review-input.md')
    fs.writeFileSync(
      reviewInput,
      [
        `# Pull request #${number}`,
        '',
        `- Base branch: ${pr.base.ref}`,
        `- Merge base: ${mergeBase}`,
        `- Head: ${headSha}`,
        '',
        '## impact-facts.json',
        '',
        '```json',
        JSON.stringify(facts, null, 2),
        '```',
        '',
        '## Title and description',
        '',
        '<untrusted>',
        `Title: ${pr.title}`,
        '',
        pr.body ?? '',
        '</untrusted>',
        '',
      ].join('\n'),
    )
    review = await callAgent({
      role: 'pr-reviewer',
      agent: 'pr-reviewer',
      model: config.models.review,
      message: `Review pull request #${number}. Your input is the attached review-input.md.`,
      inputFile: reviewInput,
      out,
      costs,
      runUrl,
      schema: 'review',
    })

    let verdicts = []
    if (review.findings.length) {
      const verifyInput = path.join(out, 'verify-input.md')
      fs.writeFileSync(
        verifyInput,
        [
          `- Merge base: ${mergeBase}`,
          `- Head: ${headSha}`,
          '',
          '```json',
          JSON.stringify(review.findings, null, 2),
          '```',
          '',
        ].join('\n'),
      )
      verdicts = (
        await callAgent({
          role: 'verifier',
          agent: 'verifier',
          model: config.models.verify,
          message: 'Verify the findings in the attached verify-input.md.',
          inputFile: verifyInput,
          out,
          costs,
          runUrl,
          schema: 'verification',
        })
      ).verdicts
    }

    const kept = selectFindings(review.findings, verdicts)
    const placed = placeFindings(kept, files)
    inline = placed.inline
    const totalUsd = [...st.costs, ...costs].reduce((s, c) => s + c.usd, 0)
    human = renderSummary({ review, other: placed.other, inlineCount: inline.length, headSha, runUrl, totalUsd })
    fs.writeFileSync(path.join(out, 'summary.md'), human)
  } catch (err) {
    failure = err
  }

  for (const c of costs) st = state.addCost(st, c)
  if (!failure) {
    const entry = { sha: headSha, run: runUrl, at: new Date().toISOString() }
    st = { ...st, reviews: [...(st.reviews ?? []), entry] }
  }
  if (failure) {
    human = `### AI review failed\n\nThe review of ${headSha.slice(0, 7)} did not finish: ${failure.message}\n\n` +
      `<sub>[Run](${runUrl}) · comment \`/agent review\` to try again</sub>`
  }
  const body = state.render(human, st)

  if (config.dryRun) {
    const report = [`## Dry run: AI review of #${number}`, '', human, '']
    for (const f of inline) {
      report.push(`- inline \`${f.file}:${f.line}\`: ${findingBody(f).replace(/\s*\n\s*/g, ' ')}`)
    }
    fs.appendFileSync(env.GITHUB_STEP_SUMMARY, report.join('\n') + '\n')
  } else {
    if (inline.length) {
      await gh.createReview(number, {
        commitId: headSha,
        body: `AI review of ${headSha.slice(0, 7)}: ${inline.length} inline finding(s). The summary is in the AI ` +
          'review comment of this pull request.',
        comments: inline.map((f) => ({ path: f.file, line: f.line, body: findingBody(f) })),
      })
    }
    if (existing) await gh.updateIssueComment(existing.id, body)
    else await gh.createIssueComment(number, body)
    if (!failure) await gh.addLabels(number, ['agent:pr-reviewed'])
  }
  if (failure) throw failure
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}

module.exports = { selectFindings, placeFindings, renderSummary, findingBody }
