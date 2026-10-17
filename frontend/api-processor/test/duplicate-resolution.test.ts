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
import { documentOf, Editor, notificationsInCategory, LocalRegistry, operationOf, publishVersion, expectNotEmpty } from './helpers'
import { setReportingDuplicate } from '../src/utils'
import { operationKey } from '../src/components/operations'
import { reportCollisions } from '../src/components/duplicate-resolution'
import { BUILD_TYPE, MESSAGE_CATEGORY, MESSAGE_SEVERITY, VERSION_STATUS } from '../src/consts'
import { BuildConfig, BuildResult, MessageSeverity } from '../src/types'
import { NotificationMessage } from '../src/types/package/notifications'

/*
 * Two or more documents claiming one id — the design's `Duplicate resolution`, in one file.
 *
 * Which claimant is indexed, what each of them is told, and when the answer must not depend on the order the
 * config listed them in. An operation is identified by its api type and its id, so only documents of one api
 * type can contest an id, and the severity of the contest follows that type: AsyncAPI an `Error`, REST and
 * GraphQL a `Warning`.
 *
 * What an `Error` then costs the document is `tolerant-publication.test.ts`; the category, severity and
 * release verdict of each duplicate diagnostic are rows in `notification-catalogue.test.ts`.
 */

/** The two REST documents that both derive `res-data-post` — the cross-document collision fixture. */
const CONTESTED_PAIR = 'operation-id-collisions/same-path-different-documents'

const publishContestedPair = (): Promise<BuildResult> =>
  publishVersion(CONTESTED_PAIR, 'v1', ['spec1.json', 'spec2.json'])

// `reportCollisions` grades a contested id once, from every claimant. Today no caller can make two claimants
// of one key disagree — an operation key carries the api type, and MCP and DDL grade by a constant — so the
// policy is exercised here, where a disagreeing `severityOf` can be handed to the helper directly.
describe('The grade of a collision', () => {
  const claim = (documentId: string): { documentId: string } => ({ documentId })

  const gradeOf = (order: string[], severityOf: (claimant: { documentId: string }) => MessageSeverity): MessageSeverity[] => {
    const notifications: NotificationMessage[] = []
    reportCollisions(
      new Map([['contested', order.map(claim)]]),
      notifications,
      MESSAGE_CATEGORY.DuplicateOperationId,
      severityOf,
      () => 'contested',
    )
    return notifications.map(({ severity }) => severity)
  }

  // `Error` is 0 and `Warning` is 1, so the strictest grade is the smallest
  const strictForA = ({ documentId }: { documentId: string }): MessageSeverity =>
    (documentId === 'a' ? MESSAGE_SEVERITY.Error : MESSAGE_SEVERITY.Warning)

  test('should take the strictest grade of its claimants', () => {
    expect(gradeOf(['a', 'b'], strictForA)).toEqual([MESSAGE_SEVERITY.Error, MESSAGE_SEVERITY.Error])
  })

  test('should not depend on the order the claimants arrived in', () => {
    expect(gradeOf(['b', 'a'], strictForA)).toEqual(gradeOf(['a', 'b'], strictForA))
  })
})

describe('Duplicate resolution', () => {
  const entity = (documentId: string, title: string): { documentId: string; title: string } => ({ documentId, title })

  test('should keep the lexicographically smallest documentId, whichever arrives first', () => {
    const forwards = new Map<string, { documentId: string; title: string }>()
    setReportingDuplicate(forwards, 'id', entity('a', 'first'))
    setReportingDuplicate(forwards, 'id', entity('b', 'second'))

    const backwards = new Map<string, { documentId: string; title: string }>()
    setReportingDuplicate(backwards, 'id', entity('b', 'second'))
    setReportingDuplicate(backwards, 'id', entity('a', 'first'))

    expect(forwards.get('id')?.documentId).toBe('a')
    expect(backwards.get('id')?.documentId).toBe('a')
  })

  test('should let the same document refresh its own entry', () => {
    const map = new Map<string, { documentId: string; title: string }>()
    setReportingDuplicate(map, 'id', entity('a', 'before'))
    setReportingDuplicate(map, 'id', entity('a', 'after'))

    expect(map.get('id')?.title).toBe('after')
  })
})

// A document announces only what it owns in the published index: without this `documents.json` and
// `operations.json` contradict each other after a duplicate.
describe('What each document announces', () => {
  test('should not list on the losing document the id the winner owns', async () => {
    const result = await publishContestedPair()

    expect(operationOf(result, 'res-data-post').documentId).toBe('spec1')

    const documents = [...result.documents.values()]
    const owner = documents.find(({ slug }) => slug === 'spec1')
    const loser = documents.find(({ slug }) => slug === 'spec2')
    expect(owner?.operationIds).toContain('res-data-post')
    expect(loser?.operationIds).not.toContain('res-data-post')
  })
})

// The two duplicate cases are separate diagnostics: a collision inside one document is
// `rest-duplicate-operation`, reported once, and the cross-document handler must stay out of it — otherwise
// the text names the same document twice.
describe('Duplicate resolution tells the two cases apart', () => {
  test('should not report an intra-document collision as a cross-document duplicate', async () => {
    const result = await publishVersion(
      'operation-id-collisions/same-operation-id-same-document', 'v1', 'spec.json', { status: VERSION_STATUS.DRAFT })

    expect(result.notifications.map(({ category }) => category))
      .toContain(MESSAGE_CATEGORY.RestDuplicateOperation)
    expect(notificationsInCategory(result.notifications, MESSAGE_CATEGORY.DuplicateOperationId)).toEqual([])
    // the giveaway of the old behaviour: a message naming one document as two
    expect(result.notifications.every(({ message }) => !/'([^']+)' and '\1'/.test(message))).toBe(true)
  }, 30000)
})

// A file dropped from `config.files` takes its operations with it. The index is keyed per api type, so the
// entries to evict are found by the document's claims, not by the bare ids it announced.
describe('A document dropped from the config', () => {
  test('should take its operations out of the index', async () => {
    const packageId = 'duplicate-resolution/removed-file'
    const editor = new Editor('tolerant-publication', {
      packageId,
      version: 'v1',
      status: VERSION_STATUS.DRAFT,
      buildType: BUILD_TYPE.BUILD,
      files: [{ fileId: 'rest.json' }, { fileId: 'async-a.yaml' }],
    } as BuildConfig, {}, LocalRegistry.openPackage('tolerant-publication'))
    const built = await editor.run()
    expect([...built.operations.values()].map(({ apiType }) => apiType).sort())
      .toEqual(['asyncapi', 'rest'])

    const after = await editor.update(
      { packageId, version: 'v1', files: [{ fileId: 'rest.json' }] } as BuildConfig, [])

    expect([...after.operations.values()].map(({ apiType, operationId }) => ({ apiType, operationId })))
      .toEqual([{ apiType: 'rest', operationId: 'pets-get' }])
  }, 60000)

  // The dropped document may have lost a contested id to a neighbour. Its claims are kept whole, so the
  // eviction has to check ownership: otherwise dropping the loser takes the winner's entry with it.
  test('should leave the winner in place when the loser is dropped', async () => {
    const project = CONTESTED_PAIR
    const packageId = 'duplicate-resolution/dropped-loser'
    const editor = new Editor(project, {
      packageId,
      version: 'v1',
      status: VERSION_STATUS.DRAFT,
      buildType: BUILD_TYPE.BUILD,
      files: [{ fileId: 'spec1.json' }, { fileId: 'spec2.json' }],
    } as BuildConfig, {}, LocalRegistry.openPackage(project))
    const built = await editor.run()
    expect(operationOf(built, 'res-data-post').documentId).toBe('spec1')

    // spec2 lost the id, so dropping it changes nothing about who owns what
    const after = await editor.update(
      { packageId, version: 'v1', files: [{ fileId: 'spec1.json' }] } as BuildConfig, [])

    expect(operationOf(after, 'res-data-post').documentId).toBe('spec1')
    expect(documentOf(after, 'spec1.json').operationIds).toEqual(['res-data-post'])
  }, 60000)
})

// An incremental rebuild re-processes one document, not the set. The loser of a duplicate must not take the
// id back by being rebuilt on its own — the winner is still the smaller slug, and nothing rebuilt it.
describe('What each document announces, after an incremental rebuild', () => {
  // two documents claiming one operationId, then `update()` re-processing only the loser
  test('should leave the winner in place when the losing document is rebuilt alone', async () => {
    const packageId = CONTESTED_PAIR
    const files = [{ fileId: 'spec1.json' }, { fileId: 'spec2.json' }]
    const editor = new Editor(packageId, {
      packageId, version: 'v1', status: VERSION_STATUS.DRAFT, buildType: BUILD_TYPE.BUILD, files,
    } as BuildConfig, {}, LocalRegistry.openPackage(packageId))

    const built = await editor.run()
    expect(operationOf(built, 'res-data-post').documentId).toBe('spec1')

    const rebuilt = await editor.update({ packageId, version: 'v1', files } as BuildConfig, ['spec2.json'])

    expect(operationOf(rebuilt, 'res-data-post').documentId).toBe('spec1')
    expect(documentOf(rebuilt, 'spec2.json').operationIds).toEqual([])
  }, 60000)
})

// Ownership can change after a document has been processed: a smaller slug arriving later takes the entry.
describe('What each document announces, whatever the config order', () => {
  test('should drop the id from the loser even when it was processed first', async () => {
    // reversed: spec2 is processed first and owns the id until spec1 takes it
    const result = await publishVersion(CONTESTED_PAIR, 'v1', ['spec2.json', 'spec1.json'])

    expect(operationOf(result, 'res-data-post').documentId).toBe('spec1')

    const loser = [...result.documents.values()].find(({ slug }) => slug === 'spec2')
    expect(loser?.operationIds).not.toContain('res-data-post')
  })
})

// Operations are discriminated by api type first, so one `operationId` derived by a REST document and by an
// AsyncAPI one names two different operations. Neither may evict the other from the index, and neither is
// told about a collision.
describe('One operationId in two api types', () => {
  test('should publish both operations and report no collision', async () => {
    const result = await LocalRegistry.openPackage('tolerant-publication').publish('tolerant-publication', {
      packageId: 'cross-api-type/coexist',
      version: 'v1',
      status: VERSION_STATUS.DRAFT,
      files: [{ fileId: 'api.yaml' }, { fileId: 'async-a.yaml' }],
    })

    const published = [...result.operations.values()]
      .map(({ operationId, apiType, documentId }) => ({ operationId, apiType, documentId }))
      .sort((left, right) => left.apiType.localeCompare(right.apiType))
    expect(published).toEqual([
      { operationId: 'pets-get', apiType: 'asyncapi', documentId: 'async-a' },
      { operationId: 'pets-get', apiType: 'rest', documentId: 'api' },
    ])

    expect(notificationsInCategory(result.notifications, MESSAGE_CATEGORY.DuplicateOperationId)).toEqual([])
  }, 30000)

  test('should let each document announce the id it derived', async () => {
    const result = await LocalRegistry.openPackage('tolerant-publication').publish('tolerant-publication', {
      packageId: 'cross-api-type/announced',
      version: 'v1',
      status: VERSION_STATUS.DRAFT,
      files: [{ fileId: 'api.yaml' }, { fileId: 'async-a.yaml' }],
    })

    const announced = [...result.documents.values()]
      .filter(({ publish }) => publish)
      .map(({ slug, operationIds }) => [slug, operationIds] as const)
      .sort(([left], [right]) => left.localeCompare(right))
    expect(announced).toEqual([['api', ['pets-get']], ['async-a', ['pets-get']]])
  }, 30000)
})

describe('Two documents of one api type deriving one id', () => {
  const severitiesFor = async (packageId: string, fileIds: string[]): Promise<MessageSeverity[]> => {
    const result = await LocalRegistry.openPackage('tolerant-publication').publish('tolerant-publication', {
      packageId,
      version: 'v1',
      status: VERSION_STATUS.DRAFT,
      files: fileIds.map(fileId => ({ fileId })),
    })

    return notificationsInCategory(result.notifications, MESSAGE_CATEGORY.DuplicateOperationId)
      .map(({ severity }) => severity)
  }

  // AsyncAPI grades its own collision an `Error`; REST and GraphQL a staged `Warning`
  test('should report a collision between two AsyncAPI documents as an Error', async () => {
    const severities = await severitiesFor('duplicate-severity/async-only', ['async-a.yaml', 'async-b.yaml'])

    expect(severities).toEqual([MESSAGE_SEVERITY.Error, MESSAGE_SEVERITY.Error])
  }, 60000)

  // `config.files` order decides which document is processed second; it must not decide what is reported
  test('should report the same collision whichever document is processed first', async () => {
    const forwards = await severitiesFor('duplicate-severity/async-forwards', ['async-a.yaml', 'async-b.yaml'])
    const backwards = await severitiesFor('duplicate-severity/async-backwards', ['async-b.yaml', 'async-a.yaml'])

    expect(backwards).toEqual(forwards)
  }, 60000)
})

describe('A collision three documents share', () => {
  // Three documents deriving one id, two of them AsyncAPI: only those two are in the contest, and the REST
  // document is not told about a collision it is not part of.
  test('should report the collision to its own api type alone', async () => {
    const result = await LocalRegistry.openPackage('tolerant-publication').publish('tolerant-publication', {
      packageId: 'tolerant-publication/three-claimants',
      status: VERSION_STATUS.DRAFT,
      files: [{ fileId: 'api.yaml' }, { fileId: 'async-a.yaml' }, { fileId: 'async-b.yaml' }],
    })

    const reported = notificationsInCategory(result.notifications, MESSAGE_CATEGORY.DuplicateOperationId)
      .map(({ documentId, severity }) => ({ documentId, severity }))
      .sort((left, right) => (left.documentId ?? '').localeCompare(right.documentId ?? ''))
    expect(reported).toEqual([
      { documentId: 'async-a', severity: MESSAGE_SEVERITY.Error },
      { documentId: 'async-b', severity: MESSAGE_SEVERITY.Error },
    ])

    // Each claimant is told, so there are two messages, and both name the claimants of that api type and not
    // the REST document. Asserted over both: `find` answered about whichever the build happened to raise first.
    const named = notificationsInCategory(result.notifications, MESSAGE_CATEGORY.DuplicateOperationId)
      .map(({ message }) => ['api', 'async-a', 'async-b'].filter(slug => message.includes(slug)))
    expect(named).toEqual([['async-a', 'async-b'], ['async-a', 'async-b']])
  }, 30000)
})

/*
 * The invariant every bug in this area broke, stated once and checked over the fixtures that exercise it:
 *
 *   the index and the documents agree — every id a document announces is in the index and attributed back to
 *   it, and every entry in the index is announced by the document that owns it.
 *
 * Each defect we found violated one half or the other: a document announcing an id the version dropped, or an
 * index entry no document claimed.
 */
describe('The index and the documents agree', () => {
  const FIXTURES: Array<[string, string[]]> = [
    [CONTESTED_PAIR, ['spec1.json', 'spec2.json']],
    ['operation-id-collisions/same-operation-id-same-document', ['spec.json']],
    ['tolerant-publication', ['healthy.yaml', 'colliding.yaml']],
    ['tolerant-publication', ['api.yaml', 'async-a.yaml', 'async-b.yaml']],
  ]

  test.each(FIXTURES)('holds for %s %p', async (project, fileIds) => {
    const registry = LocalRegistry.openPackage(project)
    const result = await registry.publish(project, {
      packageId: `agreement/${project}/${fileIds.join('-')}`,
      version: 'v1',
      status: VERSION_STATUS.DRAFT,
      files: fileIds.map(fileId => ({ fileId })),
    })

    // The three loops below are the whole test, and every one of them passes over an empty build.
    // Guarding the operations is enough: with documents empty and operations not, the last loop fails.
    expectNotEmpty(result.operations)

    // an operation is identified by its api type and its id, which is how the index is keyed
    const announced = new Map<string, string>()
    for (const document of result.documents.values()) {
      const owned = new Set((document.operationClaims ?? [])
        .filter(({ operationId }) => document.operationIds?.includes(operationId))
        .map(operationKey))
      for (const key of owned) {
        // two documents announcing one key is the contradiction this invariant exists to catch; one
        // document claiming an id twice is its own diagnostic
        expect(announced.has(key)).toBe(false)
        announced.set(key, document.slug)
      }
    }

    for (const [key, slug] of announced) {
      expect(result.operations.get(key)?.documentId).toBe(slug)
    }
    for (const [key, operation] of result.operations) {
      expect(announced.get(key)).toBe(operation.documentId)
    }
  }, 60000)
})

/*
 * The editor's incremental rebuild answers the same question as a publication, and must answer it the same
 * way: it grades a collision from what every document remembers deriving, not against whichever claimant
 * holds the index. Graded pairwise it reported a `Warning` where the publication reports an `Error`, so the
 * preview called a version publishable that the release gate refuses.
 */
describe('The editor preview agrees with the publication', () => {
  test('should grade a three-document collision the way a publication does', async () => {
    const files = [{ fileId: 'api.yaml' }, { fileId: 'async-a.yaml' }, { fileId: 'async-b.yaml' }]
    const registry = LocalRegistry.openPackage('tolerant-publication')

    const published = await registry.publish('tolerant-publication', {
      packageId: 'agreement/published', version: 'v1', status: VERSION_STATUS.DRAFT, files,
    })

    const editor = new Editor('tolerant-publication', {
      packageId: 'agreement/previewed',
      version: 'v1',
      status: VERSION_STATUS.DRAFT,
      buildType: BUILD_TYPE.BUILD,
      files,
    } as BuildConfig, {}, registry)
    await editor.run()
    const rebuilt = await editor.update(
      { packageId: 'agreement/previewed', version: 'v1', files } as BuildConfig,
      ['async-b.yaml'],
    )

    const graded = (notifications: Array<{ documentId?: string; severity: number }>): string[] =>
      notifications.map(({ documentId, severity }) => `${documentId}/${severity}`).sort()

    expect(graded(rebuilt.notifications)).toEqual(graded(published.notifications))
  }, 90000)
})

// MCP entity ids collide across documents the same way operation ids do, and the preview must grade them the
// same way a publication does: rebuilding an unrelated file must not clear a collision between two others.
describe('The editor preview agrees with the publication for MCP', () => {
  const MCP_ENDPOINT = '/mcp'
  const mcpFiles = [
    { fileId: 'init.json', metadata: { mcpEndpoint: MCP_ENDPOINT } },
    { fileId: 'tools-same-name.json', metadata: { mcpEndpoint: MCP_ENDPOINT } },
    { fileId: 'tools-same-name-2.json', metadata: { mcpEndpoint: MCP_ENDPOINT } },
  ]

  test('should keep a collision reported when an unrelated document is rebuilt', async () => {
    const config = {
      packageId: 'agreement/mcp-preview',
      version: 'v1',
      status: VERSION_STATUS.DRAFT,
      buildType: BUILD_TYPE.BUILD,
      files: mcpFiles,
    } as unknown as BuildConfig

    const editor = new Editor('mcp-build', config, {}, LocalRegistry.openPackage('mcp-build'))
    const built = await editor.run()
    const rebuilt = await editor.update(config, ['init.json'])

    const collisions = (notifications: NotificationMessage[]): Array<string | undefined> =>
      notificationsInCategory(notifications, MESSAGE_CATEGORY.McpDuplicateEntity)
        .map(({ documentId }) => documentId)
        .sort()

    expect(collisions(built.notifications)).toEqual(['tools-same-name', 'tools-same-name-2'])
    expect(collisions(rebuilt.notifications)).toEqual(collisions(built.notifications))
  }, 90000)
})

