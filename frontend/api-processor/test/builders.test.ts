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


import { existsSync } from 'fs'
import { join } from 'path'
import {
  ANY_REST_SPEC,
  contentEditor,
  expectNotEmpty,
  notificationsInCategory,
  publishDocumentTypeCase,
  publishVersion,
} from './helpers'
import { BUILD_TYPE, DOCUMENT_TYPE, MESSAGE_CATEGORY, VERSION_STATUS } from '../src/consts'
import { REST_DOCUMENT_TYPE } from '../src/apitypes/rest/rest.consts'

// Two small documents no other suite publishes under these versions. Each test takes its own version, so
// nothing here reads what another test wrote.
const PACKAGE_ID = 'build-result-ordering/rest'

describe('publishVersion', () => {
  test('should publish every file of a list', async () => {
    const result = await publishVersion(PACKAGE_ID, 'publish-version-list', ['alpha.yaml', 'zeta.yaml'])

    expect(Array.from(result.documents.keys())).toIncludeSameMembers(['alpha.yaml', 'zeta.yaml'])
  })

  test('should take a bare file id the way it takes a whole entry', async () => {
    const bare = await publishVersion(PACKAGE_ID, 'publish-version-bare', 'alpha.yaml')
    const entry = await publishVersion(PACKAGE_ID, 'publish-version-entry', [{ fileId: 'alpha.yaml' }])

    expect(Array.from(bare.documents.keys())).toEqual(['alpha.yaml'])
    expect(Array.from(entry.operations.keys())).toEqual(Array.from(bare.operations.keys()))
    expectNotEmpty(bare.operations)
  })

  // the build itself would only report the file as not parsed, and a test built on it would stay green
  test('should refuse a listed file the folder does not hold', async () => {
    await expect(publishVersion(PACKAGE_ID, 'publish-version-missing', ['alpha.yaml', 'no-such-file.yaml']))
      .rejects.toThrow(`The fixture folder '${join('test/projects', PACKAGE_ID)}' has no file 'no-such-file.yaml'`)
  })
})

describe('contentEditor', () => {
  const build = (): ReturnType<typeof contentEditor> =>
    contentEditor({ packageId: PACKAGE_ID, version: 'content-editor' }, { 'rest.json': ANY_REST_SPEC })

  test('should build the files it was given', async () => {
    const result = await build().run()

    expect(Array.from(result.documents.keys())).toEqual(['rest.json'])
  })

  test('should build an edit of a file over the file itself', async () => {
    const editor = build()
    await editor.updateJsonFile('rest.json', data => ({ ...data, info: { ...data.info, title: 'Edited' } }))
    const result = await editor.run()

    expect(Array.from(result.documents.values()).map(({ title }) => title)).toEqual(['Edited'])
  })

  // the package id names a fixture folder that holds `alpha.yaml`, so a lookup on disk would succeed, not fail
  describe('a file it was not given', () => {
    test('should be on disk, or the three tests below would pass with a lookup on disk too', () => {
      expect(existsSync(`test/projects/${PACKAGE_ID}/alpha.yaml`)).toBe(true)
    })

    test('should be refused when a run lists it', async () => {
      await expect(build().run({ files: [{ fileId: 'alpha.yaml' }] }))
        .rejects.toThrow(/The content editor has no file 'alpha.yaml'/)
    })

    test('should be refused when an update lists it', async () => {
      await expect(build().update({ files: [{ fileId: 'alpha.yaml' }] }, 'alpha.yaml'))
        .rejects.toThrow(/The content editor has no file 'alpha.yaml'/)
    })

    test('should be refused when an edit names it', async () => {
      await expect(build().updateYamlFile('alpha.yaml', data => data)).rejects.toThrow(/has no file 'alpha.yaml'/)
    })

    // resolved to nothing, as the base editor resolves a file that is not on disk, so the build reports it
    test('should be reported as a missing reference when a document refers to it', async () => {
      const referring = ANY_REST_SPEC.replace('"responses"', '"parameters": [{ "$ref": "alpha.yaml#/info" }], "responses"')
      const result = await contentEditor(
        { packageId: PACKAGE_ID, version: 'content-editor-ref', status: VERSION_STATUS.DRAFT, buildType: BUILD_TYPE.BUILD },
        { 'rest.json': referring },
      ).run()

      // the file is missing, not the pointer: `#/info` exists in the `alpha.yaml` on disk
      expect(notificationsInCategory(result.notifications, MESSAGE_CATEGORY.RefNotFound).map(({ message }) => message))
        .toContainEqual(expect.stringContaining('Unable to resolve the file "alpha.yaml" because it does not exist'))
    })
  })
})

// The per-type tables compare whole results, so they hold only if the helper reads both fields off a real build.
describe('publishDocumentTypeCase', () => {
  test('should read the type of a document that built', async () => {
    const published = await publishDocumentTypeCase('builders', {
      name: 'built', fileId: 'spec.json', content: ANY_REST_SPEC, type: '', errored: false,
    })

    expect(published).toEqual({ type: REST_DOCUMENT_TYPE.OAS3, errored: false })
  }, 30000)

  test('should read the error flag of a document that did not parse', async () => {
    const published = await publishDocumentTypeCase('builders', {
      name: 'unparsable', fileId: 'spec.json', content: '{"title": ', type: '', errored: false,
    })

    expect(published).toEqual({ type: DOCUMENT_TYPE.UNKNOWN, errored: true })
  }, 30000)
})
