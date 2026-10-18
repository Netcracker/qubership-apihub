import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import {
  API_TYPE_ASYNCAPI,
  API_TYPE_GRAPHQL,
  API_TYPE_REST,
} from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import {
  CONTRACT_TYPE_DDL,
  CONTRACT_TYPE_MCP,
  type ContractType,
} from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'
import { isEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'

import { getDefaultApiType } from '../../../../../utils/operation-types'

export type PublishedApiTypes = ReadonlyArray<ApiType | ContractType>

export type TabAllowedApiType = ApiType | ContractType

export const VERSION_TAB_IDS = {
  contracts: 'contracts',
  apiChanges: 'apiChanges',
  deprecated: 'deprecated',
  apiQuality: 'apiQuality',
} as const

export type VersionTabId = (typeof VERSION_TAB_IDS)[keyof typeof VERSION_TAB_IDS]

export const CONTRACTS_TAB_ALLOWED_API_TYPES = [
  API_TYPE_REST,
  API_TYPE_GRAPHQL,
  API_TYPE_ASYNCAPI,
  CONTRACT_TYPE_MCP,
  CONTRACT_TYPE_DDL,
] as const satisfies ReadonlyArray<TabAllowedApiType>

export const API_CHANGES_TAB_ALLOWED_API_TYPES = [
  API_TYPE_REST,
  API_TYPE_GRAPHQL,
  API_TYPE_ASYNCAPI,
  CONTRACT_TYPE_DDL,
] as const satisfies ReadonlyArray<TabAllowedApiType>

export const DEPRECATED_TAB_ALLOWED_API_TYPES = [
  API_TYPE_REST,
  API_TYPE_GRAPHQL,
  API_TYPE_ASYNCAPI,
] as const satisfies ReadonlyArray<TabAllowedApiType>

export const API_QUALITY_TAB_ALLOWED_API_TYPES = [
  API_TYPE_REST,
  API_TYPE_ASYNCAPI,
] as const satisfies ReadonlyArray<TabAllowedApiType>

export const VERSION_TAB_ALLOWED_API_TYPES = {
  [VERSION_TAB_IDS.contracts]: CONTRACTS_TAB_ALLOWED_API_TYPES,
  [VERSION_TAB_IDS.apiChanges]: API_CHANGES_TAB_ALLOWED_API_TYPES,
  [VERSION_TAB_IDS.deprecated]: DEPRECATED_TAB_ALLOWED_API_TYPES,
  [VERSION_TAB_IDS.apiQuality]: API_QUALITY_TAB_ALLOWED_API_TYPES,
} as const satisfies Record<VersionTabId, ReadonlyArray<TabAllowedApiType>>

export function resolveTabApiTypes(
  tab: VersionTabId,
  published: PublishedApiTypes,
): Array<ApiType | ContractType> {
  const allowedApiTypes: ReadonlyArray<TabAllowedApiType> = VERSION_TAB_ALLOWED_API_TYPES[tab]
  return published.filter(type => allowedApiTypes.includes(type))
}

export function isTabApiTypesEmpty(tabApiTypes: PublishedApiTypes): boolean {
  return isEmpty(tabApiTypes)
}

export function getDefaultApiTypeFromTabApiTypes(
  tabApiTypes: PublishedApiTypes,
): ApiType | ContractType | undefined {
  return isTabApiTypesEmpty(tabApiTypes) ? undefined : getDefaultApiType(tabApiTypes)
}
