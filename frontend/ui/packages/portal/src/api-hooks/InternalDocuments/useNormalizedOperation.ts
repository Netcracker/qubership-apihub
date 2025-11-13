import type { VersionKey } from '@apihub/entities/keys'
import { INTERNAL_DOCUMENT_STRING_SYMBOL_MAPPING } from '@apihub/utils/internal-documents/constants'
import { deserialize } from '@netcracker/qubership-apihub-api-unifier'
import type { Operation } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type { PackageKey } from '@netcracker/qubership-apihub-ui-shared/utils/types'
import { useMemo } from 'react'
import { useInternalDocumentContent } from './useInternalDocumentContent'
import type { QueryResult } from './useInternalDocumentsByPackageVersion'
import { useInternalDocumentsByPackageVersion } from './useInternalDocumentsByPackageVersion'

type Options = {
  operation: Operation | undefined
  packageId: PackageKey | undefined
  versionId: VersionKey | undefined
}

export function useNormalizedOperation(options: Options): QueryResult<unknown, Error> {
  const { operation, packageId, versionId } = options

  const operationPackageKey = encodeURIComponent(packageId ?? '')
  const operationPackageVersion = encodeURIComponent(versionId ?? '')

  const {
    data: internalDocuments,
    isLoading: isInternalDocumentsLoading,
    error: internalDocumentsError,
  } = useInternalDocumentsByPackageVersion(operationPackageKey, operationPackageVersion)

  const internalDocumentWithChangedOperation = useMemo(
    () => internalDocuments?.find(document => document.id === operation?.versionInternalDocumentId),
    [internalDocuments, operation?.versionInternalDocumentId],
  )

  const {
    data: internalDocumenContent,
    isLoading: isInternalDocumenContentLoading,
    error: internalDocumenContentError,
  } = useInternalDocumentContent(internalDocumentWithChangedOperation?.hash)

  const deserializedInternalDocumentForOperation = useMemo(() => {
    if (!internalDocumenContent) {
      return undefined
    }
    return deserialize(internalDocumenContent, INTERNAL_DOCUMENT_STRING_SYMBOL_MAPPING)
  }, [internalDocumenContent])

  return useMemo(
    () => ({
      data: deserializedInternalDocumentForOperation,
      isLoading: isInternalDocumentsLoading || isInternalDocumenContentLoading,
      error: internalDocumentsError || internalDocumenContentError,
    }),
    [
      deserializedInternalDocumentForOperation,
      internalDocumenContentError,
      internalDocumentsError,
      isInternalDocumenContentLoading,
      isInternalDocumentsLoading,
    ],
  )
}
