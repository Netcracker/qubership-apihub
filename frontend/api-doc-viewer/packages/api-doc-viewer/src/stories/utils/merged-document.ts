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

import { aggregateDiffsWithRollup, apiDiff, COMPARE_MODE_OPERATION, CompareResult, DIFF_META_KEY, DIFFS_AGGREGATED_META_KEY } from '@netcracker/qubership-apihub-api-diff'
import { NormalizeOptions, stringifyCyclicJso } from '@netcracker/qubership-apihub-api-unifier'

const SYNTHETIC_TITLE_FLAG = Symbol('synthetic-title');
const NORMALIZE_OPTIONS: NormalizeOptions = {
  validate: true,
  liftCombiners: true,
  syntheticTitleFlag: SYNTHETIC_TITLE_FLAG,
  unify: true,
  allowNotValidSyntheticChanges: true,
};

export const getMergedDocument = (before: object | undefined, after: object | undefined): unknown => {
  if (before && after) {
    return getCompareResult(before, after).merged
  }

  return null
}

export const getCompareResult = (
  before: object,
  after: object,
): CompareResult => {
  const beforeOperation = before
  const afterOperation = after

  // Used similar options like in builder
  const compareResult = apiDiff(beforeOperation, afterOperation, {
    ...NORMALIZE_OPTIONS,
    beforeSource: before,
    afterSource: after,
    mode: COMPARE_MODE_OPERATION,
    metaKey: DIFF_META_KEY
  })

  aggregateDiffsWithRollup(compareResult.merged, DIFF_META_KEY, DIFFS_AGGREGATED_META_KEY)

  // To prevent circular reference error in Storybook
  if (isObject(compareResult.merged)) {
    compareResult.merged.toJSON = () => stringifyCyclicJso(compareResult.merged)
  }
  return compareResult
}

function isObject(maybeObject: unknown): maybeObject is Record<PropertyKey, unknown> {
  return maybeObject !== undefined && maybeObject !== null && typeof maybeObject === 'object';
}
