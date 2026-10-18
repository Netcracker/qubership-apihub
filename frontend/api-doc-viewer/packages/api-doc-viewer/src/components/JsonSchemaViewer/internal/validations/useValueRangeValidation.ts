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
  maxDiffTypeFromDiffs
} from "../../../../utils/common/changes";
import { isDefined } from "../../../../utils/common/checkers";

export type ValueRangeInitialData = Partial<{
  minimum: number
  exclusiveMinimum: number | boolean
  maximum: number
  exclusiveMaximum: number | boolean
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
const EXCLUSIVE_VALUE_MASK = '{exclusive_value}'
const GREATER_THAN = '>'
const GREATER_THAN_OR_EQUALS = '>='
const LESS_THAN = '<'
const LESS_THAN_OR_EQUALS = '<='

const BITWISE_MINIMUM = 1 << 0
const BITWISE_EXCLUSIVE_MINIMUM = 1 << 1
const BITWISE_MAXIMUM = 1 << 2
const BITWISE_EXCLUSIVE_MAXIMUM = 1 << 3

// Templates use VALUE_MASK for the regular bound value and EXCLUSIVE_VALUE_MASK for the exclusive bound value.
// substituteValues is called separately for lower (with minimum / exclusiveLowerValue) and upper
// (with maximum / exclusiveUpperValue), so a single EXCLUSIVE_VALUE_MASK suffices for both sides.
// EXCLUSIVE_VALUE_MASK falls back to DEFAULT_CHARACTER when no numeric exclusive value is available (JSON Schema Draft 04 boolean style).
const MINIMAX_CHAINS_MAPPING: Record<number, ValueRange> = {
  // no fields
  0: { lower: undefined, upper: undefined },
  // one field
  [BITWISE_MINIMUM]: { lower: `${GREATER_THAN_OR_EQUALS} ${VALUE_MASK}`, upper: undefined },
  [BITWISE_EXCLUSIVE_MINIMUM]: { lower: `${GREATER_THAN} ${EXCLUSIVE_VALUE_MASK}`, upper: undefined },
  [BITWISE_MAXIMUM]: { lower: undefined, upper: `${LESS_THAN_OR_EQUALS} ${VALUE_MASK}` },
  [BITWISE_EXCLUSIVE_MAXIMUM]: { lower: undefined, upper: `${LESS_THAN} ${EXCLUSIVE_VALUE_MASK}` },
  // two fields
  [BITWISE_EXCLUSIVE_MINIMUM | BITWISE_MINIMUM]:
    { lower: `${GREATER_THAN} ${VALUE_MASK}`, upper: undefined },
  [BITWISE_EXCLUSIVE_MINIMUM | BITWISE_MAXIMUM]:
    { lower: `${GREATER_THAN} ${EXCLUSIVE_VALUE_MASK}`, upper: `${LESS_THAN_OR_EQUALS} ${VALUE_MASK}` },
  [BITWISE_EXCLUSIVE_MINIMUM | BITWISE_EXCLUSIVE_MAXIMUM]:
    { lower: `${GREATER_THAN} ${EXCLUSIVE_VALUE_MASK}`, upper: `${LESS_THAN} ${EXCLUSIVE_VALUE_MASK}` },
  [BITWISE_EXCLUSIVE_MAXIMUM | BITWISE_MINIMUM]:
    { lower: `${GREATER_THAN_OR_EQUALS} ${VALUE_MASK}`, upper: `${LESS_THAN} ${EXCLUSIVE_VALUE_MASK}` },
  [BITWISE_EXCLUSIVE_MAXIMUM | BITWISE_MAXIMUM]:
    { lower: undefined, upper: `${LESS_THAN} ${VALUE_MASK}` },
  [BITWISE_MAXIMUM | BITWISE_MINIMUM]:
    { lower: `${GREATER_THAN_OR_EQUALS} ${VALUE_MASK}`, upper: `${LESS_THAN_OR_EQUALS} ${VALUE_MASK}` },
  // three fields
  [BITWISE_EXCLUSIVE_MINIMUM | BITWISE_MINIMUM | BITWISE_MAXIMUM]:
    { lower: `${GREATER_THAN} ${VALUE_MASK}`, upper: `${LESS_THAN_OR_EQUALS} ${VALUE_MASK}` },
  [BITWISE_EXCLUSIVE_MINIMUM | BITWISE_MINIMUM | BITWISE_EXCLUSIVE_MAXIMUM]:
    { lower: `${GREATER_THAN} ${VALUE_MASK}`, upper: `${LESS_THAN} ${EXCLUSIVE_VALUE_MASK}` },
  [BITWISE_EXCLUSIVE_MINIMUM | BITWISE_MAXIMUM | BITWISE_EXCLUSIVE_MAXIMUM]:
    { lower: `${GREATER_THAN} ${EXCLUSIVE_VALUE_MASK}`, upper: `${LESS_THAN} ${VALUE_MASK}` },
  [BITWISE_EXCLUSIVE_MAXIMUM | BITWISE_MINIMUM | BITWISE_MAXIMUM]:
    { lower: `${GREATER_THAN_OR_EQUALS} ${VALUE_MASK}`, upper: `${LESS_THAN} ${VALUE_MASK}` },
  // all fields
  [BITWISE_MINIMUM | BITWISE_EXCLUSIVE_MINIMUM | BITWISE_MAXIMUM | BITWISE_EXCLUSIVE_MAXIMUM]:
    { lower: `${GREATER_THAN} ${VALUE_MASK}`, upper: `${LESS_THAN} ${VALUE_MASK}` },
}

// True when an exclusive bound is active: boolean true (JSON Schema Draft 04 boolean style)
// or any number including 0 (JSON Schema Draft 07 and above numeric value).
function isExclusiveActive(v: number | boolean | undefined): boolean {
  return v !== undefined && v !== false
}

// True when a diff beforeValue/afterValue represents an active exclusive bound.
function isExclusiveDiffValueActive(v: unknown): boolean {
  return v !== undefined && v !== false
}

// When both the regular lower bound and a numeric (JSON Schema Draft 07 and above numeric value) exclusive lower bound are set,
// keep only the stricter bit. For JSON Schema Draft 04 (exclusiveMinimum is a boolean flag), both bits together
// is correct — the template for that combo uses VALUE_MASK which correctly renders the minimum value.
function resolveEffectiveLowerBitwiseKey(key: number, minValue: unknown, exclMinValue: number | undefined): number {
  if ((key & (BITWISE_MINIMUM | BITWISE_EXCLUSIVE_MINIMUM)) !== (BITWISE_MINIMUM | BITWISE_EXCLUSIVE_MINIMUM)) {
    return key
  }
  if (exclMinValue === undefined || typeof minValue !== 'number') {
    return key  // JSON Schema Draft 04 combo (boolean exclusive flag): both bits are intentional
  }
  // JSON Schema Draft 07 and above numeric value: exclusive bound is stricter when exclMin >= min (equal prefers exclusive: x>5 is stricter than x>=5)
  return exclMinValue >= minValue
    ? key & ~BITWISE_MINIMUM           // exclusive is stricter → > exclMin
    : key & ~BITWISE_EXCLUSIVE_MINIMUM // regular is stricter  → >= min
}

// Symmetric counterpart for the upper bound.
function resolveEffectiveUpperBitwiseKey(key: number, maxValue: unknown, exclMaxValue: number | undefined): number {
  if ((key & (BITWISE_MAXIMUM | BITWISE_EXCLUSIVE_MAXIMUM)) !== (BITWISE_MAXIMUM | BITWISE_EXCLUSIVE_MAXIMUM)) {
    return key
  }
  if (exclMaxValue === undefined || typeof maxValue !== 'number') {
    return key  // JSON Schema Draft 04 combo: both bits are intentional
  }
  // JSON Schema Draft 07 and above numeric value: exclusive upper bound is stricter when exclMax <= max (equal prefers exclusive: x<5 is stricter than x<=5)
  return exclMaxValue <= maxValue
    ? key & ~BITWISE_MAXIMUM           // exclusive is stricter → < exclMax
    : key & ~BITWISE_EXCLUSIVE_MAXIMUM // regular is stricter  → <= max
}

function substituteValues(
  template: string,
  regularValue: unknown,
  exclusiveValue: number | undefined,
): string {
  return template
    .replace(VALUE_MASK, `${regularValue}`)
    .replace(EXCLUSIVE_VALUE_MASK, isDefined(exclusiveValue) ? `${exclusiveValue}` : DEFAULT_CHARACTER)
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
  const [lowerDiffType] = maxDiffTypeFromDiffs(diffMinimum, diffExclusiveMinimum)!
  const [upperDiffType] = maxDiffTypeFromDiffs(diffMaximum, diffExclusiveMaximum)!

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

  // Numeric exclusive bound values from the current (after) state for substitution
  const exclusiveLowerValue = typeof exclusiveMinimum === 'number' ? exclusiveMinimum : undefined
  const exclusiveUpperValue = typeof exclusiveMaximum === 'number' ? exclusiveMaximum : undefined

  let beforeBitwiseKey: number = 0
  let afterBitwiseKey: number = 0

  // Scan which props are present in "after"
  if (hasMinimum && (!hasMinimumChanged || minimumAdded || minimumReplaced)) {
    afterBitwiseKey |= BITWISE_MINIMUM
  }
  if (isExclusiveActive(exclusiveMinimum) && (
    !hasExclusiveMinimumChanged ||
    diffAdd(diffExclusiveMinimum) ||
    (diffReplace(diffExclusiveMinimum) && isExclusiveDiffValueActive(diffExclusiveMinimum?.afterValue))
  )) {
    afterBitwiseKey |= BITWISE_EXCLUSIVE_MINIMUM
  }
  if (hasMaximum && (!hasMaximumChanged || maximumAdded || maximumReplaced)) {
    afterBitwiseKey |= BITWISE_MAXIMUM
  }
  if (isExclusiveActive(exclusiveMaximum) && (
    !hasExclusiveMaximumChanged ||
    diffAdd(diffExclusiveMaximum) ||
    (diffReplace(diffExclusiveMaximum) && isExclusiveDiffValueActive(diffExclusiveMaximum?.afterValue))
  )) {
    afterBitwiseKey |= BITWISE_EXCLUSIVE_MAXIMUM
  }

  // OAS 3.0 boolean exclusive flags are modifiers on the regular bound — without a paired minimum/maximum
  // they carry no display value and must be suppressed (otherwise the template renders '> ?' / '< ?').
  if (typeof exclusiveMinimum !== 'number' && !(afterBitwiseKey & BITWISE_MINIMUM)) {
    afterBitwiseKey &= ~BITWISE_EXCLUSIVE_MINIMUM
  }
  if (typeof exclusiveMaximum !== 'number' && !(afterBitwiseKey & BITWISE_MAXIMUM)) {
    afterBitwiseKey &= ~BITWISE_EXCLUSIVE_MAXIMUM
  }

  // For JSON Schema Draft 07 and above numeric value: when both bits are set, keep only the effective (stricter) one
  afterBitwiseKey = resolveEffectiveLowerBitwiseKey(afterBitwiseKey, minimum, exclusiveLowerValue)
  afterBitwiseKey = resolveEffectiveUpperBitwiseKey(afterBitwiseKey, maximum, exclusiveUpperValue)

  // Mapping to human-readable values
  const afterMapping =
    afterBitwiseKey in MINIMAX_CHAINS_MAPPING
      ? { ...MINIMAX_CHAINS_MAPPING[afterBitwiseKey] }
      : undefined
  if (afterMapping?.lower) {
    afterMapping.lower = substituteValues(afterMapping.lower, minimum, exclusiveLowerValue)
  }
  if (afterMapping?.upper) {
    afterMapping.upper = substituteValues(afterMapping.upper, maximum, exclusiveUpperValue)
  }

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
  let beforeExclusiveLowerValue: number | undefined
  let beforeExclusiveUpperValue: number | undefined

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

  // Exclusive minimum before state: present when unchanged, replaced, or removed
  if (isExclusiveActive(exclusiveMinimum) && !hasExclusiveMinimumChanged) {
    beforeBitwiseKey |= BITWISE_EXCLUSIVE_MINIMUM
    beforeExclusiveLowerValue = exclusiveLowerValue
  }
  if ((diffReplace(diffExclusiveMinimum) || diffRemove(diffExclusiveMinimum)) &&
    isExclusiveDiffValueActive(diffExclusiveMinimum?.beforeValue)) {
    beforeBitwiseKey |= BITWISE_EXCLUSIVE_MINIMUM
    if (typeof diffExclusiveMinimum!.beforeValue === 'number') {
      beforeExclusiveLowerValue = diffExclusiveMinimum!.beforeValue as number
    }
  }

  // Exclusive maximum before state: present when unchanged, replaced, or removed
  if (isExclusiveActive(exclusiveMaximum) && !hasExclusiveMaximumChanged) {
    beforeBitwiseKey |= BITWISE_EXCLUSIVE_MAXIMUM
    beforeExclusiveUpperValue = exclusiveUpperValue
  }
  if ((diffReplace(diffExclusiveMaximum) || diffRemove(diffExclusiveMaximum)) &&
    isExclusiveDiffValueActive(diffExclusiveMaximum?.beforeValue)) {
    beforeBitwiseKey |= BITWISE_EXCLUSIVE_MAXIMUM
    if (typeof diffExclusiveMaximum!.beforeValue === 'number') {
      beforeExclusiveUpperValue = diffExclusiveMaximum!.beforeValue as number
    }
  }

  // Same suppression as for after-state: a boolean exclusive flag without its paired regular bound is meaningless.
  // Determine the before-state exclusive type: unchanged → same as current; replaced/removed → from beforeValue.
  const beforeExclMinIsBoolean =
    (!hasExclusiveMinimumChanged && typeof exclusiveMinimum !== 'number') ||
    ((diffReplace(diffExclusiveMinimum) || diffRemove(diffExclusiveMinimum)) &&
      typeof diffExclusiveMinimum!.beforeValue !== 'number')
  if (beforeExclMinIsBoolean && !(beforeBitwiseKey & BITWISE_MINIMUM)) {
    beforeBitwiseKey &= ~BITWISE_EXCLUSIVE_MINIMUM
  }
  const beforeExclMaxIsBoolean =
    (!hasExclusiveMaximumChanged && typeof exclusiveMaximum !== 'number') ||
    ((diffReplace(diffExclusiveMaximum) || diffRemove(diffExclusiveMaximum)) &&
      typeof diffExclusiveMaximum!.beforeValue !== 'number')
  if (beforeExclMaxIsBoolean && !(beforeBitwiseKey & BITWISE_MAXIMUM)) {
    beforeBitwiseKey &= ~BITWISE_EXCLUSIVE_MAXIMUM
  }

  // For JSON Schema Draft 07 and above numeric value: when both bits are set, keep only the effective (stricter) one
  beforeBitwiseKey = resolveEffectiveLowerBitwiseKey(beforeBitwiseKey, beforeMinimum, beforeExclusiveLowerValue)
  beforeBitwiseKey = resolveEffectiveUpperBitwiseKey(beforeBitwiseKey, beforeMaximum, beforeExclusiveUpperValue)

  // Mapping to human-readable values
  const beforeMapping =
    beforeBitwiseKey in MINIMAX_CHAINS_MAPPING
      ? { ...MINIMAX_CHAINS_MAPPING[beforeBitwiseKey] }
      : undefined
  if (beforeMapping?.lower) {
    beforeMapping.lower = substituteValues(beforeMapping.lower, beforeMinimum, beforeExclusiveLowerValue)
  }
  if (beforeMapping?.upper) {
    beforeMapping.upper = substituteValues(beforeMapping.upper, beforeMaximum, beforeExclusiveUpperValue)
  }

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
