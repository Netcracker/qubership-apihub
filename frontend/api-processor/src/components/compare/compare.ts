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

import { BuildConfigRef, CompareContext, VersionParams, VersionsComparison, VersionsComparisonDto } from '../../types'
import { compareVersionsOperations } from './compare.operations'
import { getSplittedVersionKey } from '../../utils'
import { toVersionsComparisonDto } from '../../utils/transformToDto'
import { MESSAGE_SEVERITY } from '../../consts'
import { asyncDebugPerformance, DebugPerformanceContext } from '../../utils/logs'

export async function compareVersions(
  prev: VersionParams,
  curr: VersionParams,
  ctx: CompareContext,
  debugCtx?: DebugPerformanceContext,
): Promise<VersionsComparisonDto[]> {
  let comparisons: VersionsComparison[] = []
  await asyncDebugPerformance('[CompareVersions]', async (versionsDebugContext) => {
    comparisons = await compareVersionsReferences(prev, curr, ctx)
    comparisons.push(await asyncDebugPerformance(
      '[CompareOperations]',
      (operationsDebugCtx) => compareVersionsOperations(prev, curr, ctx, operationsDebugCtx),
      versionsDebugContext,
    ))
  }, debugCtx, prev ? [prev[1], prev[0]] : ['empty previous id', 'empty previous version'])

  const logError = (message: string): void => {
    ctx.notifications.push({
      severity: MESSAGE_SEVERITY.Error,
      message: message,
    })
  }

  return comparisons.map(comparison => toVersionsComparisonDto(comparison, logError))
}

export async function compareVersionsReferences(
  prev: VersionParams,
  curr: VersionParams,
  ctx: CompareContext,
): Promise<VersionsComparison[]> {
  const comparisons: VersionsComparison[] = []

  const currentVersionRefs = curr && await ctx.versionReferencesResolver(...curr) || []
  const previousVersionRefs = prev && await ctx.versionReferencesResolver(...prev) || []

  const refsMap = new Map<string, { [key: string]: BuildConfigRef }>()

  // map refs by refId
  for (const previous of previousVersionRefs) {
    refsMap.set(previous.refId, { previous })
  }
  for (const current of currentVersionRefs) {
    const mapping = refsMap.get(current.refId)
    refsMap.set(current.refId, { ...mapping, current })
  }

  for (const { current, previous } of refsMap.values()) {
    if (previous && current) {
      const comparison = await ctx.versionComparisonResolver(current.version, current.refId, previous.version, previous.refId)
      if (comparison && Array.isArray(comparison.operationTypes)) {
        const [previousVersion, previousVersionRevision] = getSplittedVersionKey(previous.version)
        const [version, revision] = getSplittedVersionKey(current.version)

        comparisons.push({
          ...comparison,
          packageId: current.refId,
          version: version,
          revision: revision,
          previousVersionPackageId: previous.refId,
          previousVersion: previousVersion,
          previousVersionRevision: previousVersionRevision,
          fromCache: true,
        })
        continue
      }
    }
    const prevParams: VersionParams = previous ? [previous.version, previous.refId] : null
    const currParams: VersionParams = current ? [current.version, current.refId] : null
    comparisons.push(await compareVersionsOperations(prevParams, currParams, ctx))
  }

  return comparisons
}
