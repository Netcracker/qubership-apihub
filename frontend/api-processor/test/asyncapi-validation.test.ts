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

import { Editor, LocalRegistry } from './helpers'
import { MESSAGE_SEVERITY } from '../src/consts'

const asyncValidationPackage = LocalRegistry.openPackage('asyncapi-validation')

describe('AsyncAPI Validation', () => {
  describe('Valid AsyncAPI document', () => {
    test('should build successfully without notifications', async () => {
      const editor = await Editor.openProject('asyncapi-validation', asyncValidationPackage)
      const result = await editor.run({ files: [{ fileId: 'valid-async.yaml', publish: true, labels: [] }] })

      // Document should be successfully created
      expect(result.documents.get('valid-async.yaml')?.type).toBe('asyncapi-3-0')

      // No error notifications for this file
      const errorNotifications = result.notifications.filter(
        notification => notification.fileId === 'valid-async.yaml' && notification.severity === MESSAGE_SEVERITY.Error,
      )
      expect(errorNotifications).toHaveLength(0)

      // No warning notifications for this file
      const warningNotifications = result.notifications.filter(
        notification => notification.fileId === 'valid-async.yaml' && notification.severity === MESSAGE_SEVERITY.Warning,
      )
      expect(warningNotifications).toHaveLength(0)
    })
  })

  describe('AsyncAPI document with critical errors', () => {
    test('should fail build with detailed error message', async () => {
      const editor = await Editor.openProject('asyncapi-validation', asyncValidationPackage)

      await expect(
        async () => await editor.run({ files: [{ fileId: 'invalid-critical-async.yaml', publish: true, labels: [] }] }),
      ).rejects.toThrow(/AsyncAPI validation failed/)
    })

    test('error should include file context', async () => {
      const editor = await Editor.openProject('asyncapi-validation', asyncValidationPackage)

      try {
        await editor.run({ files: [{ fileId: 'invalid-critical-async.yaml', publish: true, labels: [] }] })
        fail('Expected error to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        const errorMessage = (error as Error).message

        // Should contain AsyncAPI validation failure
        expect(errorMessage).toContain('AsyncAPI validation')

        // Should contain file name from parseFile error wrapping
        expect(errorMessage).toContain('invalid-critical-async.yaml')
      }
    })
  })

  //TODO: add tests for AsyncAPI document with non-critical errors/warnings
})

