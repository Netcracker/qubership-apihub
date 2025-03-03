import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { generatePath } from 'react-router'
import type { Key } from '../../entities/keys'
import type { DeletePersonalAccessTokenCallback, GeneratePersonalAccessTokenCallback, GeneratePersonalAccessTokenData, PersonalAccessTokenDto, PersonalAccessTokens, PersonalAccessTokensDto } from '../../types/tokens'
import type { InvalidateQuery, IsLoading } from '../../utils/aliases'
import { API_V1, requestJson, requestVoid } from '../../utils/requests'

const QUERY_KEY_PERSONAL_ACCESS_TOKENS = 'personal-access-tokens-query'

export function useInvalidatePersonalAccessTokens(): InvalidateQuery<void> {
  const client = useQueryClient()

  return () => client.invalidateQueries({
    queryKey: [QUERY_KEY_PERSONAL_ACCESS_TOKENS],
    refetchType: 'all',
  })
}

export function usePersonalAccessTokens(): [PersonalAccessTokens, IsLoading, Error | null] {
  const { data, isLoading, error } = useQuery<PersonalAccessTokens, Error, void>({
    queryKey: [QUERY_KEY_PERSONAL_ACCESS_TOKENS],
    queryFn: getPersonalAccessTokenList,
  })

  return [
    useMemo(() => data ?? [], [data]),
    isLoading,
    error,
  ]
}

export function useGeneratePersonalAccessToken(): [Key, GeneratePersonalAccessTokenCallback, IsLoading] {
  const invalidateTokens = useInvalidatePersonalAccessTokens()

  const { data, mutate, isLoading } = useMutation<PersonalAccessTokenDto, Error, GeneratePersonalAccessTokenData>({
    mutationFn: (requestBody: GeneratePersonalAccessTokenData) => generatePersonalAccessToken(requestBody),
    onSuccess: () => {
      invalidateTokens()
    },
  })
  return [data?.token ?? '', mutate, isLoading]
}

export function useDeletePersonalAccessToken(): [DeletePersonalAccessTokenCallback, IsLoading] {
  const invalidateTokens = useInvalidatePersonalAccessTokens()

  const { mutate, isLoading } = useMutation<void, Error, Key>({
    mutationFn: (tokenId: Key) => deletePersonalAccessToken(tokenId),
    onSuccess: () => {
      invalidateTokens()
    },
  })

  return [mutate, isLoading]
}

export async function generatePersonalAccessToken(value: GeneratePersonalAccessTokenData): Promise<PersonalAccessTokenDto> {
  return await requestJson<PersonalAccessTokenDto>(
    '/personalAccessToken',
    {
      method: 'POST',
      body: JSON.stringify(value),
    },
    { basePath: API_V1 },
  )
}

export async function getPersonalAccessTokenList(): Promise<PersonalAccessTokensDto> {
  return await requestJson<PersonalAccessTokensDto>(
    '/personalAccessToken',
    { method: 'GET' },
    { basePath: API_V1 },
  )
}

export async function deletePersonalAccessToken(tokenId: Key): Promise<void> {
  const pathPattern = '/personalAccessToken/:tokenId'
  return await requestVoid(
    generatePath(pathPattern, { tokenId }),
    { method: 'DELETE' },
    { basePath: API_V1 },
  )
}
