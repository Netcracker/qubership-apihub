import { BuildConfig, BuilderStrategy, BuildResult, BuildTypeContexts } from '../types'
import { compareVersions } from '../components/compare'
import { applyBuilderVersionInfo } from '../validators'
import { validateGroupPrefix } from '../apitypes/rest/rest.utils'

export class PrefixGroupsChangelogStrategy implements BuilderStrategy {
  async execute(config: BuildConfig, buildResult: BuildResult, contexts: BuildTypeContexts): Promise<BuildResult> {
    const { packageId, version } = config
    const { compareContext } = contexts

    // Validate groups
    validateGroupPrefix(config.currentGroup, 'currentGroup')
    validateGroupPrefix(config.previousGroup, 'previousGroup')

    const compareResult = await compareVersions(
      [version, packageId],
      [version, packageId],
      compareContext(config),
    )
    buildResult.comparisons = compareResult.comparisons
    applyBuilderVersionInfo(config, compareResult)

    return buildResult
  }
}
