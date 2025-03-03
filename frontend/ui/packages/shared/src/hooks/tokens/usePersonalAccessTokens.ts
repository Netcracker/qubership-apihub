import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Key } from '../../entities/keys'
import type { GeneratePersonalAccessTokenCallback, PersonalAccessTokenDto, GeneratePersonalAccessTokenData, PersonalAccessToken, PersonalAccessTokens, PersonalAccessTokensDto } from '../../types/tokens'
import type { InvalidateQuery, IsLoading } from '../../utils/aliases'
import { requestJson, API_V1 } from '../../utils/requests'
import { useInvalidateTokens } from './useTokens'
import { useMemo } from 'react'

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
  const invalidateTokens = useInvalidateTokens()

  const { data, mutate, isLoading } = useMutation<PersonalAccessTokenDto, Error, GeneratePersonalAccessTokenData>({
    mutationFn: (requestBody: GeneratePersonalAccessTokenData) => generatePersonalAccessToken(requestBody),
    onSuccess: () => {
      invalidateTokens()
    },
  })
  return [data?.token ?? '', mutate, isLoading]
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
