import { useQuery } from '@tanstack/react-query'

import type { Documents } from '@portal/entities/documents'
import { toDocuments } from '@portal/entities/documents'
import { useVersionWithRevision } from '../../useVersionWithRevision'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import {
  isContractType,
  type ContractType,
} from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { DocumentsDto } from '@netcracker/qubership-apihub-ui-shared/entities/documents'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { getAllResolvedVersionDocuments } from '@netcracker/qubership-apihub-ui-shared/utils/packages-builder'

export const DOCUMENTS_QUERY_KEY = 'documents-query-key'

export type DocumentsQueryState = {
  documents: Documents
  isLoading: IsLoading
  isInitialLoading: IsLoading
}

export function useDocuments(options: Partial<{
  packageKey: Key
  versionKey: Key
  apiType: ApiType | ContractType
  enabled: boolean
}>): DocumentsQueryState {
  const { packageKey, versionKey, apiType, enabled } = options
  const {
    fullVersion,
    isLoading: isVersionLoading,
    isInitialLoading: isVersionInitialLoading,
  } = useVersionWithRevision(versionKey, packageKey, enabled)

  const { data, isLoading, isInitialLoading } = useQuery<DocumentsDto, Error, Documents>({
    queryKey: [DOCUMENTS_QUERY_KEY, packageKey, fullVersion, apiType, enabled],
    queryFn: ({ signal }) => {
      if (!apiType) {
        return getAllResolvedVersionDocuments(packageKey!, fullVersion!, undefined, undefined, signal) as Promise<DocumentsDto>
      }
      return fetchDocumentsByApiType(packageKey!, fullVersion!, apiType, signal)
    },
    enabled: !!packageKey && !!fullVersion && enabled,
    select: toDocuments,
  })

  return {
    documents: data ?? [],
    isLoading: isLoading || isVersionLoading,
    isInitialLoading: isInitialLoading || isVersionInitialLoading,
  }
}

async function fetchDocumentsByApiType(
  packageKey: Key,
  versionKey: Key,
  apiType: ApiType | ContractType,
  signal?: AbortSignal,
): Promise<DocumentsDto> {
  if (isContractType(apiType)) {
    return getAllResolvedVersionDocuments(packageKey, versionKey, undefined, apiType, signal) as Promise<DocumentsDto>
  }
  return getAllResolvedVersionDocuments(packageKey, versionKey, apiType, undefined, signal) as Promise<DocumentsDto>
}
