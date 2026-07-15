import {
  API_TYPE_ASYNCAPI,
  API_TYPE_GRAPHQL,
  API_TYPE_REST,
} from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { CONTRACT_TYPE_DDL, CONTRACT_TYPE_MCP } from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'

import { getDefaultApiTypeFromTabApiTypes, resolveTabApiTypes, VERSION_TAB_IDS } from './version-tab-allowed-api-types'

const ALL_PUBLISHED = [
  API_TYPE_REST,
  API_TYPE_GRAPHQL,
  API_TYPE_ASYNCAPI,
  CONTRACT_TYPE_MCP,
  CONTRACT_TYPE_DDL,
] as const

describe('resolveTabApiTypes', () => {
  test('intersects published types with tab allow-list and preserves order', () => {
    expect(resolveTabApiTypes(VERSION_TAB_IDS.contracts, ALL_PUBLISHED)).toEqual([...ALL_PUBLISHED])
    // TODO(DDL): uncomment when CONTRACT_TYPE_DDL is restored in API_CHANGES_TAB_ALLOWED_API_TYPES.
    // expect(resolveTabApiTypes(VERSION_TAB_IDS.apiChanges, ALL_PUBLISHED)).toEqual([
    //   API_TYPE_REST,
    //   API_TYPE_GRAPHQL,
    //   API_TYPE_ASYNCAPI,
    //   CONTRACT_TYPE_DDL,
    // ])
    expect(resolveTabApiTypes(VERSION_TAB_IDS.apiQuality, ALL_PUBLISHED)).toEqual([
      API_TYPE_REST,
      API_TYPE_ASYNCAPI,
    ])
  })

  test('returns empty when published types are outside tab allow-list', () => {
    expect(resolveTabApiTypes(VERSION_TAB_IDS.apiChanges, [CONTRACT_TYPE_MCP])).toEqual([])
    expect(resolveTabApiTypes(VERSION_TAB_IDS.deprecated, [CONTRACT_TYPE_DDL])).toEqual([])
    expect(resolveTabApiTypes(VERSION_TAB_IDS.apiQuality, [API_TYPE_GRAPHQL])).toEqual([])
  })
})

describe('getDefaultApiTypeFromTabApiTypes', () => {
  test('returns undefined for empty tab api types and prefers REST otherwise', () => {
    expect(getDefaultApiTypeFromTabApiTypes([])).toBeUndefined()
    expect(getDefaultApiTypeFromTabApiTypes([API_TYPE_ASYNCAPI, API_TYPE_REST])).toBe(API_TYPE_REST)
  })
})
