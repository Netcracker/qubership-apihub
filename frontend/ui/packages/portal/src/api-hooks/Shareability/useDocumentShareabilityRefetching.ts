import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { useIsFetching } from '@tanstack/react-query'

import { DOCUMENT_QUERY_KEY } from '../../routes/root/PortalPage/VersionPage/useDocument'
import { DOCUMENTS_QUERY_KEY } from '../../routes/root/PortalPage/VersionPage/useDocuments'

type UseDocumentShareabilityRefetchingResult = {
  isDocumentsListRefetching: boolean
  isDocumentRefetching: boolean
}

export function useDocumentShareabilityRefetching(
  packageKey: Key | undefined,
  fullVersion: Key,
  slug: Key,
): UseDocumentShareabilityRefetchingResult {
  const isDocumentsListRefetching = useIsFetching({
    queryKey: [DOCUMENTS_QUERY_KEY, packageKey, fullVersion],
    exact: false,
  }) > 0

  const isDocumentRefetching = useIsFetching({
    queryKey: [DOCUMENT_QUERY_KEY, packageKey, fullVersion, slug],
    exact: true,
  }) > 0

  return {
    isDocumentsListRefetching,
    isDocumentRefetching,
  }
}
