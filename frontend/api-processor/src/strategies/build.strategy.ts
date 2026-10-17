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

import { BuildConfig, BuilderStrategy, BuildResult, BuildTypeContexts, VersionCache } from '../types'
import { compareVersions } from '../components'
import { applyBuilderVersionInfo } from '../validators'
import { getOperationsList, replaceInPlace } from '../utils'
import { buildFiles } from '../components/files'
import { buildVersionContent } from '../components/build-documents'
import { calculateHistoryForDeprecatedItems } from '../components/deprecated'
import { assertReleaseIsPublishable, comparisonPhaseNotifications, toNotificationsError } from '../components/release-gate'
import { REST_API_TYPE } from '../consts'
import { NotificationMessage } from '../types/package/notifications'

export class BuildStrategy implements BuilderStrategy {
  async execute(config: BuildConfig, buildResult: BuildResult, contexts: BuildTypeContexts): Promise<BuildResult> {
    // an invalid config is rejected before the build starts, so it carries no notifications
    if (!config.files?.length && !config.refs?.length) {
      throw new Error('Incorrect config: No files and refs')
    }

    // the pair's array: a baseline that does not resolve builds no comparison to own the failure
    const rootNotifications: NotificationMessage[] = []

    try {
      return await this.build(config, buildResult, contexts, rootNotifications)
    } catch (error) {
      // the root pair's array is on the failure even when the comparison threw before it returned
      throw toNotificationsError(
        error,
        buildResult.notifications,
        [rootNotifications, comparisonPhaseNotifications(buildResult)],
      )
    }
  }

  private async build(
    config: BuildConfig,
    buildResult: BuildResult,
    contexts: BuildTypeContexts,
    rootNotifications: NotificationMessage[],
  ): Promise<BuildResult> {
    const {
      previousVersionPackageId,
      packageId,
      version,
      previousVersion,
      files,
    } = config

    const { builderContext, compareContext } = contexts
    const builderContextObject = builderContext(config)
    const compareContextObject = compareContext(config)

    let previousVersionCache: VersionCache | null = null
    if (previousVersion) {
      previousVersionCache = await compareContextObject
        .forPair(rootNotifications)
        .versionResolver(previousVersion, previousVersionPackageId || packageId)
    }

    if (files?.length) {
      await buildVersionContent(
        await buildFiles(files, builderContextObject),
        builderContextObject,
        buildResult,
      )

      // fail fast: a release already doomed by its own documents should not spend time on a changelog that
      // would be discarded. The authoritative check is the one after the comparison phase.
      assertReleaseIsPublishable(config.status, buildResult.notifications, [])

      if (!builderContextObject.builderRunOptions.withoutDeprecatedDepth && previousVersionCache) {
        await calculateHistoryForDeprecatedItems(
          REST_API_TYPE,
          getOperationsList(buildResult),
          previousVersionCache.version,
          previousVersionPackageId || packageId,
          builderContextObject,
        )
      }
    }

    if (!builderContextObject.builderRunOptions.withoutChangelog && previousVersionCache) {
      const compareResult = await compareVersions(
        [previousVersionCache.version, previousVersionPackageId || packageId],
        [version, packageId],
        compareContextObject,
        rootNotifications,
      )
      buildResult.comparisons = compareResult.comparisons
      buildResult.ddlComparisons = compareResult.ddlComparisons
      applyBuilderVersionInfo(config, compareResult)
    } else if (rootNotifications.length) {
      // no comparison ran, so the packager files these under the pair the config declared
      replaceInPlace(buildResult.comparisonNotifications, rootNotifications)
    }

    // authoritative: it sees both streams, including every message the comparison phase raised
    assertReleaseIsPublishable(config.status, buildResult.notifications, comparisonPhaseNotifications(buildResult))

    return buildResult
  }
}
