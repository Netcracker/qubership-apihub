import { API_CHANGES_PAGE, CONTRACTS_PAGE } from '../../../../routes'
import { generatePathname } from './useSetPathParam'

// useParams returns decoded values; a version may contain a literal '%' and a revision after '@'.
const PARAMS = { packageId: 'group.package', versionId: '1.0 snapshot%20a@3', apiType: 'rest-api' }
const ENCODED_VERSION = '1.0%20snapshot%2520a%403'

describe('generatePathname', () => {
  test('encodes each segment once when it replaces the API type', () => {
    expect(generatePathname(
      `/portal/packages/group.package/${ENCODED_VERSION}/${API_CHANGES_PAGE}/rest-api`,
      PARAMS,
      'graphql',
      'apiType',
    )).toBe(`portal/packages/group.package/${ENCODED_VERSION}/${API_CHANGES_PAGE}/graphql`)
  })

  test('encodes the new value', () => {
    expect(generatePathname(
      `/portal/packages/group.package/1.0/${CONTRACTS_PAGE}/rest-api/get-a`,
      { ...PARAMS, versionId: '1.0', operationId: 'get-a' },
      'get b?#',
      'operationId',
    )).toBe(`portal/packages/group.package/1.0/${CONTRACTS_PAGE}/rest-api/get%20b%3F%23`)
  })
})
