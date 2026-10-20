const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const {
  slug,
  bySlug,
  planSite,
  budgetFromArgs,
  storybookHome,
  NOT_PUBLISHED_HTML,
  SITE_LIMIT,
} = require('./storybook-site')
const { route } = require('../../sites/index/404-map.js')

const MIB = 1024 ** 2

// costs: slug -> [[key, MiB], ...]
function plan({ order, protectedSlugs = [], costs, budgetMib }) {
  return planSite({
    order,
    protectedSlugs: new Set(protectedSlugs),
    costs: new Map(Object.entries(costs).map(([s, cs]) => [s, cs.map(([key, m]) => ({ key, bytes: m * MIB }))])),
    budget: budgetMib * MIB,
  })
}

test('planSite() publishes the protected branches whatever they cost', () => {
  const r = plan({
    order: ['develop', 'main', 'feature-a'],
    protectedSlugs: ['develop', 'main'],
    costs: { develop: [['ui:a', 600]], main: [['ui:b', 600]], 'feature-a': [['ui:c', 1]] },
    budgetMib: 900,
  })
  assert.deepEqual(r.included, ['develop', 'main'])
  assert.deepEqual(r.excluded, [{ slug: 'feature-a', cost: 1 * MIB }])
  assert.equal(r.bytes, 1200 * MIB)
})

test('planSite() counts content two branches share once', () => {
  const r = plan({
    order: ['develop', 'feature-a'],
    protectedSlugs: ['develop'],
    costs: { develop: [['ui:a', 500]], 'feature-a': [['ui:a', 500], ['graphapi:x', 100]] },
    budgetMib: 650,
  })
  assert.deepEqual(r.included, ['develop', 'feature-a'])
  assert.equal(r.bytes, 600 * MIB)
})

test('planSite() skips a branch that does not fit and still tries later ones', () => {
  const r = plan({
    order: ['develop', 'big', 'small'],
    protectedSlugs: ['develop'],
    costs: { develop: [['ui:a', 100]], big: [['ui:b', 500]], small: [['ui:c', 50]] },
    budgetMib: 200,
  })
  assert.deepEqual(r.included, ['develop', 'small'])
  assert.deepEqual(r.excluded.map((e) => e.slug), ['big'])
})

test('planSite() always publishes a branch that adds nothing, even over the budget', () => {
  const r = plan({
    order: ['develop', 'same'],
    protectedSlugs: ['develop'],
    costs: { develop: [['ui:a', 1000]], same: [['ui:a', 1000]] },
    budgetMib: 10,
  })
  assert.deepEqual(r.included, ['develop', 'same'])
})

test('planSite() publishes a branch whole or not at all', () => {
  const r = plan({
    order: ['feature-a'],
    costs: { 'feature-a': [['ui:a', 60], ['graphapi:a', 60]] },
    budgetMib: 100,
  })
  assert.deepEqual(r.included, [])
  assert.deepEqual(r.excluded, [{ slug: 'feature-a', cost: 120 * MIB }])
  assert.equal(r.bytes, 0)
})

test('slug() and bySlug() leave colliding branches unpublished', () => {
  assert.equal(slug('feature/a+b'), 'feature-a-b')
  const { live, collisions } = bySlug(['feature/a-b', 'feature-a/b', 'develop'])
  assert.deepEqual([...live.keys()], ['develop'])
  assert.deepEqual(collisions, [{ slug: 'feature-a-b', branches: ['feature/a-b', 'feature-a/b'] }])
})

test('budgetFromArgs() takes the budget from the caller', () => {
  assert.equal(budgetFromArgs([]), 900 * MIB)
  assert.equal(budgetFromArgs(['--budget-mib', '100']), 100 * MIB)
  assert.equal(budgetFromArgs(['--budget-bytes', '12345']), 12345)
  assert.equal(budgetFromArgs(['--budget-bytes', String(2 * SITE_LIMIT)]), SITE_LIMIT)
  for (const bad of [['--budget-mib', '0'], ['--budget-bytes', '-1'], ['--budget-mib', 'x'], ['--budget-mib']]) {
    assert.throws(() => budgetFromArgs(bad), undefined, bad.join(' '))
  }
  assert.throws(() => budgetFromArgs(['--budget-mib', '1', '--budget-bytes', '1']), /not both/)
})

test('storybookHome() is the storybook/ folder under the repository segment', () => {
  assert.equal(storybookHome('/qubership-apihub/storybook/ui/gone/'), '/qubership-apihub/storybook/')
  assert.equal(storybookHome('/qubership-apihub/storybook/'), '/qubership-apihub/storybook/')
  assert.equal(storybookHome('/fork/storybook/ui/x/iframe.html'), '/fork/storybook/')
})

test('the 404 text names the cause and carries the link the 404 script points home', () => {
  assert.match(NOT_PUBLISHED_HTML, /not published/)
  assert.match(NOT_PUBLISHED_HTML, /size budget/)
  assert.match(NOT_PUBLISHED_HTML, /<a id="storybook-home" href="\/qubership-apihub\/storybook\/">/)
  assert.doesNotMatch(NOT_PUBLISHED_HTML, /<script/)
})

test('the 404 script routes a missing Storybook to the text and storybookHome()', () => {
  for (const p of [
    '/qubership-apihub/storybook/ui/deleted-branch/',
    '/qubership-apihub/storybook/ui/deleted-branch/iframe.html',
    '/qubership-apihub/storybook/no-such-component/',
    '/qubership-apihub/storybook',
  ]) {
    assert.deepEqual(route(p, '?path=/story/x', '#a'), { kind: 'storybook', home: storybookHome(p) }, p)
  }
})

test('assemble no longer writes a root 404.html', () => {
  const src = require('node:fs').readFileSync(path.join(__dirname, 'storybook-site.js'), 'utf8')
  assert.doesNotMatch(src, /'404\.html'/)
})
