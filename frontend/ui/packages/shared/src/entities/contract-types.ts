import { DDL_CONTRACT_TYPE, MCP_CONTRACT_TYPE } from '@netcracker/qubership-apihub-api-processor'

import { API_TYPE_TITLE_MAP, type ApiType, isApiType } from './api-types'
import { DEFAULT_API_TYPE } from './operations'

export const CONTRACT_TYPE_MCP = MCP_CONTRACT_TYPE
export const CONTRACT_TYPE_DDL = DDL_CONTRACT_TYPE

export type ContractType = typeof CONTRACT_TYPE_MCP | typeof CONTRACT_TYPE_DDL

export const CONTRACT_TYPES: ReadonlyArray<ContractType> = [
  CONTRACT_TYPE_MCP,
  CONTRACT_TYPE_DDL,
]

export const CONTRACT_TYPE_TITLE_MAP: Record<ContractType, string> = {
  [CONTRACT_TYPE_MCP]: 'MCP',
  [CONTRACT_TYPE_DDL]: 'DDL',
}

export function isContractType(value: string): value is ContractType {
  return CONTRACT_TYPES.some(type => type === value)
}

export function isApiContract(value: string): value is ApiType | ContractType {
  return isApiType(value) || isContractType(value)
}

export function toRouteApiType(
  value: string | undefined,
  fallback: ApiType | ContractType = DEFAULT_API_TYPE,
): ApiType | ContractType {
  return value && isApiContract(value) ? value : fallback
}

export function getRouteApiTypeTitle(routeApiType: ApiType | ContractType): string {
  return isApiType(routeApiType)
    ? API_TYPE_TITLE_MAP[routeApiType]
    : CONTRACT_TYPE_TITLE_MAP[routeApiType]
}
