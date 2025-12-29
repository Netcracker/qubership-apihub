import type { RulesetWithFile } from '@portal/entities'
import type { Version } from '@test-data/props'
import type { ResourceFileInfo, UsedResourcesHelper } from './fixtures'

/**
 * Registers version files with usedResources fixture for attach-on-failure.
 * File names are formatted as: packageId_version_filename
 */
export const registerVersionFiles = (
  usedResources: UsedResourcesHelper,
  versions: Version | Version[],
): void => {
  const versionsArray = Array.isArray(versions) ? versions : [versions]

  const files: ResourceFileInfo[] = []

  for (const version of versionsArray) {
    if (!version.files) continue

    const { packageId } = version.pkg
    const versionName = version.version

    for (const vf of version.files) {
      files.push({
        name: `${packageId}_${versionName}_${vf.file.name}`,
        path: vf.file.path,
      })
    }
  }

  if (files.length === 0) return

  usedResources.addFiles(files)
}

/**
 * Registers ruleset files with usedResources fixture for attach-on-failure.
 * File names are formatted as: rulesetName_apiType_filename
 * Accepts a single ruleset or an array of rulesets.
 */
export const registerRulesetFiles = (
  usedResources: UsedResourcesHelper,
  rulesets: RulesetWithFile | RulesetWithFile[],
): void => {
  const rulesetsArray = Array.isArray(rulesets) ? rulesets : [rulesets]

  const files: ResourceFileInfo[] = rulesetsArray.map((ruleset) => ({
    name: `${ruleset.name}_${ruleset.apiType}_${ruleset.file.name}`,
    path: ruleset.file.path,
  }))

  usedResources.addFiles(files)
}
