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

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { generatePath } from 'react-router-dom'
import type { Key } from '../../entities/keys'
import type {
  DeleteApiKey,
  DeleteApiKeyData,
  GenerateApiKey,
  GenerateApiKeyData,
  GenerateApiKeyValue,
  SystemToken,
  SystemTokenDto,
  SystemTokensDto,
  Tokens,
} from '../../types/tokens'
import type { InvalidateQuery, IsLoading } from '../../utils/aliases'
import type { Roles, RolesDto } from '../../types/roles'
import { toRoles } from '../user-roles/useRoles'
import { SYSTEM_TOKENS_PACKAGE_KEY } from '../../entities/tokens'
import { API_V2, API_V4, requestJson, requestVoid } from '../../utils/requests'
import { optionalSearchParams } from '../../utils/search-params'

const ACCESS_TOKENS_QUERY_KEY = 'access-tokens-query-key'
const AVAILABLE_ROLES_FOR_PACKAGE_QUERY_KEY = 'available-roles-for-package-query-key'

export function useTokens(packageKey?: Key): [Tokens, IsLoading, Error | null] {
  const { data, isLoading, error } = useQuery<SystemTokensDto, Error, Tokens>({
    queryKey: [ACCESS_TOKENS_QUERY_KEY, packageKey],
    queryFn: () => getTokens(packageKey),
    select: toSystemTokens,
  })

  return [
    useMemo(() => data ?? [], [data]),
    isLoading,
    error,
  ]
}

export function useGenerateApiKey(): [Key, GenerateApiKey, IsLoading] {
  const invalidateTokens = useInvalidateTokens()

  const { data, mutate, isLoading } = useMutation<SystemTokenDto, Error, GenerateApiKeyData>({
    mutationFn: ({ value, packageKey }) => generateApiKey(value, packageKey),
    onSuccess: () => {
      invalidateTokens()
    },
  })
  return [data?.apiKey ?? '', mutate, isLoading]
}

export function useDeleteApiKey(): [DeleteApiKey, IsLoading] {
  const invalidateTokens = useInvalidateTokens()

  const { mutate, isLoading } = useMutation<void, Error, DeleteApiKeyData>({
    mutationFn: ({ key, packageKey }) => deleteApiKey(key, packageKey),
    onSuccess: () => {
      invalidateTokens()
    },
  })
  return [mutate, isLoading]
}

export function useAvailablePackageRoles(packageKey: Key, userId?: Key): [Roles, IsLoading, Error | null] {
  const { data, isLoading, error } = useQuery<RolesDto, Error, Roles>({
    queryKey: [AVAILABLE_ROLES_FOR_PACKAGE_QUERY_KEY, userId, packageKey],
    queryFn: () => getAvailableRoles(packageKey!, userId),
    select: toRoles,
  })

  return [
    useMemo(() => data ?? [], [data]),
    isLoading,
    error,
  ]
}

export function useInvalidateTokens(): InvalidateQuery<void> {
  const client = useQueryClient()

  return () => client.invalidateQueries({
    queryKey: [ACCESS_TOKENS_QUERY_KEY],
    refetchType: 'all',
  })
}

export async function getTokens(
  packageKey?: Key,
): Promise<SystemTokensDto> {
  const packageId = encodeURIComponent(packageKey ?? SYSTEM_TOKENS_PACKAGE_KEY)
  const pathPattern = '/packages/:packageId/apiKeys'

  return await requestJson<SystemTokensDto>(generatePath(pathPattern, { packageId }), {
      method: 'GET',
    },
    { basePath: API_V4 },
  )
}

export async function getAvailableRoles(
  packageKey: Key,
  userKey?: Key,
): Promise<RolesDto> {
  const packageId = encodeURIComponent(packageKey)
  const userId = encodeURIComponent(userKey ?? '')

  const queryParams = optionalSearchParams({
    id: { value: userId },
  })

  const pathPattern = `/packages/:packageId/availableRoles?${queryParams}`

  return await requestJson<RolesDto>(generatePath(pathPattern, { packageId }), {
      method: 'GET',
    },
    { basePath: API_V2 },
  )
}

export async function generateApiKey(
  value: GenerateApiKeyValue,
  packageKey?: Key,
): Promise<SystemTokenDto> {
  const packageId = encodeURIComponent(packageKey ?? SYSTEM_TOKENS_PACKAGE_KEY)
  const pathPattern = '/packages/:packageId/apiKeys'

  return await requestJson<SystemTokenDto>(generatePath(pathPattern, { packageId }), {
      method: 'POST',
      body: JSON.stringify(value),
    },
    { basePath: API_V4 },
  )
}

export async function deleteApiKey(
  key: Key,
  packageKey: Key,
): Promise<void> {
  const packageId = encodeURIComponent(packageKey)
  const id = encodeURIComponent(key)
  const pathPattern = '/packages/:packageId/apiKeys/:id'

  return await requestVoid(generatePath(pathPattern, { packageId, id }), {
      method: 'DELETE',
    },
    { basePath: API_V2 },
  )
}

export function toSystemTokens(value: SystemTokensDto): Tokens {
  return value?.apiKeys.map(apiKey => toSystemToken(apiKey))
}

export function toSystemToken(value: SystemTokenDto): SystemToken {
  return {
    key: value.id,
    packageKey: value.packageId,
    name: value.name,
    createdAt: value.createdAt,
    createdBy: value.createdBy,
    createdFor: value.createdFor,
    roles: value.roles,
  }
}
