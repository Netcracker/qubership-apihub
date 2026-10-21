const { test } = require('node:test')
const assert = require('node:assert/strict')
const TagOnlyVersionActions = require('./tag-only')

function create() {
  const actions = new TagOnlyVersionActions(
    { name: 'portal-backend' },
    { name: 'portal-backend', data: { root: 'backend/portal-backend' } },
    { manifestRootsToUpdate: [], preserveLocalDependencyProtocols: true },
  )
  const tree = {
    exists: () => assert.fail('tag-only version actions must not look for a manifest'),
    write: () => assert.fail('tag-only version actions must not write'),
  }
  return { actions, tree }
}

test('declares no manifest and resolves no manifest path', async () => {
  const { actions, tree } = create()
  assert.equal(actions.validManifestFilenames, null)
  await actions.init(tree)
  await actions.validate(tree)
  assert.deepEqual(actions.manifestsToUpdate, [])
})

test('a component without a tag starts from 0.0.0', async () => {
  const { actions, tree } = create()
  const { currentVersion } = await actions.readCurrentVersionFromSourceManifest(tree)
  assert.equal(currentVersion, '0.0.0')
  assert.equal(await actions.readCurrentVersionFromRegistry(tree, {}), null)
})

test('versioning writes nothing', async () => {
  const { actions, tree } = create()
  assert.deepEqual(await actions.updateProjectVersion(tree, '1.22.0'), [])
  assert.deepEqual(await actions.updateProjectDependencies(tree, {}, { 'commons-go': '0.1.0' }), [])
  assert.deepEqual(await actions.readCurrentVersionOfDependency(tree, {}, 'commons-go'), {
    currentVersion: null,
    dependencyCollection: null,
  })
})

test('semver bumps follow the base implementation', async () => {
  const { actions } = create()
  const { newVersion } = await actions.calculateNewVersion('1.21.0', 'minor', 'CONVENTIONAL_COMMITS', {}, undefined)
  assert.equal(newVersion, '1.22.0')
})
