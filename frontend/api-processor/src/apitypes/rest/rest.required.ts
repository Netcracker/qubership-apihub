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

import { isArray, isObject, syncCrawl as newSyncCrawl, SyncCrawlHook } from '@netcracker/qubership-apihub-json-crawl'
import { Diff, DIFF_META_KEY, DiffAction, DiffMetaRecord } from '@netcracker/qubership-apihub-api-diff'
import { getJsoProperty, JSON_SCHEMA_PROPERTY_REQUIRED } from '@netcracker/qubership-apihub-api-unifier'

export function findRequiredRemovedProperties(mergedJso: unknown, diffs: Diff[]): RequiredDiff[] | undefined {
  const removedPropDiffs = diffs.filter(diff => diff.action === DiffAction.remove && isObject(diff.beforeNormalizedValue))

  const requiredPropertiesState: RequiredPropertiesCrawlState = {
    crawledValues: new Set(),
    parent: undefined,
    propertyDiff: [],
    removedDiffs: removedPropDiffs,
  }

  newSyncCrawl<RequiredPropertiesCrawlState>(
    mergedJso,
    [requiredHook],
    { state: requiredPropertiesState },
  )

  return requiredPropertiesState.propertyDiff
}

export const requiredHook: RequiredPropertiesCrawlHook = ({ key, value, state }) => {
  if (!isObject(value)) {
    return { done: true }
  }
  if (typeof key === 'symbol') {
    return { done: true }
  }
  if (state.crawledValues.has(value)) {
    return { done: true }
  }

  const localState = {
    ...state,
    parent: value,
    crawledValues: state.crawledValues.add(value),
  }

  const diffRecordForProperties = value[DIFF_META_KEY] as DiffMetaRecord
  if (!diffRecordForProperties) {
    return { state: localState }
  }

  const matchedDiffPropertyRecords = Object.entries(diffRecordForProperties).filter(([, value]) => state.removedDiffs.includes(value))
  if (matchedDiffPropertyRecords.length === 0) {
    return { state: localState }
  }
  if (!isObject(state.parent)) {
    return { state: localState }
  }
  const required = state.parent[JSON_SCHEMA_PROPERTY_REQUIRED]
  if (!isArray(required)) {
    return { state: localState }
  }

  const diffRecordForRequired = getJsoProperty(required, DIFF_META_KEY) as DiffMetaRecord
  if (!diffRecordForRequired) {
    return { state: localState }
  }
  const requiredDiffs = Object.values(diffRecordForRequired)
  matchedDiffPropertyRecords
    .map(([propName, propDiff]) => {
      state.propertyDiff.push({
        propName,
        propDiff,
        requiredDiff: requiredDiffs.find(rd => (rd.action === DiffAction.remove || rd.action === DiffAction.replace) && rd.beforeNormalizedValue === propName),
      })
    })

  return { state: localState }
}

type RequiredPropertiesCrawlState = {
  crawledValues: Set<unknown>
  parent: unknown
  propertyDiff: RequiredDiff[]
  removedDiffs: Diff[]
}

type RequiredPropertiesCrawlHook = SyncCrawlHook<RequiredPropertiesCrawlState>
type RequiredDiff = {
  propName: PropertyKey
  propDiff: Diff
  requiredDiff: Diff | undefined
}
