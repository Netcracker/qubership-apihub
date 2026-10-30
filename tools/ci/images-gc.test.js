const { test } = require('node:test')
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const {
  images, branchTag, legacyTag, liveTags, plan, referencedDigests,
  collectOpenPullNumbers, reserveCoreCall, OPEN_PULL_PAGE_SIZE,
} = require('./images-gc')

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
const run = async (versions, refs, graph = {}, openPulls = []) =>
  (await plan(versions, liveTags(refs, openPulls), async (d) => graph[d] || [], NOW)).map((x) => x.name).sort()

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

test('liveTags() keeps pull-N-merge only for an open pull request number', () => {
  const live = liveTags(['refs/heads/develop'], [605])
  assert.equal(live.has('pull-605-merge'), true)
  assert.equal(live.has('pull-12-merge'), false)
  // Git still advertises this ref after the pull request closes, so it must not keep the image.
  assert.equal(liveTags(['refs/pull/605/head']).has('pull-605-merge'), false)
})

test('an open pull request keeps its image and a closed one does not', async () => {
  const gone = await run(
    [
      v('open', ['pull-605-merge']),
      v('closed', ['pull-12-merge'], FRESH),
      v('mixed', ['gone-branch', 'develop-copy']),
      v('gone', ['gone-branch-2']),
    ],
    ['refs/heads/develop', 'refs/heads/develop-copy'],
    {},
    [605],
  )
  assert.deepEqual(gone, ['closed', 'gone'])
})

test('collectOpenPullNumbers stops on a short page and rejects a page that never ends', async () => {
  const calls = []
  const full = Array.from({ length: OPEN_PULL_PAGE_SIZE }, (_, index) => index + 1)
  const numbers = await collectOpenPullNumbers(page => {
    calls.push(page)
    return page === 1 ? full : [OPEN_PULL_PAGE_SIZE + 1]
  })
  assert.deepEqual(calls, [1, 2])
  assert.equal(numbers.length, OPEN_PULL_PAGE_SIZE + 1)
  await assert.rejects(collectOpenPullNumbers(() => full))
})

test('reserveCoreCall counts the call and stops before crossing the floor', () => {
  const ledger = { limit: 1000, remaining: 501, floor: 500, pullCalls: 0 }
  reserveCoreCall(ledger, 'pulls')
  assert.equal(ledger.pullCalls, 1)
  assert.equal(ledger.remaining, 500)
  assert.throws(() => reserveCoreCall(ledger, 'pulls'), /floor is 500/)
  assert.equal(ledger.pullCalls, 1)
})

test('content that only the base of a branch image names is unreachable without the annotation', async () => {
  // The branch tag is a thin image over the content (tools/ci/ref-overlay): its index lists manifests of its own
  // and shares only the layer blobs with the content, so nothing in the registry links it to src-0123….
  const gone = await run(
    [v('dev', ['dev']), v('ovl-amd'), v('ovl-arm'), v('src', ['src-0123456789abcdef']), v('amd'), v('arm')],
    ['refs/heads/develop'],
    { dev: ['ovl-amd', 'ovl-arm'], src: ['amd', 'arm'] },
  )
  assert.deepEqual(gone, ['amd', 'arm', 'src'])
})

test('referencedDigests adds the base digest that the index annotates to the manifests it lists', () => {
  const base = 'sha256:' + '0'.repeat(64)
  const amd = 'sha256:' + '1'.repeat(64)
  assert.deepEqual(
    referencedDigests({ manifests: [{ digest: amd }], annotations: { 'org.opencontainers.image.base.digest': base } }),
    [amd, base],
  )
  assert.deepEqual(referencedDigests({ manifests: [{ digest: amd }] }), [amd])
  assert.deepEqual(referencedDigests({ annotations: { 'org.opencontainers.image.revision': 'abc' } }), [])
})

test('content stays while a kept branch index names it as its base', async () => {
  const gone = await run(
    [v('dev', ['dev']), v('ovl-amd'), v('ovl-arm'), v('src', ['src-0123456789abcdef']), v('amd'), v('arm'), v('unused', ['src-fedcba9876543210'])],
    ['refs/heads/develop'],
    { dev: ['ovl-amd', 'ovl-arm', 'src'], src: ['amd', 'arm'] },
  )
  assert.deepEqual(gone, ['unused'])
})
