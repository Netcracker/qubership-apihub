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

import { describe, expect, test } from '@jest/globals'
import { breaking, DiffAction } from '@netcracker/qubership-apihub-api-diff'
import { calculateHistoryForDeprecatedItems, calculateTolerantHash } from '../src/components/deprecated'
import { CUSTOM_SCOPE_ELEMENT_DEPRECATION } from '../src/components/compare/custom-scope'
import { createDeprecatedRemovalRules } from '../src/apitypes/rest/rest.deprecated.classification'
import { ASYNCAPI_API_TYPE, HASH_FLAG, MESSAGE_CATEGORY, MESSAGE_SEVERITY, REST_API_TYPE } from '../src/consts'
import { BuilderContext, CompareOperationsPairContext, NotificationMessage, ResolvedVersionDocument } from '../src/types'
import { calculateNormalizedRestOperationId } from '../src/utils'

// Diagnostics of the calculation, not of the contract: they fire when the builder's own inputs arrive in a
// shape it cannot use. A real comparison does not produce them, so they are driven directly — and each one
// carries the document slug this change gave it, which is the half a regression would silently drop.
describe('Calculation diagnostics carry their category, severity and document', () => {
  const DOCUMENT = 'petstore'

  describe('Deprecated items: the tolerant hash', () => {
    const cases: Array<[string, object, string]> = [
      ['no hash on the value', {}, MESSAGE_CATEGORY.TolerantHashMissing],
      // the lookup only runs for a value with ordinary keys, so the symbol alone would read as "missing"
      ['a hash that throws', { type: 'object', [HASH_FLAG]: () => { throw new Error('hash exploded') } }, MESSAGE_CATEGORY.TolerantHashFailed],
    ]

    test.each(cases)('should report %s', (_name, value, category) => {
      const notifications: NotificationMessage[] = []

      expect(calculateTolerantHash(value as never, notifications, DOCUMENT)).toBeUndefined()
      expect(notifications).toEqual([{
        category,
        severity: MESSAGE_SEVERITY.Warning,
        message: expect.any(String),
        documentId: DOCUMENT,
      }])
    })
  })

  // The history is resolved for one api type, but the version's operation list holds every type, and an
  // operationId is unique only within a type. The operation the history lands on has to be the one of the
  // api type asked for.
  test('should carry the history onto the operation of the api type it asked for', async () => {
    const item = (): unknown =>
      ({ tolerantHash: 'same-hash', declarationJsonPaths: [['components', 'schemas', 'Pet', 'deprecated']], deprecatedInPreviousVersions: [] })
    const operation = (apiType: string): Record<string, unknown> =>
      ({ operationId: 'pets-get', apiType, documentId: DOCUMENT, deprecated: true, deprecatedItems: [item()] })

    const rest = operation(REST_API_TYPE)
    const asyncApi = operation(ASYNCAPI_API_TYPE)
    const ctx = {
      notifications: [],
      versionDeprecatedResolver: async () => ({
        operations: [{
          operationId: 'pets-get',
          deprecatedItems: [{ ...(item() as Record<string, unknown>), deprecatedInPreviousVersions: ['v1'] }],
        }],
      }),
    } as unknown as BuilderContext

    // the AsyncAPI operation is processed last, so a key of the bare id would leave it holding the entry
    await calculateHistoryForDeprecatedItems(REST_API_TYPE, [rest, asyncApi] as never, 'v1', 'pkg', ctx)

    const historyOf = (op: Record<string, unknown>): unknown =>
      (op.deprecatedItems as Array<{ deprecatedInPreviousVersions: unknown }>)[0].deprecatedInPreviousVersions
    expect(historyOf(rest)).toEqual(['v1'])
    // and the operation of another api type is left alone: this history is not about it
    expect(historyOf(asyncApi)).toEqual([])
  })

  // Carrying the previous version's history onto an operation walks the declaration paths of its deprecated
  // items. A path shaped like a component reference whose type or name is not a string cannot be matched, and
  // that operation loses its history — the others keep theirs, so it is reported rather than thrown.
  test('should report a deprecated item whose component path cannot be read', async () => {
    const notifications: NotificationMessage[] = []
    const deprecatedItem = (declarationJsonPaths: unknown[][]): unknown =>
      ({ tolerantHash: 'same-hash', declarationJsonPaths, deprecatedInPreviousVersions: [] })

    const current = {
      operationId: 'pets-get',
      apiType: REST_API_TYPE,
      documentId: DOCUMENT,
      deprecated: true,
      // the component type is a number, which `matchSharedComponent` refuses
      deprecatedItems: [deprecatedItem([['components', 1, 'Pet', 'deprecated']])],
    }
    const ctx = {
      notifications,
      versionDeprecatedResolver: async () => ({
        operations: [{
          operationId: 'pets-get',
          deprecatedItems: [deprecatedItem([['components', 'schemas', 'Pet', 'deprecated']])],
        }],
      }),
    } as unknown as BuilderContext

    await calculateHistoryForDeprecatedItems(REST_API_TYPE, [current] as never, 'v1', 'pkg', ctx)

    expect(notifications).toEqual([{
      category: MESSAGE_CATEGORY.DeprecatedComponentPath,
      severity: MESSAGE_SEVERITY.Error,
      message: expect.any(String),
      documentId: DOCUMENT,
    }])
  })

  describe('Changelog: the deprecated-removal rule', () => {
    // The rule reaches a removed element only inside a partition that holds a long-announced element, so the
    // resolver supplies one and the partition is read back from the scope element, the way api-diff reads it
    test('should report a removed deprecated element that carries no origins', async () => {
      const notifications: NotificationMessage[] = []
      const operationsMap = {
        [calculateNormalizedRestOperationId('', '/pets', 'get')]: { previous: { operationId: 'pets-get', documentId: DOCUMENT } },
      }
      const ctx = {
        notifications,
        previousVersion: 'v2',
        previousPackageId: 'pkg',
        versionDeprecatedResolver: async () => ({
          operations: [{
            operationId: 'pets-get',
            deprecatedItems: [{ hash: 'pet-hash', declarationJsonPaths: [['components', 'schemas', 'Pet']], deprecatedInPreviousVersions: ['v1', 'v2'] }],
          }],
        }),
      } as unknown as CompareOperationsPairContext
      const previousDocument = { slug: DOCUMENT } as ResolvedVersionDocument
      const previousDocumentData = { components: { schemas: { Pet: { deprecated: true } } } } as never

      const { customScopeElementProviders, reclassificationRules } =
        await createDeprecatedRemovalRules(operationsMap as never, previousDocument, previousDocumentData, ctx)
      const partition = customScopeElementProviders[0].valueAt({ path: ['paths', '/pets', 'get'], beforeJso: {} } as never)
      const withoutOrigins = {
        action: DiffAction.remove,
        type: breaking,
        beforeDeclarationPaths: [['components', 'schemas', 'Pet']],
        beforeValue: { deprecated: true },
        customScope: { [CUSTOM_SCOPE_ELEMENT_DEPRECATION]: partition },
      }

      expect(partition).toBeDefined()
      // the removal stays breaking: without origins the element's history cannot be looked up
      expect(reclassificationRules[0](withoutOrigins as never)).toBeUndefined()
      expect(notifications).toEqual([{
        category: MESSAGE_CATEGORY.RiskyOrigins,
        severity: MESSAGE_SEVERITY.Warning,
        message: expect.any(String),
        documentId: DOCUMENT,
      }])
    })
  })
})
