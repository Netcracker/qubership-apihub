import { deprecatedItemsOf, Editor, LocalRegistry } from './helpers'
import { BUILD_TYPE, VERSION_STATUS } from '../src'

const portal = LocalRegistry.openPackage('new-deprecated')

describe('GraphQL Deprecated Items test', () => {
  const packageId = 'new-deprecated-graphapi'
  test('should build deprecated items', async () => {
    const editor = new Editor('new-deprecated', {
      packageId: packageId,
      version: 'v2',
      status: VERSION_STATUS.RELEASE,
      files: [{ fileId: 'simple-graphql.gql' }],
      buildType: BUILD_TYPE.BUILD,
    }, {}, portal)

    const result = await editor.run()

    const deprecatedItems = deprecatedItemsOf(result)

    expect(deprecatedItems).toHaveLength(1)
  })
})
