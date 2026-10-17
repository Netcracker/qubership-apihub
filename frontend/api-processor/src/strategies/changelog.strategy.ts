/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { BuildConfig, BuilderStrategy, BuildResult, BuildTypeContexts, NotificationMessage, VersionCache } from '../types'
import { compareVersions } from '../components/compare'
import { applyBuilderVersionInfo } from '../validators'
import { toNotificationsError } from '../components/release-gate'

/**
 * Recalculate the changelog of a version that is already published — `BUILD_TYPE.CHANGELOG`. A `build` that
 * declares a `previousVersion` compares inline in `BuildStrategy` instead, and ships one archive.
 *
 * There is no release gate here, deliberately: `config.status` describes the published version rather than a
 * publication being attempted, so gating would leave a version with an unreliable changelog impossible to
 * recalculate. `test/release-gate.test.ts` pins that.
 */
export class ChangelogStrategy implements BuilderStrategy {
  async execute(config: BuildConfig, buildResult: BuildResult, contexts: BuildTypeContexts): Promise<BuildResult> {
    const { previousVersion } = config
    if (!previousVersion) {
      // `validateConfig` rejects this first; a guard rather than a fallback, so a missing baseline cannot
      // quietly produce an empty changelog. Rejected before the build starts, so it carries no notifications.
      throw new Error('ChangelogStrategy requires previousVersion; validateConfig should have rejected this build')
    }

    // the pair's array, so a baseline that does not resolve reports on the pair, not build-wide
    const rootNotifications: NotificationMessage[] = []

    try {
      return await this.compare(config, previousVersion, buildResult, contexts, rootNotifications)
    } catch (error) {
      // a changelog builds no documents, so its build stream is empty. `comparisonPhaseNotifications` would add
      // nothing: comparisons are set only after `compareVersions` returns, nothing after it can throw, and a
      // changelog never writes `comparisonNotifications`. Reference pairs' arrays are lost with the throw
      throw toNotificationsError(error, buildResult.notifications, [rootNotifications])
    }
  }

  private async compare(
    config: BuildConfig,
    previousVersion: string,
    buildResult: BuildResult,
    contexts: BuildTypeContexts,
    rootNotifications: NotificationMessage[],
  ): Promise<BuildResult> {
    const { previousVersionPackageId, packageId, version } = config

    const compareContextObject = contexts.compareContext(config)

    const previousVersionCache: VersionCache | null = await compareContextObject
      .forPair(rootNotifications)
      .versionResolver(previousVersion, previousVersionPackageId || packageId)
    const comparisonPreviousVersion = previousVersionCache?.version ?? previousVersion

    const compareResult = await compareVersions(
      [comparisonPreviousVersion, previousVersionPackageId || packageId],
      [version, packageId],
      compareContextObject,
      rootNotifications,
    )
    buildResult.comparisons = compareResult.comparisons
    buildResult.ddlComparisons = compareResult.ddlComparisons
    applyBuilderVersionInfo(config, compareResult)

    return buildResult
  }
}
