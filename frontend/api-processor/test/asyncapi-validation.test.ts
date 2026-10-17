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

import { documentOf, Editor, LocalRegistry, notificationOf } from './helpers'
import { MESSAGE_CATEGORY, MESSAGE_SEVERITY } from '../src/consts'

const asyncValidationPackage = LocalRegistry.openPackage('asyncapi-validation')

describe('AsyncAPI Validation', () => {
  describe('Valid AsyncAPI document', () => {
    test('should build successfully without notifications', async () => {
      const editor = await Editor.openProject('asyncapi-validation', asyncValidationPackage)
      const result = await editor.run({ files: [{ fileId: 'valid-async.yaml', publish: true, labels: [] }] })

      // Document should be successfully created
      expect(documentOf(result, 'valid-async.yaml').type).toBe('asyncapi-3-0')

      // No error notifications for this file
      const errorNotifications = result.notifications.filter(
        notification => notification.documentId === 'valid-async' && notification.severity === MESSAGE_SEVERITY.Error,
      )
      expect(errorNotifications).toHaveLength(0)

      // No warning notifications for this file
      const warningNotifications = result.notifications.filter(
        notification => notification.documentId === 'valid-async' && notification.severity === MESSAGE_SEVERITY.Warning,
      )
      expect(warningNotifications).toHaveLength(0)
    })
  })

  // A critical AsyncAPI validation failure no longer costs the version: the parser still refuses the document,
  // but the build records why and publishes the file as-is.
  describe('AsyncAPI document with critical errors', () => {
    test('should report the failure instead of breaking the build', async () => {
      const message = await runTest('invalid-critical-async.yaml')
      expect(message).toContain('AsyncAPI validation')
    })

    test('error should include file context', async () => {
      const message = await runTest('invalid-critical-async.yaml')
      expect(message).toContain('invalid-critical-async.yaml')
    })

    test('should operation message belong to the specified channel', async () => {
      const message = await runTest('operation-message-not-belong-to-specified-channel.yaml')
      expect(message).toContain('Operation message does not belong to the specified channel')
    })

    async function runTest(fileId: string): Promise<string> {
      const editor = await Editor.openProject('asyncapi-validation', asyncValidationPackage)
      const result = await editor.run({ files: [{ fileId, publish: true, labels: [] }] })

      // published, with its bytes, and with nothing extracted from it
      const document = documentOf(result, fileId)
      expect(document.source).toBeDefined()
      expect(result.operations.size).toBe(0)

      const parseFailure = notificationOf(result.notifications, MESSAGE_CATEGORY.ParseFile)
      expect(parseFailure.severity).toBe(MESSAGE_SEVERITY.Error)
      expect(parseFailure.documentId).toBe(document.slug)
      return parseFailure.message
    }
  })

  //TODO: add tests for AsyncAPI document with non-critical errors/warnings
})

