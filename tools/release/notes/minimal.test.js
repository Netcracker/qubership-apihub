const { test } = require('node:test')
const assert = require('node:assert/strict')
const { MARKER, groupCommits, moduleNotes, productNotes } = require('./minimal')

const repoUrl = 'https://github.com/Netcracker/qubership-apihub'
const c = (hash, subject, body = '') => ({ hash, subject, body })

test('groupCommits puts each commit in one section, breaking first, unknown types under other', () => {
  const groups = groupCommits([
    c('a1', 'feat(ui): new page (#1)'),
    c('b2', 'fix!: drop the old endpoint'),
    c('c3', 'fix: footer', 'BREAKING CHANGE: the API changed'),
    c('d4', 'fix: a bug'),
    c('e5', 'perf: faster'),
    c('f6', 'chore: deps: bump x'),
    c('g7', 'Update README'),
  ])
  assert.deepEqual(
    Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.map((x) => x.hash)])),
    { breaking: ['b2', 'c3'], feat: ['a1'], fix: ['d4'], perf: ['e5'], other: ['f6', 'g7'] },
  )
})

test('moduleNotes renders the marker, artifacts, sections in order, and the compare link', () => {
  const md = moduleNotes({
    component: 'portal-backend',
    version: '1.22.0',
    tag: 'portal-backend/1.22.0',
    previousTag: 'portal-backend/1.21.0',
    commits: [c('d4', 'fix: a bug'), c('a1', 'feat: new API (#12)')],
    artifacts: { image: 'ghcr.io/netcracker/qubership-apihub-backend:1.22.0' },
    repoUrl,
  })
  assert.ok(md.startsWith(MARKER))
  assert.match(md, /^## portal-backend 1\.22\.0$/m)
  assert.match(md, /^- Docker image: `ghcr\.io\/netcracker\/qubership-apihub-backend:1\.22\.0`$/m)
  assert.ok(md.indexOf('### Features') < md.indexOf('### Bug fixes'))
  assert.ok(md.includes(`- feat: new API (#12) ([a1](${repoUrl}/commit/a1))\n`))
  assert.match(md, /compare\/portal-backend\/1\.21\.0\.\.\.portal-backend\/1\.22\.0\)$/m)
  assert.doesNotMatch(md, /### Other changes/)
})

test('moduleNotes says why a component without own commits is released, and handles a first release', () => {
  const md = moduleNotes({
    component: 'api-diff',
    version: '4.0.1',
    tag: 'api-diff/4.0.1',
    previousTag: null,
    commits: [],
    artifacts: { packages: ['@netcracker/qubership-apihub-api-diff@4.0.1'] },
    repoUrl,
  })
  assert.match(md, /released because an in-repo dependency was released/)
  assert.match(md, /^- npm package: `@netcracker\/qubership-apihub-api-diff@4\.0\.1`$/m)
  assert.match(md, /\*\*First release\*\*.*\/tree\/api-diff\/4\.0\.1\)$/m)
})

test('productNotes lists the components with their previous versions, the sprint, and the compare link', () => {
  const md = productNotes({
    version: '2.16.0',
    tag: '2.16.0',
    previousTag: '2.15.0',
    sprint: 'APIHUB-26.3.5',
    components: [
      { component: 'ui', version: '3.11.0', previousTag: 'ui/3.10.1' },
      { component: 'test-service', version: '0.1.0', previousTag: null },
    ],
    repoUrl,
  })
  assert.match(md, /^## APIHUB 2\.16\.0$/m)
  assert.match(md, /^Sprint: APIHUB-26\.3\.5$/m)
  assert.match(md, /^\| ui \| \[3\.11\.0\]\(.*\/releases\/tag\/ui\/3\.11\.0\) \| 3\.10\.1 \|$/m)
  assert.match(md, /^\| test-service \| .* \| none \|$/m)
  assert.match(md, /compare\/2\.15\.0\.\.\.2\.16\.0\)$/m)
})

test('productNotes of a deploy-only release says so', () => {
  const md = productNotes({ version: '2.15.1', tag: '2.15.1', previousTag: '2.15.0', components: [], repoUrl })
  assert.match(md, /Only `deploy\/` changed/)
  assert.doesNotMatch(md, /Sprint:/)
})
