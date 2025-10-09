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

import { BuildConfig, BuilderStrategy, BuildResult, BuildTypeContexts } from '../types'
import { compareVersions } from '../components/compare'

export class PrefixGroupsChangelogStrategy implements BuilderStrategy {
  async execute(config: BuildConfig, buildResult: BuildResult, contexts: BuildTypeContexts): Promise<BuildResult> {
    const { packageId, version } = config
    const { compareContext } = contexts

    // Validate groups
    this.validateGroup(config.currentGroup, 'currentGroup')
    this.validateGroup(config.previousGroup, 'previousGroup')

    buildResult.comparisons = await compareVersions(
      [version, packageId],
      [version, packageId],
      compareContext(config),
    )

    return buildResult
  }

  private validateGroup(group: unknown, paramName: string): void {
    if (group === undefined) {
      return
    }

    if (typeof group !== 'string') {
      throw new Error(`${paramName} must be a string, received: ${typeof group}`)
    }

    if (group.length < 3 || !group.startsWith('/') || !group.endsWith('/')) {
      throw new Error(`${paramName} must begin and end with a "/" character and contain at least one meaningful character, received: "${group}"`)
    }
  }
}
