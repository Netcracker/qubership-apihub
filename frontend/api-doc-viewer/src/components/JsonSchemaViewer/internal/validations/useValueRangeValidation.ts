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

import { Diff, DiffAction, DiffAdd, DiffRemove, DiffReplace, DiffType } from "@netcracker/qubership-apihub-api-diff";
import { JsonPath } from "@netcracker/qubership-apihub-json-crawl";
import {
  diffAdd,
  diffRemove,
  diffReplace,
  filterChangeKeys,
  hasAfterDeclarationPaths,
  hasBeforeDeclarationPaths,
  maxDiffType
} from "../../../../utils/common/changes";
import { isDefined } from "../../../../utils/common/checkers";

export type ValueRangeInitialData = Partial<{
  minimum: number
  exclusiveMinimum: boolean
  maximum: number
  exclusiveMaximum: boolean
}>

export type ValueRangeDiffData = Partial<{
  minimum: Diff
  exclusiveMinimum: Diff
  maximum: Diff
  exclusiveMaximum: Diff
}>

type ValueRange = Partial<{
  lower: string
  upper: string
}>

type ValueRangeChange = Partial<{
  lower: Diff
  upper: Diff
}>

type UseValueRangeValidationResult = {
  data: ValueRange
  changes: ValueRangeChange
  changesKeys: string[]
  visible: boolean
}

const DEFAULT_CHARACTER = '?'
const VALUE_MASK = '{value}'
const GREATER_THAN = '>'
const GREATER_THAN_OR_EQUALS = '>='
const LESS_THAN = '<'
const LESS_THAN_OR_EQUALS = '<='

const BITWISE_MINIMUM = 1 << 0
const BITWISE_EXCLUSIVE_MINIMUM = 1 << 1
const BITWISE_MAXIMUM = 1 << 2
const BITWISE_EXCLUSIVE_MAXIMUM = 1 << 3

const MINIMAX_CHAINS_MAPPING: Record<number, ValueRange> = {
  // no fields
  0: { lower: undefined, upper: undefined },
  // one fields
  [BITWISE_MINIMUM]: { lower: `${GREATER_THAN_OR_EQUALS} ${VALUE_MASK}`, upper: undefined },
  [BITWISE_EXCLUSIVE_MINIMUM]: { lower: `${GREATER_THAN} ${DEFAULT_CHARACTER}`, upper: undefined },
  [BITWISE_MAXIMUM]: { lower: undefined, upper: `${LESS_THAN_OR_EQUALS} ${VALUE_MASK}` },
  [BITWISE_EXCLUSIVE_MAXIMUM]: { lower: undefined, upper: `${LESS_THAN} ${DEFAULT_CHARACTER}` },
  // two fields
  [BITWISE_EXCLUSIVE_MINIMUM | BITWISE_MINIMUM]:
    { lower: `${GREATER_THAN} ${VALUE_MASK}`, upper: undefined },
  [BITWISE_EXCLUSIVE_MINIMUM | BITWISE_MAXIMUM]:
    { lower: `${GREATER_THAN} ${DEFAULT_CHARACTER}`, upper: `${LESS_THAN_OR_EQUALS} ${VALUE_MASK}` },
  [BITWISE_EXCLUSIVE_MINIMUM | BITWISE_EXCLUSIVE_MAXIMUM]:
    { lower: `${GREATER_THAN} ${DEFAULT_CHARACTER}`, upper: `${LESS_THAN} ${DEFAULT_CHARACTER}` },
  [BITWISE_EXCLUSIVE_MAXIMUM | BITWISE_MINIMUM]:
    { lower: `${GREATER_THAN_OR_EQUALS} ${VALUE_MASK}`, upper: `${LESS_THAN} ${DEFAULT_CHARACTER}` },
  [BITWISE_EXCLUSIVE_MAXIMUM | BITWISE_MAXIMUM]:
    { lower: undefined, upper: `${LESS_THAN} ${VALUE_MASK}` },
  [BITWISE_MAXIMUM | BITWISE_MINIMUM]:
    { lower: `${GREATER_THAN_OR_EQUALS} ${VALUE_MASK}`, upper: `${LESS_THAN_OR_EQUALS} ${VALUE_MASK}` },
  // three fields
  [BITWISE_EXCLUSIVE_MINIMUM | BITWISE_MINIMUM | BITWISE_MAXIMUM]:
    { lower: `${GREATER_THAN} ${VALUE_MASK}`, upper: `${LESS_THAN_OR_EQUALS} ${VALUE_MASK}` },
  [BITWISE_EXCLUSIVE_MINIMUM | BITWISE_MINIMUM | BITWISE_EXCLUSIVE_MAXIMUM]:
    { lower: `${GREATER_THAN} ${VALUE_MASK}`, upper: `${LESS_THAN} ${DEFAULT_CHARACTER}` },
  [BITWISE_EXCLUSIVE_MINIMUM | BITWISE_MAXIMUM | BITWISE_EXCLUSIVE_MAXIMUM]:
    { lower: `${GREATER_THAN} ${DEFAULT_CHARACTER}`, upper: `${LESS_THAN} ${VALUE_MASK}` },
  [BITWISE_EXCLUSIVE_MAXIMUM | BITWISE_MINIMUM | BITWISE_MAXIMUM]:
    { lower: `${GREATER_THAN_OR_EQUALS} ${VALUE_MASK}`, upper: `${LESS_THAN} ${VALUE_MASK}` },
  // all fields
  [BITWISE_MINIMUM | BITWISE_EXCLUSIVE_MINIMUM | BITWISE_MAXIMUM | BITWISE_EXCLUSIVE_MAXIMUM]:
    { lower: `${GREATER_THAN} ${VALUE_MASK}`, upper: `${LESS_THAN} ${VALUE_MASK}` },
}

export function useValueRangeValidation(
  data: ValueRangeInitialData,
  changes: ValueRangeDiffData,
  originalChangeKeys: string[]
): UseValueRangeValidationResult {
  const result: UseValueRangeValidationResult = {
    data: {},
    changes: {},
    changesKeys: [],
    visible: false,
  }

  // Basic constants
  const minimum = data.minimum
  const exclusiveMinimum = data.exclusiveMinimum
  const maximum = data.maximum
  const exclusiveMaximum = data.exclusiveMaximum
  const diffMinimum = changes.minimum
  const diffExclusiveMinimum = changes.exclusiveMinimum
  const diffMaximum = changes.maximum
  const diffExclusiveMaximum = changes.exclusiveMaximum
  const [lowerDiffType] = maxDiffType(diffMinimum, diffExclusiveMinimum)!
  const [upperDiffType] = maxDiffType(diffMaximum, diffExclusiveMaximum)!

  // Changes detection flags
  const hasMinimum = isDefined(minimum)
  const hasMaximum = isDefined(maximum)
  const hasMinimumChanged = isDefined(diffMinimum)
  const hasMaximumChanged = isDefined(diffMaximum)
  const hasExclusiveMinimumChanged = isDefined(diffExclusiveMinimum)
  const hasExclusiveMaximumChanged = isDefined(diffExclusiveMaximum)
  const minimumAdded = diffAdd(diffMinimum)
  const minimumRemoved = diffRemove(diffMinimum)
  const minimumReplaced = diffReplace(diffMinimum)
  const maximumAdded = diffAdd(diffMaximum)
  const maximumRemoved = diffRemove(diffMaximum)
  const maximumReplaced = diffReplace(diffMaximum)

  let beforeBitwiseKey: number = 0
  let afterBitwiseKey: number = 0

  // Scan which props are present in "after"
  if (hasMinimum && (!hasMinimumChanged || minimumAdded || minimumReplaced)) {
    afterBitwiseKey |= BITWISE_MINIMUM
  }
  if (exclusiveMinimum && (!hasExclusiveMinimumChanged || diffReplace(diffExclusiveMinimum) && diffExclusiveMinimum.afterValue)) {
    afterBitwiseKey |= BITWISE_EXCLUSIVE_MINIMUM
  }
  if (hasMaximum && (!hasMaximumChanged || maximumAdded || maximumReplaced)) {
    afterBitwiseKey |= BITWISE_MAXIMUM
  }
  if (exclusiveMaximum && (!hasExclusiveMaximumChanged || diffReplace(diffExclusiveMaximum) && diffExclusiveMaximum.afterValue)) {
    afterBitwiseKey |= BITWISE_EXCLUSIVE_MAXIMUM
  }

  // Mapping to human-readable values
  const afterMapping =
    afterBitwiseKey in MINIMAX_CHAINS_MAPPING
      ? { ...MINIMAX_CHAINS_MAPPING[afterBitwiseKey] }
      : undefined
  afterMapping?.lower && (afterMapping.lower = afterMapping.lower.replace(VALUE_MASK, `${minimum}`))
  afterMapping?.upper && (afterMapping.upper = afterMapping.upper.replace(VALUE_MASK, `${maximum}`))

  // Saving them
  result.data.lower = afterMapping?.lower
  result.data.upper = afterMapping?.upper

  // If no changes -> exit from hook
  if (!hasMinimumChanged && !hasExclusiveMinimumChanged && !hasMaximumChanged && !hasExclusiveMaximumChanged) {
    result.visible = isVisible(result.data.lower, result.data.upper)
    return result
  }

  // Scan which props are present in "before", if there are any changes
  let beforeMinimum: unknown
  let beforeMaximum: unknown
  if (hasMinimum && !hasMinimumChanged) {
    beforeMinimum = minimum
    beforeBitwiseKey |= BITWISE_MINIMUM
  }
  if (minimumRemoved || minimumReplaced) {
    beforeMinimum = diffMinimum.beforeValue
    beforeBitwiseKey |= BITWISE_MINIMUM
  }
  if (hasMaximum && !hasMaximumChanged) {
    beforeMaximum = maximum
    beforeBitwiseKey |= BITWISE_MAXIMUM
  }
  if (maximumRemoved || maximumReplaced) {
    beforeMaximum = diffMaximum.beforeValue
    beforeBitwiseKey |= BITWISE_MAXIMUM
  }
  if (exclusiveMinimum && !hasExclusiveMinimumChanged || diffReplace(diffExclusiveMinimum) && diffExclusiveMinimum.beforeValue) {
    beforeBitwiseKey |= BITWISE_EXCLUSIVE_MINIMUM
  }
  if (exclusiveMaximum && !hasExclusiveMaximumChanged || diffReplace(diffExclusiveMaximum) && diffExclusiveMaximum.beforeValue) {
    beforeBitwiseKey |= BITWISE_EXCLUSIVE_MAXIMUM
  }

  // Mapping to human-readable values
  const beforeMapping =
    beforeBitwiseKey in MINIMAX_CHAINS_MAPPING
      ? { ...MINIMAX_CHAINS_MAPPING[beforeBitwiseKey] }
      : undefined
  beforeMapping?.lower && (beforeMapping.lower = beforeMapping.lower.replace(VALUE_MASK, `${beforeMinimum}`))
  beforeMapping?.upper && (beforeMapping.upper = beforeMapping.upper.replace(VALUE_MASK, `${beforeMaximum}`))

  // Re-saving them
  result.data.lower ??= beforeMapping?.lower
  result.data.upper ??= beforeMapping?.upper
  result.visible = isVisible(result.data.lower, result.data.upper)

  // Synthesize new diffs
  const diffLower = compareStrings(lowerDiffType, beforeMapping?.lower, afterMapping?.lower)
  const diffUpper = compareStrings(upperDiffType, beforeMapping?.upper, afterMapping?.upper)
  const diffLowerPaths = collectDiffPaths(diffMinimum, diffExclusiveMinimum)
  const diffUpperPaths = collectDiffPaths(diffMaximum, diffExclusiveMaximum)
  if (diffLower) {
    updateDiffPaths(diffLower, diffLowerPaths)
    result.changes.lower = diffLower
  }
  if (diffUpper) {
    updateDiffPaths(diffUpper, diffUpperPaths)
    result.changes.upper = diffUpper
  }

  result.changesKeys = filterChangeKeys(result.data, originalChangeKeys)

  return result
}

function isVisible(lower: string | undefined, upper: string | undefined) {
  return !!lower || !!upper
}

function compareStrings(
  diffType: DiffType | undefined,
  before: string | undefined,
  after: string | undefined
): Diff | undefined {
  if (diffType === undefined || before === after) {
    return undefined
  }

  if (before === undefined && after !== undefined) {
    return {
      type: diffType,
      action: DiffAction.add,
      afterValue: after,
    } as DiffAdd
  }

  if (before !== undefined && after === undefined) {
    return {
      type: diffType,
      action: DiffAction.remove,
      beforeValue: before,
    } as DiffRemove
  }

  return {
    type: diffType,
    action: DiffAction.replace,
    beforeValue: before,
    afterValue: after,
  } as DiffReplace
}

type DiffPaths = {
  beforeDeclarationPaths: JsonPath[]
  afterDeclarationPaths: JsonPath[]
}

function collectDiffPaths(...diffs: (Diff | undefined)[]): DiffPaths {
  const paths: DiffPaths = {
    beforeDeclarationPaths: [],
    afterDeclarationPaths: []
  }

  for (const diff of diffs) {
    if (!diff) {
      continue
    }
    if (hasBeforeDeclarationPaths(diff)) {
      paths.beforeDeclarationPaths.push(...diff.beforeDeclarationPaths)
    }
    if (hasAfterDeclarationPaths(diff)) {
      paths.afterDeclarationPaths.push(...diff.afterDeclarationPaths)
    }
  }

  return paths
}

function updateDiffPaths(diff: Diff | undefined, paths: DiffPaths): Diff | undefined {
  if (!diff) {
    return undefined
  }

  if (hasBeforeDeclarationPaths(diff)) {
    diff.beforeDeclarationPaths = paths.beforeDeclarationPaths
  }
  if (hasAfterDeclarationPaths(diff)) {
    diff.afterDeclarationPaths = paths.afterDeclarationPaths
  }

  return diff
}
