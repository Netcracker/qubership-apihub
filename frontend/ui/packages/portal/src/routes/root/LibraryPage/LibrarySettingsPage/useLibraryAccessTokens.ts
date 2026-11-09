import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { Tokens } from '@netcracker/qubership-apihub-ui-shared/types/tokens'
import { API_V1 } from '@netcracker/qubership-apihub-ui-shared/utils/requests'

import type { LibraryApiKeyCreateDto, LibraryApiKeyDto, LibraryApiKeysDto } from '@portal/entities/libraries'
import { portalRequestJson, portalRequestVoid } from '@portal/utils/requests'

type LibraryAccessTokensResult = { tokens: Tokens; isLoading: boolean; error: Error | null }
type GenerateApiKey = (value: LibraryApiKeyCreateDto) => Promise<LibraryApiKeyDto>
type DeleteApiKey = (key: Key) => Promise<void>
type GenerateApiKeyResult = { generateApiKey: GenerateApiKey; generatedApiKey: string; isLoading: boolean }
type DeleteApiKeyResult = { deleteApiKey: DeleteApiKey; isLoading: boolean }

const libraryAccessTokensQueryKey = (libraryId: Key): readonly ['library-access-tokens', Key] => [
  'library-access-tokens',
  libraryId,
]

export function useLibraryAccessTokens(libraryId: Key, enabled = true): LibraryAccessTokensResult {
  const { data, isInitialLoading, error } = useQuery<LibraryApiKeysDto, Error, Tokens>({
    queryKey: libraryAccessTokensQueryKey(libraryId),
    queryFn: ({ signal }) =>
      portalRequestJson<LibraryApiKeysDto>(
        `/libraries/${encodeURIComponent(libraryId)}/apiKeys`,
        { method: 'GET' },
        { basePath: API_V1 },
        signal,
      ),
    select: toLibraryAccessTokens,
    enabled: enabled,
  })
  return { tokens: data ?? [], isLoading: isInitialLoading, error: error }
}

export function useGenerateLibraryApiKey(libraryId: Key): GenerateApiKeyResult {
  const client = useQueryClient()
  const { data, mutateAsync, isLoading } = useMutation<LibraryApiKeyDto, Error, LibraryApiKeyCreateDto>({
    mutationFn: value =>
      portalRequestJson<LibraryApiKeyDto>(
        `/libraries/${encodeURIComponent(libraryId)}/apiKeys`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(value),
        },
        { basePath: API_V1 },
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: libraryAccessTokensQueryKey(libraryId), refetchType: 'all' }),
  })
  return { generateApiKey: mutateAsync, generatedApiKey: data?.apiKey ?? '', isLoading: isLoading }
}

export function useDeleteLibraryApiKey(libraryId: Key): DeleteApiKeyResult {
  const client = useQueryClient()
  const { mutateAsync, isLoading } = useMutation<void, Error, Key>({
    mutationFn: key =>
      portalRequestVoid(
        `/libraries/${encodeURIComponent(libraryId)}/apiKeys/${encodeURIComponent(key)}`,
        { method: 'DELETE' },
        { basePath: API_V1 },
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: libraryAccessTokensQueryKey(libraryId), refetchType: 'all' }),
  })
  return { deleteApiKey: mutateAsync, isLoading: isLoading }
}

function toLibraryAccessTokens(value: LibraryApiKeysDto): Tokens {
  return value.apiKeys.map(token => ({
    key: token.id,
    packageKey: token.libraryId,
    name: token.name,
    createdAt: token.createdAt,
    createdBy: {
      key: token.createdBy.id,
      name: token.createdBy.name,
      gitlabIntegration: false,
      systemRole: '',
      accessTokenTTLSeconds: null,
    },
    createdFor: {
      key: token.createdFor.id,
      name: token.createdFor.name,
      gitlabIntegration: false,
      systemRole: '',
      accessTokenTTLSeconds: null,
    },
    roles: token.roles,
  }))
}
