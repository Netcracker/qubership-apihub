#!/usr/bin/env node
/**
 * Execution levels of the AI Autonomous agent: copies the `ai:l*` label of a merged pull request to the issues it
 * closes, because the team counts work by issue. It uses no model and costs nothing.
 *
 * The workflow (.github/workflows/ai-autonomous-levels.yml) runs on `pull_request_target` when a pull request is
 * merged or gets an `ai:l*` label, and checks out no code of the pull request. Steps:
 *
 *   1. read the pull request and the issues it closes (GraphQL `closingIssuesReferences`);
 *   2. for each issue, collect the merged pull requests that close it; the issue gets the LOWEST level among those
 *      that have one (the issue was as autonomous as its least autonomous part), and loses its other level labels;
 *   3. a merged pull request without a level gets one reminder comment; an agent pull request that holds commits
 *      without an `Agent-Run:` trailer gets one comment that counts them.
 *
 * In dry-run, the job summary shows what would change. Environment: GITHUB_REPOSITORY, GITHUB_TOKEN, AGENT_NUMBER
 * (the pull request), AGENT_RUN_URL, the AGENT_* variables of lib/config.js, GITHUB_STEP_SUMMARY.
 */
'use strict'

const fs = require('node:fs')
const { loadConfig, isActorAllowed } = require('./lib/config')
const { createClient } = require('./lib/github')
const log = require('./lib/log')

/** From the least to the most autonomous. */
const LEVELS = ['ai:l0-assistant', 'ai:l1-executor', 'ai:l2-agent', 'ai:l3-autonomous']
const REMINDER_MARKER = '<!-- ai-autonomous-levels -->'
const COMMITS_MARKER = '<!-- ai-autonomous-levels-commits -->'
const AGENT_PR_MARKER = '<!-- ai-autonomous-agent '
const BOT = 'github-actions[bot]'

const names = (labels) => (labels ?? []).map((label) => (typeof label === 'string' ? label : label?.name))

/** The lowest level among the labels of one pull request, or `null` when it has none. */
function levelOfLabels(labels) {
  const found = names(labels).map((name) => LEVELS.indexOf(name)).filter((i) => i !== -1)
  return found.length === 0 ? null : LEVELS[Math.min(...found)]
}

/**
 * The lowest level among the pull requests that have one, or `null` when none has. A pull request with two level
 * labels counts with its lower one.
 *
 * @param {Array<Array<string|{name: string}>>} labelSets the labels of each merged pull request
 */
function lowestLevel(labelSets) {
  const levels = labelSets.map(levelOfLabels).filter((level) => level !== null)
  return levels.length === 0 ? null : LEVELS[Math.min(...levels.map((level) => LEVELS.indexOf(level)))]
}

/**
 * The labels to add to and remove from an issue so that it carries `level` and no other level. `level: null` means
 * no merged pull request has a level yet, so the issue stays as it is.
 *
 * @returns {{ add: string[], remove: string[] }}
 */
function levelChanges(issueLabels, level) {
  if (level === null) return { add: [], remove: [] }
  const have = names(issueLabels)
  return {
    add: have.includes(level) ? [] : [level],
    remove: have.filter((name) => LEVELS.includes(name) && name !== level),
  }
}

/** How many commits carry no `Agent-Run:` trailer, so people wrote them. `commits` come from the REST API. */
function countCommitsWithoutRun(commits) {
  return commits.filter((c) => !/^Agent-Run:\s*\S/im.test(c?.commit?.message ?? '')).length
}

/** True when the workflow bot already left a comment with `marker`. */
function hasMarker(comments, marker) {
  return (comments ?? []).some((c) => c?.user?.login === BOT && typeof c.body === 'string' && c.body.includes(marker))
}

const issueList = (numbers) => `issue${numbers.length > 1 ? 's' : ''} ${numbers.map((n) => `#${n}`).join(', ')}`

/** The reminder for a merged pull request without a level. */
function reminderBody(issueNumbers) {
  return [
    REMINDER_MARKER,
    `This pull request has no execution level label (${LEVELS[0]} ... ${LEVELS[LEVELS.length - 1]}). ` +
      `Add one; the agent copies it to ${issueList(issueNumbers)}.`,
    '',
  ].join('\n')
}

/** The note on an agent pull request that people added commits to. */
function commitsBody({ people, total }) {
  return [
    COMMITS_MARKER,
    `${people} of ${total} commits on this pull request have no \`Agent-Run:\` trailer, so people wrote them. ` +
      'The level stays as it is, because it is a human judgment. If the people\'s commits were substantial, ' +
      `consider \`${LEVELS[0]}\`.`,
    '',
  ].join('\n')
}

/** The numbers and labels of the issues a pull request closes, from the `closingIssuesReferences` response. */
function closingIssuesOf(response) {
  const nodes = response?.data?.repository?.pullRequest?.closingIssuesReferences?.nodes ?? []
  return nodes.filter(Boolean).map((n) => ({ number: n.number, labels: names(n.labels?.nodes) }))
}

/**
 * The merged pull requests that close an issue, from the `closedByPullRequestsReferences` response, as
 * `{ number, labels }`. `current` (the pull request of this run, with fresh labels) replaces the entry with its
 * number or is added: the index of GitHub can lag behind a merge or a label.
 */
function mergedPullsOf(response, current) {
  const nodes = response?.data?.repository?.issue?.closedByPullRequestsReferences?.nodes ?? []
  const pulls = new Map()
  for (const n of nodes.filter(Boolean)) {
    if (n.merged) pulls.set(n.number, { number: n.number, labels: names(n.labels?.nodes) })
  }
  if (current) pulls.set(current.number, current)
  return [...pulls.values()].sort((a, b) => a.number - b.number)
}

const CLOSING_ISSUES_QUERY = `query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      closingIssuesReferences(first: 20) {
        nodes { number labels(first: 50) { nodes { name } } }
      }
    }
  }
}`

const CLOSING_PULLS_QUERY = `query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    issue(number: $number) {
      closedByPullRequestsReferences(first: 20, includeClosedPrs: true) {
        nodes { number merged labels(first: 50) { nodes { name } } }
      }
    }
  }
}`

/** `gh` is injectable so that tests never touch the network. */
async function main(
  env = process.env,
  gh = createClient({ token: env.GITHUB_TOKEN, repo: env.GITHUB_REPOSITORY }),
) {
  const config = loadConfig(env)
  const number = Number(env.AGENT_NUMBER)
  const [owner, name] = env.GITHUB_REPOSITORY.split('/')
  log.info('levels start', { pullRequest: number, enabled: config.enabled, dryRun: config.dryRun })
  if (!config.enabled) {
    log.info('decision', { action: 'skip', reason: 'AGENT_ENABLED is not true' })
    return
  }

  const pr = await log.group('Load the pull request', async () => {
    const found = await gh.getPull(number)
    log.info('pull request loaded', {
      merged: found.merged,
      author: found.user?.login,
      labels: names(found.labels).join(',') || 'none',
    })
    return found
  })
  if (!pr.merged) {
    log.info('decision', { action: 'skip', reason: 'the pull request is not merged' })
    return
  }
  if (!isActorAllowed(config, pr.user?.login)) {
    log.info('decision', { action: 'skip', reason: `author '${pr.user?.login}' is not in AGENT_ALLOWED_ACTORS` })
    return
  }

  const issues = await log.group('Find the issues the pull request closes', async () => {
    const found = closingIssuesOf(await gh.graphql(CLOSING_ISSUES_QUERY, { owner, name, number }))
    log.info('closing issues', { issues: found.map((i) => `#${i.number}`).join(',') || 'none' })
    return found
  })

  const current = { number, labels: names(pr.labels) }
  const prLevel = lowestLevel([current.labels])
  const report = [`## ${config.dryRun ? 'Dry run: ' : ''}AI execution levels for #${number}`, '']

  for (const issue of issues) {
    await log.group(`Level of issue #${issue.number}`, async () => {
      const response = await gh.graphql(CLOSING_PULLS_QUERY, { owner, name, number: issue.number })
      const pulls = mergedPullsOf(response, current)
      const level = lowestLevel(pulls.map((p) => p.labels))
      const changes = levelChanges(issue.labels, level)
      log.info('level decided', {
        issue: issue.number,
        mergedPulls: pulls.map((p) => `#${p.number}=${levelOfLabels(p.labels) ?? 'none'}`).join(','),
        level,
        add: changes.add.join(',') || 'none',
        remove: changes.remove.join(',') || 'none',
      })
      report.push(
        `- issue #${issue.number}: level ${level ?? 'none'}, add ${changes.add.join(', ') || 'none'}, ` +
          `remove ${changes.remove.join(', ') || 'none'}`,
      )
      if (config.dryRun) return
      if (changes.add.length) await gh.addLabels(issue.number, changes.add)
      for (const label of changes.remove) await gh.removeLabel(issue.number, label)
    })
  }

  await log.group('Comment on the pull request', async () => {
    const comments = await gh.listIssueComments(number)
    const notes = []
    if (prLevel === null && issues.length > 0 && !hasMarker(comments, REMINDER_MARKER)) {
      notes.push(['level reminder', reminderBody(issues.map((i) => i.number))])
    }
    if (typeof pr.body === 'string' && pr.body.includes(AGENT_PR_MARKER) && !hasMarker(comments, COMMITS_MARKER)) {
      const commits = await gh.listPullCommits(number)
      const people = countCommitsWithoutRun(commits)
      log.info('commits', { total: commits.length, withoutAgentRun: people })
      if (people > 0) notes.push(['people commits note', commitsBody({ people, total: commits.length })])
    }
    if (notes.length === 0) log.info('no comment needed', { level: prLevel ?? 'none' })
    for (const [what, body] of notes) {
      report.push(`- ${config.dryRun ? 'would comment' : 'comment'} (${what}): ${body.split('\n')[1]}`)
      log.info(config.dryRun ? 'dry run: would comment' : 'comment', { what })
      if (!config.dryRun) await gh.createIssueComment(number, body)
    }
  })

  if (config.dryRun && env.GITHUB_STEP_SUMMARY) fs.appendFileSync(env.GITHUB_STEP_SUMMARY, report.join('\n') + '\n')
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
  LEVELS,
  REMINDER_MARKER,
  COMMITS_MARKER,
  levelOfLabels,
  lowestLevel,
  levelChanges,
  countCommitsWithoutRun,
  hasMarker,
  reminderBody,
  commitsBody,
  closingIssuesOf,
  mergedPullsOf,
}
