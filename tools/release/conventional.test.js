const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const {
  bumpBetween,
  bumpFromCommits,
  bumpVersion,
  classify,
  commitTypes,
  commitsTouching,
  compareSemver,
  highest,
} = require('./conventional')

const R6 = {
  feat: 'minor',
  fix: 'patch',
  perf: 'patch',
  revert: 'patch',
  refactor: 'patch',
  build: 'patch',
  chore: 'patch',
  style: 'patch',
  docs: 'none',
  test: 'none',
  ci: 'none',
}

test('nx.json lists every R6 commit type with its bump', () => {
  assert.deepEqual(commitTypes(), R6)
})

test('commitTypes reads the boolean shorthand as Nx does', () => {
  const release = { conventionalCommits: { types: { feat: { semverBump: 'minor' }, wip: false, ops: true } } }
  assert.deepEqual(commitTypes(release), { feat: 'minor', wip: 'none', ops: 'patch' })
})

test('classify follows R6 for every type, with or without a scope', () => {
  for (const [type, bump] of Object.entries(R6)) {
    assert.equal(classify(`${type}: change`, '', R6), bump, type)
    assert.equal(classify(`${type}(ui): change`, '', R6), bump, `${type} with scope`)
  }
})

test('classify gives major for ! and for a BREAKING CHANGE footer', () => {
  assert.equal(classify('feat!: drop the v1 API', '', R6), 'major')
  assert.equal(classify('fix(api-diff)!: rename a field', '', R6), 'major')
  assert.equal(classify('docs!: remove a page', '', R6), 'major')
  assert.equal(classify('fix: rename a field', 'BREAKING CHANGE: the field is renamed', R6), 'major')
  assert.equal(classify('Update things', 'BREAKING CHANGE: as Nx does', R6), 'major')
  assert.equal(classify('fix: rename', 'Rename the field.\n\nBREAKING-CHANGE: the field is renamed', R6), 'major')
})

test('classify ignores BREAKING CHANGE when it does not start a line', () => {
  assert.equal(classify('fix: wording', 'This is not a BREAKING CHANGE: only the text moves.', R6), 'patch')
  assert.equal(classify('feat: new page', 'Lists the BREAKING CHANGE: footers of a commit.', R6), 'minor')
  assert.equal(classify('fix: wording', '  BREAKING CHANGE: indented, so quoted', R6), 'patch')
})

test('classify ignores BREAKING CHANGE inside a Dependabot-style body', () => {
  const body = [
    'Bumps [axios](https://github.com/axios/axios) from 0.27.2 to 1.6.0.',
    '<details>',
    '<summary>Release notes</summary>',
    '<p><em>Sourced from <a href="https://github.com/axios/axios/releases">axios\'s releases</a>.</em></p>',
    '<blockquote>',
    '<h2>v1.0.0</h2>',
    '<p>BREAKING CHANGE: the default export is now an ES module.</p>',
    '<ul>',
    '<li>fix!: drop Node 12 (BREAKING CHANGE: Node 14 is required)</li>',
    '</ul>',
    '</blockquote>',
    '</details>',
    '',
    '---',
    'updated-dependencies:',
    '- dependency-name: axios',
    '  dependency-type: direct:production',
    '  update-type: version-update:semver-major',
    '...',
    '',
    'Signed-off-by: dependabot[bot] <support@github.com>',
  ].join('\n')
  assert.equal(classify('chore(deps): bump axios from 0.27.2 to 1.6.0 in /packages/api-diff (#42)', body, R6), 'patch')
})

test('classify gives none to unknown types and non-conventional subjects', () => {
  assert.equal(classify('wip: something', '', R6), 'none')
  assert.equal(classify('constructor: prototype keys are not types', '', R6), 'none')
  assert.equal(classify("Merge branch 'release' into develop", '', R6), 'none')
  assert.equal(classify('Feat: types are case-sensitive', '', R6), 'none')
  assert.equal(classify('feat:no space after the colon', '', R6), 'none')
})

test('classify treats a git revert as revert', () => {
  const body = `This reverts commit ${'a'.repeat(40)}.`
  assert.equal(classify('Revert "docs: page"', body, R6), 'patch')
})

test('highest orders none < patch < minor < major', () => {
  assert.equal(highest([]), 'none')
  assert.equal(highest(['patch', 'none', 'minor', 'patch']), 'minor')
  assert.equal(highest(['major', 'patch']), 'major')
})

test('bumpVersion and bumpBetween are inverse', () => {
  for (const bump of ['patch', 'minor', 'major']) {
    assert.equal(bumpBetween('2.15.3', bumpVersion('2.15.3', bump)), bump)
  }
  assert.equal(bumpVersion('2.15.3', 'none'), '2.15.3')
  assert.equal(bumpVersion('0.0.0', 'minor'), '0.1.0')
  assert.equal(bumpBetween('1.2.3', '1.2.3'), 'none')
  assert.throws(() => bumpVersion('v1.2.3', 'patch'))
})

test('compareSemver sorts numerically and puts prereleases first', () => {
  const sorted = ['2.10.0', '2.9.1', '2.10.0-rc.1', '10.0.0', '2.9.10'].sort(compareSemver)
  assert.deepEqual(sorted, ['2.9.1', '2.9.10', '2.10.0-rc.1', '2.10.0', '10.0.0'])
})

test('commitsTouching skips merge commits and scopes by path', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-conventional-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' })
  const commit = (file, message) => {
    fs.mkdirSync(path.join(dir, path.dirname(file)), { recursive: true })
    fs.appendFileSync(path.join(dir, file), `${message}\n`)
    git('add', '-A')
    git('commit', '-q', '-m', message)
  }
  git('init', '-q', '-b', 'main')
  git('config', 'user.email', 'test@example.invalid')
  git('config', 'user.name', 'test')
  git('config', 'core.hooksPath', path.join(dir, '.git', 'no-hooks'))
  commit('a/x.txt', 'chore: initial')
  const base = git('rev-parse', 'HEAD').trim()
  commit('b/x.txt', 'feat: change in b')
  git('switch', '-q', '-c', 'side')
  commit('a/x.txt', 'docs: side change in a')
  git('switch', '-q', 'main')
  git('merge', '-q', '--no-ff', 'side', '-m', 'feat: a merge commit never counts')

  assert.deepEqual(
    commitsTouching(base, ['a'], dir).map((c) => c.subject),
    ['docs: side change in a'],
  )
  assert.equal(bumpFromCommits(base, ['a'], R6, dir), 'none')
  assert.equal(bumpFromCommits(base, ['b'], R6, dir), 'minor')
  assert.equal(bumpFromCommits(null, ['a'], R6, dir), 'patch')
})
