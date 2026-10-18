const { test } = require('node:test')
const assert = require('node:assert/strict')
const { componentPaths, expectedBump, renderPlan } = require('./plan')

const roots = {
  'ui-root': 'frontend/ui',
  'ui-portal': 'frontend/ui/packages/portal',
  'ui-shared': 'frontend/ui/packages/shared',
  agent: 'backend/agent',
  'agents-backend': 'backend/agents-backend',
  nested: 'backend/agent/tools/nested',
  'maven-root': '.',
}

test('componentPaths keeps the outermost roots and excludes nested projects of other components', () => {
  assert.deepEqual(componentPaths(['ui-root', 'ui-portal', 'ui-shared'], roots), ['frontend/ui'])
  assert.deepEqual(componentPaths(['agent'], roots), ['backend/agent', ':(exclude)backend/agent/tools/nested'])
  assert.deepEqual(componentPaths(['agents-backend'], roots), ['backend/agents-backend'])
})

test('expectedBump is the own bump, or patch for a dependency-only release', () => {
  assert.equal(expectedBump('none'), 'patch')
  assert.equal(expectedBump('minor'), 'minor')
})

const product = { previous: '2.15.0', next: '2.16.0', bump: 'minor', reasons: [{ source: 'ui', bump: 'minor' }] }

test('renderPlan prints one row per released component and the product', () => {
  const md = renderPlan({
    mode: 'dry run',
    rows: [
      { component: 'api-unifier', from: '2.9.2', to: '2.9.3', bump: 'patch', ownBump: 'patch', reason: 'own change' },
      { component: 'ui', from: '3.10.1', to: '3.11.0', bump: 'minor', ownBump: 'minor', reason: 'own change' },
      { component: 'api-diff', from: '4.0.0', to: '4.0.1', bump: 'patch', ownBump: 'none', reason: 'dependency' },
    ],
    unchanged: ['agent'],
    product,
  })
  assert.match(md, /^## Release plan \(dry run\)$/m)
  assert.match(md, /^\| Component \| From \| To \| Bump \| Reason \|$/m)
  assert.match(md, /^\| api-diff \| 4\.0\.0 \| 4\.0\.1 \| patch \| dependency \|$/m)
  assert.match(md, /^\| ui \| 3\.10\.1 \| 3\.11\.0 \| minor \| own change \|$/m)
  assert.match(md, /^\*\*Product:\*\* 2\.15\.0 → 2\.16\.0 \(minor; ui minor\)$/m)
  assert.match(md, /^Not released: agent\.$/m)
  assert.doesNotMatch(md, /Warning/)
})

test('renderPlan warns when Nx bumps above R6', () => {
  const md = renderPlan({
    mode: 'dry run',
    rows: [{ component: 'ui', from: '3.10.1', to: '4.0.0', bump: 'major', ownBump: 'none', reason: 'dependency' }],
    unchanged: [],
    product: { ...product, next: '3.0.0', bump: 'major', reasons: [{ source: 'ui', bump: 'major' }] },
  })
  assert.match(md, /\*\*Warning:\*\*/)
  assert.match(md, /^- ui: Nx major, R6 patch$/m)
})

test('renderPlan says when there is nothing to release', () => {
  const md = renderPlan({
    mode: 'dry run',
    rows: [],
    unchanged: ['ui', 'agent'],
    product: { previous: '2.15.0', next: null, bump: 'none', reasons: [] },
  })
  assert.match(md, /\*\*Nothing to release\.\*\*/)
  assert.match(md, /^\*\*Product:\*\* stays at 2\.15\.0/m)
  assert.doesNotMatch(md, /\| Component \|/)
})
