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

import {
  APIHUB_API_COMPATIBILITY_KIND_BWC,
  APIHUB_API_COMPATIBILITY_KIND_EXPERIMENTAL,
  APIHUB_API_COMPATIBILITY_KIND_NO_BWC,
  ApihubApiCompatibilityKind,
  BREAKING_CHANGE_TYPE,
  BUILD_TYPE,
  BuildResult,
  GRAPHQL_API_TYPE,
  isNoBwcLike,
  Labels,
  RISKY_CHANGE_TYPE,
  VERSION_STATUS,
} from '../src'
import { createGraphqlApiCompatibilityScopeFunction } from '../src/components/compare/graphql.bwc.validation'
import {
  API_COMPATIBILITY_KIND_BACKWARD_COMPATIBLE,
  API_COMPATIBILITY_KIND_NOT_BACKWARD_COMPATIBLE,
} from '@netcracker/qubership-apihub-api-diff'
import { changesSummaryMatcher, Editor, LocalRegistry } from './helpers'
import { takeIfDefined } from '../src/utils'

const BWC = APIHUB_API_COMPATIBILITY_KIND_BWC
const NO_BWC = APIHUB_API_COMPATIBILITY_KIND_NO_BWC
const EXPERIMENTAL = APIHUB_API_COMPATIBILITY_KIND_EXPERIMENTAL

const BACKWARD_COMPATIBLE = API_COMPATIBILITY_KIND_BACKWARD_COMPATIBLE
const NOT_BACKWARD_COMPATIBLE = API_COMPATIBILITY_KIND_NOT_BACKWARD_COMPATIBLE

describe('GraphQL api-compatibility scope function', () => {
  const OP = ['queries', 'q1']
  const OBJ = {} // "exists"

  describe('Root scope (document-level, either side)', () => {
    it.each([
      // prev    | curr    | expected
      [BWC, BWC, BACKWARD_COMPATIBLE],
      [BWC, NO_BWC, NOT_BACKWARD_COMPATIBLE],
      [NO_BWC, BWC, NOT_BACKWARD_COMPATIBLE], // either side no-bwc → risky
      [NO_BWC, NO_BWC, NOT_BACKWARD_COMPATIBLE],
      [BWC, EXPERIMENTAL, NOT_BACKWARD_COMPATIBLE],
      [EXPERIMENTAL, BWC, NOT_BACKWARD_COMPATIBLE],
    ] as const)('should classify root scope prev(%s) curr(%s) as %s', (prev, curr, expected) => {
      expect(createGraphqlApiCompatibilityScopeFunction(prev, curr)([], OBJ, OBJ)).toBe(expected)
    })
  })

  describe('Operation scope — modification (both sides present, either side)', () => {
    it.each([
      [BWC, BWC, BACKWARD_COMPATIBLE],
      [BWC, NO_BWC, NOT_BACKWARD_COMPATIBLE],
      [NO_BWC, BWC, NOT_BACKWARD_COMPATIBLE], // either side no-bwc → risky
      [NO_BWC, NO_BWC, NOT_BACKWARD_COMPATIBLE],
      [NO_BWC, EXPERIMENTAL, NOT_BACKWARD_COMPATIBLE],
      [EXPERIMENTAL, BWC, NOT_BACKWARD_COMPATIBLE],
    ] as const)('should classify operation modification prev(%s) curr(%s) as %s', (prev, curr, expected) => {
      expect(createGraphqlApiCompatibilityScopeFunction(prev, curr)(OP, OBJ, OBJ)).toBe(expected)
    })
  })

  describe('Operation scope — removal (before only, keyed on previous)', () => {
    it.each([
      [BWC, BWC, BACKWARD_COMPATIBLE],
      [BWC, NO_BWC, BACKWARD_COMPATIBLE],
      [NO_BWC, BWC, NOT_BACKWARD_COMPATIBLE],
      [NO_BWC, NO_BWC, NOT_BACKWARD_COMPATIBLE],
      [EXPERIMENTAL, BWC, NOT_BACKWARD_COMPATIBLE],
    ] as const)('should classify operation removal prev(%s) curr(%s) as %s', (prev, curr, expected) => {
      expect(createGraphqlApiCompatibilityScopeFunction(prev, curr)(OP, OBJ, undefined)).toBe(expected)
    })
  })

  describe('Operation scope — addition (after only, either side)', () => {
    it.each([
      [BWC, BWC, BACKWARD_COMPATIBLE],
      [BWC, NO_BWC, NOT_BACKWARD_COMPATIBLE],
      [NO_BWC, BWC, NOT_BACKWARD_COMPATIBLE], // either side no-bwc → risky
      [EXPERIMENTAL, BWC, NOT_BACKWARD_COMPATIBLE],
    ] as const)('should classify operation addition prev(%s) curr(%s) as %s', (prev, curr, expected) => {
      expect(createGraphqlApiCompatibilityScopeFunction(prev, curr)(OP, undefined, OBJ)).toBe(expected)
    })
  })

  // The blocks above exercise the classification rules on `queries`. GraphQL has two more
  // operation root types — `mutations` and `subscriptions` — which the scope function recognises
  // by their root path segment and must treat identically. Here we only assert that same behaviour;
  // the classification rules themselves are already covered via `queries` above.
  describe('Mutations and subscriptions behave like queries', () => {
    it.each([
      ['mutations', 'm1'],
      ['subscriptions', 's1'],
    ] as const)('should classify %s modification by either side', (segment, name) => {
      const fn = createGraphqlApiCompatibilityScopeFunction(NO_BWC, BWC)
      expect(fn([segment, name], OBJ, OBJ)).toBe(NOT_BACKWARD_COMPATIBLE) // either side no-bwc → risky
    })
  })

  describe('experimental produces the same result as no-BWC', () => {
    const replace = (apihubApiCompatibilityKind: typeof BWC | typeof NO_BWC): typeof BWC | typeof EXPERIMENTAL =>
      (apihubApiCompatibilityKind === NO_BWC ? EXPERIMENTAL : apihubApiCompatibilityKind)
    const docs = [BWC, NO_BWC] as const
    const beforeAfter: [unknown, unknown][] = [[OBJ, OBJ], [OBJ, undefined], [undefined, OBJ]]

    it.each(docs)('should produce the same root scope result as no-BWC (document=%s)', (prev) => {
      for (const curr of docs) {
        const noBwc = createGraphqlApiCompatibilityScopeFunction(prev, curr)([], OBJ, OBJ)
        const exp = createGraphqlApiCompatibilityScopeFunction(replace(prev), replace(curr))([], OBJ, OBJ)
        expect(exp).toBe(noBwc)
      }
    })

    it.each(docs)('should produce the same operation scope result as no-BWC (document=%s)', (prev) => {
      for (const curr of docs) {
        for (const [before, after] of beforeAfter) {
          const noBwc = createGraphqlApiCompatibilityScopeFunction(prev, curr)(OP, before, after)
          const exp = createGraphqlApiCompatibilityScopeFunction(replace(prev), replace(curr))(OP, before, after)
          expect(exp).toBe(noBwc)
        }
      }
    })
  })

  describe('paths outside the classification scope return undefined', () => {
    const fn = createGraphqlApiCompatibilityScopeFunction(NO_BWC, NO_BWC)

    it('should return undefined when the operation is absent on both sides', () => {
      expect(fn(OP, undefined, undefined)).toBeUndefined()
    })
    it('should return undefined for a non-operation top-level segment', () => {
      expect(fn(['components', 'Foo'], OBJ, OBJ)).toBeUndefined()
    })
    it('should return undefined for a deeper-than-operation path', () => {
      expect(fn(['queries', 'q1', 'args'], OBJ, OBJ)).toBeUndefined()
    })
  })
})

describe('GraphQL changelog api-kind (e2e)', () => {
  type ChangeType = typeof BREAKING_CHANGE_TYPE | typeof RISKY_CHANGE_TYPE

  const LABEL: Record<ApihubApiCompatibilityKind, string> = {
    [BWC]: 'apihub/x-api-kind: BWC',
    [NO_BWC]: 'apihub/x-api-kind: no-BWC',
    [EXPERIMENTAL]: 'apihub/x-api-kind: experimental',
  }

  // Modification: risky if EITHER the previous or the current document api-kind is no-bwc-like.
  function expectedModifyType(prevDoc: ApihubApiCompatibilityKind, currDoc: ApihubApiCompatibilityKind): ChangeType {
    return (isNoBwcLike(prevDoc) || isNoBwcLike(currDoc)) ? RISKY_CHANGE_TYPE : BREAKING_CHANGE_TYPE
  }

  function expectedRemoveType(prevDoc: ApihubApiCompatibilityKind): ChangeType {
    return isNoBwcLike(prevDoc) ? RISKY_CHANGE_TYPE : BREAKING_CHANGE_TYPE
  }

  const MODIFY_BEFORE = 'type Query {\n  fruits: String\n}'
  const MODIFY_AFTER = 'type Query {\n  fruits: Int\n}' // breaking: field type change
  const REMOVE_BEFORE = 'type Query {\n  fruits: String\n  fruitsByColor: String\n}'
  const REMOVE_AFTER = 'type Query {\n  fruits: String\n}' // breaking: operation removed

  async function buildGqlChangelogApiKind(
    packageId: string,
    beforeSdl: string,
    afterSdl: string,
    labels: {
      prevFileLabels?: Labels
      currFileLabels?: Labels
      prevVersionLabels?: Labels
      currVersionLabels?: Labels
    } = {},
  ): Promise<BuildResult> {
    const portal = new LocalRegistry(packageId)

    await portal.publishFromContent(
      { 'before.gql': beforeSdl },
      {
        packageId,
        version: 'v1',
        metadata: { ...takeIfDefined({ versionLabels: labels.prevVersionLabels }) },
        files: [{ fileId: 'before.gql', publish: true, ...takeIfDefined({ labels: labels.prevFileLabels }) }],
      },
    )
    await portal.publishFromContent(
      { 'after.gql': afterSdl },
      {
        packageId,
        version: 'v2',
        metadata: { ...takeIfDefined({ versionLabels: labels.currVersionLabels }) },
        files: [{ fileId: 'after.gql', ...takeIfDefined({ labels: labels.currFileLabels }) }],
      },
    )

    const editor = new Editor(packageId, {
      packageId,
      version: 'v2',
      previousVersionPackageId: packageId,
      previousVersion: 'v1',
      status: VERSION_STATUS.RELEASE,
      buildType: BUILD_TYPE.CHANGELOG,
    }, {}, portal)

    return editor.run()
  }

  // Representative cases only — the exhaustive (prev, curr) × {BWC, no-BWC, experimental}
  // classification is covered by the unit block above. Here e2e just proves the scope function is
  // wired into graphql.changes and api-diff applies it. ER is hardcoded and guard-checked per row.
  const modifyCases: [ApihubApiCompatibilityKind, ApihubApiCompatibilityKind, ChangeType][] = [
    [BWC, BWC, BREAKING_CHANGE_TYPE],
    [BWC, NO_BWC, RISKY_CHANGE_TYPE],
    [NO_BWC, BWC, RISKY_CHANGE_TYPE], // either side no-bwc → risky
  ]

  const removeCases: [ApihubApiCompatibilityKind, ApihubApiCompatibilityKind, ChangeType][] = [
    [BWC, BWC, BREAKING_CHANGE_TYPE],
    [NO_BWC, BWC, RISKY_CHANGE_TYPE], // removal keyed on previous
  ]

  describe('Modification (either side)', () => {
    test.each(modifyCases)('should classify modification prev(%s) curr(%s) as %s', async (prev, curr, expectedType) => {
      // Guard: hardcoded ER must match the reference rule.
      expect(expectedType).toBe(expectedModifyType(prev, curr))

      const result = await buildGqlChangelogApiKind(
        `gql-apikind-modify/${prev}--${curr}`, MODIFY_BEFORE, MODIFY_AFTER,
        { prevFileLabels: [LABEL[prev]], currFileLabels: [LABEL[curr]] },
      )
      expect(result).toEqual(changesSummaryMatcher({ [expectedType]: 1 }, GRAPHQL_API_TYPE))
    })
  })

  describe('Removal (keyed on previous)', () => {
    test.each(removeCases)('should classify removal prev(%s) curr(%s) as %s', async (prev, curr, expectedType) => {
      // Guard: hardcoded ER must match the reference rule.
      expect(expectedType).toBe(expectedRemoveType(prev))

      const result = await buildGqlChangelogApiKind(
        `gql-apikind-remove/${prev}--${curr}`, REMOVE_BEFORE, REMOVE_AFTER,
        { prevFileLabels: [LABEL[prev]], currFileLabels: [LABEL[curr]] },
      )
      expect(result).toEqual(changesSummaryMatcher({ [expectedType]: 1 }, GRAPHQL_API_TYPE))
    })
  })

  // Version labels are the k8s-service-label channel: at publish they are baked into the stored
  // document apiKind, so changelog resolves them via currDoc/prevDoc.apiKind (same as file labels).
  describe('Version-label channel', () => {
    const NB: Labels = ['apihub/x-api-kind: no-BWC']

    test('should classify modification as risky when the current version label is no-BWC', async () => {
      const result = await buildGqlChangelogApiKind(
        'gql-apikind-modify-vlabel/curr-nb', MODIFY_BEFORE, MODIFY_AFTER, { currVersionLabels: NB },
      )
      expect(result).toEqual(changesSummaryMatcher({ [RISKY_CHANGE_TYPE]: 1 }, GRAPHQL_API_TYPE))
    })

    test('should classify removal as risky when the previous version label is no-BWC', async () => {
      const result = await buildGqlChangelogApiKind(
        'gql-apikind-remove-vlabel/prev-nb', REMOVE_BEFORE, REMOVE_AFTER, { prevVersionLabels: NB },
      )
      expect(result).toEqual(changesSummaryMatcher({ [RISKY_CHANGE_TYPE]: 1 }, GRAPHQL_API_TYPE))
    })
  })
})
