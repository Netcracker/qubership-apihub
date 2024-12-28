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
import { compareVersions } from '../components/compare'
import { MESSAGE_SEVERITY } from '../consts'
import { DebugPerformanceContext } from '../utils/logs'

export class ChangelogStrategy implements BuilderStrategy {
  async execute(config: BuildConfig, buildResult: BuildResult, contexts: BuildTypeContexts, debugContext?: DebugPerformanceContext): Promise<BuildResult> {
    const { previousVersionPackageId, packageId, version, previousVersion } = config

    const compareContextObject = contexts.compareContext(config)

    let previousVersionCache: VersionCache | null = null
    if (previousVersion) {
      previousVersionCache = await compareContextObject.versionResolver(previousVersion, previousVersionPackageId || packageId)
    }

    const comparisonPreviousVersion = previousVersionCache?.version ?? config.previousVersion
    if (!comparisonPreviousVersion) {
      compareContextObject.notifications.push({
        severity: MESSAGE_SEVERITY.Error,
        message: `Previous version has been deleted or does not exist (${config.previousVersionPackageId || config.packageId}/${config.previousVersion})`,
      })
    }

    buildResult.comparisons = await compareVersions(
      comparisonPreviousVersion ? [comparisonPreviousVersion, previousVersionPackageId || packageId] : null,
      [version, packageId],
      compareContextObject,
      debugContext,
    )

    return buildResult
  }
}
