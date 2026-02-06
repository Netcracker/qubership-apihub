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
  EMPTY_CHANGE_SUMMARY,
  Labels,
  NON_BREAKING_CHANGE_TYPE,
  RISKY_CHANGE_TYPE,
  UNCLASSIFIED_CHANGE_TYPE,
  VERSION_STATUS,
} from '../src'
import { jest } from '@jest/globals'
import { changesSummaryMatcher, Editor, LocalRegistry, serializedComparisonDocumentMatcher } from './helpers'
import { takeIfDefined } from '../src/utils'
import * as bwcValidation from '../src/components/compare/bwc.validation'
import { calculateOperationApiCompatibilityKind } from '../src/components/compare/bwc.validation'

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

const portal = new LocalRegistry(AFTER_PACKAGE_ID)
describe('Risky changes for no-bwc operations test', () => {
  beforeAll(async () => {
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
  const API_KIND_NO_BWC_LABEL = 'apihub/x-api-kind: no-BWC'
  const API_KIND_BWC_LABEL = 'apihub/x-api-kind: BWC'

  describe('Calculate default ApiKind', () => {
    test('should apply BWC api kind by default', async () => {
      const result = await runApiKindTest('api-kinds/no-api-kind-in-documents')
      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }))
      expect(result).toEqual(serializedComparisonDocumentMatcher([BREAKING_CHANGE_TYPE]))
    })

    describe('Publish ApiKind file Labels tests', () => {
      test('should apply file label BWC from previous document', async () => {
        const result = await runApiKindTest('api-kinds/no-api-kind-in-documents', [API_KIND_BWC_LABEL])
        expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }))
        expect(result).toEqual(serializedComparisonDocumentMatcher([BREAKING_CHANGE_TYPE]))
      })

      test('should apply file label no-BWC from previous document', async () => {
        const result = await runApiKindTest('api-kinds/no-api-kind-in-documents', [API_KIND_NO_BWC_LABEL])
        expect(result).toEqual(changesSummaryMatcher({ [RISKY_CHANGE_TYPE]: 1 }))
        expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE]))
      })

      test('should prioritize file label no-BWC in current document over file label BWC in previous document', async () => {
        const result = await runApiKindTest(
          'api-kinds/no-api-kind-in-documents', [API_KIND_BWC_LABEL], [API_KIND_NO_BWC_LABEL],
        )
        expect(result).toEqual(changesSummaryMatcher({ [RISKY_CHANGE_TYPE]: 1 }))
        expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE]))
      })

      test('should prioritize file label no-BWC in previous document over file label BWC in current document', async () => {
        const result = await runApiKindTest(
          'api-kinds/no-api-kind-in-documents', [API_KIND_NO_BWC_LABEL], [API_KIND_BWC_LABEL],
        )
        expect(result).toEqual(changesSummaryMatcher({ [RISKY_CHANGE_TYPE]: 1 }))
        expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE]))
      })
    })

    describe('Publish ApiKind version Labels tests', () => {
      test('should apply version label BWC from previous document', async () => {
        const result = await runApiKindTest(
          'api-kinds/no-api-kind-in-documents', [], [], [API_KIND_BWC_LABEL],
        )
        expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }))
        expect(result).toEqual(serializedComparisonDocumentMatcher([BREAKING_CHANGE_TYPE]))
      })

      test('should apply version label no-BWC from previous document', async () => {
        const result = await runApiKindTest(
          'api-kinds/no-api-kind-in-documents', [], [], [API_KIND_NO_BWC_LABEL],
        )
        expect(result).toEqual(changesSummaryMatcher({ [RISKY_CHANGE_TYPE]: 1 }))
        expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE]))
      })

      test('should prioritize version label no-BWC in current document over version label BWC in previous document', async () => {
        const result = await runApiKindTest(
          'api-kinds/no-api-kind-in-documents', [], [], [API_KIND_BWC_LABEL], [API_KIND_NO_BWC_LABEL],
        )
        expect(result).toEqual(changesSummaryMatcher({ [RISKY_CHANGE_TYPE]: 1 }))
        expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE]))
      })

      test('should prioritize version label no-BWC in previous document over version label BWC in current document', async () => {
        const result = await runApiKindTest(
          'api-kinds/no-api-kind-in-documents', [], [], [API_KIND_NO_BWC_LABEL], [API_KIND_BWC_LABEL],
        )
        expect(result).toEqual(changesSummaryMatcher({ [RISKY_CHANGE_TYPE]: 1 }))
        expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE]))
      })
    })

    describe('ApiKind info property tests', () => {
      test('should apply info no-BWC property in previous document', async () => {
        const result = await runApiKindTest('api-kinds/info-noBWC-in-prev-document')
        expect(result).toEqual(changesSummaryMatcher({ [RISKY_CHANGE_TYPE]: 1 }))
        expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE]))
      })

      test('should apply info no-BWC property in current document', async () => {
        const result = await runApiKindTest('api-kinds/info-noBWC-in-curr-document')
        expect(result).toEqual(changesSummaryMatcher({ [RISKY_CHANGE_TYPE]: 1 }))
        expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE]))
      })

      test('should prioritize info no-BWC property in current document over info BWC property in previous document', async () => {
        const result = await runApiKindTest('api-kinds/info-bwc-in-prev-document-info-noBWC-in-curr-document')
        expect(result).toEqual(changesSummaryMatcher({ [RISKY_CHANGE_TYPE]: 1 }))
        expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE]))
      })

      test('should prioritize info label no-BWC property in previous document over info BWC property in current document', async () => {
        const result = await runApiKindTest('api-kinds/info-noBWC-in-prev-document-info-bwc-in-curr-document')
        expect(result).toEqual(changesSummaryMatcher({ [RISKY_CHANGE_TYPE]: 1 }))
        expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE]))
      })
    })

    describe('Priority File labels and Version labels', () => {
      test('should prioritize file label BWC in previous document over version label no-BWC in previous document', async () => {
        const result = await runApiKindTest(
          'api-kinds/no-api-kind-in-documents', [API_KIND_BWC_LABEL], [], [API_KIND_NO_BWC_LABEL],
        )
        expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }))
        expect(result).toEqual(serializedComparisonDocumentMatcher([BREAKING_CHANGE_TYPE]))
      })

      test('should prioritize file label no-BWC in previous document over version label BWC in previous document', async () => {
        const result = await runApiKindTest(
          'api-kinds/no-api-kind-in-documents', [API_KIND_NO_BWC_LABEL], [], [API_KIND_BWC_LABEL],
        )
        expect(result).toEqual(changesSummaryMatcher({ [RISKY_CHANGE_TYPE]: 1 }))
        expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE]))
      })

      test('should prioritize file label BWC in current document over version label no-BWC in current document', async () => {
        const result = await runApiKindTest(
          'api-kinds/no-api-kind-in-documents', [], [API_KIND_BWC_LABEL], [], [API_KIND_NO_BWC_LABEL],
        )
        expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }))
        expect(result).toEqual(serializedComparisonDocumentMatcher([BREAKING_CHANGE_TYPE]))
      })

      test('should prioritize file label no-BWC in current document over version label BWC in current document', async () => {
        const result = await runApiKindTest(
          'api-kinds/no-api-kind-in-documents', [], [API_KIND_NO_BWC_LABEL], [], [API_KIND_BWC_LABEL],
        )
        expect(result).toEqual(changesSummaryMatcher({ [RISKY_CHANGE_TYPE]: 1 }))
        expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE]))
      })
    })

    describe('Priority Info property and File labels', () => {
      test('should prioritize info no-BWC property in previous document over file label BWC in previous document', async () => {
        const result = await runApiKindTest(
          'api-kinds/info-noBWC-in-prev-document', [API_KIND_BWC_LABEL],
        )
        expect(result).toEqual(changesSummaryMatcher({ [RISKY_CHANGE_TYPE]: 1 }))
        expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE]))
      })

      test('should prioritize info no-BWC property in previous document over file label BWC in current document', async () => {
        const result = await runApiKindTest(
          'api-kinds/info-noBWC-in-prev-document', [], [API_KIND_BWC_LABEL],
        )
        expect(result).toEqual(changesSummaryMatcher({ [RISKY_CHANGE_TYPE]: 1 }))
        expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE]))
      })

      test('should prioritize info no-BWC property in current document over file label BWC in previous document', async () => {
        const result = await runApiKindTest(
          'api-kinds/info-noBWC-in-curr-document', [API_KIND_BWC_LABEL],
        )
        expect(result).toEqual(changesSummaryMatcher({ [RISKY_CHANGE_TYPE]: 1 }))
        expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE]))
      })

      test('should prioritize info no-BWC property in current document over file label BWC in current document', async () => {
        const result = await runApiKindTest(
          'api-kinds/info-noBWC-in-curr-document', [], [API_KIND_BWC_LABEL],
        )
        expect(result).toEqual(changesSummaryMatcher({ [RISKY_CHANGE_TYPE]: 1 }))
        expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE]))
      })

      test('should prioritize info BWC property in previous document over file label no-BWC in previous document', async () => {
        const result = await runApiKindTest(
          'api-kinds/info-bwc-in-prev-document', [API_KIND_NO_BWC_LABEL],
        )
        expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }))
        expect(result).toEqual(serializedComparisonDocumentMatcher([BREAKING_CHANGE_TYPE]))
      })

      test('should prioritize file label no-BWC in current document over info BWC property in previous document', async () => {
        const result = await runApiKindTest(
          'api-kinds/info-bwc-in-prev-document', [], [API_KIND_NO_BWC_LABEL],
        )
        expect(result).toEqual(changesSummaryMatcher({ [RISKY_CHANGE_TYPE]: 1 }))
        expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE]))
      })

      test('should prioritize file label no-BWC in previous document over info BWC property in current document', async () => {
        const result = await runApiKindTest(
          'api-kinds/info-bwc-in-curr-document', [API_KIND_NO_BWC_LABEL],
        )
        expect(result).toEqual(changesSummaryMatcher({ [RISKY_CHANGE_TYPE]: 1 }))
        expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE]))
      })

      test('should prioritize info BWC property in current document over file label no-BWC in current document', async () => {
        const result = await runApiKindTest(
          'api-kinds/info-bwc-in-curr-document', [], [API_KIND_NO_BWC_LABEL],
        )
        expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }))
        expect(result).toEqual(serializedComparisonDocumentMatcher([BREAKING_CHANGE_TYPE]))
      })
    })
  })

  const OPERATION_RISKY_CHANGE_TYPES = {
    [RISKY_CHANGE_TYPE]: 1,
    [UNCLASSIFIED_CHANGE_TYPE]: 1, // x-api-kind field in the operation also gives a diff
  }

  const OPERATION_BREAKING_CHANGE_TYPES = {
    [BREAKING_CHANGE_TYPE]: 1,
    [UNCLASSIFIED_CHANGE_TYPE]: 1, // x-api-kind field in the operation also gives a diff
  }

  describe('ApiKind operations section tests', () => {
    test('should apply operation no-BWC in current document', async () => {
      const result = await runApiKindTest('api-kinds/operation-noBWC-in-curr-document')
      expect(result).toEqual(changesSummaryMatcher(OPERATION_RISKY_CHANGE_TYPES))
      expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE]))
    })

    test('should apply operation no-BWC in previous document', async () => {
      const result = await runApiKindTest('api-kinds/operation-noBWC-in-prev-document')
      expect(result).toEqual(changesSummaryMatcher(OPERATION_RISKY_CHANGE_TYPES))
      expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE]))
    })

    test('should prioritize operation no-BWC property in current document over operation BWC property in previous document', async () => {
      const result = await runApiKindTest('api-kinds/operation-bwc-in-prev-document-operation-noBWC-in-curr-document')
      expect(result).toEqual(changesSummaryMatcher(OPERATION_RISKY_CHANGE_TYPES))
      expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE]))
    })

    test('should prioritize operation no-BWC property in previous document over operation BWC property in current document', async () => {
      const result = await runApiKindTest('api-kinds/operation-noBWC-in-prev-document-operation-bwc-in-curr-document')
      expect(result).toEqual(changesSummaryMatcher(OPERATION_RISKY_CHANGE_TYPES))
      expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE]))
    })
  })

  describe('Priority operation ApiKind and default ApiKind', () => {
    test('should prioritize parent no-BWC in previous document over operation BWC property in current document', async () => {
      const result = await runApiKindTest('api-kinds/operation-bwc-in-curr-document', [API_KIND_NO_BWC_LABEL])
      expect(result).toEqual(changesSummaryMatcher(OPERATION_RISKY_CHANGE_TYPES))
      expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE]))
    })

    test('should prioritize operation BWC property in current document over default no-BWC in current document', async () => {
      const result = await runApiKindTest('api-kinds/operation-bwc-in-curr-document', [], [API_KIND_NO_BWC_LABEL])
      expect(result).toEqual(changesSummaryMatcher(OPERATION_BREAKING_CHANGE_TYPES))
      expect(result).toEqual(serializedComparisonDocumentMatcher([BREAKING_CHANGE_TYPE]))
    })

    test('should prioritize operation BWC property in previous document over default no-BWC in previous document', async () => {
      const result = await runApiKindTest('api-kinds/operation-bwc-in-prev-document', [API_KIND_NO_BWC_LABEL])
      expect(result).toEqual(changesSummaryMatcher(OPERATION_BREAKING_CHANGE_TYPES))
      expect(result).toEqual(serializedComparisonDocumentMatcher([BREAKING_CHANGE_TYPE]))
    })

    test('should prioritize default no-BWC in current document over operation BWC in previous document', async () => {
      const result = await runApiKindTest('api-kinds/operation-bwc-in-prev-document', [], [API_KIND_NO_BWC_LABEL])
      expect(result).toEqual(changesSummaryMatcher(OPERATION_RISKY_CHANGE_TYPES))
      expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE]))
    })

    test('should prioritize operation no-BWC property in current document over default BWC in previous document', async () => {
      const result = await runApiKindTest('api-kinds/operation-noBWC-in-curr-document', [API_KIND_BWC_LABEL])
      expect(result).toEqual(changesSummaryMatcher(OPERATION_RISKY_CHANGE_TYPES))
      expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE]))
    })

    test('should prioritize operation no-BWC property in current document over default BWC in current document', async () => {
      const result = await runApiKindTest('api-kinds/operation-noBWC-in-curr-document', [], [API_KIND_BWC_LABEL])
      expect(result).toEqual(changesSummaryMatcher(OPERATION_RISKY_CHANGE_TYPES))
      expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE]))
    })

    test('should prioritize operation no-BWC property in previous document over default BWC in previous document', async () => {
      const result = await runApiKindTest('api-kinds/operation-noBWC-in-prev-document', [API_KIND_BWC_LABEL])
      expect(result).toEqual(changesSummaryMatcher(OPERATION_RISKY_CHANGE_TYPES))
      expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE]))
    })

    test('should prioritize operation no-BWC property in previous document over default BWC in current document', async () => {
      const result = await runApiKindTest('api-kinds/operation-noBWC-in-prev-document', [], [API_KIND_BWC_LABEL])
      expect(result).toEqual(changesSummaryMatcher(OPERATION_RISKY_CHANGE_TYPES))
      expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE]))
    })
  })

  describe('Remove operations tests', () => {
    test('should apply removed operations as BWC by default', async () => {
      const result = await runApiKindTest('api-kinds/remove-operations-bwc')
      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }))
      expect(result).toEqual(serializedComparisonDocumentMatcher([BREAKING_CHANGE_TYPE]))
    })

    test('should prioritize removed operation BWC property over default no-BWC in previous document', async () => {
      const result = await runApiKindTest('api-kinds/remove-operations-bwc', [API_KIND_NO_BWC_LABEL])
      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }))
      expect(result).toEqual(serializedComparisonDocumentMatcher([BREAKING_CHANGE_TYPE]))
    })

    test('should prioritize removed operation BWC property over default no-BWC in current document', async () => {
      const result = await runApiKindTest('api-kinds/remove-operations-bwc', [], [API_KIND_NO_BWC_LABEL])
      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }))
      expect(result).toEqual(serializedComparisonDocumentMatcher([BREAKING_CHANGE_TYPE]))
    })
  })

  describe('Remove pathItem tests', () => {
    test('should apply removed operations as no-BWC by default', async () => {
      const result = await runApiKindTest('api-kinds/remove-operations-noBWC')
      expect(result).toEqual(changesSummaryMatcher({ [RISKY_CHANGE_TYPE]: 1 }))
      expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE]))
    })

    test('should prioritize removed operation no-BWC property over default BWC in previous document', async () => {
      const result = await runApiKindTest('api-kinds/remove-operations-noBWC', [API_KIND_BWC_LABEL])
      expect(result).toEqual(changesSummaryMatcher({ [RISKY_CHANGE_TYPE]: 1 }))
      expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE]))
    })

    test('should prioritize removed operation no-BWC property over default BWC in current document', async () => {
      const result = await runApiKindTest('api-kinds/remove-operations-noBWC', [], [API_KIND_BWC_LABEL])
      expect(result).toEqual(changesSummaryMatcher({ [RISKY_CHANGE_TYPE]: 1 }))
      expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE]))
    })

    test('should apply removed pathItem as BWC by default', async () => {
      const result = await runApiKindTest('api-kinds/remove-pathItem-no-api-kind-in-documents')
      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }))
      expect(result).toEqual(serializedComparisonDocumentMatcher([BREAKING_CHANGE_TYPE]))
    })

    test('should apply removed pathItem as no-BWC by default from previous document', async () => {
      const result = await runApiKindTest('api-kinds/remove-pathItem-no-api-kind-in-documents', [API_KIND_NO_BWC_LABEL])
      expect(result).toEqual(changesSummaryMatcher({ [RISKY_CHANGE_TYPE]: 1 }))
      expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE]))
    })

    test('should apply removed pathItem as no-BWC by default from current document', async () => {
      const result = await runApiKindTest('api-kinds/remove-pathItem-no-api-kind-in-documents', [], [API_KIND_NO_BWC_LABEL])
      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }))
      expect(result).toEqual(serializedComparisonDocumentMatcher([BREAKING_CHANGE_TYPE]))
    })

    test('should apply removed pathItem operation BWC by default', async () => {
      const result = await runApiKindTest('api-kinds/remove-pathItem-operation-bwc-in-prev-document')
      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }))
      expect(result).toEqual(serializedComparisonDocumentMatcher([BREAKING_CHANGE_TYPE]))
    })

    test('should apply removed pathItem operation BWC over no-BWC default from previous document', async () => {
      const result = await runApiKindTest('api-kinds/remove-pathItem-operation-bwc-in-prev-document', [API_KIND_NO_BWC_LABEL])
      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }))
      expect(result).toEqual(serializedComparisonDocumentMatcher([BREAKING_CHANGE_TYPE]))
    })

    test('should apply removed pathItem operation BWC over no-BWC default from current document', async () => {
      const result = await runApiKindTest('api-kinds/remove-pathItem-operation-bwc-in-prev-document', [], [API_KIND_NO_BWC_LABEL])
      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }))
      expect(result).toEqual(serializedComparisonDocumentMatcher([BREAKING_CHANGE_TYPE]))
    })

    test('should apply removed pathItem operation no-BWC by default', async () => {
      const result = await runApiKindTest('api-kinds/remove-pathItem-operation-noBWC-in-prev-document')
      expect(result).toEqual(changesSummaryMatcher({ [RISKY_CHANGE_TYPE]: 1 }))
      expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE]))
    })

    test('should apply removed pathItem operation no-BWC over BWC default from previous document', async () => {
      const result = await runApiKindTest('api-kinds/remove-pathItem-operation-noBWC-in-prev-document', [API_KIND_BWC_LABEL])
      expect(result).toEqual(changesSummaryMatcher({ [RISKY_CHANGE_TYPE]: 1 }))
      expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE]))
    })

    test('should apply removed pathItem operation no-BWC over BWC default from current document', async () => {
      const result = await runApiKindTest('api-kinds/remove-pathItem-operation-noBWC-in-prev-document', [], [API_KIND_BWC_LABEL])
      expect(result).toEqual(changesSummaryMatcher({ [RISKY_CHANGE_TYPE]: 1 }))
      expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE]))
    })

    test('should apply removed pathItem operations BWC and no-BWC by default', async () => {
      const result = await runApiKindTest('api-kinds/remove-pathItem-operations-bwc-and-noBWC-in-prev-document')
      expect(result).toEqual(changesSummaryMatcher({ [RISKY_CHANGE_TYPE]: 1, [BREAKING_CHANGE_TYPE]: 1 }))
      expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE, BREAKING_CHANGE_TYPE]))
    })

    test('should apply removed pathItem operations BWC and no-BWC over BWC default from previous document', async () => {
      const result = await runApiKindTest('api-kinds/remove-pathItem-operations-bwc-and-noBWC-in-prev-document', [API_KIND_BWC_LABEL])
      expect(result).toEqual(changesSummaryMatcher({ [RISKY_CHANGE_TYPE]: 1, [BREAKING_CHANGE_TYPE]: 1 }))
      expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE, BREAKING_CHANGE_TYPE]))
    })

    test('should apply removed pathItem operations BWC and no-BWC over BWC default from current document', async () => {
      const result = await runApiKindTest('api-kinds/remove-pathItem-operations-bwc-and-noBWC-in-prev-document', [], [API_KIND_BWC_LABEL])
      expect(result).toEqual(changesSummaryMatcher({ [RISKY_CHANGE_TYPE]: 1, [BREAKING_CHANGE_TYPE]: 1 }))
      expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE, BREAKING_CHANGE_TYPE]))
    })

    test('should apply removed pathItem operations BWC by default', async () => {
      const result = await runApiKindTest('api-kinds/remove-pathItem-operations-bwc-and-bwc-in-prev-document')
      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 2 }))
      expect(result).toEqual(serializedComparisonDocumentMatcher([BREAKING_CHANGE_TYPE]))
    })

    test('should apply removed pathItem operations BWC and BWC over no-BWC default from previous document', async () => {
      const result = await runApiKindTest('api-kinds/remove-pathItem-operations-bwc-and-bwc-in-prev-document', [API_KIND_NO_BWC_LABEL])
      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 2 }))
      expect(result).toEqual(serializedComparisonDocumentMatcher([BREAKING_CHANGE_TYPE]))
    })

    test('should apply removed pathItem operations BWC and BWC over no-BWC default from current document', async () => {
      const result = await runApiKindTest('api-kinds/remove-pathItem-operations-bwc-and-bwc-in-prev-document', [], [API_KIND_NO_BWC_LABEL])
      expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 2 }))
      expect(result).toEqual(serializedComparisonDocumentMatcher([BREAKING_CHANGE_TYPE]))
    })

    test('should apply removed pathItem operations no-BWC by default', async () => {
      const result = await runApiKindTest('api-kinds/remove-pathItem-operations-noBWC-and-noBWC-in-prev-document')
      expect(result).toEqual(changesSummaryMatcher({ [RISKY_CHANGE_TYPE]: 2 }))
      expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE]))
    })

    test('should apply removed pathItem operations no-BWC and no-BWC over BWC default from previous document', async () => {
      const result = await runApiKindTest('api-kinds/remove-pathItem-operations-noBWC-and-noBWC-in-prev-document', [API_KIND_BWC_LABEL])
      expect(result).toEqual(changesSummaryMatcher({ [RISKY_CHANGE_TYPE]: 2 }))
      expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE]))
    })

    test('should apply removed pathItem operations no-BWC and no-BWC over BWC default from current document', async () => {
      const result = await runApiKindTest('api-kinds/remove-pathItem-operations-noBWC-and-noBWC-in-prev-document', [], [API_KIND_BWC_LABEL])
      expect(result).toEqual(changesSummaryMatcher({ [RISKY_CHANGE_TYPE]: 2 }))
      expect(result).toEqual(serializedComparisonDocumentMatcher([RISKY_CHANGE_TYPE]))
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
})
