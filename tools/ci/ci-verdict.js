#!/usr/bin/env node
/**
 * The verdict of the `ci-ok` job, the one required check.
 *
 * `needs` carries each job's result and the outputs of `plan`. A job passes when it succeeded. A job
 * that failed or was cancelled always fails the verdict. A skipped job fails it too when the plan says
 * the job had to run; a skip is accepted only where the plan makes it correct:
 *
 *   go, java, screenshot-tests   skipped when nothing in their area is affected
 *   e2e                          skipped when the plan chose no E2E tier
 *   storybooks, storybook-pages  skipped on pull requests
 *
 * Everything else must succeed. A job that is missing from `needs`, or one this script does not know,
 * fails the verdict: adding a job to the workflow without deciding what its skip means is an error.
 * If `plan` itself failed its outputs are empty, so every optional job counts as required and the
 * verdict fails on `plan` anyway.
 *
 * Environment: NEEDS (the JSON of `toJSON(needs)`), EVENT (`github.event_name`).
 * Prints a Markdown table to stdout; exits 1 on a bad verdict.
 */

const needs = JSON.parse(process.env.NEEDS || '{}')
const event = process.env.EVENT || ''
const out = (needs.plan && needs.plan.outputs) || {}

// Is the job due? An empty output (plan failed) counts as due.
const due = {
  plan: true,
  js: true,
  'go-checks': true,
  go: out.go_projects !== '[]',
  java: out.java_projects !== '[]',
  'screenshot-tests': out.screenshot_projects !== '[]',
  'js-images': out.image_projects !== '[]',
  'go-images': out.image_projects !== '[]',
  'java-images': out.image_projects !== '[]',
  e2e: out.e2e_tier !== 'none',
  storybooks: event !== 'pull_request',
  'storybook-pages': event !== 'pull_request',
}

const problems = []
const rows = []

for (const name of Object.keys(due)) {
  if (!(name in needs)) problems.push(`${name}: not listed in the needs of ci-ok`)
}

for (const [name, job] of Object.entries(needs)) {
  const result = job.result
  const isDue = name in due ? due[name] : true
  let verdict = 'ok'
  if (result === 'failure' || result === 'cancelled') {
    verdict = `FAILED (${result})`
    problems.push(`${name}=${result}`)
  } else if (result === 'skipped' && isDue) {
    verdict = 'FAILED (skipped, but it had to run)'
    problems.push(`${name}=skipped, but the plan requires it`)
  } else if (result === 'skipped') {
    verdict = 'skipped, as planned'
  } else if (result !== 'success') {
    verdict = `FAILED (unexpected result "${result}")`
    problems.push(`${name}=${result}`)
  }
  rows.push(`| ${name} | ${result} | ${isDue ? 'required' : 'optional'} | ${verdict} |`)
}

console.log('### ci-ok')
console.log()
console.log('| job | result | due | verdict |')
console.log('|---|---|---|---|')
for (const r of rows) console.log(r)
console.log()

if (problems.length) {
  console.log(`**Not ok:** ${problems.join('; ')}`)
  console.error(`FAILED: ${problems.join('; ')}`)
  process.exit(1)
}
console.log('All required jobs succeeded; every skip is one the plan expects.')
