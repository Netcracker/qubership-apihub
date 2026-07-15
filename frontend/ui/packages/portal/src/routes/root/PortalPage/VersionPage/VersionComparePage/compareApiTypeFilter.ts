import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { type ContractType, toRouteApiType } from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'

export const COMPARE_API_TYPE_ALL = 'all' as const

export type CompareApiTypeFilterOption = typeof COMPARE_API_TYPE_ALL | ApiType

export type CompareApiTypeSearchParam = ApiType | ContractType | typeof COMPARE_API_TYPE_ALL

export function isCompareApiTypeAll(value: string | undefined): value is typeof COMPARE_API_TYPE_ALL {
  return value === COMPARE_API_TYPE_ALL
}

export function parseCompareApiTypeSearchParam(
  searchParamValue: string | undefined,
  fallback: ApiType | ContractType,
): CompareApiTypeSearchParam {
  if (isCompareApiTypeAll(searchParamValue)) {
    return COMPARE_API_TYPE_ALL
  }
  return toRouteApiType(searchParamValue, fallback)
}

export function toComparedApiTypeFilter(
  searchParam: CompareApiTypeSearchParam,
): ApiType | ContractType | undefined {
  return isCompareApiTypeAll(searchParam) ? undefined : searchParam
}

export function toComparedApiType(
  searchParam: CompareApiTypeSearchParam,
  fallback: ApiType | ContractType,
): ApiType | ContractType {
  return isCompareApiTypeAll(searchParam) ? fallback : searchParam
}
