const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { CHARTS, IMAGES, MAX_BODY, buildPlan, componentDependencies, previousTag, releaseTags } = require('./artifacts')

const REPO = 'https://github.com/Netcracker/qubership-apihub'

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

// Released before the commit under test; build-task-consumer, api-linter-service, and agents-backend are
// not release groups of this fixture, but the product chart pins them by their tags.
const MERGED = [
  'api-diff/4.0.0',
  'ui/3.10.1',
  'portal-backend/1.21.0',
  'agent/2.1.5',
  'build-task-consumer/1.4.0',
  'api-linter-service/1.3.0',
  'agents-backend/0.9.0',
  'agents-backend/0.10.0',
  '2.15.0',
]

const plan = (tagsAtCommit, extra = {}) =>
  buildPlan({
    release,
    roots,
    packages,
    dependsOn: { ui: ['api-diff'] },
    tagsAtCommit,
    mergedTags: [...MERGED, ...tagsAtCommit],
    commitsFor: (from) =>
      from === 'portal-backend/1.21.0'
        ? [{ hash: 'a1', sha: 'a1', author: 'Dev', subject: 'feat!: x', body: '' }]
        : [],
    resolveChanges: async (commits) => commits.map((commit) => ({ commit, login: 'dev', pull: null })),
    dependencyChangesFor: ({ from }) => (from === 'ui/3.10.1' ? [{ name: 'react', from: '18', to: '19' }] : []),
    tagsMergedInto: (ref) => (ref === '2.15.0' ? ['ui/3.10.1', 'portal-backend/1.21.0', '2.15.0'] : []),
    workItemsFor: async () => ({ features: ['| Issue: <u> | Name | @a | |'], bugfixes: [], other: [] }),
    sprint: 'APIHUB-26.3.5',
    owner: 'Netcracker',
    repoUrl: REPO,
    ...extra,
  })

test('buildPlan: images and public packages of the released components, modules first, product last and Latest', async () => {
  const p = await plan(['2.16.0', 'ui/3.11.0', 'portal-backend/1.22.0', 'api-diff/5.0.0'])
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
  const [apiDiff, ui, backend, product] = p.releases.map((r) => r.notes)
  assert.match(apiDiff, /## 📦 Package\n\n- `@netcracker\/qubership-apihub-api-diff@5\.0\.0`/)
  assert.match(ui, /- api-diff 4\.0\.0 → \[5\.0\.0\]/)
  assert.match(ui, /\| react \| 18 \| 19 \|/)
  assert.match(ui, /tree\/ui\/3\.11\.0\/frontend\/ui\)/)
  assert.match(backend, /compare\/portal-backend\/1\.21\.0\.\.\.portal-backend\/1\.22\.0/)
  assert.match(backend, /## ⚠️ Breaking changes\n\n- feat!: x by @dev/)
  assert.match(product, /Sprint: APIHUB-26\.3\.5/)
  assert.match(product, /- \*\*portal-backend 1\.22\.0\*\*: feat!: x/)
  assert.match(product, /\| Issue: <u> \| Name \| @a \| \|/)
  assert.match(product, /\| ui \| \[3\.11\.0\]\(.*\) \| 3\.10\.1 \|/)
  assert.match(product, /\| agent \| 2\.1\.5 \| none \|/)
  assert.match(product, /qubership-apihub-agent:2\.1\.5\]/)
  assert.match(product, /compare\/2\.15\.0\.\.\.2\.16\.0/)
  assert.deepEqual(p.problems, [])
})

test('buildPlan: an agent-only release has no Latest release; a package.json behind its tag is a problem', async () => {
  const p = await plan(['agent/2.1.6', 'api-diff/5.0.1'])
  assert.ok(p.releases.every((r) => !r.latest))
  assert.match(p.releases.find((r) => r.tag === 'agent/2.1.6').notes, /Helm chart:\*\* .*qubership-apihub-agent/)
  assert.deepEqual(p.problems, [
    '@netcracker/qubership-apihub-api-diff is at 5.0.0 in package.json, but the tag api-diff/5.0.1 says 5.0.1',
  ])
})

test('buildPlan: the product chart pins every product image at its current version', async () => {
  const p = await plan(['2.16.0', 'portal-backend/1.22.0'])
  assert.deepEqual(p.charts, [
    {
      ref: 'oci://ghcr.io/netcracker/charts/qubership-apihub',
      version: '2.16.0',
      dir: 'deploy/helm-templates/qubership-apihub',
      name: 'qubership-apihub',
      tag: '2.16.0',
      pins: [
        {
          path: 'qubershipApihubBackend.image.tag',
          component: 'portal-backend',
          version: '1.22.0',
          image: 'ghcr.io/netcracker/qubership-apihub-backend',
        },
        {
          path: 'qubershipApihubBuildTaskConsumer.image.tag',
          component: 'build-task-consumer',
          version: '1.4.0',
          image: 'ghcr.io/netcracker/qubership-apihub-build-task-consumer',
        },
        {
          path: 'qubershipApihubUi.image.tag',
          component: 'ui',
          version: '3.10.1',
          image: 'ghcr.io/netcracker/qubership-apihub-ui',
        },
        {
          path: 'qubershipApiLinterService.image.tag',
          component: 'api-linter-service',
          version: '1.3.0',
          image: 'ghcr.io/netcracker/qubership-api-linter-service',
        },
        {
          path: 'qubershipApihubAgentsBackend.image.tag',
          component: 'agents-backend',
          version: '0.10.0',
          image: 'ghcr.io/netcracker/qubership-apihub-agents-backend',
        },
        { path: 'qubershipApihubAgentsBackend.version', component: 'agents-backend', version: '0.10.0' },
      ],
    },
  ])
  const product = p.releases.find((r) => r.latest)
  assert.deepEqual(product.chart, { name: 'qubership-apihub', version: '2.16.0' })
  assert.match(product.notes, /`helm install apihub oci:\/\/ghcr\.io\/netcracker\/charts\/qubership-apihub --version 2\.16\.0`/)
  // The agent is not released here: its notes link the chart of agent/2.1.5, which must already exist.
  assert.deepEqual(p.chartLinks, [
    { name: 'qubership-apihub-agent', ref: 'oci://ghcr.io/netcracker/charts/qubership-apihub-agent', version: '2.1.5' },
  ])
  assert.match(product.notes, /charts\/qubership-apihub-agent` version `2\.1\.5`/)
  assert.deepEqual(p.problems, [])
})

test('buildPlan: the agent chart goes with the agent release; the product then links the chart it pushes', async () => {
  const p = await plan(['2.16.0', 'agent/2.1.6'])
  assert.deepEqual(
    p.charts.map((c) => [c.name, c.version, c.tag]),
    [
      ['qubership-apihub-agent', '2.1.6', 'agent/2.1.6'],
      ['qubership-apihub', '2.16.0', '2.16.0'],
    ],
  )
  assert.deepEqual(p.charts[0].pins, [
    {
      path: 'qubershipApihubAgent.image.tag',
      component: 'agent',
      version: '2.1.6',
      image: 'ghcr.io/netcracker/qubership-apihub-agent',
    },
  ])
  assert.deepEqual(p.chartLinks, [])
  const agent = p.releases.find((r) => r.tag === 'agent/2.1.6')
  assert.deepEqual(agent.chart, { name: 'qubership-apihub-agent', version: '2.1.6' })
  assert.match(agent.notes, /`oci:\/\/ghcr\.io\/netcracker\/charts\/qubership-apihub-agent` version `2\.1\.6`/)
  assert.match(p.releases.find((r) => r.latest).notes, /charts\/qubership-apihub-agent` version `2\.1\.6`/)
})

test('buildPlan: a chart that cannot pin a component is a problem', async () => {
  const p = await plan(['2.16.0'], { mergedTags: ['2.15.0', 'agent/2.1.5', '2.16.0'] })
  assert.ok(p.problems.includes('The chart qubership-apihub 2.16.0 cannot pin portal-backend: it has no release.'))
  assert.equal(p.problems.filter((x) => x.startsWith('The chart qubership-apihub')).length, 5)
})

test('CHARTS: every pinned component has an image, and the chart directories exist', () => {
  for (const chart of Object.values(CHARTS)) {
    assert.ok(fs.existsSync(path.join(__dirname, '..', '..', chart.dir, 'Chart.yaml')), chart.dir)
    for (const [component, paths] of Object.entries(chart.pins)) {
      if (paths.some((p) => p.endsWith('.image.tag'))) assert.ok(IMAGES[component], component)
    }
  }
})

test('buildPlan: missing work items are a problem, which stops a real run', async () => {
  const noToken = await plan(['2.16.0'], { workItemsFor: async () => null })
  assert.deepEqual(noToken.problems, [
    'PROJECT_READ_TOKEN is not set, so the work items of sprint APIHUB-26.3.5 are not listed.',
  ])
  assert.match(noToken.releases[0].notes, /## ✨ Work items\n\nPROJECT_READ_TOKEN is not set/)
  const none = await plan(['2.16.0'], { workItemsFor: async () => ({ features: [], bugfixes: [], other: [] }) })
  assert.deepEqual(none.problems, ['No Project 9 card of sprint APIHUB-26.3.5 is Done or In Test; check the sprint name.'])
  const noSprint = await plan(['2.16.0'], { sprint: undefined })
  assert.deepEqual(noSprint.problems, ['The product tag 2.16.0 names no sprint, so its work items are not listed.'])
})

test('buildPlan: product cards the token cannot read are a problem', async () => {
  const p = await plan(['2.16.0'], {
    workItemsFor: async () => ({ features: ['| x | y | | |'], bugfixes: [], other: [], hidden: 2 }),
  })
  assert.deepEqual(p.problems, [
    'PROJECT_READ_TOKEN cannot read 2 Project 9 card(s) of sprint APIHUB-26.3.5; give it access to their repositories.',
  ])
})

test('buildPlan: notes over the GitHub body limit are shortened, with the number left out', async () => {
  const many = Array.from({ length: 3000 }, (_, i) => ({
    hash: `h${i}`,
    sha: `s${i}`,
    author: 'Dev',
    subject: `chore: change number ${i} ${'x'.repeat(60)}`,
    body: '',
  }))
  const p = await plan(['portal-backend/1.22.0'], {
    commitsFor: () => many,
  })
  const notes = p.releases[0].notes
  assert.ok(notes.length <= MAX_BODY, `${notes.length} characters`)
  assert.match(notes, /- … and \d+ more; see the full changelog\./)
  assert.deepEqual(p.problems, [])
})

test('buildPlan: no release tag means nothing to publish', async () => {
  const p = await plan(['some-other-tag'])
  assert.deepEqual([p.images, p.npm, p.releases], [[], [], []])
})

test('componentDependencies maps project dependencies to components', () => {
  const graphDeps = {
    'ui-portal': [{ target: 'api-diff' }, { target: 'ui-shared' }, { target: 'npm:react' }],
    'portal-backend': [],
  }
  assert.deepEqual(componentDependencies(release.groups, graphDeps), {
    'api-diff': [],
    ui: ['api-diff'],
    'portal-backend': [],
    agent: [],
  })
})

test('IMAGES matches the image legs of ci.yml', () => {
  const ci = fs.readFileSync(path.join(__dirname, '..', '..', '.github', 'workflows', 'ci.yml'), 'utf8')
  const legs = Object.fromEntries([...ci.matchAll(/"project":"([^"]+)","image":"([^"]+)"/g)].map((m) => [m[1], m[2]]))
  const byProject = { ...IMAGES }
  byProject['ui-portal'] = byProject.ui
  delete byProject.ui
  assert.deepEqual(legs, byProject)
})
