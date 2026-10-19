/**
 * Conventional Commits and semver helpers shared by the release scripts.
 *
 * Commit types and their bumps are read from `release.conventionalCommits.types` in nx.json (decision R6),
 * so these scripts and `nx release` cannot disagree on what a commit is worth. A commit is parsed the way
 * Nx 23 parses it (same header pattern, `BREAKING CHANGE:` anywhere in the body, `This reverts commit`).
 */
const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

const WORKSPACE_ROOT = path.resolve(__dirname, '..', '..')
const BUMPS = ['none', 'patch', 'minor', 'major']
const HEADER = /^(?<type>[^\s():!]+)(?:\s*\((?<scope>.+)\))?(?<breaking>!)?: (?<description>.+)$/u
const REVERT = /This reverts commit [\da-f]{40}/
const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/

function readNxRelease(root = WORKSPACE_ROOT) {
  return JSON.parse(fs.readFileSync(path.join(root, 'nx.json'), 'utf8')).release
}

/** `{ feat: 'minor', fix: 'patch', docs: 'none', ... }` from nx.json. */
function commitTypes(release = readNxRelease()) {
  const types = {}
  for (const [type, config] of Object.entries(release.conventionalCommits?.types ?? {})) {
    if (config === false) types[type] = 'none'
    else if (config === true) types[type] = 'patch'
    else types[type] = config.semverBump ?? 'patch'
  }
  return types
}

/**
 * The bump one commit gives its component. Unknown types and non-conventional subjects give none, but a
 * `BREAKING CHANGE:` footer gives major even then, as in Nx.
 */
function classify(subject, body, types) {
  const header = subject.match(HEADER)
  if (header?.groups.breaking || body.includes('BREAKING CHANGE:')) return 'major'
  const type = REVERT.test(body) ? 'revert' : header?.groups.type
  return type && Object.hasOwn(types, type) ? types[type] : 'none'
}

function highest(bumps) {
  return bumps.reduce((a, b) => (BUMPS.indexOf(b) > BUMPS.indexOf(a) ? b : a), 'none')
}

function parseSemver(version) {
  const m = String(version).match(SEMVER)
  return m ? { major: +m[1], minor: +m[2], patch: +m[3], pre: m[4] ?? '' } : null
}

function compareSemver(a, b) {
  const x = parseSemver(a)
  const y = parseSemver(b)
  for (const k of ['major', 'minor', 'patch']) if (x[k] !== y[k]) return x[k] - y[k]
  if (x.pre === y.pre) return 0
  if (!x.pre) return 1
  if (!y.pre) return -1
  return x.pre < y.pre ? -1 : 1
}

function bumpVersion(version, bump) {
  const v = parseSemver(version)
  if (!v) throw new Error(`not a semver version: ${version}`)
  if (bump === 'major') return `${v.major + 1}.0.0`
  if (bump === 'minor') return `${v.major}.${v.minor + 1}.0`
  if (bump === 'patch') return `${v.major}.${v.minor}.${v.patch + 1}`
  return version
}

/** The bump that leads from one version to the next, or none when they are equal. */
function bumpBetween(from, to) {
  const a = parseSemver(from)
  const b = parseSemver(to)
  if (!a || !b) throw new Error(`not a semver pair: ${from} -> ${to}`)
  if (a.major !== b.major) return 'major'
  if (a.minor !== b.minor) return 'minor'
  if (a.patch !== b.patch) return 'patch'
  return 'none'
}

// execFileSync, not execSync: execSync runs through cmd.exe on Windows, where `^` is an escape.
function git(args, cwd = WORKSPACE_ROOT) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 1 << 30 })
}

/**
 * Non-merge commits in `from..to` that touch `paths`; all history of `paths` up to `to` when `from` is
 * null. Merge commits are skipped as in Nx, which sees no files in them.
 */
function commitsTouching(from, paths, cwd = WORKSPACE_ROOT, to = 'HEAD') {
  const sep = '\u001e'
  const range = from ? [`${from}..${to}`] : [to]
  const out = git(['log', '--no-merges', `--format=${sep}%h%x00%s%x00%b`, ...range, '--', ...paths], cwd)
  return out
    .split(sep)
    .slice(1)
    .map((chunk) => {
      const [hash, subject, body = ''] = chunk.split('\u0000')
      return { hash, subject, body: body.trim() }
    })
}

/** The highest bump among the commits in `from..HEAD` that touch `paths`. */
function bumpFromCommits(from, paths, types, cwd = WORKSPACE_ROOT) {
  return highest(commitsTouching(from, paths, cwd).map((c) => classify(c.subject, c.body, types)))
}

function listTags(pattern, cwd = WORKSPACE_ROOT) {
  return git(['tag', '--list', '--merged', 'HEAD', ...(pattern ? [pattern] : [])], cwd)
    .split(/\r?\n/)
    .filter(Boolean)
}

module.exports = {
  BUMPS,
  HEADER,
  WORKSPACE_ROOT,
  bumpBetween,
  bumpFromCommits,
  bumpVersion,
  classify,
  commitTypes,
  commitsTouching,
  compareSemver,
  git,
  highest,
  listTags,
  parseSemver,
  readNxRelease,
}
