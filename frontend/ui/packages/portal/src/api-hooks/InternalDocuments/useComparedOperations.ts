import type { VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { OperationData } from '@netcracker/qubership-apihub-ui-shared/entities/operations'

import { INTERNAL_DOCUMENT_STRING_SYMBOL_MAPPING } from '@apihub/utils/internal-documents/constants'
import { deserialize } from '@netcracker/qubership-apihub-api-unifier'
import type { PackageKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { useMemo } from 'react'
import { useComparisonInternalDocumentContent } from './useComparisonInternalDocumentContent'
import { useComparisonInternalDocumentsByPackageVersion } from './useComparisonInternalDocumentsByPackageVersion'
import type { QueryResult } from './useInternalDocumentsByPackageVersion'

type Options = {
  previousOperation: OperationData | undefined
  currentOperation: OperationData | undefined
  previousPackageId: PackageKey | undefined
  previousVersionId: VersionKey | undefined
  currentPackageId: PackageKey | undefined
  currentVersionId: VersionKey | undefined
}

export function useComparedOperations(options: Options): QueryResult<unknown, Error> {
  const {
    previousOperation,
    currentOperation,
    previousPackageId,
    previousVersionId,
    currentPackageId,
    currentVersionId,
  } = options

  console.log('OPTS', options)

  const {
    data: comparisonInternalDocuments,
    isLoading: isComparisonInternalDocumentsLoading,
    error: comparisonInternalDocumentsError,
  } = useComparisonInternalDocumentsByPackageVersion({ currentPackageId, currentVersionId, previousPackageId, previousVersionId })

  const comparisonInternalDocument = useMemo(
    () => comparisonInternalDocuments?.find(document => (
      document.id === currentOperation?.versionInternalDocumentId ||
      document.id === previousOperation?.versionInternalDocumentId
    )),
    [comparisonInternalDocuments, currentOperation?.versionInternalDocumentId, previousOperation?.versionInternalDocumentId],
  )

  const {
    data: comparisonInternalDocumentContent,
    isLoading: isComparisonInternalDocumentContentLoading,
    error: comparisonInternalDocumentContentError,
  } = useComparisonInternalDocumentContent(comparisonInternalDocument?.hash)

  const deserializedComparisonInternalDocument = useMemo(() => {
    if (!comparisonInternalDocumentContent) {
      return undefined
    }
    return deserialize(comparisonInternalDocumentContent, INTERNAL_DOCUMENT_STRING_SYMBOL_MAPPING)
  }, [comparisonInternalDocumentContent])

  return {
    data: deserializedComparisonInternalDocument,
    isLoading: isComparisonInternalDocumentContentLoading || isComparisonInternalDocumentsLoading,
    error: comparisonInternalDocumentContentError || comparisonInternalDocumentsError,
  }
}
