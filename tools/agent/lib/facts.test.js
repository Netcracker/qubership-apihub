'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { computeFacts, globToRegExp } = require('./facts')

const REAL_LABELER = fs.readFileSync(path.join(__dirname, '..', '..', '..', '.github', 'labeler.yml'), 'utf8')

const INLINE_LABELER = `
'module:alpha':
  - changed-files:
      - any-glob-to-any-file: 'src/alpha/**'
'module:beta':
  - changed-files:
      - any-glob-to-any-file:
          - 'src/beta/**'
          - 'shared/*.txt'
'area:other':
  - changed-files:
      - any-glob-to-any-file: '**'
'module:gamma':
  - changed-files:
      - all-globs-to-all-files: 'src/gamma/**'
`

const facts = (overrides = {}) =>
  computeFacts({ files: [], labelerYaml: INLINE_LABELER, title: 'chore: x', body: '', ...overrides })

test('globToRegExp: ** crosses directories, * does not', () => {
  const deep = globToRegExp('backend/portal-backend/**')
  assert.ok(deep.test('backend/portal-backend/a.go'))
  assert.ok(deep.test('backend/portal-backend/service/x/y.go'))
  assert.ok(!deep.test('backend/portal-backend'))
  assert.ok(!deep.test('backend/portal-backend2/a.go'))

  const star = globToRegExp('docs/*.md')
  assert.ok(star.test('docs/readme.md'))
  assert.ok(!star.test('docs/api/readme.md'))
  assert.ok(!star.test('docs/readme.md.bak'))
})

test('globToRegExp: **/ matches zero or more directories', () => {
  const re = globToRegExp('**/go.mod')
  assert.ok(re.test('go.mod'))
  assert.ok(re.test('backend/agent/go.mod'))
  assert.ok(!re.test('backend/agent/xgo.mod'))
  assert.ok(globToRegExp('**').test('any/path/at/all.txt'))
  assert.ok(globToRegExp('a/**/b').test('a/b'))
  assert.ok(globToRegExp('a/**/b').test('a/x/y/b'))
})

test('globToRegExp: ? matches one character that is not a slash', () => {
  const re = globToRegExp('file?.txt')
  assert.ok(re.test('file1.txt'))
  assert.ok(!re.test('file.txt'))
  assert.ok(!re.test('file12.txt'))
  assert.ok(!globToRegExp('a?b').test('a/b'))
})

test('globToRegExp: {a,b} alternatives, also nested', () => {
  const re = globToRegExp('src/*.{js,ts}')
  assert.ok(re.test('src/a.js'))
  assert.ok(re.test('src/a.ts'))
  assert.ok(!re.test('src/a.go'))
  const nested = globToRegExp('x/{a,b/{c,d}}/f')
  assert.ok(nested.test('x/a/f'))
  assert.ok(nested.test('x/b/d/f'))
  assert.ok(!nested.test('x/b/e/f'))
})

test('globToRegExp: regex metacharacters and dotfiles are literal', () => {
  const re = globToRegExp('.github/**')
  assert.ok(re.test('.github/workflows/ci.yaml'))
  assert.ok(!re.test('xgithub/workflows/ci.yaml'))
  assert.ok(globToRegExp('a+b(1).txt').test('a+b(1).txt'))
  assert.ok(!globToRegExp('a.b').test('axb'))
  assert.ok(globToRegExp('*').test('.hidden'))
})

test('globToRegExp: rejects bad input', () => {
  assert.throws(() => globToRegExp(42), TypeError)
  assert.throws(() => globToRegExp('a/{b,c'), /Unbalanced/)
})

test('modules come from module: labels only, sorted and unique', () => {
  const result = facts({ files: ['src/beta/x.go', 'src/alpha/b.go', 'src/alpha/a.go', 'shared/note.txt'] })
  assert.deepEqual(result.modules, ['alpha', 'beta'])
})

test('modules: list of globs, nesting limits, and unmatched files', () => {
  assert.deepEqual(facts({ files: ['shared/note.txt'] }).modules, ['beta'])
  assert.deepEqual(facts({ files: ['shared/deep/note.txt'] }).modules, [])
  assert.deepEqual(facts({ files: ['elsewhere/file.go'] }).modules, [])
  assert.deepEqual(facts({ files: [] }).modules, [])
})

test('modules: conditions other than any-glob-to-any-file never match', () => {
  assert.deepEqual(facts({ files: ['src/gamma/x.go'] }).modules, [])
})

test('modules with the real labeler.yml', () => {
  const result = computeFacts({
    files: [
      'backend/portal-backend/service/x.go',
      'frontend/ui/src/a.tsx',
      '.github/workflows/ci.yaml',
      'docs/internal/design.md',
      'deploy/helm-templates/values.yaml',
    ],
    labelerYaml: REAL_LABELER,
    title: 'feat: x',
    body: '',
  })
  assert.deepEqual(result.modules, ['ci', 'deploy', 'docs', 'portal-backend', 'ui'])
})

test('the real labeler.yml parses and defines the module labels', () => {
  const result = computeFacts({
    files: ['tools/agent/route.js', 'tests/postman-collections/a.json', 'backend/agent/main.go'],
    labelerYaml: REAL_LABELER,
    title: '',
    body: '',
  })
  assert.deepEqual(result.modules, ['agent', 'postman-collections', 'tools'])
})

test('changedFiles is sorted and the input is not mutated', () => {
  const files = ['b.txt', 'a/z.txt', 'a/b.txt']
  const result = facts({ files })
  assert.deepEqual(result.changedFiles, ['a/b.txt', 'a/z.txt', 'b.txt'])
  assert.deepEqual(files, ['b.txt', 'a/z.txt', 'a/b.txt'])
})

test('affectedProjects: sorted copy, or null when not computed', () => {
  assert.equal(facts().affectedProjects, null)
  const affected = ['ui', 'api-diff']
  assert.deepEqual(facts({ affected }).affectedProjects, ['api-diff', 'ui'])
  assert.deepEqual(affected, ['ui', 'api-diff'])
  assert.deepEqual(facts({ affected: [] }).affectedProjects, [])
})

test('flags are all false for an unrelated change', () => {
  assert.deepEqual(facts({ files: ['README.md'] }).flags, {
    openapi: false,
    migrations: false,
    deploy: false,
    workflows: false,
    dependencies: false,
    breakingMarker: false,
  })
})

test('flag openapi: docs/api folder at any depth, yaml/yml/json only', () => {
  assert.equal(facts({ files: ['docs/api/openapi.yaml'] }).flags.openapi, true)
  assert.equal(facts({ files: ['backend/portal-backend/docs/api/Apihub API.yml'] }).flags.openapi, true)
  assert.equal(facts({ files: ['backend/agent/docs/api/sub/spec.json'] }).flags.openapi, true)
  assert.equal(facts({ files: ['docs/api/README.md'] }).flags.openapi, false)
  assert.equal(facts({ files: ['docs/apix/spec.yaml'] }).flags.openapi, false)
  assert.equal(facts({ files: ['mydocs/api/spec.yaml'] }).flags.openapi, false)
})

test('flag migrations: a migrations folder and .sql', () => {
  assert.equal(facts({ files: ['backend/portal-backend/resources/migrations/12_a.up.sql'] }).flags.migrations, true)
  assert.equal(facts({ files: ['migrations/1.sql'] }).flags.migrations, true)
  assert.equal(facts({ files: ['migrations/readme.md'] }).flags.migrations, false)
  assert.equal(facts({ files: ['queries/1.sql'] }).flags.migrations, false)
})

test('flag deploy: deploy/, configuration reference, config.template.yaml anywhere', () => {
  assert.equal(facts({ files: ['deploy/docker-compose/a.yaml'] }).flags.deploy, true)
  assert.equal(facts({ files: ['docs/configuration-reference.md'] }).flags.deploy, true)
  assert.equal(facts({ files: ['backend/linter/config.template.yaml'] }).flags.deploy, true)
  assert.equal(facts({ files: ['config.template.yaml'] }).flags.deploy, true)
  assert.equal(facts({ files: ['docs/other.md'] }).flags.deploy, false)
  assert.equal(facts({ files: ['backend/x/deploy/a.yaml'] }).flags.deploy, false)
  assert.equal(facts({ files: ['backend/x/config.yaml'] }).flags.deploy, false)
})

test('flag workflows: .github/workflows and .github/actions only', () => {
  assert.equal(facts({ files: ['.github/workflows/ci.yaml'] }).flags.workflows, true)
  assert.equal(facts({ files: ['.github/actions/setup/action.yml'] }).flags.workflows, true)
  assert.equal(facts({ files: ['.github/labeler.yml'] }).flags.workflows, false)
  assert.equal(facts({ files: ['docs/.github/workflows/x.yaml'] }).flags.workflows, false)
})

test('flag dependencies: manifests and lock files anywhere', () => {
  for (const file of ['go.mod', 'backend/agent/go.sum', 'frontend/ui/package.json', 'pnpm-lock.yaml', 'a/pom.xml']) {
    assert.equal(facts({ files: [file] }).flags.dependencies, true, file)
  }
  assert.equal(facts({ files: ['package-lock.json'] }).flags.dependencies, false)
  assert.equal(facts({ files: ['mygo.mod'] }).flags.dependencies, false)
})

test('flag breakingMarker: title with ! and BREAKING CHANGE footer', () => {
  assert.equal(facts({ title: 'feat!: drop v1' }).flags.breakingMarker, true)
  assert.equal(facts({ title: 'feat(api)!: drop v1' }).flags.breakingMarker, true)
  assert.equal(facts({ title: 'feat(api): add' }).flags.breakingMarker, false)
  assert.equal(facts({ title: 'fix: handle a!: b' }).flags.breakingMarker, false)
  assert.equal(facts({ title: 'x', body: 'Text\n\nBREAKING CHANGE: removed the field' }).flags.breakingMarker, true)
  assert.equal(facts({ title: 'x', body: 'BREAKING CHANGE: first line' }).flags.breakingMarker, true)
  assert.equal(facts({ title: 'x', body: 'This is not a BREAKING CHANGE: inline' }).flags.breakingMarker, false)
})

test('missing title and body are treated as empty', () => {
  const result = computeFacts({ files: ['a'], labelerYaml: INLINE_LABELER, title: undefined, body: null })
  assert.equal(result.flags.breakingMarker, false)
})

test('errors: bad files and bad labeler config', () => {
  assert.throws(() => facts({ files: 'a.txt' }), /files must be an array/)
  assert.throws(() => facts({ files: [1] }), /files must be an array/)
  assert.throws(() => facts({ labelerYaml: '' }), /YAML mapping/)
  assert.throws(() => facts({ labelerYaml: '- a\n- b\n' }), /YAML mapping/)
  assert.throws(() => facts({ labelerYaml: 'a: [unclosed' }))
})
