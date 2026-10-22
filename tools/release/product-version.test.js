const { test } = require('node:test')
const assert = require('node:assert/strict')
const { PRODUCT_COMPONENTS, componentBumpsAtHead, latestProductTag, productVersion } = require('./product-version')

test('the product components are the six of the design', () => {
  assert.deepEqual([...PRODUCT_COMPONENTS].sort(), [
    'agents-backend',
    'api-linter-service',
    'build-task-consumer',
    'java-task-consumer',
    'portal-backend',
    'ui',
  ])
})

test('latestProductTag takes the highest stable bare tag', () => {
  const tags = ['2.9.0', '2.15.0', '2.10.1', 'ui/9.0.0', '3.0.0-rc.1', 'portal-backend/1.21.0', 'beta']
  assert.equal(latestProductTag(tags), '2.15.0')
  assert.equal(latestProductTag(['ui/1.0.0']), null)
})

test('the product continues from 2.15.0 with the highest component bump', () => {
  const result = productVersion({
    previous: '2.15.0',
    componentBumps: { ui: 'minor', 'portal-backend': 'patch', 'build-task-consumer': 'patch' },
    deployBump: 'none',
  })
  assert.equal(result.next, '2.16.0')
  assert.equal(result.bump, 'minor')
  assert.deepEqual(result.reasons, [
    { source: 'portal-backend', bump: 'patch' },
    { source: 'ui', bump: 'minor' },
    { source: 'build-task-consumer', bump: 'patch' },
  ])
})

test('a major bump of any product component gives a major product bump', () => {
  const result = productVersion({ previous: '2.15.0', componentBumps: { 'java-task-consumer': 'major' } })
  assert.equal(result.next, '3.0.0')
})

test('the agent and the libraries do not move the product', () => {
  const result = productVersion({
    previous: '2.15.0',
    componentBumps: { agent: 'major', 'api-diff': 'major', 'commons-go': 'minor' },
    deployBump: 'none',
  })
  assert.equal(result.next, null)
  assert.equal(result.bump, 'none')
  assert.deepEqual(result.reasons, [])
})

test('commits that touch deploy/ move the product on their own', () => {
  const result = productVersion({ previous: '2.15.0', componentBumps: {}, deployBump: 'patch' })
  assert.equal(result.next, '2.15.1')
  assert.deepEqual(result.reasons, [{ source: 'deploy', bump: 'patch' }])
})

test('deploy/ and components combine to the highest bump', () => {
  const result = productVersion({ previous: '2.15.0', componentBumps: { ui: 'patch' }, deployBump: 'minor' })
  assert.equal(result.next, '2.16.0')
})

test('a non-semver previous version is refused', () => {
  assert.throws(() => productVersion({ previous: 'v2.15.0', componentBumps: {} }), /not semver/)
})

test('componentBumpsAtHead compares each tag at HEAD with the previous tag of its component', () => {
  const all = [
    'ui/3.10.1',
    'ui/3.9.0',
    'ui/3.11.0',
    'portal-backend/1.21.0',
    'portal-backend/1.21.1',
    'java-task-consumer/0.1.0',
    'agent/2.1.6',
    'agent/2.1.5',
    'ui/0.0.1-test',
  ]
  const atHead = ['ui/3.11.0', 'portal-backend/1.21.1', 'java-task-consumer/0.1.0', 'agent/2.1.6', '2.16.0']
  assert.deepEqual(componentBumpsAtHead(atHead, all), {
    ui: 'minor',
    'portal-backend': 'patch',
    'java-task-consumer': 'minor',
  })
})
