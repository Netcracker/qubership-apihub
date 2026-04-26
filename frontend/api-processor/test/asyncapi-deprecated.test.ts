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
import { buildPackageWithDefaultConfig, deprecatedItemDescriptionMatcher } from './helpers'
import { DeprecateItem } from '../src'
import { isOperationDeprecated } from '../src/utils'

describe('AsyncAPI 3.0 Deprecated tests', () => {

  describe('Channel tests', () => {
    let deprecatedItems: DeprecateItem[]
    beforeAll(async () => {
      const result = await buildPackageWithDefaultConfig('asyncapi/deprecated/channel')
      deprecatedItems = Array.from(result.operations.values()).flatMap(operation => operation.deprecatedItems ?? [])
    })

    test('should deprecated channel has message', async () => {
      const [deprecatedItem] = deprecatedItems

      expect(deprecatedItems.length).toBeGreaterThan(0)
      expect(deprecatedItem).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] channel \'userSignedUp\''))
    })

    test('should deprecated channel item has hash', async () => {
      const [deprecatedItem] = deprecatedItems

      expect(deprecatedItem).toHaveProperty('hash')
      expect(deprecatedItem).toHaveProperty('tolerantHash')
    })
  })

  describe('Messages tests', () => {
    let deprecatedItems: DeprecateItem[]
    beforeAll(async () => {
      const result = await buildPackageWithDefaultConfig('asyncapi/deprecated/messages')
      deprecatedItems = Array.from(result.operations.values()).flatMap(operation => operation.deprecatedItems ?? [])
    })

    test('should report deprecated messages', async () => {
      const [deprecatedItem] = deprecatedItems

      expect(deprecatedItems.length).toBeGreaterThan(0)
      expect(deprecatedItem).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] message \'User Signed Up\''))
    })

    test('should deprecated message item has no hash', async () => {
      const [deprecatedItem] = deprecatedItems

      expect(deprecatedItem).not.toHaveProperty('hash')
      expect(deprecatedItem).not.toHaveProperty('tolerantHash')
    })

    test('should deprecated message has OperationDeprecated symbol with true', async () => {
      const [deprecatedItem] = deprecatedItems
      const operationDeprecatedSymbol = (deprecatedItem as unknown as Record<symbol, boolean>)[isOperationDeprecated]
      expect(operationDeprecatedSymbol).toBeTruthy()
    })
  })

  test('should mark apihub operation as deprecated if message was deprecated', async () => {
    const result = await buildPackageWithDefaultConfig('asyncapi/deprecated/messages')
    const operations = Array.from(result.operations.values())

    const [operation] = operations
    expect(operation.deprecated).toBe(true)
  })

  describe('Shared channel with different deprecation per message', () => {
    test('should only report deprecated items for the operation that uses the deprecated message', async () => {
      const result = await buildPackageWithDefaultConfig('asyncapi/deprecated/shared-channel-different-deprecation')
      const operations = Array.from(result.operations.entries())

      // operation1 uses UserSignedUp (deprecated: false on email) — should have NO deprecated items
      const operation1Entry = operations.find(([key]) => key.includes('operation1'))
      expect(operation1Entry).toBeDefined()
      const operation1DeprecatedItems = operation1Entry![1].deprecatedItems ?? []

      // operation2 uses UserQuit (deprecated: true on email) — should have deprecated items
      const operation2Entry = operations.find(([key]) => key.includes('operation2'))
      expect(operation2Entry).toBeDefined()
      const operation2DeprecatedItems = operation2Entry![1].deprecatedItems ?? []

      expect(operation1DeprecatedItems.length).toBe(0)
      expect(operation2DeprecatedItems.length).toBe(1)
    })
  })

  test('should report deprecated schemas (flag "deprecated" in payload schema)', async () => {
    const result = await buildPackageWithDefaultConfig('asyncapi/deprecated/schemas')
    const deprecatedItems = Array.from(result.operations.values()).flatMap(operation => operation.deprecatedItems ?? [])
    expect(deprecatedItems.length).toBeGreaterThan(0)

    const [deprecatedItem] = deprecatedItems
    expect(deprecatedItem).toEqual(deprecatedItemDescriptionMatcher('[Deprecated] schema in \'components.schemas.DeprecatedEmail\''))

    expect(deprecatedItem).toHaveProperty('hash')
    expect(deprecatedItem).toHaveProperty('tolerantHash')

    expect(deprecatedItem.declarationJsonPaths.some(path => path.at(-1) === 'deprecated')).toBe(true)
  })
})
