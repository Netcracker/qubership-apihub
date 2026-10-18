import { BUILD_TYPE, FILE_FORMAT_GRAPHQL } from '../src'
import { Editor, exportDocumentMatcher, exportDocumentsMatcher, LocalRegistry } from './helpers'

describe('Export GraphQL version test', () => {
  const GRAPHQL_SINGLE_VERSION = 'single-graphql-version@1'
  let graphqlEditor: Editor

  beforeAll(async () => {
    const graphqlPkg = LocalRegistry.openPackage('graphql-export')
    await graphqlPkg.publish(graphqlPkg.packageId, {
      version: GRAPHQL_SINGLE_VERSION,
      files: [{ fileId: 'schema1.graphql' }],
    })
    graphqlEditor = await Editor.openProject(graphqlPkg.packageId, graphqlPkg)
  })

  test('should export single graphql file with original extension', async () => {
    const result = await graphqlEditor.run({
      version: GRAPHQL_SINGLE_VERSION,
      buildType: BUILD_TYPE.EXPORT_VERSION,
      format: FILE_FORMAT_GRAPHQL,
    })
    expect(result.exportFileName).toEqual('graphql-export_single-graphql-version_schema1.graphql')
    expect(result).toEqual(exportDocumentsMatcher([
      exportDocumentMatcher('schema1.graphql'),
    ]))
  })
})
