import {
  buildChangelogPackage,
  buildGqlChangelogPackage,
  expectChangeCounts,
  LocalRegistry,
  operationChangesMatcher,
} from './helpers'
import {
  BREAKING_CHANGE_TYPE,
  GRAPHQL_API_TYPE,
  GRAPHQL_DOCUMENT_TYPE,
  GRAPHQL_FILE_FORMAT,
  NON_BREAKING_CHANGE_TYPE,
} from '../src'

describe('Graphql changes test', () => {
  describe('Added/removed/changed operations handling', () => {
    test('Add operation', async () => {
      const result = await buildGqlChangelogPackage('graphql-changes/add-operation')
      expectChangeCounts(result, {
        changes: { [NON_BREAKING_CHANGE_TYPE]: 1 },
        impacted: { [NON_BREAKING_CHANGE_TYPE]: 1 },
      }, GRAPHQL_API_TYPE)
    })

    test('Remove operation', async () => {
      const result = await buildGqlChangelogPackage('graphql-changes/remove-operation')
      expectChangeCounts(result, {
        changes: { [BREAKING_CHANGE_TYPE]: 1 },
        impacted: { [BREAKING_CHANGE_TYPE]: 1 },
      }, GRAPHQL_API_TYPE)
    })

    test('Change operation content', async () => {
      const result = await buildGqlChangelogPackage('graphql-changes/change-inside-operation')
      expectChangeCounts(result, {
        changes: { [BREAKING_CHANGE_TYPE]: 1 },
        impacted: { [BREAKING_CHANGE_TYPE]: 1 },
      }, GRAPHQL_API_TYPE)
    })
  })

  // Both versions are published by the current builder, so their documents describe the artifact and are
  // read back as SDL. The introspection and graphapi read paths are covered in `graphql-transformer.test.ts`.
  test('should parse the previous document published from introspection to build a diff', async () => {
    const result = await buildChangelogPackage(
      'graphql-changes/introspection',
      [{ fileId: 'before.json' }],
      [{ fileId: 'after.json' }],
    )

    expect(result.notifications).toEqual([])
    // after.json adds Query.author to before.json
    expectChangeCounts(result, {
      changes: { [NON_BREAKING_CHANGE_TYPE]: 1 },
      impacted: { [NON_BREAKING_CHANGE_TYPE]: 1 },
    }, GRAPHQL_API_TYPE)
  })

  test.each([
    ['an introspection response', 'graphql-changes/introspection', 'before.json'],
    ['a GraphAPI document', 'graphql-changes/graphapi', 'source.json'],
    ['SDL', 'graphql-changes/add-operation', 'before.gql'],
  ])('should describe a document published from %s as the SDL it is stored as', async (_, project, fileId) => {
    const registry = new LocalRegistry(project)

    const result = await registry.publish(project, {
      packageId: 'graphql-artifact-metadata',
      version: 'v1',
      files: [{ fileId: fileId, publish: true }],
    })

    const [document] = Array.from(result.documents.values())
    expect(document).toEqual(expect.objectContaining({
      type: GRAPHQL_DOCUMENT_TYPE.SCHEMA,
      format: GRAPHQL_FILE_FORMAT.GRAPHQL,
      filename: `${document.slug}.${GRAPHQL_FILE_FORMAT.GRAPHQL}`,
    }))
  })

  test('Operation changes fields are correct', async () => {
    const result = await buildGqlChangelogPackage('graphql-changes/operation-changes-fields')

    expect(result).toEqual(operationChangesMatcher([
      expect.objectContaining({
        previousOperationId: 'query-fruits',
        operationId: 'query-fruits',
        previousMetadata: {
          'title': 'Fruits',
          'tags': ['queries'],
          'method': 'fruits',
          'type': 'query',
        },
        metadata: {
          'title': 'Fruits',
          'tags': ['queries'],
          'method': 'fruits',
          'type': 'query',
        },
        // rest of the fields are covered by dedicated tests
      }),
    ]))
  })
})
