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

import { LocalRegistry, VERSIONS_PATH, loadFileAsStringFromRegistry } from './helpers'
import { PACKAGE } from '../src'

describe('Operations of one path item', () => {
  describe('each method of the path item', () => {
    // neither fixture carries a config.json; the version and the file list live here instead
    async function expectOneOperationPerMethod(packagePath: string): Promise<void> {
      const pkg = LocalRegistry.openPackage(packagePath)
      await pkg.publish(pkg.packageId, { packageId: pkg.packageId, version: 'v1', files: [{ fileId: 'spec.yaml' }] })

      const operationFile = await loadFileAsStringFromRegistry(
        VERSIONS_PATH,
        `${pkg.packageId}/v1`,
        `${PACKAGE.OPERATIONS_FILE_NAME}`,
      )
      expect(operationFile).not.toBeNull()

      const operationData = JSON.parse(operationFile!)

      // a pathItem `$ref` left unresolved yields no methods, so this count is what fails for it
      expect(operationData.operations.length).toBe(2)
      // the ids name the methods, so this pins which operations the path item produced
      const operationIds = operationData.operations.map(({ operationId }: { operationId: string }) => operationId)
      expect(operationIds.sort()).toEqual(['path1-get', 'path1-post'])
    }

    test('should become an operation of its own', async () => {
      await expectOneOperationPerMethod('path-item-operations/different-hashes-for-each-operation')
    })

    test('should become an operation of its own when the path item is a $ref to components', async () => {
      await expectOneOperationPerMethod('path-item-operations/different-hashes-for-each-path-items-operation')
    })
  })
})
