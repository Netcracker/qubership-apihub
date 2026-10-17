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

import { BuildResult, ChangeSummary, EMPTY_CHANGE_SUMMARY, OperationsApiType, REST_API_TYPE } from '../../src'
import { calculateChangeSummary } from '../../src/utils'
import { NotificationsError } from '../../src/errors'
import { operationTypeOf } from './accessors'

/**
 * A summary that contradicts the changes it counts is the symptom users report: an operation shown as
 * breaking while none of its changes is breaking. The two are computed at different moments, so any change
 * to how a verdict is decided can pull them apart. Assert this wherever a build reclassifies anything.
 */
export function expectSummariesMatchDiffs(result: BuildResult): void {
  let checked = 0
  for (const comparison of result.comparisons) {
    for (const changes of comparison.data ?? []) {
      expect(changes.changeSummary).toEqual(calculateChangeSummary(changes.diffs ?? []))
      checked += 1
    }
  }

  // Outside both loops: a build that produced no comparison, or none carrying operation changes, would
  // otherwise pass this having asserted nothing
  expect(checked).toBeGreaterThan(0)
}

/**
 * The change counts one comparison reports.
 *
 * Plain functions rather than `expect.extend` matchers. One wrong count printed 162 lines or more through
 * the old matcher factories and about 15 through these; a custom matcher would save one more line at the
 * cost of a type-declaration surface kept in sync by hand.
 */
export function expectChangesSummary(
  result: BuildResult,
  expected: Partial<ChangeSummary>,
  apiType: OperationsApiType = REST_API_TYPE,
): void {
  expect(operationTypeOf(result, apiType).changesSummary).toEqual({ ...EMPTY_CHANGE_SUMMARY, ...expected })
}

/**
 * Assert a collection has at least one element. The guard before a loop over a build result, which would
 * otherwise pass having checked nothing.
 */
export function expectNotEmpty(collection: string | { length: number } | { size: number } | undefined): void {
  expect(collection).toBeDefined()
  const count = typeof collection === 'object' && 'size' in collection ? collection.size : collection!.length
  expect(count).toBeGreaterThan(0)
}

export interface ChangeCounts {
  changes: Partial<ChangeSummary>
  impacted: Partial<ChangeSummary>
}

/** A comparison that found nothing: no changes, so no operation impacted by one. */
export const NO_CHANGES: ChangeCounts = { changes: {}, impacted: {} }

/**
 * Assert the change counts and the impacted-operation counts in one `toEqual`, so a failure shows them side by
 * side. Both are always spelled out, even when they agree, so a reader never has to know a default to see what
 * is checked. A count left out of either is asserted to be zero.
 *
 * They differ when one change touches several operations: `asyncapi-deduplication.test.ts` asserts
 * `{ breaking: 1 }` against `{ breaking: 2 }` for that reason. A test that asserts only the change counts keeps
 * `expectChangesSummary`.
 */
export function expectChangeCounts(
  result: BuildResult,
  { changes, impacted }: ChangeCounts,
  apiType: OperationsApiType = REST_API_TYPE,
): void {
  const { changesSummary, numberOfImpactedOperations } = operationTypeOf(result, apiType)
  expect({ changes: changesSummary, impacted: numberOfImpactedOperations }).toEqual({
    changes: { ...EMPTY_CHANGE_SUMMARY, ...changes },
    impacted: { ...EMPTY_CHANGE_SUMMARY, ...impacted },
  })
}

/**
 * Wait for a promise that must reject and return what it rejected with. A promise that resolves fails here,
 * instead of at a later assertion that would report the resolved value as the wrong error.
 */
export async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => { throw new Error('Expected the promise to reject, but it resolved') },
    (reason: unknown) => reason,
  )
}

/** Wait for a build that must fail with a `NotificationsError` and return the error. */
export async function notificationsErrorOf(promise: Promise<unknown>): Promise<NotificationsError> {
  const error = await rejectionOf(promise)
  expect(error).toBeInstanceOf(NotificationsError)
  return error as NotificationsError
}
