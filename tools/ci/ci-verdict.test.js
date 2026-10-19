const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { DUE_JOBS, verdict } = require('./ci-verdict')

const YAML = require(require.resolve('yaml', { paths: [require.resolve('nx/package.json')] }))
const ci = YAML.parse(fs.readFileSync(path.join(__dirname, '..', '..', '.github', 'workflows', 'ci.yml'), 'utf8'))

const outputs = {
  go_projects: '["portal-backend"]',
  java_projects: '[]',
  screenshot_projects: '[]',
  image_projects: '["ui-portal"]',
  e2e_tier: 'none',
  can_publish: 'true',
}
const needsWith = (results = {}, out = outputs) =>
  Object.fromEntries(
    DUE_JOBS.map((name) => [
      name,
      { result: results[name] ?? 'success', ...(name === 'plan' ? { outputs: out } : {}) },
    ]),
  )

test('a green push passes; skips the plan expects are accepted', () => {
  const r = verdict(
    needsWith({ java: 'skipped', 'screenshot-tests': 'skipped', e2e: 'skipped', 'storybook-pages': 'skipped' }),
    'push',
    false,
  )
  assert.equal(r.ok, true, r.problems.join('; '))
})

test('a skip of a due job, a failure, and a cancellation fail the verdict', () => {
  assert.deepEqual(verdict(needsWith({ go: 'skipped' }), 'push', false).problems, [
    'go=skipped, but the plan requires it',
  ])
  assert.deepEqual(verdict(needsWith({ js: 'failure', e2e: 'cancelled' }), 'push', false).problems, [
    'js=failure',
    'e2e=cancelled',
  ])
})

test('a run that cannot publish may skip the image, E2E, and Storybook jobs', () => {
  const skipped = ['js-images', 'go-images', 'java-images', 'e2e', 'storybooks', 'storybook-pages', 'java']
  const r = verdict(
    needsWith(Object.fromEntries([...skipped, 'screenshot-tests'].map((j) => [j, 'skipped'])), {
      ...outputs,
      can_publish: 'false',
    }),
    'pull_request',
    true,
  )
  assert.equal(r.ok, true, r.problems.join('; '))
})

test('a job missing from the needs fails the verdict, and an unknown job must succeed', () => {
  const needs = needsWith()
  delete needs.storybooks
  needs['new-job'] = { result: 'skipped' }
  assert.deepEqual(verdict(needs, 'push', false).problems, [
    'storybooks: not listed in the needs of ci-ok',
    'new-job=skipped, but the plan requires it',
  ])
})

test('ci.yml: ci-ok needs exactly every job that does not run after it, and those are the known jobs', () => {
  const after = new Set(['ci-ok'])
  let grew = true
  while (grew) {
    grew = false
    for (const [name, job] of Object.entries(ci.jobs)) {
      const needs = [].concat(job.needs ?? [])
      if (!after.has(name) && needs.some((n) => after.has(n))) {
        after.add(name)
        grew = true
      }
    }
  }
  const before = Object.keys(ci.jobs).filter((name) => !after.has(name)).sort()
  assert.deepEqual([...ci.jobs['ci-ok'].needs].sort(), before)
  assert.deepEqual([...DUE_JOBS].sort(), before)
  assert.deepEqual([...after].sort(), ['ci-ok', 'release-artifacts', 'release-artifacts-dry-run'])
})

test('ci.yml: release-artifacts publishes on main only, and the dry run only when asked for', () => {
  assert.match(ci.jobs['release-artifacts'].if, /github\.ref == 'refs\/heads\/main'/)
  assert.match(ci.jobs['release-artifacts'].if, /needs\.ci-ok\.result == 'success'/)
  assert.match(ci.jobs['release-artifacts-dry-run'].if, /inputs\.release_dry_run == true/)
  assert.equal(ci.jobs['release-artifacts-dry-run'].with.dry_run, true)
  assert.equal(ci.jobs['release-artifacts'].with.dry_run, false)
  assert.deepEqual(ci.jobs['release-artifacts-dry-run'].permissions, { contents: 'read', packages: 'read' })
})
