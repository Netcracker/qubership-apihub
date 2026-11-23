import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { DeleteApiKeyData, Tokens } from '@netcracker/qubership-apihub-ui-shared/types/tokens'

import type { LibraryApiKeyCreateDto, LibraryApiKeyDto, LibraryApiKeysDto } from '@portal/entities/libraries'
import { LIBRARIES_API_BASE_PATH, portalRequestJson, portalRequestVoid } from '@portal/utils/requests'

type LibraryAccessTokensResult = { tokens: Tokens; isLoading: boolean }
type GenerateApiKey = (value: LibraryApiKeyCreateDto) => void
type DeleteApiKey = (data: DeleteApiKeyData) => void
type GenerateApiKeyResult = { generateApiKey: GenerateApiKey; generatedApiKey: string; isLoading: boolean }
type DeleteApiKeyResult = { deleteApiKey: DeleteApiKey }

const libraryAccessTokensQueryKey = (libraryId: Key): readonly ['library-access-tokens', Key] => [
  'library-access-tokens',
  libraryId,
]

// TODO(libraries-backend): The service has no library API key endpoints;
// the Access tokens tab works only with the local mock until those endpoints exist.
export function useLibraryAccessTokens(libraryId: Key, enabled = true): LibraryAccessTokensResult {
  const { data, isInitialLoading } = useQuery<LibraryApiKeysDto, Error, Tokens>({
    queryKey: libraryAccessTokensQueryKey(libraryId),
    queryFn: ({ signal }) =>
      portalRequestJson<LibraryApiKeysDto>(
        `/libraries/${encodeURIComponent(libraryId)}/apiKeys`,
        { method: 'GET' },
        { basePath: LIBRARIES_API_BASE_PATH },
        signal,
      ),
    select: toLibraryAccessTokens,
    enabled: enabled,
  })
  return { tokens: data ?? [], isLoading: isInitialLoading }
}

export function useGenerateLibraryApiKey(libraryId: Key): GenerateApiKeyResult {
  const client = useQueryClient()
  const { data, mutate, isLoading } = useMutation<LibraryApiKeyDto, Error, LibraryApiKeyCreateDto>({
    mutationFn: value =>
      portalRequestJson<LibraryApiKeyDto>(
        `/libraries/${encodeURIComponent(libraryId)}/apiKeys`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(value),
        },
        { basePath: LIBRARIES_API_BASE_PATH },
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: libraryAccessTokensQueryKey(libraryId), refetchType: 'all' }),
  })
  return { generateApiKey: mutate, generatedApiKey: data?.apiKey ?? '', isLoading: isLoading }
}

export function useDeleteLibraryApiKey(libraryId: Key): DeleteApiKeyResult {
  const client = useQueryClient()
  const { mutate } = useMutation<void, Error, DeleteApiKeyData>({
    mutationFn: ({ key }) =>
      portalRequestVoid(
        `/libraries/${encodeURIComponent(libraryId)}/apiKeys/${encodeURIComponent(key)}`,
        { method: 'DELETE' },
        { basePath: LIBRARIES_API_BASE_PATH },
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: libraryAccessTokensQueryKey(libraryId), refetchType: 'all' }),
  })
  return { deleteApiKey: mutate }
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
