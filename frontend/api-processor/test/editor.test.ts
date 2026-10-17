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

import { join } from 'path'
import { documentOf, Editor, errorNotificationsOf, expectNotEmpty } from './helpers'

// two one-operation documents and no config.json, so an editor opened on the folder lists nothing until a run
// does; nothing here publishes, so no package id is taken
const FOLDER = 'editor'
const MISSING = `The fixture folder '${join('test/projects', FOLDER)}' has no file 'no-such-file.yaml'`

describe('Editor', () => {
  // the build itself would only report the file as not parsed, and a test built on it would stay green
  describe('a listed file the folder does not hold', () => {
    test('should be refused by a run', async () => {
      const editor = await Editor.openProject(FOLDER)

      await expect(editor.run({ version: 'v1', files: [{ fileId: 'no-such-file.yaml' }] }))
        .rejects.toThrow(MISSING)
      // refused before the run took the list, so a later run does not inherit it
      expect(editor.config.files).toEqual([])
    })

    test('should be refused by an update', async () => {
      const editor = await Editor.openProject(FOLDER)

      await expect(editor.update({ version: 'v1', files: [{ fileId: 'no-such-file.yaml' }] }, 'no-such-file.yaml'))
        .rejects.toThrow(MISSING)
      // refused before the update took the list
      expect(editor.config.files).toEqual([])
    })
  })

  test('should build a file an update adds to the list', async () => {
    const editor = await Editor.openProject(FOLDER)
    await editor.run({ version: 'v1', files: [{ fileId: 'spec1.yaml' }] })

    const result = await editor.update({ version: 'v1', files: [{ fileId: 'spec1.yaml' }, { fileId: 'spec2.yaml' }] }, 'spec2.yaml')

    // a file the build could not read would still get a document, an empty one, with an error
    expect(errorNotificationsOf(result.notifications)).toEqual([])
    expectNotEmpty(documentOf(result, 'spec2.yaml').operationIds)
  })
})
