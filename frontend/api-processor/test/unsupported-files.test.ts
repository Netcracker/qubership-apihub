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

import { Editor, LocalRegistry, VERSIONS_PATH } from './helpers'
import { DOCUMENT_TYPE } from '../src'
import fs from 'fs/promises'

const packageId = 'unsupported'
const classificationBugsPackage = LocalRegistry.openPackage(packageId)
let editor: Editor

describe('Unsupported files test', () => {
  beforeAll(async () => {
    await classificationBugsPackage.publish(packageId, {
      packageId: packageId,
      version: 'v1',
      files: [{ fileId: 'Document.docx' }, { fileId: 'Test.png' }],
    })
    editor = await Editor.openProject(packageId)
  })

  test('Publish unsupported files', async () => {
    const result = await editor.run()

    const doc = result.documents.get('Document.docx')
    const png = result.documents.get('Test.png')

    expect(doc?.format).toEqual(DOCUMENT_TYPE.UNKNOWN)
    expect(doc?.type).toEqual(DOCUMENT_TYPE.UNKNOWN)
    expect(doc?.source instanceof Blob).toBe(true)

    expect(png?.format).toEqual(DOCUMENT_TYPE.UNKNOWN)
    expect(png?.type).toEqual(DOCUMENT_TYPE.UNKNOWN)
    expect(png?.source instanceof Blob).toBe(true)
  })

  test('Pack unsupported files using js zip', async () => {
    await editor.run()
    const packageZip = await editor.createVersionPackage()
    await fs.writeFile(`${VERSIONS_PATH}/unsupported-files-jszip-result.zip`, packageZip)
  }, 100000)

  test('Pack unsupported files using admzip', async () => {
    await editor.run()
    const { packageVersion } = await editor.createNodeVersionPackage()
    await fs.writeFile(`${VERSIONS_PATH}/unsupported-files-admzip-result.zip`, packageVersion)
  }, 100000)
})
