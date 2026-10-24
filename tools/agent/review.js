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
const { commentableLines } = require('./lib/diff')
const { computeFacts } = require('./lib/facts')
const { callAgent } = require('./lib/agent-call')
const { untrusted } = require('./lib/prompt')
const log = require('./lib/log')

const SEVERITY_ORDER = ['blocker', 'major', 'minor', 'nit']
const SEVERITY_ICON = { blocker: '🛑', major: '🔴', minor: '🟡', nit: '⚪' }

/** Keeps the findings the verifier did not reject, marks the plausible ones, and sorts them by severity. */
function selectFindings(findings, verdicts) {
  const byId = new Map(verdicts.map((v) => [v.id, v]))
  // A finding the verifier skipped stays, marked plausible: dropping it would hide a possibly real problem.
  return findings
    .map((f) => {
      const v = byId.get(f.id)
      return { ...f, verdict: v?.verdict ?? 'plausible', verdictReason: v?.reason ?? '' }
    })
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

/** What the verifier did with the findings, for the summary: the review text was written before the verification. */
function verificationLine(findings, verdicts) {
  if (!findings.length) return ''
  const verdictOf = (f) => verdicts.find((x) => x.id === f.id)?.verdict ?? 'plausible'
  const count = (v) => findings.filter((f) => verdictOf(f) === v).length
  return `A second model checked the ${findings.length} finding(s): ${count('confirmed')} confirmed, ` +
    `${count('plausible')} plausible (shown, marked as not confirmed), ${count('rejected')} rejected (not shown). ` +
    'The text above was written before that check.'
}

/** The human part of the state comment: impact, findings outside the diff lines, and the cost so far. */
function renderSummary({ review, other, inlineCount, headSha, runUrl, totalUsd, verification = '' }) {
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
  if (verification) out.push(verification, '')
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

async function main() {
  const env = process.env
  const config = loadConfig(env)
  const number = Number(env.AGENT_NUMBER)
  // The parsed `/agent review` command, when a comment started the run; empty for a pull_request event.
  const command = env.AGENT_COMMAND ? JSON.parse(env.AGENT_COMMAND) : null
  const out = env.AGENT_OUT
  const runUrl = env.AGENT_RUN_URL
  fs.mkdirSync(out, { recursive: true })
  const gh = createClient({ token: env.GITHUB_TOKEN, repo: env.GITHUB_REPOSITORY })
  log.info('review starts', {
    pr: number,
    dryRun: config.dryRun,
    review: `${config.models.review.id}:${config.models.review.variant}`,
    verify: `${config.models.verify.id}:${config.models.verify.variant}`,
  })

  const { pr, files, mergeBase, headSha, facts } = await log.group('Load the pull request', async () => {
    const pr = await gh.getPull(number)
    const files = await gh.listPullFiles(number)
    git(['fetch', '--no-tags', 'origin', pr.base.ref])
    const mergeBase = git(['merge-base', 'FETCH_HEAD', 'HEAD'])
    const headSha = git(['rev-parse', 'HEAD'])
    log.info('pull request', { title: pr.title, author: pr.user?.login, base: pr.base.ref, mergeBase, headSha })
    log.info('changed files', { count: files.length, withoutPatch: files.filter((f) => !f.patch).length })
    const facts = computeFacts({
      files: files.map((f) => f.filename),
      labelerYaml: fs.readFileSync(env.AGENT_LABELER, 'utf8'),
      title: pr.title,
      body: pr.body ?? '',
    })
    log.json('impact facts', facts)
    return { pr, files, mergeBase, headSha, facts }
  })

  const { existing, initial } = await log.group('Load the state', async () => {
    const existing = state.findStateComment(await gh.listIssueComments(number))
    const initial = (existing && state.parse(existing.body)) || state.emptyPullState(number)
    log.info('state', {
      comment: existing?.id ?? 'none',
      reviews: initial.reviews?.length ?? 0,
      usdSoFar: (initial.costs ?? []).reduce((s, c) => s + c.usd, 0).toFixed(4),
    })
    return { existing, initial }
  })
  let st = initial
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
        untrusted(`Title: ${pr.title}\n\n${pr.body ?? ''}`),
        '',
        // The notes after `/agent review` steer the review: what the maintainer wants looked at.
        ...(command?.notes
          ? ['## Request of the maintainer who asked for this review', '', untrusted(command.notes), '']
          : []),
      ].join('\n'),
    )
    review = await log.group('Review (pr-reviewer)', () =>
      callAgent({
        flow: 'review',
        role: 'pr-reviewer',
        agent: 'pr-reviewer',
        model: config.models.review,
        message: `Review pull request #${number}. Your input is the attached review-input.md.`,
        inputFile: reviewInput,
        out,
        costs,
        runUrl,
        schema: 'review',
      }),
    )
    log.info('review', { risk: review.risk, findings: review.findings.length })

    let verdicts = []
    if (!review.findings.length) log.info('verification skipped: no findings')
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
        await log.group('Verify the findings (verifier)', () =>
          callAgent({
            flow: 'review',
            role: 'verifier',
            agent: 'verifier',
            model: config.models.verify,
            message: 'Verify the findings in the attached verify-input.md.',
            inputFile: verifyInput,
            out,
            costs,
            runUrl,
            schema: 'verification',
          }),
        )
      ).verdicts
    }

    const kept = selectFindings(review.findings, verdicts)
    const placed = placeFindings(kept, files)
    inline = placed.inline
    // One line per finding: what happened to it and why, so a missing comment can be explained from the log.
    for (const f of review.findings) {
      const v = verdicts.find((x) => x.id === f.id)
      const where = placed.inline.includes(kept.find((k) => k.id === f.id)) ? 'inline' : 'summary'
      log.info('finding', {
        id: f.id,
        severity: f.severity,
        at: `${f.file}:${f.line ?? '-'}`,
        verdict: v?.verdict ?? 'none',
        placed: v?.verdict === 'rejected' ? 'dropped' : where,
        title: f.title,
      })
    }
    const totalUsd = [...st.costs, ...costs].reduce((s, c) => s + c.usd, 0)
    human = renderSummary({
      review,
      other: placed.other,
      inlineCount: inline.length,
      headSha,
      runUrl,
      totalUsd,
      verification: verificationLine(review.findings, verdicts),
    })
    fs.writeFileSync(path.join(out, 'summary.md'), human)
  } catch (err) {
    failure = err
    log.error(`review failed: ${err.message}`)
  }

  for (const c of costs) st = state.addCost(st, c)
  log.info('cost', {
    thisRun: costs.reduce((s, c) => s + c.usd, 0).toFixed(4),
    pullRequestTotal: st.costs.reduce((s, c) => s + c.usd, 0).toFixed(4),
  })
  if (!failure) {
    const entry = { sha: headSha, run: runUrl, at: new Date().toISOString() }
    st = { ...st, reviews: [...(st.reviews ?? []), entry] }
  }
  if (failure) {
    human = `### AI review failed\n\nThe review of ${headSha.slice(0, 7)} did not finish: ${failure.message}\n\n` +
      `<sub>[Run](${runUrl}) · comment \`/agent review\` to try again</sub>`
  }

  await log.group(config.dryRun ? 'Publish (dry run: job summary only)' : 'Publish', async () => {
    if (config.dryRun) {
      const report = [`## Dry run: AI review of #${number}`, '', human, '']
      for (const f of inline) {
        report.push(`- inline \`${f.file}:${f.line}\`: ${findingBody(f).replace(/\s*\n\s*/g, ' ')}`)
      }
      if (env.GITHUB_STEP_SUMMARY) fs.appendFileSync(env.GITHUB_STEP_SUMMARY, report.join('\n') + '\n')
      log.info('dry run: written to the job summary', { inline: inline.length })
      return
    }
    // The state comment goes first: it holds the cost record, which must survive a failed review post. It is read
    // again right before the write, so a cost record that chat added since the state was loaded survives too.
    const body = state.render(human, await state.withFreshCosts(gh, number, st))
    if (existing) {
      await gh.updateIssueComment(existing.id, body)
      log.info('state comment updated', { id: existing.id })
    } else {
      const created = await gh.createIssueComment(number, body)
      log.info('state comment created', { id: created?.id })
    }
    if (inline.length) {
      try {
        const created = await gh.createReview(number, {
          commitId: headSha,
          body: `AI review of ${headSha.slice(0, 7)}: ${inline.length} inline finding(s). The summary is in the AI ` +
            'review comment of this pull request.',
          comments: inline.map((f) => ({ path: f.file, line: f.line, body: findingBody(f) })),
        })
        log.info('review posted', { id: created?.id, comments: inline.length })
      } catch (err) {
        log.error(`the inline review could not be posted: ${err.message}`)
        failure ??= err
      }
    }
    if (!failure) {
      await gh.addLabels(number, ['agent:pr-reviewed'])
      log.info('label added', { label: 'agent:pr-reviewed' })
    }
  })
  if (failure) throw failure
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}

module.exports = { selectFindings, placeFindings, renderSummary, findingBody, verificationLine }
