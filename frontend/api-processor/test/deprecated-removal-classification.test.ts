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

import { expectSummariesMatchDiffs, LocalRegistry, operationChangesOf } from './helpers'
import {
  ANNOTATION_CHANGE_TYPE,
  BREAKING_CHANGE_TYPE,
  NON_BREAKING_CHANGE_TYPE,
  REST_API_TYPE,
  RISKY_CHANGE_TYPE,
} from '../src'
import type { BuildResult, OperationChanges, OperationType } from '../src'

/**
 * Removing an element deprecated in more than one released version is risky rather than breaking. How long
 * it has been announced is a property of the consumer, so two operations reaching the same removed element
 * through one shared schema must be able to disagree about it. The deprecation scope element groups them by
 * what they were warned about, and apiDiff classifies each group's instance on its own.
 * The failure this suite prevents is a summary frozen per operation contradicting its own diffs:
 *
 *   operationTypes[].changesSummary              breaking 0   <- Summary "Number of changes"
 *   operationTypes[].numberOfImpactedOperations  breaking 1   <- Summary "Number of affected operations"
 *   data[<operation>].changeSummary              breaking 1
 *   data[<operation>].diffs                      no breaking diff at all
 *
 * Every fixture needs three publishes, since the downgrade wants more than one earlier version.
 * Removed operations, and elements no other operation can reach, are covered by `deprecated.test.ts`.
 */

const PACKAGE_ID = 'deprecated-removal-classification'

const LATE_COMER_ID = 'late-comer-post'
const LONG_LIVED_ID = 'long-lived-post'

const FIRST_ID = 'first-post'
const SECOND_ID = 'second-post'

const DRIFT_OPERATION_ID = 'thing-post'

const LEGACY_PROPERTY_PATH = 'components.schemas.Shared.properties.legacy'
const SHARED_PROPERTY_PATH = 'components.schemas.Shared.properties.common'
const ALPHA_PROPERTY_PATH = 'components.schemas.AlphaBox.properties.alpha'
const BETA_PROPERTY_PATH = 'components.schemas.BetaBox.properties.beta'
const RETIRED_ID = 'retired-post'
const CURRENT_ID = 'current-post'
const REQUEST_SCOPE = 'request'
const NO_BWC_LABEL = 'apihub/x-api-kind: no-BWC'

const registry = LocalRegistry.openPackage(PACKAGE_ID)

/**
 * The smallest document that still tells two operations apart: `longLived` uses the shared schema from the
 * first version on, `lateComer` only from the second, so the notice qualifies for one and not the other.
 * `/late-comer` is declared first, which is the order the comparison walks. Both operations reach the
 * schema in the request and in the response, so the removal of one property reaches each of them twice.
 * Run with DEPRECATED_REMOVAL_DUMP=1 to print every summary and diff. Places worth a breakpoint:
 * `indexDeprecationHistory` and the reclassification rule in rest.deprecated.classification.ts,
 * `createChangeBase` in compare.utils.ts.
 */
describe('Removal of a long-deprecated element', () => {
  let result: BuildResult

  beforeAll(async () => {
    result = await publishSeries('minimal')
  })

  test('should report the shared removal as a separate change for each operation', () => {
    const lateComerRemoval = requestRemoval(operationChangesOf(result, LATE_COMER_ID))
    const longLivedRemoval = requestRemoval(operationChangesOf(result, LONG_LIVED_ID))

    expect(lateComerRemoval).toBeDefined()
    expect(longLivedRemoval).toBeDefined()
    expect(lateComerRemoval).not.toBe(longLivedRemoval)
  })

  test('should report the removal as risky only for the operation warned long enough', () => {
    const longLived = operationChangesOf(result, LONG_LIVED_ID)
    expect(longLived.changeSummary[RISKY_CHANGE_TYPE]).toBe(1)
    expect(longLived.changeSummary[BREAKING_CHANGE_TYPE]).toBe(0)
    expect(requestRemoval(longLived)?.type).toBe(RISKY_CHANGE_TYPE)

    const lateComer = operationChangesOf(result, LATE_COMER_ID)
    expect(lateComer.changeSummary[BREAKING_CHANGE_TYPE]).toBe(1)
    expect(lateComer.changeSummary[RISKY_CHANGE_TYPE]).toBe(0)
    expect(requestRemoval(lateComer)?.type).toBe(BREAKING_CHANGE_TYPE)
  })

  test('should give every operation a changeSummary matching its own changes', () => {
    expectSummariesMatchDiffs(result)
  })

  test('should count the removal twice in changesSummary, as breaking and as risky', () => {
    const { changesSummary, numberOfImpactedOperations } = restOperationType(result)

    // Only the removal in the request splits in two, because that is the only change the two operations
    // judge differently. Everything else they share is counted once: copies that agree carry the same
    // change id and collapse.
    expect(changesSummary).toEqual({
      [BREAKING_CHANGE_TYPE]: 1,
      [NON_BREAKING_CHANGE_TYPE]: 3,
      [RISKY_CHANGE_TYPE]: 1,
      [ANNOTATION_CHANGE_TYPE]: 0,
      unclassified: 0,
      deprecated: 0,
    })
    expect(numberOfImpactedOperations).toEqual({
      [BREAKING_CHANGE_TYPE]: 1,
      [NON_BREAKING_CHANGE_TYPE]: 2,
      [RISKY_CHANGE_TYPE]: 1,
      [ANNOTATION_CHANGE_TYPE]: 0,
      unclassified: 0,
      deprecated: 0,
    })
  })
})

/**
 * The two rules of a REST changelog meet here: the api kind rule runs first and softens every breaking
 * removal of a no-BWC document, so the deprecated-removal rule, which claims only differences still
 * breaking, has nothing left to decide. The verdict is the same one it would have reached anyway.
 */
describe('Removal of a long-deprecated element in a no-BWC document', () => {
  let result: BuildResult

  beforeAll(async () => {
    result = await publishSeries('minimal', [NO_BWC_LABEL], 'no-bwc-')
  })

  test('should report the removal as risky for both operations, warned long enough or not', () => {
    const longLived = operationChangesOf(result, LONG_LIVED_ID)
    expect(requestRemoval(longLived)?.type).toBe(RISKY_CHANGE_TYPE)
    expect(longLived.changeSummary[BREAKING_CHANGE_TYPE]).toBe(0)

    // Breaking without the api kind, as the suite above pins; risky here, and by the other rule
    const lateComer = operationChangesOf(result, LATE_COMER_ID)
    expect(requestRemoval(lateComer)?.type).toBe(RISKY_CHANGE_TYPE)
    expect(lateComer.changeSummary[BREAKING_CHANGE_TYPE]).toBe(0)
  })

  test('should give every operation a changeSummary matching its own changes', () => {
    expectSummariesMatchDiffs(result)
  })
})

/**
 * The common case: every operation reaching the element has been warned for just as long. Nothing to
 * disagree about, so the operations share a partition and the removal stays one difference. This is the
 * reuse that keeps partitioning from costing a traversal per operation.
 */
describe('Operations with the same deprecation history', () => {
  let result: BuildResult

  beforeAll(async () => {
    result = await publishSeries('agreeing')
  })

  test('should report one shared risky change to both operations', () => {
    const firstDiffs = operationChangesOf(result, FIRST_ID).diffs ?? []
    const secondDiffs = operationChangesOf(result, SECOND_ID).diffs ?? []

    expect(firstDiffs).toHaveLength(1)
    expect(secondDiffs).toHaveLength(1)
    expect(firstDiffs[0]).toBe(secondDiffs[0])
    expect(firstDiffs[0].type).toBe(RISKY_CHANGE_TYPE)
  })

  test('should count the removal once and report both operations as impacted', () => {
    const { changesSummary, numberOfImpactedOperations } = restOperationType(result)

    expect(changesSummary?.[RISKY_CHANGE_TYPE]).toBe(1)
    expect(changesSummary?.[BREAKING_CHANGE_TYPE]).toBe(0)

    expect(numberOfImpactedOperations?.[RISKY_CHANGE_TYPE]).toBe(2)
    expect(numberOfImpactedOperations?.[BREAKING_CHANGE_TYPE]).toBe(0)
  })
})

/**
 * Both operations were warned long enough, but about different sets: each carries an element of its own on
 * top of the one they share. Everything else in this file gives one of the two operations nothing that
 * qualifies, so the grouping never has to tell two partitioned operations apart, and the machinery that
 * builds a partition signature goes unexercised.
 */
describe('Operations warned about different elements', () => {
  let result: BuildResult

  beforeAll(async () => {
    result = await publishSeries('divergent')
  })

  test('should report the shared removal as a separate risky change for each operation', () => {
    const first = removalAt(operationChangesOf(result, FIRST_ID), SHARED_PROPERTY_PATH)
    const second = removalAt(operationChangesOf(result, SECOND_ID), SHARED_PROPERTY_PATH)

    expect(first?.type).toBe(RISKY_CHANGE_TYPE)
    expect(second?.type).toBe(RISKY_CHANGE_TYPE)
    // The verdict is the same, so only identity shows the split: their signatures differ, so they sit in
    // different partitions, and a partitioning that collapsed them would hand both operations one object
    expect(first).not.toBe(second)
  })

  test('should report the removal only one of them was warned about as risky', () => {
    expect(removalAt(operationChangesOf(result, FIRST_ID), ALPHA_PROPERTY_PATH)?.type).toBe(RISKY_CHANGE_TYPE)
    expect(removalAt(operationChangesOf(result, SECOND_ID), BETA_PROPERTY_PATH)?.type).toBe(RISKY_CHANGE_TYPE)
  })

  test('should count three risky changes in changesSummary, collapsing the shared removal', () => {
    const { changesSummary, numberOfImpactedOperations } = restOperationType(result)

    // The two operations carry four differences between them, but the copies of the removal they share
    // agree on the verdict, so they carry the same change id and collapse. Three remain: the shared
    // removal once, plus the element only each of them was warned about. The suite above pins the other
    // half of the same rule, where the copies disagree and are counted apart.
    expect(changesSummary?.[RISKY_CHANGE_TYPE]).toBe(3)
    expect(changesSummary?.[BREAKING_CHANGE_TYPE]).toBe(0)

    expect(numberOfImpactedOperations?.[RISKY_CHANGE_TYPE]).toBe(2)
  })

  test('should give every operation a changeSummary matching its own changes', () => {
    expectSummariesMatchDiffs(result)
  })
})

/**
 * Deprecating a whole operation says nothing about how long the things inside it have been announced, so it
 * must not soften what happens to them. Here the shared property was announced one version before it was
 * removed, which is not long enough for anybody, and one of the two operations reaching it is itself
 * deprecated. That operation gets no discount the other one is denied.
 *
 * The mechanism, since only it makes the check observable: the record standing for an operation's own
 * deprecation carries no hash and can never match a removed element, so it stays out of the grouping key.
 * Were it counted, the deprecated operation would be grouped on its own and stop sharing the removal with
 * its neighbour, which is what the identity assertion below detects.
 */
describe('An operation deprecated in its own right', () => {
  let result: BuildResult

  beforeAll(async () => {
    result = await publishSeries('self-deprecated')
  })

  test('should keep a removal breaking when only the operation itself was announced long enough', () => {
    const retired = removalAt(operationChangesOf(result, RETIRED_ID), LEGACY_PROPERTY_PATH)
    const current = removalAt(operationChangesOf(result, CURRENT_ID), LEGACY_PROPERTY_PATH)

    expect(retired?.type).toBe(BREAKING_CHANGE_TYPE)

    // The verdict alone cannot tell the two apart, since neither was warned long enough. Identity can:
    // grouping the deprecated operation on its own would hand it a second copy of this removal
    expect(retired).toBe(current)
  })
})

/**
 * Two notions of "the same deprecated element" meet in this rule. Between versions the content drifts, so
 * the publication history is chained by the tolerant hash; within one version the removed value and the
 * stored record describe the same content, so the classification matches on the exact hash. Reword a
 * deprecation and the announcement must still count.
 */
describe('Deprecation history across a reworded notice', () => {
  test('should not restart the announcement when the content changes between releases', async () => {
    const result = await publishSeries('drift')

    const changes = operationChangesOf(result, DRIFT_OPERATION_ID)
    expect(changes.changeSummary[RISKY_CHANGE_TYPE]).toBe(1)
    expect(changes.changeSummary[BREAKING_CHANGE_TYPE]).toBe(0)
  })
})

/**
 * Both APIHUB policies apply in one comparison, each to a different operation: `longLived` was warned long
 * enough, and `lateComer`, which the deprecation rule leaves breaking, is the one marked no-BWC in the
 * specification. So both end up softened, by a different rule each, and neither rule softens both.
 */
describe('Two operations softened by different rules', () => {
  let result: BuildResult

  beforeAll(async () => {
    result = await publishSeries('marked-late-comer')
  })

  test('should report both operations as risky, each softened by a different rule', () => {
    // Warned long enough, and carries no mark: only the deprecation rule can have softened it
    expect(requestRemoval(operationChangesOf(result, LONG_LIVED_ID))?.type).toBe(RISKY_CHANGE_TYPE)

    // Marked no-BWC, and joined too late to be warned: only the api kind rule can have softened it
    expect(requestRemoval(operationChangesOf(result, LATE_COMER_ID))?.type).toBe(RISKY_CHANGE_TYPE)
  })

  test('should give every operation a changeSummary matching its own changes', () => {
    expectSummariesMatchDiffs(result)
  })
})

/** Labels for the whole series, or a function answering for one publication of it. */
type SeriesLabels = string[] | ((step: number) => string[] | undefined)

/**
 * The api kind of a changelog comes from the pair being compared, not from the history of the series: the
 * two versions it is built from decide it, and either side carrying the mark is enough. Both cases below
 * therefore soften the removal, and `lateComer` is what shows it — the deprecation rule leaves that one
 * breaking, as the first suite pins, so a risky verdict here can only come from the api kind.
 */
describe('An api kind mark that changes between publications', () => {
  test('should soften both removals when the no-BWC mark appears only in the version being published', async () => {
    const result = await publishSeries('minimal', step => (step === 3 ? [NO_BWC_LABEL] : undefined), 'late-mark-')

    expect(requestRemoval(operationChangesOf(result, LATE_COMER_ID))?.type).toBe(RISKY_CHANGE_TYPE)
    expect(requestRemoval(operationChangesOf(result, LONG_LIVED_ID))?.type).toBe(RISKY_CHANGE_TYPE)
    expectSummariesMatchDiffs(result)
  })

  test('should soften both removals when the no-BWC mark is dropped in the version being published', async () => {
    const result = await publishSeries('minimal', step => (step === 3 ? undefined : [NO_BWC_LABEL]), 'dropped-mark-')

    // The previous version carries it, which is enough: dropping the mark does not make the removal
    // breaking again for an operation that was never warned long enough
    expect(requestRemoval(operationChangesOf(result, LATE_COMER_ID))?.type).toBe(RISKY_CHANGE_TYPE)
    expectSummariesMatchDiffs(result)
  })
})

/** Publishes `<fixture>-v1` to `-v3` in order, each against the one before, and returns the last build. */
async function publishSeries(fixture: string, versionLabels?: SeriesLabels, versionPrefix = ''): Promise<BuildResult> {
  let result: BuildResult | undefined
  let previousVersion: string | undefined

  for (const step of [1, 2, 3]) {
    const source = `${fixture}-v${step}`
    const version = `${versionPrefix}${source}`
    result = await registry.publish(PACKAGE_ID, {
      packageId: PACKAGE_ID,
      version,
      ...previousVersion ? { previousVersion } : {},
      ...takeVersionLabels(versionLabels, step),
      files: [{ fileId: `${source}.yaml`, publish: true }],
    })
    previousVersion = version
  }

  return result!
}

function takeVersionLabels(versionLabels: SeriesLabels | undefined, step: number): { metadata?: { versionLabels: string[] } } {
  const labels = typeof versionLabels === 'function' ? versionLabels(step) : versionLabels
  return labels ? { metadata: { versionLabels: labels } } : {}
}

function restOperationType(result: BuildResult): OperationType {
  const operationType = result.comparisons[0]?.operationTypes.find(({ apiType }) => apiType === REST_API_TYPE)
  if (!operationType) {
    throw new Error('Comparison has no REST operation type')
  }
  return operationType
}

/** The removal of a named property as the request of one operation sees it. */
function removalAt(changes: OperationChanges, path: string): NonNullable<OperationChanges['diffs']>[number] | undefined {
  return (changes.diffs ?? []).find(diff =>
    diff.scope === REQUEST_SCOPE &&
    'beforeDeclarationPaths' in diff &&
    (diff.beforeDeclarationPaths ?? []).some(jsonPath => jsonPath.join('.') === path),
  )
}

/** The removal of the deprecated property as the request of one operation sees it. */
function requestRemoval(changes: OperationChanges): NonNullable<OperationChanges['diffs']>[number] | undefined {
  return (changes.diffs ?? []).find(diff =>
    diff.scope === REQUEST_SCOPE &&
    'beforeDeclarationPaths' in diff &&
    (diff.beforeDeclarationPaths ?? []).some(jsonPath => jsonPath.join('.') === LEGACY_PROPERTY_PATH),
  )
}
