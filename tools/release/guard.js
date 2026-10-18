#!/usr/bin/env node
/**
 * Refuses a real `nx release` anywhere but `main`. On `release`, Nx would version, commit, tag, and
 * push `release`, and create GitHub Releases for a commit that is not on `main`.
 *
 * Runs as release.version.preVersionCommand in nx.json, which Nx runs before it changes anything.
 * A pre-push hook would not fire: Nx pushes with `--no-verify`. Dry runs (NX_DRY_RUN=true) pass,
 * and give the same plan on `release` as on `main`.
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
    `A real release must run on ${RELEASE_BRANCH}. From "${branch}" Nx would version, commit, tag`,
    `and PUSH "${branch}", then create GitHub Releases against a commit that is not on`,
    `${RELEASE_BRANCH} — and pushing two refs at one commit starts two CI runs that both build.`,
    '',
    'Promote first, then release:',
    `  git switch ${RELEASE_BRANCH}`,
    '  git merge --ff-only release',
    '  pnpm exec nx release --skip-publish',
    '',
    'To read the plan from here without releasing, add --dry-run.',
  ])
}

console.log(`release guard: on ${branch}, proceeding`)
