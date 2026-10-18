const { test } = require('node:test')
const assert = require('node:assert/strict')
const { componentBumps, componentPaths, lastReleaseTag, renderVersionPlan } = require('./version-plan')

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

const release = {
  releaseTag: { pattern: '{releaseGroupName}/{version}' },
  groups: {
    ui: { projects: ['ui-root', 'ui-portal', 'ui-shared'] },
    agent: { projects: ['agent'] },
    'agents-backend': { projects: ['agents-backend'] },
  },
}

test('lastReleaseTag takes the highest stable version of the component, not of a name it prefixes', () => {
  const tags = ['agent/1.2.0', 'agent/1.10.0', 'agent/2.0.0-rc.1', 'agents-backend/9.0.0', '2.15.0', 'agent/x']
  assert.equal(lastReleaseTag('agent', release.groups.agent, release, tags), 'agent/1.10.0')
  const agentsBackend = release.groups['agents-backend']
  assert.equal(lastReleaseTag('agents-backend', agentsBackend, release, tags), 'agents-backend/9.0.0')
  assert.equal(lastReleaseTag('ui', release.groups.ui, release, tags), null)
})

test('lastReleaseTag honours a group releaseTag pattern', () => {
  const group = { projects: ['agent'], releaseTag: { pattern: 'v{version}-agent' } }
  assert.equal(lastReleaseTag('agent', group, release, ['v1.0.0-agent', 'v1.1.0-agent', 'agent/3.0.0']), 'v1.1.0-agent')
})

test('componentBumps asks for the commits since the last tag on the component paths only', () => {
  const calls = []
  const bumps = componentBumps({
    release,
    roots,
    tags: ['agent/1.0.0', 'agents-backend/0.3.0'],
    bumpOf: (lastTag, paths) => {
      calls.push([lastTag, paths])
      return lastTag === 'agent/1.0.0' ? 'minor' : 'none'
    },
  })
  assert.deepEqual(bumps, [
    { component: 'ui', lastTag: null, bump: 'none' },
    { component: 'agent', lastTag: 'agent/1.0.0', bump: 'minor' },
    { component: 'agents-backend', lastTag: 'agents-backend/0.3.0', bump: 'none' },
  ])
  assert.deepEqual(calls, [
    [null, ['frontend/ui']],
    ['agent/1.0.0', ['backend/agent', ':(exclude)backend/agent/tools/nested']],
    ['agents-backend/0.3.0', ['backend/agents-backend']],
  ])
})

test('renderVersionPlan lists only the bumped components, or returns null', () => {
  const plan = renderVersionPlan([
    { component: 'api-unifier', bump: 'major' },
    { component: 'ui', bump: 'none' },
    { component: 'agent', bump: 'patch' },
  ])
  assert.match(plan, /^---\napi-unifier: major\nagent: patch\n---\n/)
  assert.equal(renderVersionPlan([{ component: 'ui', bump: 'none' }]), null)
})
