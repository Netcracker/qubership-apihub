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
 *   storybook-pages              also skipped while the variable PAGES_DEPLOY is not `true`
 *   js-images, go-images, java-images, e2e, storybooks, storybook-pages
 *                                skipped when the plan says the run cannot publish (`can_publish` is
 *                                `false`: a pull request from a fork, or Dependabot), because the
 *                                token has no package write access there
 *
 * Everything else must succeed. A job that is missing from `needs`, or one this script does not know,
 * fails the verdict: adding a job to the workflow without deciding what its skip means is an error.
 * If `plan` itself failed its outputs are empty, so every optional job counts as required and the
 * verdict fails on `plan` anyway.
 *
 * The jobs after the verdict (release-artifacts and release-artifacts-dry-run, which need ci-ok) are not
 * in `needs` and cannot change it, so they never fail ci-ok on any branch. ci-verdict.test.js checks that
 * the needs of ci-ok are exactly every other job of ci.yml and the keys of DUE_JOBS.
 *
 * Environment: NEEDS (the JSON of `toJSON(needs)`), EVENT (`github.event_name`), PAGES_DEPLOY
 * (`vars.PAGES_DEPLOY`).
 * Prints a Markdown table to stdout; exits 1 on a bad verdict.
 */

/** Is each job due? An empty plan output (plan failed) counts as due. */
function dueJobs(out, event, pagesDeploy) {
  // Only the exact string `false` excuses a skip; an empty output (plan failed) counts as publishing.
  const canPublish = out.can_publish !== 'false'
  return {
    plan: true,
    js: true,
    'go-checks': true,
    go: out.go_projects !== '[]',
    java: out.java_projects !== '[]',
    'screenshot-tests': out.screenshot_projects !== '[]',
    'js-images': out.image_projects !== '[]' && canPublish,
    'go-images': out.image_projects !== '[]' && canPublish,
    'java-images': out.image_projects !== '[]' && canPublish,
    e2e: out.e2e_tier !== 'none' && canPublish,
    storybooks: event !== 'pull_request' && canPublish,
    // ci.yml dispatches pages.yml only while the repository variable PAGES_DEPLOY is `true`.
    'storybook-pages': event !== 'pull_request' && canPublish && pagesDeploy,
  }
}

const DUE_JOBS = Object.keys(dueJobs({}, '', false))

/** `{ ok, rows, problems }` for the `needs` of ci-ok. */
function verdict(needs, event, pagesDeploy) {
  const due = dueJobs((needs.plan && needs.plan.outputs) || {}, event, pagesDeploy)
  const problems = []
  const rows = []

  for (const name of Object.keys(due)) {
    if (!(name in needs)) problems.push(`${name}: not listed in the needs of ci-ok`)
  }

  for (const [name, job] of Object.entries(needs)) {
    const result = job.result
    const isDue = name in due ? due[name] : true
    let text = 'ok'
    if (result === 'failure' || result === 'cancelled') {
      text = `FAILED (${result})`
      problems.push(`${name}=${result}`)
    } else if (result === 'skipped' && isDue) {
      text = 'FAILED (skipped, but it had to run)'
      problems.push(`${name}=skipped, but the plan requires it`)
    } else if (result === 'skipped') {
      text = 'skipped, as planned'
    } else if (result !== 'success') {
      text = `FAILED (unexpected result "${result}")`
      problems.push(`${name}=${result}`)
    }
    rows.push(`| ${name} | ${result} | ${isDue ? 'required' : 'optional'} | ${text} |`)
  }
  return { ok: problems.length === 0, rows, problems }
}

if (require.main === module) {
  const { rows, problems } = verdict(
    JSON.parse(process.env.NEEDS || '{}'),
    process.env.EVENT || '',
    process.env.PAGES_DEPLOY === 'true',
  )
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
}

module.exports = { DUE_JOBS, dueJobs, verdict }
