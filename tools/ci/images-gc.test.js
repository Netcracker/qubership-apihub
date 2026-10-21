const { test } = require('node:test')
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const { images, branchTag, legacyTag, liveTags, plan } = require('./images-gc')

const YAML = require(require.resolve('yaml', { paths: [require.resolve('nx/package.json')] }))
const ciPath = path.join(__dirname, '..', '..', '.github', 'workflows', 'ci.yml')

test('images() finds every image of the ci.yml image jobs', () => {
  const ci = YAML.parse(fs.readFileSync(ciPath, 'utf8'))
  const expected = ['js-images', 'go-images', 'java-images']
    .flatMap((job) => JSON.parse(ci.jobs[job].with.images).map((leg) => leg.image))
    .sort()
  assert.deepEqual(images(fs.readFileSync(ciPath, 'utf8')), expected)
})

test('branchTag() agrees with branch-tag.sh', () => {
  const refs = [
    'refs/heads/develop', 'refs/heads/main', 'refs/heads/release', 'refs/heads/feature/x',
    'refs/heads/wiring/4-5', 'refs/pull/12/merge', 'refs/tags/portal-backend/1.2.3',
    'refs/heads/.hidden', 'refs/heads/a+b@c', 'refs/heads/fix/ünïcode', `refs/heads/${'x'.repeat(140)}`,
  ]
  for (const ref of refs) {
    const script = execFileSync('bash', [path.join(__dirname, 'branch-tag.sh'), ref], { encoding: 'utf8' }).trim()
    assert.equal(branchTag(ref), script, ref)
  }
})

test('legacyTag() follows the legacy CI: no main -> latest', () => {
  assert.equal(legacyTag('refs/heads/main'), 'main')
  assert.equal(legacyTag('refs/heads/develop'), 'dev')
  assert.equal(legacyTag('refs/heads/feature/x'), 'feature-x')
  assert.equal(legacyTag('refs/tags/1.21.0'), '1.21.0')
})

test('liveTags() keeps the floating tags and a git tag by name and by last segment', () => {
  const live = liveTags(['refs/heads/main', 'refs/tags/portal-backend/1.2.3', 'refs/tags/alpha'])
  for (const t of ['latest', 'next', 'dev', 'main', 'portal-backend-1.2.3', '1.2.3', 'alpha']) assert.ok(live.has(t), t)
})

// A registry in memory: digest -> the digests it lists.
const NOW = Date.parse('2026-10-20T12:00:00Z')
const OLD = '2026-10-01T00:00:00Z'
const FRESH = '2026-10-20T11:00:00Z'
const v = (name, tags = [], updated = OLD) => ({ id: name, name, updated_at: updated, tags })
const run = async (versions, refs, graph = {}) =>
  (await plan(versions, liveTags(refs), async (d) => graph[d] || [], NOW)).map((x) => x.name).sort()

test('a deleted branch loses its tag at once, with what only it lists', async () => {
  const gone = await run(
    [v('idx', ['feature-x'], FRESH), v('amd'), v('keep', ['feature-y']), v('amd2')],
    ['refs/heads/develop', 'refs/heads/feature/y'],
    { idx: ['amd'], keep: ['amd2'] },
  )
  assert.deepEqual(gone, ['amd', 'idx'])
})

test('multi-arch content stays while a kept index wraps its platform manifests', async () => {
  // 1.2.3 is a new index over the two manifests of src-0123…; src-fedc… is used by nothing.
  const gone = await run(
    [
      v('src', ['src-0123456789abcdef']), v('rel', ['1.2.3']), v('amd'), v('arm'),
      v('unused', ['src-fedcba9876543210']), v('amd2'), v('arm2'),
    ],
    ['refs/heads/develop', 'refs/tags/portal-backend/1.2.3'],
    { src: ['amd', 'arm'], rel: ['amd', 'arm'], unused: ['amd2', 'arm2'] },
  )
  assert.deepEqual(gone, ['amd2', 'arm2', 'unused'])
})

test('one-platform content stays while a branch index lists it', async () => {
  const gone = await run(
    [v('src', ['src-0123456789abcdef']), v('dev', ['dev']), v('old', ['src-fedcba9876543210'])],
    ['refs/heads/develop'],
    { dev: ['src'] },
  )
  assert.deepEqual(gone, ['old'])
})

test('untagged and content versions under a day old stay, with what they list', async () => {
  const gone = await run(
    [v('new', [], FRESH), v('child'), v('src', ['src-0123456789abcdef'], FRESH), v('stale')],
    ['refs/heads/develop'],
    { new: ['child'] },
  )
  assert.deepEqual(gone, ['stale'])
})

test('pull request tags and versions with any live tag stay', async () => {
  const gone = await run(
    [v('pr', ['pull-605-merge']), v('mixed', ['gone-branch', 'develop-copy']), v('gone', ['gone-branch-2'])],
    ['refs/heads/develop', 'refs/heads/develop-copy'],
  )
  assert.deepEqual(gone, ['gone'])
})
