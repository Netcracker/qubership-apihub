import type { RefetchOptions, UseQueryResult } from '@tanstack/react-query'

export type IsLoading = boolean
export type IsInitialLoading = boolean
export type IsFetched = boolean
export type IsFetching = boolean
export type IsFetchingNextPage = boolean
export type IsSuccess = boolean
export type IsError = boolean
export type IsValidating = boolean
export type HasNextPage = boolean | undefined

export type OptionInvalidateQuery<T> = (value?: T) => void
export type InvalidateQuery<T> = (value: T) => void
export type RefetchQuery<TData, TError> = (options?: RefetchOptions) => Promise<UseQueryResult<TData, TError>>
