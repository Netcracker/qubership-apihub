const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { IMAGES, buildPlan, previousTag, releaseTags } = require('./artifacts')

const release = {
  groups: {
    'api-diff': { projects: ['api-diff'] },
    ui: { projects: ['ui-root', 'ui-portal', 'ui-shared'] },
    'portal-backend': { projects: ['portal-backend'] },
    agent: { projects: ['agent'] },
  },
}
const roots = {
  'api-diff': 'frontend/api-diff',
  'ui-root': 'frontend/ui',
  'ui-portal': 'frontend/ui/packages/portal',
  'ui-shared': 'frontend/ui/packages/shared',
  'portal-backend': 'backend/portal-backend',
  agent: 'backend/agent',
}
const packages = {
  'api-diff': { name: '@netcracker/qubership-apihub-api-diff', version: '5.0.0' },
  'ui-root': { name: '@netcracker/qubership-apihub-ui', version: '3.11.0', private: true },
  'ui-portal': { name: '@netcracker/qubership-apihub-ui-portal', version: '3.11.0', private: true },
}

test('releaseTags finds the components and the product, in nx.json order, and skips other tags', () => {
  const tags = ['2.16.0', 'portal-backend/1.22.0', 'api-diff/5.0.0', 'ui/0.0.1-test', 'unknown/1.0.0', '2.16.0-rc.1']
  assert.deepEqual(releaseTags(tags, release.groups), {
    modules: [
      { component: 'api-diff', version: '5.0.0', tag: 'api-diff/5.0.0' },
      { component: 'portal-backend', version: '1.22.0', tag: 'portal-backend/1.22.0' },
    ],
    product: { version: '2.16.0', tag: '2.16.0' },
  })
})

test('previousTag takes the highest stable version below the new one', () => {
  const tags = ['ui/3.9.0', 'ui/3.10.1', 'ui/3.11.0', 'ui/3.12.0-rc.1', 'ui-tests/9.0.0', '2.15.0', '2.9.0']
  assert.equal(previousTag('ui/', '3.11.0', tags), 'ui/3.10.1')
  assert.equal(previousTag('ui/', '3.9.0', tags), null)
  assert.equal(previousTag('', '2.16.0', tags.filter((t) => !t.includes('/'))), '2.15.0')
})

const plan = (tagsAtCommit, extra = {}) =>
  buildPlan({
    release,
    roots,
    packages,
    tagsAtCommit,
    mergedTags: ['api-diff/4.0.0', 'ui/3.10.1', 'portal-backend/1.21.0', '2.15.0', ...tagsAtCommit],
    commitsFor: (from) => (from === 'portal-backend/1.21.0' ? [{ hash: 'a1', subject: 'feat: x', body: '' }] : []),
    sprint: 'APIHUB-26.3.5',
    owner: 'Netcracker',
    repoUrl: 'https://github.com/Netcracker/qubership-apihub',
    ...extra,
  })

test('buildPlan: images and public packages of the released components, modules first, product last and Latest', () => {
  const p = plan(['2.16.0', 'ui/3.11.0', 'portal-backend/1.22.0', 'api-diff/5.0.0'])
  assert.deepEqual(p.images, [
    { component: 'ui', version: '3.11.0', image: 'ghcr.io/netcracker/qubership-apihub-ui' },
    { component: 'portal-backend', version: '1.22.0', image: 'ghcr.io/netcracker/qubership-apihub-backend' },
  ])
  assert.deepEqual(p.npm, [
    {
      component: 'api-diff',
      project: 'api-diff',
      root: 'frontend/api-diff',
      name: '@netcracker/qubership-apihub-api-diff',
      version: '5.0.0',
    },
  ])
  assert.deepEqual(
    p.releases.map((r) => [r.tag, r.latest]),
    [['api-diff/5.0.0', false], ['ui/3.11.0', false], ['portal-backend/1.22.0', false], ['2.16.0', true]],
  )
  assert.match(p.releases[2].notes, /compare\/portal-backend\/1\.21\.0\.\.\.portal-backend\/1\.22\.0/)
  assert.match(p.releases[2].notes, /- feat: x/)
  assert.match(p.releases[3].notes, /Sprint: APIHUB-26\.3\.5/)
  assert.match(p.releases[3].notes, /compare\/2\.15\.0\.\.\.2\.16\.0/)
  assert.deepEqual(p.problems, [])
})

test('buildPlan: an agent-only release has no Latest release; a package.json behind its tag is a problem', () => {
  const p = plan(['agent/2.1.6', 'api-diff/5.0.1'])
  assert.ok(p.releases.every((r) => !r.latest))
  assert.deepEqual(p.problems, [
    '@netcracker/qubership-apihub-api-diff is at 5.0.0 in package.json, but the tag api-diff/5.0.1 says 5.0.1',
  ])
})

test('buildPlan: no release tag means nothing to publish', () => {
  const p = plan(['some-other-tag'])
  assert.deepEqual([p.images, p.npm, p.releases], [[], [], []])
})

test('IMAGES matches the image legs of ci.yml', () => {
  const ci = fs.readFileSync(path.join(__dirname, '..', '..', '.github', 'workflows', 'ci.yml'), 'utf8')
  const legs = Object.fromEntries([...ci.matchAll(/"project":"([^"]+)","image":"([^"]+)"/g)].map((m) => [m[1], m[2]]))
  const byProject = { ...IMAGES }
  byProject['ui-portal'] = byProject.ui
  delete byProject.ui
  assert.deepEqual(legs, byProject)
})
