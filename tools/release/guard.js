#!/usr/bin/env node
/**
 * Refuses a real `nx release version` anywhere but `main`. On `release`, Nx would commit the versions
 * and create the tags on a commit that release-finish.yml never pushes to `main`.
 *
 * Runs as release.version.preVersionCommand in nx.json, which Nx runs before it changes anything.
 * Dry runs (NX_DRY_RUN=true) pass, and give the same plan on `release` as on `main`.
 */
const { execFileSync } = require('node:child_process')

const RELEASE_BRANCH = 'main'

// execFileSync, not execSync: execSync runs through cmd.exe on Windows, where `^` is an escape.
function git(...args) {
  return execFileSync('git', args, { encoding: 'utf-8' }).trim()
}

// Nx pipes this command's stdio unless --verbose, so a console.log can be lost.
function refuse(lines) {
  for (const line of lines) process.stderr.write(line + '\n')
  process.exit(1)
}

if (process.env.NX_DRY_RUN === 'true') {
  console.log(`release guard: dry run, branch not checked (real releases must be on ${RELEASE_BRANCH})`)
  process.exit(0)
}

let branch
try {
  branch = git('rev-parse', '--abbrev-ref', 'HEAD')
} catch (e) {
  refuse(['release guard: could not read the current branch', String(e)])
}

if (branch === 'HEAD') {
  refuse([
    'release guard: HEAD is detached.',
    `A release must be made from ${RELEASE_BRANCH} so the tags Nx creates land on a branch.`,
    `Run: git switch ${RELEASE_BRANCH} && git merge --ff-only release`,
  ])
}

if (branch !== RELEASE_BRANCH) {
  refuse([
    `release guard: refusing to release from "${branch}".`,
    '',
    `A real release must run on ${RELEASE_BRANCH}. From "${branch}" Nx would commit the versions`,
    `and create the tags on a commit that is not on ${RELEASE_BRANCH}.`,
    '',
    'Releases run in the release-finish workflow. To read the plan from here, run:',
    '  node tools/release/plan.js',
  ])
}

console.log(`release guard: on ${branch}, proceeding`)
