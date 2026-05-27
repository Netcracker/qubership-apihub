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
  BREAKING_CHANGE_TYPE,
  BUILD_TYPE,
  BuildResult,
  isNoBwcLike,
  Labels,
  RISKY_CHANGE_TYPE,
  UNCLASSIFIED_CHANGE_TYPE,
  VERSION_STATUS,
} from '../src'
import { jest } from '@jest/globals'
import { changesSummaryMatcher, Editor, loadFileAsString, LocalRegistry, serializedComparisonDocumentMatcher } from './helpers'
import { DiffType } from '@netcracker/qubership-apihub-api-diff'
import { takeIfDefined } from '../src/utils'
import { DEFAULT_PROJECTS_PATH } from './helpers/registry/local'
import * as bwcValidation from '../src/components/compare/rest.bwc.validation'

let afterPackage: LocalRegistry
const AFTER_PACKAGE_ID = 'api-kinds'
const AFTER_VERSION_ID = 'v1'

describe('API Kinds test', () => {
  beforeAll(() => {
    afterPackage = LocalRegistry.openPackage(AFTER_PACKAGE_ID)
  })

  test('document with label must have no-bwc api kind', async () => {
    const editor = await Editor.openProject(AFTER_PACKAGE_ID, afterPackage)
    const result = await editor.run({
      version: AFTER_VERSION_ID,
      packageId: AFTER_PACKAGE_ID,
      files: [{
        fileId: 'Petstore.yaml',
        publish: true,
        labels: ['apihub/x-api-kind: no-bwc'],
      }],
    })

    expect(result.documents.get('Petstore.yaml')?.apiKind).toEqual(APIHUB_API_COMPATIBILITY_KIND_NO_BWC)
  })

  test('document with uppercase label must have no-bwc api kind', async () => {
    const editor = await Editor.openProject(AFTER_PACKAGE_ID, afterPackage)
    const result = await editor.run({
      version: AFTER_VERSION_ID,
      packageId: AFTER_PACKAGE_ID,
      files: [{
        fileId: 'Petstore.yaml',
        publish: true,
        labels: ['apihub/x-api-kind: no-BWC'],
      }],
    })

    expect(result.documents.get('Petstore.yaml')?.apiKind).toEqual(APIHUB_API_COMPATIBILITY_KIND_NO_BWC)
  })

  test('document with label must have experimental api kind', async () => {
    const editor = await Editor.openProject(AFTER_PACKAGE_ID, afterPackage)
    const result = await editor.run({
      version: AFTER_VERSION_ID,
      packageId: AFTER_PACKAGE_ID,
      files: [{
        fileId: 'Petstore.yaml',
        publish: true,
        labels: ['apihub/x-api-kind: experimental'],
      }],
    })

    expect(result.documents.get('Petstore.yaml')?.apiKind).toEqual(APIHUB_API_COMPATIBILITY_KIND_EXPERIMENTAL)
  })

  test('document with incorrect label value must have bwc api kind', async () => {
    const editor = await Editor.openProject(AFTER_PACKAGE_ID, afterPackage)
    const result = await editor.run({
      version: AFTER_VERSION_ID,
      packageId: AFTER_PACKAGE_ID,
      files: [{
        fileId: 'Petstore.yaml',
        publish: true,
        labels: ['apihub/x-api-kind: newApiKind!'],
      }],
    })

    expect(result.documents.get('Petstore.yaml')?.apiKind).toEqual(APIHUB_API_COMPATIBILITY_KIND_BWC)
  })

  test('version with label must have no-bwc api kind', async () => {
    const editor = await Editor.openProject(AFTER_PACKAGE_ID, afterPackage)
    const result = await editor.run({
      version: AFTER_VERSION_ID,
      packageId: AFTER_PACKAGE_ID,
      files: [{
        fileId: 'Petstore.yaml',
        publish: true,
      }],
      metadata: {
        versionLabels: ['apihub/x-api-kind: no-BWC'],
      },
    })

    expect(result.documents.get('Petstore.yaml')?.apiKind).toEqual(APIHUB_API_COMPATIBILITY_KIND_NO_BWC)
  })
})

describe('Risky changes for no-bwc operations test', () => {
  let portal: LocalRegistry

  beforeAll(async () => {
    portal = new LocalRegistry(AFTER_PACKAGE_ID)

    await portal.publish(AFTER_PACKAGE_ID, {
      packageId: AFTER_PACKAGE_ID,
      version: 'v1',
      files: [{ fileId: 'Petstore.yaml' }],
    })

    await portal.publish(AFTER_PACKAGE_ID, {
      packageId: AFTER_PACKAGE_ID,
      version: 'v2',
      previousVersion: 'v1',
      files: [{ fileId: 'Petstorev2.yaml' }],
    })

    await portal.publish(AFTER_PACKAGE_ID, {
      packageId: AFTER_PACKAGE_ID,
      version: 'v3',
      previousVersion: 'v2',
      files: [{ fileId: 'Petstorev3.yaml' }],
    })
  })

  test('should have 2 risky change for no-bwc operations (changed and removed)', async () => {
    const editor = new Editor(AFTER_PACKAGE_ID, {
      packageId: AFTER_PACKAGE_ID,
      version: 'v2',
      status: VERSION_STATUS.RELEASE,
      previousVersion: 'v1',
      buildType: BUILD_TYPE.CHANGELOG,
    }, {}, portal)

    const result = await editor.run()

    expect(result.comparisons[0].operationTypes[0].changesSummary?.[RISKY_CHANGE_TYPE]).toBe(3)
  })

  test('should have 1 breaking change', async () => {
    const editor = new Editor(AFTER_PACKAGE_ID, {
      packageId: AFTER_PACKAGE_ID,
      version: 'v3',
      status: VERSION_STATUS.RELEASE,
      previousVersion: 'v1',
      buildType: BUILD_TYPE.CHANGELOG,
    }, {}, portal)

    const result = await editor.run()

    expect(result.comparisons[0].operationTypes[0].changesSummary?.[BREAKING_CHANGE_TYPE]).toBe(2)
  })
})

describe('Check Api Compatibility Function tests', () => {
  const PREV_VERSION = 'v1'
  const CURR_VERSION = 'v2'

  const NB_LABEL = 'apihub/x-api-kind: no-BWC'
  const BWC_LABEL = 'apihub/x-api-kind: BWC'
  const EXP_LABEL = 'apihub/x-api-kind: experimental'

  type Expected = { summary: Record<string, number>; types: DiffType[] }

  const EXPECT_BREAKING: Expected = { summary: { [BREAKING_CHANGE_TYPE]: 1 }, types: [BREAKING_CHANGE_TYPE] }
  const EXPECT_RISKY: Expected = { summary: { [RISKY_CHANGE_TYPE]: 1 }, types: [RISKY_CHANGE_TYPE] }
  const EXPECT_OP_BREAKING: Expected = { summary: { [BREAKING_CHANGE_TYPE]: 1, [UNCLASSIFIED_CHANGE_TYPE]: 1 }, types: [BREAKING_CHANGE_TYPE] }
  const EXPECT_OP_RISKY: Expected = { summary: { [RISKY_CHANGE_TYPE]: 1, [UNCLASSIFIED_CHANGE_TYPE]: 1 }, types: [RISKY_CHANGE_TYPE] }
  const EXPECT_BREAKING_X2: Expected = { summary: { [BREAKING_CHANGE_TYPE]: 2 }, types: [BREAKING_CHANGE_TYPE] }
  const EXPECT_RISKY_X2: Expected = { summary: { [RISKY_CHANGE_TYPE]: 2 }, types: [RISKY_CHANGE_TYPE] }
  const EXPECT_RISKY_AND_BREAKING: Expected = { summary: { [RISKY_CHANGE_TYPE]: 1, [BREAKING_CHANGE_TYPE]: 1 }, types: [RISKY_CHANGE_TYPE, BREAKING_CHANGE_TYPE] }

  describe('Label-based apiKind tests', () => {
    test.each<{
      desc: string
      prevFileLabels?: Labels
      currFileLabels?: Labels
      prevVersionLabels?: Labels
      currVersionLabels?: Labels
      expected: Expected
    }>([
      // Default
      { desc: 'should apply BWC by default', expected: EXPECT_BREAKING },
      // File labels
      { desc: 'should apply file BWC in prev', prevFileLabels: [BWC_LABEL], expected: EXPECT_BREAKING },
      { desc: 'should apply file no-BWC in prev', prevFileLabels: [NB_LABEL], expected: EXPECT_RISKY },
      { desc: 'should prioritize file no-BWC in curr over file BWC in prev', prevFileLabels: [BWC_LABEL], currFileLabels: [NB_LABEL], expected: EXPECT_RISKY },
      { desc: 'should prioritize file no-BWC in prev over file BWC in curr', prevFileLabels: [NB_LABEL], currFileLabels: [BWC_LABEL], expected: EXPECT_RISKY },
      { desc: 'should apply file no-BWC in curr', currFileLabels: [NB_LABEL], expected: EXPECT_RISKY },
      { desc: 'should apply file experimental in prev', prevFileLabels: [EXP_LABEL], expected: EXPECT_RISKY },
      { desc: 'should apply file experimental in curr', currFileLabels: [EXP_LABEL], expected: EXPECT_RISKY },
      { desc: 'should apply file no-BWC in prev and file experimental in curr', prevFileLabels: [NB_LABEL], currFileLabels: [EXP_LABEL], expected: EXPECT_RISKY },
      { desc: 'should apply file experimental in prev and file no-BWC in curr', prevFileLabels: [EXP_LABEL], currFileLabels: [NB_LABEL], expected: EXPECT_RISKY },
      // Version labels
      { desc: 'should apply version BWC in prev', prevVersionLabels: [BWC_LABEL], expected: EXPECT_BREAKING },
      { desc: 'should apply version no-BWC in prev', prevVersionLabels: [NB_LABEL], expected: EXPECT_RISKY },
      { desc: 'should prioritize version no-BWC in curr over version BWC in prev', prevVersionLabels: [BWC_LABEL], currVersionLabels: [NB_LABEL], expected: EXPECT_RISKY },
      { desc: 'should prioritize version no-BWC in prev over version BWC in curr', prevVersionLabels: [NB_LABEL], currVersionLabels: [BWC_LABEL], expected: EXPECT_RISKY },
      { desc: 'should apply version no-BWC in curr', currVersionLabels: [NB_LABEL], expected: EXPECT_RISKY },
      { desc: 'should apply version experimental in prev', prevVersionLabels: [EXP_LABEL], expected: EXPECT_RISKY },
      { desc: 'should apply version experimental in curr', currVersionLabels: [EXP_LABEL], expected: EXPECT_RISKY },
      { desc: 'should apply version no-BWC in prev and version experimental in curr', prevVersionLabels: [NB_LABEL], currVersionLabels: [EXP_LABEL], expected: EXPECT_RISKY },
      { desc: 'should apply version experimental in prev and version no-BWC in curr', prevVersionLabels: [EXP_LABEL], currVersionLabels: [NB_LABEL], expected: EXPECT_RISKY },
      // Priority: file labels > version labels
      { desc: 'should prioritize file BWC in prev over version no-BWC in prev', prevFileLabels: [BWC_LABEL], prevVersionLabels: [NB_LABEL], expected: EXPECT_BREAKING },
      { desc: 'should prioritize file no-BWC in prev over version BWC in prev', prevFileLabels: [NB_LABEL], prevVersionLabels: [BWC_LABEL], expected: EXPECT_RISKY },
      { desc: 'should prioritize file BWC in curr over version no-BWC in curr', currFileLabels: [BWC_LABEL], currVersionLabels: [NB_LABEL], expected: EXPECT_BREAKING },
      { desc: 'should prioritize file no-BWC in curr over version BWC in curr', currFileLabels: [NB_LABEL], currVersionLabels: [BWC_LABEL], expected: EXPECT_RISKY },
    ])('$desc', async ({ prevFileLabels, currFileLabels, prevVersionLabels, currVersionLabels, expected: { summary, types } }) => {
      const result = await runApiKindTest('api-kinds/no-api-kind-in-documents', prevFileLabels, currFileLabels, prevVersionLabels, currVersionLabels)
      expect(result).toEqual(changesSummaryMatcher(summary))
      expect(result).toEqual(serializedComparisonDocumentMatcher(types))
    })
  })

  describe('Info apiKind tests', () => {
    test.each<{
      desc: string
      prev: string | undefined
      curr: string | undefined
      prevFileLabels?: Labels
      currFileLabels?: Labels
      expected: Expected
    }>([
      // Basic info property
      { desc: 'should apply no-BWC in prev', prev: 'no-BWC', curr: undefined, expected: EXPECT_RISKY },
      { desc: 'should apply no-BWC in curr', prev: undefined, curr: 'no-BWC', expected: EXPECT_RISKY },
      { desc: 'should apply BWC in prev, no-BWC in curr', prev: 'BWC', curr: 'no-BWC', expected: EXPECT_RISKY },
      { desc: 'should apply no-BWC in prev, BWC in curr', prev: 'no-BWC', curr: 'BWC', expected: EXPECT_RISKY },
      { desc: 'should apply experimental in prev', prev: 'experimental', curr: undefined, expected: EXPECT_RISKY },
      { desc: 'should apply experimental in curr', prev: undefined, curr: 'experimental', expected: EXPECT_RISKY },
      { desc: 'should apply no-BWC in prev, experimental in curr', prev: 'no-BWC', curr: 'experimental', expected: EXPECT_RISKY },
      { desc: 'should apply experimental in prev, no-BWC in curr', prev: 'experimental', curr: 'no-BWC', expected: EXPECT_RISKY },
      // Priority: info property > file labels
      { desc: 'should prioritize info no-BWC in prev over file BWC in prev', prev: 'no-BWC', curr: undefined, prevFileLabels: [BWC_LABEL], expected: EXPECT_RISKY },
      { desc: 'should prioritize info no-BWC in prev over file BWC in curr', prev: 'no-BWC', curr: undefined, currFileLabels: [BWC_LABEL], expected: EXPECT_RISKY },
      { desc: 'should prioritize info no-BWC in curr over file BWC in prev', prev: undefined, curr: 'no-BWC', prevFileLabels: [BWC_LABEL], expected: EXPECT_RISKY },
      { desc: 'should prioritize info no-BWC in curr over file BWC in curr', prev: undefined, curr: 'no-BWC', currFileLabels: [BWC_LABEL], expected: EXPECT_RISKY },
      { desc: 'should prioritize info BWC in prev over file no-BWC in prev', prev: 'BWC', curr: undefined, prevFileLabels: [NB_LABEL], expected: EXPECT_BREAKING },
      { desc: 'should prioritize file no-BWC in curr over info BWC in prev', prev: 'BWC', curr: undefined, currFileLabels: [NB_LABEL], expected: EXPECT_RISKY },
      { desc: 'should prioritize file no-BWC in prev over info BWC in curr', prev: undefined, curr: 'BWC', prevFileLabels: [NB_LABEL], expected: EXPECT_RISKY },
      { desc: 'should prioritize info BWC in curr over file no-BWC in curr', prev: undefined, curr: 'BWC', currFileLabels: [NB_LABEL], expected: EXPECT_BREAKING },
    ])('$desc', async ({ prev, curr, prevFileLabels, currFileLabels, expected: { summary, types } }) => {
      const result = await runApiKindTestFromTemplate('api-kinds/info-apiKind', prev, curr, prevFileLabels, currFileLabels)
      expect(result).toEqual(changesSummaryMatcher(summary))
      expect(result).toEqual(serializedComparisonDocumentMatcher(types))
    })
  })

  describe('Operation apiKind tests', () => {
    test.each<{
      desc: string
      prev: string | undefined
      curr: string | undefined
      prevFileLabels?: Labels
      currFileLabels?: Labels
      expected: Expected
    }>([
      // Basic operation property
      { desc: 'should apply no-BWC in curr', prev: undefined, curr: 'no-BWC', expected: EXPECT_OP_RISKY },
      { desc: 'should apply no-BWC in prev', prev: 'no-BWC', curr: undefined, expected: EXPECT_OP_RISKY },
      { desc: 'should apply BWC in prev, no-BWC in curr', prev: 'BWC', curr: 'no-BWC', expected: EXPECT_OP_RISKY },
      { desc: 'should apply no-BWC in prev, BWC in curr', prev: 'no-BWC', curr: 'BWC', expected: EXPECT_OP_RISKY },
      { desc: 'should apply experimental in curr', prev: undefined, curr: 'experimental', expected: EXPECT_OP_RISKY },
      { desc: 'should apply experimental in prev', prev: 'experimental', curr: undefined, expected: EXPECT_OP_RISKY },
      { desc: 'should apply no-BWC in prev, experimental in curr', prev: 'no-BWC', curr: 'experimental', expected: EXPECT_OP_RISKY },
      { desc: 'should apply experimental in prev, no-BWC in curr', prev: 'experimental', curr: 'no-BWC', expected: EXPECT_OP_RISKY },
      // Priority: operation apiKind vs default (file labels)
      { desc: 'should prioritize file no-BWC in prev over operation BWC in curr', prev: undefined, curr: 'BWC', prevFileLabels: [NB_LABEL], expected: EXPECT_OP_RISKY },
      { desc: 'should prioritize operation BWC in curr over file no-BWC in curr', prev: undefined, curr: 'BWC', currFileLabels: [NB_LABEL], expected: EXPECT_OP_BREAKING },
      { desc: 'should prioritize operation BWC in prev over file no-BWC in prev', prev: 'BWC', curr: undefined, prevFileLabels: [NB_LABEL], expected: EXPECT_OP_BREAKING },
      { desc: 'should prioritize file no-BWC in curr over operation BWC in prev', prev: 'BWC', curr: undefined, currFileLabels: [NB_LABEL], expected: EXPECT_OP_RISKY },
      { desc: 'should prioritize operation no-BWC in curr over file BWC in prev', prev: undefined, curr: 'no-BWC', prevFileLabels: [BWC_LABEL], expected: EXPECT_OP_RISKY },
      { desc: 'should prioritize operation no-BWC in curr over file BWC in curr', prev: undefined, curr: 'no-BWC', currFileLabels: [BWC_LABEL], expected: EXPECT_OP_RISKY },
      { desc: 'should prioritize operation no-BWC in prev over file BWC in prev', prev: 'no-BWC', curr: undefined, prevFileLabels: [BWC_LABEL], expected: EXPECT_OP_RISKY },
      { desc: 'should prioritize operation no-BWC in prev over file BWC in curr', prev: 'no-BWC', curr: undefined, currFileLabels: [BWC_LABEL], expected: EXPECT_OP_RISKY },
    ])('$desc', async ({ prev, curr, prevFileLabels, currFileLabels, expected: { summary, types } }) => {
      const result = await runApiKindTestFromTemplate('api-kinds/operation-apiKind', prev, curr, prevFileLabels, currFileLabels)
      expect(result).toEqual(changesSummaryMatcher(summary))
      expect(result).toEqual(serializedComparisonDocumentMatcher(types))
    })
  })

  describe('Remove operations tests', () => {
    test.each<{
      desc: string
      prev: string
      curr: string
      prevFileLabels?: Labels
      currFileLabels?: Labels
      expected: Expected
    }>([
      { desc: 'should apply BWC by default', prev: 'BWC', curr: 'BWC', expected: EXPECT_BREAKING },
      { desc: 'should prioritize operation BWC over file no-BWC in prev', prev: 'BWC', curr: 'BWC', prevFileLabels: [NB_LABEL], expected: EXPECT_BREAKING },
      { desc: 'should prioritize operation BWC over file no-BWC in curr', prev: 'BWC', curr: 'BWC', currFileLabels: [NB_LABEL], expected: EXPECT_BREAKING },
      { desc: 'should apply no-BWC by default', prev: 'no-BWC', curr: 'no-BWC', expected: EXPECT_RISKY },
      { desc: 'should prioritize operation no-BWC over file BWC in prev', prev: 'no-BWC', curr: 'no-BWC', prevFileLabels: [BWC_LABEL], expected: EXPECT_RISKY },
      { desc: 'should prioritize operation no-BWC over file BWC in curr', prev: 'no-BWC', curr: 'no-BWC', currFileLabels: [BWC_LABEL], expected: EXPECT_RISKY },
      { desc: 'should apply experimental by default', prev: 'experimental', curr: 'experimental', expected: EXPECT_RISKY },
    ])('$desc', async ({ prev, curr, prevFileLabels, currFileLabels, expected: { summary, types } }) => {
      const result = await runApiKindTestFromTemplate('api-kinds/remove-operations-apiKind', prev, curr, prevFileLabels, currFileLabels)
      expect(result).toEqual(changesSummaryMatcher(summary))
      expect(result).toEqual(serializedComparisonDocumentMatcher(types))
    })
  })

  describe('Remove pathItem tests', () => {
    describe('No api-kind in documents', () => {
      test.each<{
        desc: string
        prevFileLabels?: Labels
        currFileLabels?: Labels
        expected: Expected
      }>([
        { desc: 'should apply BWC by default', expected: EXPECT_BREAKING },
        { desc: 'should apply file no-BWC in prev', prevFileLabels: [NB_LABEL], expected: EXPECT_RISKY },
        { desc: 'should apply file no-BWC in curr (removed pathItem uses prev)', currFileLabels: [NB_LABEL], expected: EXPECT_BREAKING },
      ])('$desc', async ({ prevFileLabels, currFileLabels, expected: { summary, types } }) => {
        const result = await runApiKindTest('api-kinds/remove-pathItem-no-api-kind-in-documents', prevFileLabels, currFileLabels)
        expect(result).toEqual(changesSummaryMatcher(summary))
        expect(result).toEqual(serializedComparisonDocumentMatcher(types))
      })
    })

    describe('Single operation', () => {
      test.each<{
        desc: string
        prev: string
        prevFileLabels?: Labels
        currFileLabels?: Labels
        expected: Expected
      }>([
        { desc: 'should apply BWC by default', prev: 'BWC', expected: EXPECT_BREAKING },
        { desc: 'should prioritize operation BWC over file no-BWC in prev', prev: 'BWC', prevFileLabels: [NB_LABEL], expected: EXPECT_BREAKING },
        { desc: 'should prioritize operation BWC over file no-BWC in curr', prev: 'BWC', currFileLabels: [NB_LABEL], expected: EXPECT_BREAKING },
        { desc: 'should apply no-BWC by default', prev: 'no-BWC', expected: EXPECT_RISKY },
        { desc: 'should prioritize operation no-BWC over file BWC in prev', prev: 'no-BWC', prevFileLabels: [BWC_LABEL], expected: EXPECT_RISKY },
        { desc: 'should prioritize operation no-BWC over file BWC in curr', prev: 'no-BWC', currFileLabels: [BWC_LABEL], expected: EXPECT_RISKY },
        { desc: 'should apply experimental by default', prev: 'experimental', expected: EXPECT_RISKY },
      ])('$desc', async ({ prev, prevFileLabels, currFileLabels, expected: { summary, types } }) => {
        const result = await runApiKindTestFromTemplate('api-kinds/remove-pathItem-operation-apiKind', prev, undefined, prevFileLabels, currFileLabels)
        expect(result).toEqual(changesSummaryMatcher(summary))
        expect(result).toEqual(serializedComparisonDocumentMatcher(types))
      })
    })

    describe('Multiple same-kind operations', () => {
      test.each<{
        desc: string
        prev: string
        prevFileLabels?: Labels
        currFileLabels?: Labels
        expected: Expected
      }>([
        { desc: 'should apply BWC by default', prev: 'BWC', expected: EXPECT_BREAKING_X2 },
        { desc: 'should prioritize operation BWC over file no-BWC in prev', prev: 'BWC', prevFileLabels: [NB_LABEL], expected: EXPECT_BREAKING_X2 },
        { desc: 'should prioritize operation BWC over file no-BWC in curr', prev: 'BWC', currFileLabels: [NB_LABEL], expected: EXPECT_BREAKING_X2 },
        { desc: 'should apply no-BWC by default', prev: 'no-BWC', expected: EXPECT_RISKY_X2 },
        { desc: 'should prioritize operation no-BWC over file BWC in prev', prev: 'no-BWC', prevFileLabels: [BWC_LABEL], expected: EXPECT_RISKY_X2 },
        { desc: 'should prioritize operation no-BWC over file BWC in curr', prev: 'no-BWC', currFileLabels: [BWC_LABEL], expected: EXPECT_RISKY_X2 },
      ])('$desc', async ({ prev, prevFileLabels, currFileLabels, expected: { summary, types } }) => {
        const result = await runApiKindTestFromTemplate('api-kinds/remove-pathItem-operations-apiKind', prev, undefined, prevFileLabels, currFileLabels)
        expect(result).toEqual(changesSummaryMatcher(summary))
        expect(result).toEqual(serializedComparisonDocumentMatcher(types))
      })
    })

    describe('Mixed-kind operations', () => {
      const MIXED_BWC_NB = 'api-kinds/remove-pathItem-operations-bwc-and-noBWC-in-prev-document'
      const MIXED_NB_EXP = 'api-kinds/remove-pathItem-operations-noBWC-and-experimental-in-prev-document'

      test.each<{
        desc: string
        pkg: string
        prevFileLabels?: Labels
        currFileLabels?: Labels
        expected: Expected
      }>([
        { desc: 'should apply BWC and no-BWC by default', pkg: MIXED_BWC_NB, expected: EXPECT_RISKY_AND_BREAKING },
        { desc: 'should apply BWC and no-BWC with file BWC in prev', pkg: MIXED_BWC_NB, prevFileLabels: [BWC_LABEL], expected: EXPECT_RISKY_AND_BREAKING },
        { desc: 'should apply BWC and no-BWC with file BWC in curr', pkg: MIXED_BWC_NB, currFileLabels: [BWC_LABEL], expected: EXPECT_RISKY_AND_BREAKING },
        { desc: 'should apply no-BWC and experimental', pkg: MIXED_NB_EXP, expected: EXPECT_RISKY_X2 },
      ])('$desc', async ({ pkg, prevFileLabels, currFileLabels, expected: { summary, types } }) => {
        const result = await runApiKindTest(pkg, prevFileLabels, currFileLabels)
        expect(result).toEqual(changesSummaryMatcher(summary))
        expect(result).toEqual(serializedComparisonDocumentMatcher(types))
      })
    })
  })

  describe('PathItem specification extensions tests', () => {
    let calculateOperationApiCompatibilityKindSpy: ReturnType<typeof jest.spyOn>
    let getMethodsApiCompatibilityKindSpy: ReturnType<typeof jest.spyOn>

    beforeEach(() => {
      calculateOperationApiCompatibilityKindSpy = jest.spyOn(bwcValidation, 'calculateOperationApiCompatibilityKind')
      getMethodsApiCompatibilityKindSpy = jest.spyOn(bwcValidation, 'getMethodsApiCompatibilityKind')
    })

    afterEach(() => {
      calculateOperationApiCompatibilityKindSpy.mockRestore()
      getMethodsApiCompatibilityKindSpy.mockRestore()
    })

    const checkCalculateApiCompatibilityKindNotCallForSpecificationExtensions = (): void => {
      // Call only for operations comparisons, but not for path item specification extensions
      expect(calculateOperationApiCompatibilityKindSpy).toHaveBeenCalledTimes(1)
      expect(calculateOperationApiCompatibilityKindSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          responses: expect.anything(),
        }),
        expect.objectContaining({
          responses: expect.anything(),
        }),
        expect.any(String),
        expect.any(String),
      )

      const [[before, after]] =
        calculateOperationApiCompatibilityKindSpy.mock.calls
      expect(before).not.toHaveProperty('extension-data')
      expect(after).not.toHaveProperty('extension-data')

      expect(getMethodsApiCompatibilityKindSpy).not.toHaveBeenCalled()
    }

    test('should not calculate apiKind for path item specification extensions', async () => {
      await runApiKindTest('api-kinds/change-spec-extension-object-in-pathItem')
      expect(calculateOperationApiCompatibilityKindSpy).not.toHaveBeenCalled()
      expect(getMethodsApiCompatibilityKindSpy).not.toHaveBeenCalled()
    })

    test('should not calculate apiKind for path item specification extension string when remove it', async () => {
      await runApiKindTest('api-kinds/remove-spec-extension-string-in-pathItem')
      checkCalculateApiCompatibilityKindNotCallForSpecificationExtensions()
    })

    test('should not calculate apiKind for path item specification extension object when remove it', async () => {
      await runApiKindTest('api-kinds/remove-spec-extension-object-in-pathItem')
      checkCalculateApiCompatibilityKindNotCallForSpecificationExtensions()
    })

    test('should not calculate apiKind for path item specification extension string when add it', async () => {
      await runApiKindTest('api-kinds/add-spec-extension-string-in-pathItem')
      checkCalculateApiCompatibilityKindNotCallForSpecificationExtensions()
    })

    test('should not calculate apiKind for path item specification extension object when add it', async () => {
      await runApiKindTest('api-kinds/add-spec-extension-object-in-pathItem')
      checkCalculateApiCompatibilityKindNotCallForSpecificationExtensions()
    })
  })

  async function runApiKindTest(
    packageId: string,
    prevFileLabels?: Labels,
    currFileLabels?: Labels,
    prevVersionLabels?: Labels,
    currVersionLabels?: Labels,
  ): Promise<BuildResult> {
    const portal = new LocalRegistry(packageId)

    await portal.publish(packageId, {
      packageId: packageId,
      version: PREV_VERSION,
      metadata: { ...takeIfDefined({ versionLabels: prevVersionLabels }) },
      files: [{ fileId: '1.yaml', ...takeIfDefined({ labels: prevFileLabels }) }],
    })

    await portal.publish(packageId, {
      packageId: packageId,
      version: CURR_VERSION,
      metadata: { ...takeIfDefined({ versionLabels: currVersionLabels }) },
      files: [{ fileId: '2.yaml', ...takeIfDefined({ labels: currFileLabels }) }],
    })

    const editor = new Editor(packageId, {
      packageId: packageId,
      version: CURR_VERSION,
      status: VERSION_STATUS.RELEASE,
      previousVersion: PREV_VERSION,
      buildType: BUILD_TYPE.CHANGELOG,
    }, {}, portal)

    return editor.run()
  }

  async function runApiKindTestFromTemplate(
    templatePackageId: string,
    prevApiKind: string | undefined,
    currApiKind: string | undefined,
    prevFileLabels?: Labels,
    currFileLabels?: Labels,
    prevVersionLabels?: Labels,
    currVersionLabels?: Labels,
  ): Promise<BuildResult> {
    const packageId = `${templatePackageId}--${prevApiKind ?? 'none'}-${currApiKind ?? 'none'}`
    const portal = new LocalRegistry(packageId)

    const applyApiKind = (content: string, apiKind: string | undefined): string => {
      if (apiKind) { return content.replace(/"?\{\{ API_KIND }}"?/g, apiKind) }
      return content.replace(/^.*\{\{ API_KIND }}.*\n/gm, '')
    }

    const file1 = await loadFileAsString(DEFAULT_PROJECTS_PATH, templatePackageId, '1.yaml')
    const file2 = await loadFileAsString(DEFAULT_PROJECTS_PATH, templatePackageId, '2.yaml')

    await portal.publishFromContent(
      { '1.yaml': applyApiKind(file1!, prevApiKind) },
      {
        packageId,
        version: PREV_VERSION,
        metadata: { ...takeIfDefined({ versionLabels: prevVersionLabels }) },
        files: [{ fileId: '1.yaml', ...takeIfDefined({ labels: prevFileLabels }) }],
      },
    )

    await portal.publishFromContent(
      { '2.yaml': applyApiKind(file2!, currApiKind) },
      {
        packageId,
        version: CURR_VERSION,
        metadata: { ...takeIfDefined({ versionLabels: currVersionLabels }) },
        files: [{ fileId: '2.yaml', ...takeIfDefined({ labels: currFileLabels }) }],
      },
    )

    const editor = new Editor(packageId, {
      packageId,
      version: CURR_VERSION,
      status: VERSION_STATUS.RELEASE,
      previousVersion: PREV_VERSION,
      buildType: BUILD_TYPE.CHANGELOG,
    }, {}, portal)

    return editor.run()
  }
})

describe('isNoBwcLike', () => {
  const cases: [Parameters<typeof isNoBwcLike>[0], boolean][] = [
    [APIHUB_API_COMPATIBILITY_KIND_NO_BWC, true],
    [APIHUB_API_COMPATIBILITY_KIND_EXPERIMENTAL, true],
    [APIHUB_API_COMPATIBILITY_KIND_BWC, false],
    [undefined, false],
  ]

  it.each(cases)('%s should be %s', (kind, expected) => {
    expect(isNoBwcLike(kind)).toBe(expected)
  })
})
