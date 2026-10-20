const { test } = require('node:test')
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const path = require('node:path')
const {
  detectBackends, orderMigrations, generatorFiles, computeKey, keyFormatOf, keyAt, databaseName, newestRender, renderIndex,
  formatDate, selectGc, KEY_FORMAT,
} = require('./erd')

const TREE = 'cdc6312e2'.padEnd(40, '0')
const GENERATOR = [
  { path: 'tools/ci/erd.js', blob: 'a'.repeat(40) },
  { path: '.github/workflows/erd.yml', blob: 'b'.repeat(40) },
]
const key = (over = {}) => computeKey({ migrationsTree: TREE, generator: GENERATOR, ...over })

test('detectBackends() takes the backends with an up migration directly in resources/migrations', () => {
  const listing = [
    'backend/portal-backend/resources/migrations/1_init.up.sql',
    'backend/portal-backend/resources/migrations/1_init.down.sql',
    'backend/portal-backend/resources/migrations/2_more.up.sql',
    'backend/api-linter-service/resources/migrations/1_a.up.sql',
    'backend/agent/resources/config.yaml',
    'backend/only-down/resources/migrations/1_a.down.sql',
    'backend/nested/resources/migrations/old/1_a.up.sql',
    'backend/elsewhere/migrations/1_a.up.sql',
    '',
  ].join('\n')
  assert.deepEqual(detectBackends(listing), ['api-linter-service', 'portal-backend'])
  assert.deepEqual(detectBackends(''), [])
})

test('the backends at HEAD are the three with a database', () => {
  const listing = execFileSync('git', ['ls-tree', '-r', '--name-only', 'HEAD', '--', 'backend/'], {
    cwd: path.join(__dirname, '..', '..'), encoding: 'utf8', maxBuffer: 256 * 1024 * 1024,
  })
  for (const b of ['agents-backend', 'api-linter-service', 'portal-backend']) assert.ok(detectBackends(listing).includes(b), b)
})

test('orderMigrations() sorts by number, not by name, and skips down migrations', () => {
  const names = ['10_ten.up.sql', '2_two.up.sql', '1_one.up.sql', '2_two.down.sql', 'README.md', '100_x.up.sql']
  assert.deepEqual(orderMigrations(names), ['1_one.up.sql', '2_two.up.sql', '10_ten.up.sql', '100_x.up.sql'])
  assert.deepEqual(orderMigrations([]), [])
})

test('orderMigrations() refuses a name without a number and a number used twice', () => {
  assert.throws(() => orderMigrations(['init.up.sql']), /does not start with N_/)
  assert.throws(() => orderMigrations(['3_a.up.sql', '03_b.up.sql']), /share the number 3/)
})

test('generatorFiles() keeps tools/ci/erd* and erd.yml without the tests, sorted by path', () => {
  const listing = [
    `100644 blob ${'1'.repeat(40)}\ttools/ci/erd.test.js`,
    `100644 blob ${'2'.repeat(40)}\ttools/ci/erd.js`,
    `100644 blob ${'3'.repeat(40)}\ttools/ci/images-gc.js`,
    `100644 blob ${'4'.repeat(40)}\t.github/workflows/erd.yml`,
    `040000 tree ${'5'.repeat(40)}\ttools/ci/erd-fixtures`,
    `100755 blob ${'6'.repeat(40)}\ttools/ci/storybook-store.sh`,
  ].join('\n')
  assert.deepEqual(generatorFiles(listing), [
    { path: '.github/workflows/erd.yml', blob: '4'.repeat(40) },
    { path: 'tools/ci/erd.js', blob: '2'.repeat(40) },
  ])
})

test('computeKey() is 16 hex characters and stable', () => {
  assert.match(key(), /^[0-9a-f]{16}$/)
  assert.equal(key(), key())
  assert.equal(key(), key({ generator: [...GENERATOR].reverse() }), 'the order of the generator files does not matter')
})

test('computeKey() changes with every input', () => {
  const keys = [
    key(),
    key({ migrationsTree: 'f'.repeat(40) }),
    key({ generator: [GENERATOR[0], { ...GENERATOR[1], blob: 'c'.repeat(40) }] }),
    key({ generator: [GENERATOR[0]] }),
  ]
  assert.equal(new Set(keys).size, keys.length)
})

test('computeKey() hashes only what it is given, so the tool versions count through the erd.js blob', () => {
  assert.equal(key({ schemaspy: '9.9.9', postgresMajor: 99 }), key())
})

// A git that answers for two refs: `main` and `develop` differ only in the SchemaSpy constant of
// erd.js. Each ref's key must come from that ref's blobs, whatever the running script holds.
function fakeGit(refs) {
  return (...args) => {
    if (args[0] === 'rev-parse') {
      const [ref, dir] = args[3].split(':')
      if (!refs[ref] || !dir.endsWith('/resources/migrations')) throw new Error('not found')
      return `${refs[ref].tree}\n`
    }
    if (args[0] === 'ls-tree') {
      return Object.entries(refs[args[1]].files).map(([p, f]) => `100644 blob ${f.blob}\t${p}`).join('\n') + '\n'
    }
    if (args[0] === 'cat-file') {
      for (const r of Object.values(refs)) for (const f of Object.values(r.files)) if (f.blob === args[2]) return f.content
    }
    throw new Error(`unexpected git ${args.join(' ')}`)
  }
}

const erdSource = (version, format = KEY_FORMAT) =>
  `'use strict'\r\nconst SCHEMASPY_VERSION = '${version}'\r\n${format ? `const KEY_FORMAT = '${format}'\r\n` : ''}`

function twoRefs(developFormat = KEY_FORMAT) {
  return {
    main: {
      tree: TREE,
      files: {
        'tools/ci/erd.js': { blob: '1'.repeat(40), content: erdSource('7.0.2') },
        '.github/workflows/erd.yml': { blob: '2'.repeat(40), content: 'on: push' },
        'tools/ci/images-gc.js': { blob: '3'.repeat(40), content: '' },
      },
    },
    develop: {
      tree: TREE,
      files: {
        'tools/ci/erd.js': { blob: '4'.repeat(40), content: erdSource('7.0.3', developFormat) },
        '.github/workflows/erd.yml': { blob: '2'.repeat(40), content: 'on: push' },
      },
    },
  }
}

test('keyAt() computes a ref\'s key from the blobs at that ref only', () => {
  const g = fakeGit(twoRefs())
  const main = keyAt('portal-backend', 'main', g)
  assert.equal(main, computeKey({
    migrationsTree: TREE,
    generator: [{ path: 'tools/ci/erd.js', blob: '1'.repeat(40) }, { path: '.github/workflows/erd.yml', blob: '2'.repeat(40) }],
  }))
  assert.notEqual(keyAt('portal-backend', 'develop', g), main, 'the SchemaSpy bump on develop changes develop\'s key only')
  assert.equal(keyAt('portal-backend', 'main', g), main)
})

test('keyAt() refuses a ref whose erd.js uses another key formula or has none', () => {
  assert.throws(() => keyAt('portal-backend', 'develop', fakeGit(twoRefs('v9'))), (e) => e.otherFormat && /format v9/.test(e.message))
  assert.throws(() => keyAt('portal-backend', 'develop', fakeGit(twoRefs(''))), (e) => e.otherFormat && /format v1/.test(e.message))
  const refs = twoRefs()
  delete refs.main.files['tools/ci/erd.js']
  assert.throws(() => keyAt('portal-backend', 'main', fakeGit(refs)), (e) => e.noGenerator)
  assert.throws(() => keyAt('portal-backend', 'nope', fakeGit(refs)), /does not exist at nope/)
})

test('keyFormatOf() reads the KEY_FORMAT line of this erd.js', () => {
  const source = require('node:fs').readFileSync(path.join(__dirname, 'erd.js'), 'utf8')
  assert.equal(keyFormatOf(source), KEY_FORMAT)
  assert.equal(keyFormatOf('const X = 1'), 'v1')
})

test('computeKey() refuses something that is not a tree hash', () => {
  assert.throws(() => key({ migrationsTree: '' }), /not a tree hash/)
  assert.throws(() => key({ migrationsTree: 'HEAD:backend' }), /not a tree hash/)
})

test('databaseName() maps dashes to underscores', () => {
  assert.equal(databaseName('portal-backend'), 'portal_backend')
  assert.equal(databaseName('api-linter-service'), 'api_linter_service')
})

test('formatDate() writes Month D, YYYY in UTC', () => {
  assert.equal(formatDate('2026-10-20T23:30:00Z'), 'October 20, 2026')
  assert.equal(formatDate('2026-01-05T00:00:00+03:00'), 'January 4, 2026')
  assert.equal(formatDate(''), 'an unknown date')
  assert.equal(formatDate('garbage'), 'an unknown date')
})

test('renderIndex() has one card per backend, linked to its folder, styled by the root stylesheet', () => {
  const html = renderIndex({
    ref: 'main',
    cards: [
      {
        backend: 'portal-backend', lastMigration: '44_tolerant_publication.up.sql',
        revision: 'b0b0629ec0123456789', created: '2026-10-20T10:00:00Z',
      },
      { backend: 'agents-backend', lastMigration: '2_x.up.sql', revision: '', created: '' },
    ],
  })
  assert.match(html, /<title>Database ERD<\/title>/)
  assert.match(html, /<link rel="stylesheet" href="\.\.\/style\.css">/)
  assert.match(html, /<main class="page">[\s\S]*<section class="cards">/)
  assert.equal(html.match(/<a class="card"/g).length, 2)
  assert.match(html, /<a class="card" href="portal-backend\/">\s*<h2>portal-backend<\/h2>/)
  assert.match(html, /<code>44_tolerant_publication\.up\.sql<\/code>/)
  assert.match(html, /commit <code>b0b0629ec<\/code> on October 20, 2026/)
  assert.match(html, /an unknown commit on an unknown date/)
  assert.match(html, /at <code>main<\/code>/)
})

test('renderIndex() escapes what it prints', () => {
  const html = renderIndex({ ref: '<ref>', cards: [{ backend: 'a', lastMigration: '1_<b>&.up.sql', revision: '', created: '' }] })
  assert.ok(html.includes('&lt;ref&gt;'))
  assert.ok(html.includes('1_&lt;b&gt;&amp;.up.sql'))
})

const NOW = Date.parse('2026-10-20T12:00:00Z')
const OLD = '2026-09-01T00:00:00Z'
const NEW = '2026-10-10T00:00:00Z'
const ver = (id, tags, updated = OLD) => ({ id, updated_at: updated, tags })
const K = (c) => `mig-${c.repeat(16)}`

test('selectGc() deletes old renders that are not the key of a kept branch', () => {
  const versions = [
    ver(1, [K('a')]), // main's key
    ver(2, [K('b')]), // develop's key
    ver(3, [K('c')]), // superseded, old
    ver(4, [K('d')], NEW), // superseded, but under 30 days
    ver(5, []), // replaced by a forced render
    ver(6, [], NEW),
    ver(7, ['latest']), // not this tool's tag
    ver(8, [K('e'), 'keep-me']),
  ]
  const { remove, last } = selectGc(versions, new Set([K('a'), K('b')]), NOW)
  assert.deepEqual(remove.map((v) => v.id).sort(), [3, 5])
  assert.equal(last, null)
  assert.match(remove.find((v) => v.id === 3).why, /not the key of main or develop/)
})

test('selectGc() never deletes the newest mig-* render, kept or not', () => {
  const versions = [
    ver(1, [K('a')], '2026-08-01T00:00:00Z'),
    ver(2, [K('b')], '2026-09-01T00:00:00Z'), // the newest render, over 30 days old, no kept key
    ver(3, [], '2026-09-10T00:00:00Z'), // newer, but untagged
    ver(4, ['latest'], '2026-09-15T00:00:00Z'), // newer, but not this tool's tag
  ]
  const { remove, last } = selectGc(versions, new Set([K('z')]), NOW)
  assert.deepEqual(remove.map((v) => v.id).sort(), [1, 3])
  assert.equal(last, null)
})

test('selectGc() keeps the newest when every version would go', () => {
  const versions = [ver(1, [], '2026-08-01T00:00:00Z'), ver(2, [], '2026-09-01T00:00:00Z')]
  const { remove, last } = selectGc(versions, new Set(), NOW)
  assert.deepEqual(remove.map((v) => v.id), [1])
  assert.equal(last.id, 2)
})

test('newestRender() picks the latest created mig-* render', () => {
  const r = (tag, created) => ({ tag, created })
  assert.equal(newestRender([r(K('a'), '2026-10-01T00:00:00Z'), r(K('b'), '2026-10-03T00:00:00Z'), r(K('c'), '2026-10-02T00:00:00Z')]).tag, K('b'))
  assert.equal(newestRender([r('latest', '2026-12-01T00:00:00Z'), r(K('a'), '2026-10-01T00:00:00Z')]).tag, K('a'), 'only mig-* tags')
  assert.equal(newestRender([r(K('b'), ''), r(K('a'), '2026-10-01T00:00:00Z')]).tag, K('a'), 'a dated render wins')
  assert.equal(newestRender([r(K('b'), ''), r(K('a'), 'garbage')]).tag, K('a'), 'undated: the first tag')
  assert.equal(newestRender([]), null)
  assert.equal(newestRender([r('latest', '2026-10-01T00:00:00Z')]), null)
})

test('renderIndex() marks an older render and a backend without one', () => {
  const html = renderIndex({
    ref: 'develop',
    cards: [
      { backend: 'portal-backend', tag: K('a'), fallback: true, lastMigration: '43_x.up.sql', revision: 'abc', created: '' },
      { backend: 'agents-backend', missing: true, lastMigration: '2_x.up.sql', revision: '', created: '' },
      { backend: 'api-linter-service', tag: K('b'), lastMigration: '9_x.up.sql', revision: 'def', created: '' },
    ],
  })
  assert.match(html, /<a class="card" href="portal-backend\/">[\s\S]*<strong>Older render:<\/strong> <code>develop<\/code>[\s\S]*<code>mig-a{16}<\/code>/)
  assert.match(html, /<article class="card">\s*<h2>agents-backend<\/h2>\s*<p>Not rendered yet\./)
  assert.doesNotMatch(html, /href="agents-backend\/"/)
  assert.equal(html.match(/Older render/g).length, 1)
})

test('selectGc() keeps a version whose date it cannot read', () => {
  const { remove } = selectGc([ver(1, [K('a')], 'never'), ver(2, [K('b')], NEW)], new Set(), NOW)
  assert.deepEqual(remove, [])
})
