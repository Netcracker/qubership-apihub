/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
