import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { isApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { CONTRACT_TYPE_DDL, toRouteApiType } from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'

export const COMPARE_API_TYPE_ALL = 'all' as const

export type CompareSupportedApiType = ApiType | typeof CONTRACT_TYPE_DDL

export type CompareApiTypeFilterOption = typeof COMPARE_API_TYPE_ALL | CompareSupportedApiType

export type CompareApiTypeSearchParam = CompareApiTypeFilterOption

export function isCompareApiTypeAll(value: string | undefined): value is typeof COMPARE_API_TYPE_ALL {
  return value === COMPARE_API_TYPE_ALL
}

export function parseCompareApiTypeSearchParam(
  searchParamValue: string | undefined,
  fallback: CompareSupportedApiType,
): CompareApiTypeSearchParam {
  if (isCompareApiTypeAll(searchParamValue)) {
    return COMPARE_API_TYPE_ALL
  }

  const routeApiType = toRouteApiType(searchParamValue, fallback)
  if (isApiType(routeApiType) || routeApiType === CONTRACT_TYPE_DDL) {
    return routeApiType
  }

  return fallback
}

export function toComparedApiTypeFilter(
  searchParam: CompareApiTypeSearchParam,
): CompareSupportedApiType | undefined {
  return isCompareApiTypeAll(searchParam) ? undefined : searchParam
}

export function toComparedApiType(
  searchParam: CompareApiTypeSearchParam,
  fallback: CompareSupportedApiType,
): CompareSupportedApiType {
  return isCompareApiTypeAll(searchParam) ? fallback : searchParam
}
