/**
 * Nx release version actions for components whose version lives only in git tags: the Go modules
 * and the Java task consumer. They have no manifest, so nothing is read from or written to disk;
 * Nx resolves the current version from the last `<component>/<version>` tag and creates the new tag.
 *
 * readCurrentVersionFromSourceManifest is reached only through fallbackCurrentVersionResolver
 * "disk", when the component has no matching tag yet. Such a component starts from 0.0.0.
 */
const { VersionActions } = require('nx/release')

const INITIAL_VERSION = '0.0.0'

class TagOnlyVersionActions extends VersionActions {
  validManifestFilenames = null

  async readCurrentVersionFromSourceManifest() {
    return {
      currentVersion: INITIAL_VERSION,
      manifestPath: `none (${this.releaseGroup.name} has no tag yet, starting from ${INITIAL_VERSION})`,
    }
  }

  async readCurrentVersionFromRegistry() {
    return null
  }

  async readCurrentVersionOfDependency() {
    return { currentVersion: null, dependencyCollection: null }
  }

  async updateProjectVersion() {
    return []
  }

  async updateProjectDependencies() {
    return []
  }
}

module.exports = TagOnlyVersionActions
