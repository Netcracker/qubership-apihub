const { test } = require('node:test')
const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const {
  fillPlaceholders,
  storybookBudget,
  layoutPlan,
  storybookComponents,
  erdBackends,
  buildRef,
  docsPlaceholder,
  erdPlaceholder,
  legacyErdStub,
  parseArgs,
  REST_LIMIT,
} = require('./pages-site')
const { NOT_PUBLISHED_HTML } = require('./storybook-site')

const MIB = 1024 ** 2
const REPO = 'https://github.com/Netcracker/qubership-apihub'

// ---- placeholders ----------------------------------------------------------------------------------

test('fillPlaceholders() replaces every occurrence of each placeholder', () => {
  const out = fillPlaceholders('<p><!--@A@--></p><!--@B@--><i><!--@A@--></i>', { A: 'x', B: '<ul></ul>' })
  assert.equal(out, '<p>x</p><ul></ul><i>x</i>')
})

test('fillPlaceholders() fails on a placeholder the template lacks', () => {
  assert.throws(() => fillPlaceholders('<p></p>', { A: 'x' }), /no <!--@A@--> placeholder/)
})

test('fillPlaceholders() fails on a placeholder left without a value', () => {
  assert.throws(() => fillPlaceholders('<!--@A@--><!--@C@-->', { A: 'x' }), /without a value: <!--@C@-->/)
})

test('fillPlaceholders() does not read $ patterns in a value', () => {
  assert.equal(fillPlaceholders('<!--@A@-->', { A: "$& $' $1" }), "$& $' $1")
})

// ---- budget ----------------------------------------------------------------------------------------

test('storybookBudget() gives the Storybooks 900 MiB minus everything else', () => {
  assert.equal(storybookBudget(0), 900 * MIB)
  assert.equal(storybookBudget(25 * MIB), 875 * MIB)
  assert.equal(storybookBudget(REST_LIMIT), 600 * MIB)
  assert.equal(storybookBudget(10 * MIB, { budgetBytes: 100 * MIB }), 90 * MIB)
})

test('storybookBudget() fails when everything else passes 300 MiB', () => {
  assert.equal(REST_LIMIT, 300 * MIB)
  assert.throws(() => storybookBudget(REST_LIMIT + 1), /over the 300\.0 MiB limit/)
})

test('storybookBudget() fails when nothing is left for the Storybooks', () => {
  assert.throws(() => storybookBudget(50 * MIB, { budgetBytes: 50 * MIB }), /the whole 50\.0 MiB budget/)
  assert.throws(() => storybookBudget(0, { budgetBytes: 0 }), /must be positive/)
})

// ---- layout ----------------------------------------------------------------------------------------

const INDEX = ['404-map.js', '404.html', 'README.md', 'index.html', 'logo.png', 'style.css']

test('layoutPlan() copies sites/index without its README and templates, then the sections', () => {
  const plan = layoutPlan({ indexFiles: INDEX, landingDist: '/l', docsDist: '/d' })
  assert.deepEqual(plan.copies, [
    { from: 'index/404-map.js', to: '404-map.js' },
    { from: 'index/logo.png', to: 'logo.png' },
    { from: 'index/style.css', to: 'style.css' },
    { from: 'landing', to: 'landing' },
    { from: 'docs', to: 'docs' },
  ])
  assert.deepEqual(plan.templates, ['index.html', '404.html'])
  assert.equal(plan.docs, 'site')
})

test('layoutPlan() lays out the docs placeholder without a docs build', () => {
  const plan = layoutPlan({ indexFiles: INDEX, landingDist: '/l', docsDist: null })
  assert.equal(plan.docs, 'placeholder')
  assert.ok(!plan.copies.some((c) => c.to === 'docs'))
})

test('layoutPlan() fails without the landing or a required template', () => {
  assert.throws(() => layoutPlan({ indexFiles: INDEX, landingDist: null }), /landing build is required/)
  for (const f of ['index.html', '404.html', '404-map.js']) {
    assert.throws(() => layoutPlan({ indexFiles: INDEX.filter((x) => x !== f), landingDist: '/l' }), new RegExp(f))
  }
})

test('layoutPlan() refuses a sites/index entry named like a section', () => {
  assert.throws(() => layoutPlan({ indexFiles: [...INDEX, 'docs'], landingDist: '/l' }), /section folder/)
})

// ---- page parts ------------------------------------------------------------------------------------

test('storybookComponents() links the published components in storybooks.json order', () => {
  assert.equal(
    storybookComponents(['api-doc-viewer', 'graphapi', 'ui'], ['ui', 'api-doc-viewer']),
    '<ul><li><a href="storybook/api-doc-viewer/">api-doc-viewer</a></li><li><a href="storybook/ui/">ui</a></li></ul>',
  )
  assert.equal(storybookComponents(['ui'], []), '<ul><li>No Storybook is published yet</li></ul>')
})

test('erdBackends() links rendered backends and names the others', () => {
  assert.equal(
    erdBackends(['portal-backend', 'agents-backend'], ['portal-backend']),
    '<ul><li><a href="erd/portal-backend/">portal-backend</a></li><li>agents-backend (not rendered yet)</li></ul>',
  )
  assert.equal(erdBackends(['x'], ['x'], ''), '<ul><li><a href="x/">x</a></li></ul>')
  assert.equal(erdBackends([], []), '<ul><li>No ERD is rendered yet</li></ul>')
})

test('buildRef() names the ref and the short commit, and the landing when it differs', () => {
  const sha = '0123456789abcdef0123456789abcdef01234567'
  const other = 'fedcba9876543210fedcba9876543210fedcba98'
  assert.equal(
    buildRef({ ref: 'develop', commit: sha, repoUrl: REPO }),
    `<a href="${REPO}/tree/${sha}"><code>develop</code> at <code>0123456</code></a>`,
  )
  assert.equal(buildRef({ ref: 'main', commit: sha, landingRef: 'main', landingCommit: sha, repoUrl: REPO }).includes('landing'), false)
  const both = buildRef({ ref: 'main', commit: sha, landingRef: 'develop', landingCommit: other, repoUrl: REPO })
  assert.match(both, /<code>main<\/code> at <code>0123456<\/code>/)
  assert.match(both, /; the landing from <a href="[^"]+\/tree\/fedcba9[^"]*"><code>develop<\/code> at <code>fedcba9<\/code>/)
  assert.match(buildRef({ ref: '<x>', commit: sha, repoUrl: REPO }), /&lt;x&gt;/)
})

test('docsPlaceholder() says the site is coming and links the docs folder', () => {
  const page = docsPlaceholder({ repoUrl: REPO, commit: 'abc' })
  assert.match(page, /documentation site is coming/)
  assert.match(page, new RegExp(`href="${REPO}/tree/abc/docs"`))
  assert.match(page, /href="\.\.\/style\.css"/)
})

test('erdPlaceholder() names the failure and links what was rendered from erd/', () => {
  const page = erdPlaceholder({ backends: ['a', 'b'], rendered: ['a'], reason: 'no render for b' })
  assert.match(page, /no render for b/)
  assert.match(page, /<a href="a\/">a<\/a>/)
  assert.match(page, /b \(not rendered yet\)/)
})

test('legacyErdStub() redirects to erd/portal-backend/ with and without JavaScript', () => {
  const page = legacyErdStub()
  assert.match(page, /location\.replace\("\.\.\/\.\.\/erd\/portal-backend\/" \+ location\.search \+ location\.hash\)/)
  assert.match(page, /http-equiv="refresh" content="0; url=\.\.\/\.\.\/erd\/portal-backend\/"/)
})

test('parseArgs() requires the site, the landing, the ref, and the commit', () => {
  const o = parseArgs(['out', '--landing', 'l', '--ref', 'develop', '--commit', 'abc', '--erd-optional'])
  assert.equal(o.site, 'out')
  assert.equal(o.landing, 'l')
  assert.ok(o.flags.has('erd-optional'))
  assert.throws(() => parseArgs(['out', '--ref', 'r', '--commit', 'c']), /--landing is required/)
  assert.throws(() => parseArgs(['--landing', 'l', '--ref', 'r', '--commit', 'c']), /exactly one/)
  assert.throws(() => parseArgs(['out', '--landing']), /needs a value/)
  assert.throws(() => parseArgs(['out', '--nope']), /unknown option/)
})

// ---- the whole run, on fixtures --------------------------------------------------------------------

const STUB_ERD = `const fs = require('fs'), path = require('path')
const [mode, dir] = process.argv.slice(2)
const backends = ['portal-backend', 'agents-backend']
if (mode === 'backends') { console.log(backends.join('\\n')); process.exit(0) }
if (mode !== 'assemble') process.exit(2)
for (const b of process.env.STUB_ERD_FAIL ? backends.slice(0, 1) : backends) {
  fs.mkdirSync(path.join(dir, b), { recursive: true })
  fs.writeFileSync(path.join(dir, b, 'index.html'), 'erd ' + b)
}
if (process.env.STUB_ERD_FAIL) { console.error('no render for agents-backend'); process.exit(1) }
fs.writeFileSync(path.join(dir, 'index.html'), 'erd index')
`

const STUB_STORYBOOK = `const fs = require('fs'), path = require('path')
const [mode, site, flag, budget] = process.argv.slice(2)
if (mode !== 'assemble' || flag !== '--budget-bytes') process.exit(2)
const dir = path.join(site, 'storybook')
fs.mkdirSync(path.join(dir, 'ui', 'develop'), { recursive: true })
fs.writeFileSync(path.join(dir, 'index.html'), 'storybooks')
fs.writeFileSync(path.join(dir, 'ui', 'index.html'), 'ui storybooks')
fs.writeFileSync(path.join(dir, 'budget.txt'), budget)
`

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pages-site-'))
  const index = path.join(root, 'index')
  fs.mkdirSync(index)
  fs.writeFileSync(
    path.join(index, 'index.html'),
    '<ul><!--@STORYBOOK_COMPONENTS@--></ul><div><!--@ERD_BACKENDS@--></div><span><!--@BUILD_REF@--></span>',
  )
  fs.writeFileSync(path.join(index, '404.html'), '<p id="message">x</p><div id="storybook-404-text" class="hidden" hidden><!--@STORYBOOK_404_TEXT@--></div>')
  fs.writeFileSync(path.join(index, '404-map.js'), '// map')
  fs.writeFileSync(path.join(index, 'style.css'), 'body{}')
  fs.writeFileSync(path.join(index, 'README.md'), '# not published')
  const landing = path.join(root, 'landing')
  fs.mkdirSync(path.join(landing, '_assets'), { recursive: true })
  fs.writeFileSync(path.join(landing, 'index.html'), 'landing')
  fs.writeFileSync(path.join(landing, '_assets', 'a.js'), 'x'.repeat(1000))
  fs.writeFileSync(path.join(root, 'erd.js'), STUB_ERD)
  fs.writeFileSync(path.join(root, 'storybook.js'), STUB_STORYBOOK)
  return { root, index, landing, site: path.join(root, 'site') }
}

function runPagesSite(f, extra = [], env = {}) {
  return spawnSync(
    process.execPath,
    [
      path.join(__dirname, 'pages-site.js'), f.site,
      '--index', f.index, '--landing', f.landing, '--ref', 'develop', '--commit', '0123456789abcdef',
      '--erd-script', path.join(f.root, 'erd.js'), '--storybook-script', path.join(f.root, 'storybook.js'),
      '--repo-url', REPO,
      ...extra,
    ],
    { encoding: 'utf8', env: { ...process.env, GITHUB_STEP_SUMMARY: '', ERD_OPTIONAL: '', ...env } },
  )
}

function tree(dir, base = dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? tree(path.join(dir, e.name), base) : [path.relative(base, path.join(dir, e.name)).split(path.sep).join('/')]))
    .sort()
}

test('pages-site.js lays out every section, the docs placeholder, and the root 404', () => {
  const f = fixture()
  try {
    const r = runPagesSite(f)
    assert.equal(r.status, 0, r.stdout + r.stderr)
    assert.deepEqual(tree(f.site), [
      '404-map.js', '404.html', 'docs/index.html', 'erd/agents-backend/index.html', 'erd/index.html',
      'erd/portal-backend/index.html', 'index.html', 'landing/_assets/a.js', 'landing/index.html',
      'pages/erd/index.html', 'storybook/budget.txt', 'storybook/index.html', 'storybook/ui/index.html', 'style.css',
    ])
    const index = fs.readFileSync(path.join(f.site, 'index.html'), 'utf8')
    assert.match(index, /<a href="storybook\/ui\/">ui<\/a>/)
    assert.doesNotMatch(index, /storybook\/graphapi\//)
    assert.match(index, /<a href="erd\/agents-backend\/">agents-backend<\/a>/)
    assert.match(index, /<code>develop<\/code> at <code>0123456<\/code>/)
    assert.ok(fs.readFileSync(path.join(f.site, '404.html'), 'utf8').includes(NOT_PUBLISHED_HTML))
    assert.match(fs.readFileSync(path.join(f.site, 'docs', 'index.html'), 'utf8'), /coming/)
    // The Storybooks got the budget minus everything else that was laid out before them.
    const budget = Number(fs.readFileSync(path.join(f.site, 'storybook', 'budget.txt'), 'utf8'))
    assert.ok(budget < 900 * MIB && budget > 900 * MIB - 64 * 1024, String(budget))
    assert.match(r.stdout, /### Pages site/)
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true })
  }
})

test('pages-site.js copies the docs build when there is one', () => {
  const f = fixture()
  try {
    const docs = path.join(f.root, 'docs-dist')
    fs.mkdirSync(path.join(docs, 'installation-guide'), { recursive: true })
    fs.writeFileSync(path.join(docs, 'index.html'), 'docs site')
    fs.writeFileSync(path.join(docs, 'installation-guide', 'index.html'), 'guide')
    const r = runPagesSite(f, ['--docs', docs])
    assert.equal(r.status, 0, r.stdout + r.stderr)
    assert.equal(fs.readFileSync(path.join(f.site, 'docs', 'index.html'), 'utf8'), 'docs site')
    assert.ok(fs.existsSync(path.join(f.site, 'docs', 'installation-guide', 'index.html')))
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true })
  }
})

test('pages-site.js fails on a missing ERD render unless ERD_OPTIONAL is set', () => {
  const f = fixture()
  try {
    const failed = runPagesSite(f, [], { STUB_ERD_FAIL: '1' })
    assert.equal(failed.status, 1)
    assert.match(failed.stdout, /::error::the ERD assembly failed: erd\.js assemble exited with 1/)

    const optional = runPagesSite(f, [], { STUB_ERD_FAIL: '1', ERD_OPTIONAL: 'true' })
    assert.equal(optional.status, 0, optional.stdout + optional.stderr)
    assert.match(optional.stdout, /::warning::the ERD assembly failed/)
    const erd = fs.readFileSync(path.join(f.site, 'erd', 'index.html'), 'utf8')
    assert.match(erd, /<a href="portal-backend\/">portal-backend<\/a>/)
    assert.match(erd, /agents-backend \(not rendered yet\)/)
    assert.match(fs.readFileSync(path.join(f.site, 'index.html'), 'utf8'), /agents-backend \(not rendered yet\)/)
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true })
  }
})

test('pages-site.js treats a missing erd.js as a missing render', () => {
  const f = fixture()
  try {
    fs.rmSync(path.join(f.root, 'erd.js'))
    assert.equal(runPagesSite(f).status, 1)
    const r = runPagesSite(f, ['--erd-optional'])
    assert.equal(r.status, 0, r.stdout + r.stderr)
    assert.match(fs.readFileSync(path.join(f.site, 'erd', 'index.html'), 'utf8'), /No ERD is rendered yet/)
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true })
  }
})

test('pages-site.js fails when everything but the Storybooks leaves them no budget', () => {
  const f = fixture()
  try {
    // About 1 KiB: less than the fixture's other sections take.
    const r = runPagesSite(f, ['--budget-mib', '0.001'])
    assert.equal(r.status, 1)
    assert.match(r.stdout, /::error::everything except the Storybooks takes/)
    assert.equal(fs.existsSync(path.join(f.site, 'storybook')), false)
  } finally {
    fs.rmSync(f.root, { recursive: true, force: true })
  }
})
