import type { VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { OperationData } from '@netcracker/qubership-apihub-ui-shared/entities/operations'

import { INTERNAL_DOCUMENT_STRING_SYMBOL_MAPPING } from '@apihub/utils/internal-documents/constants'
import { deserialize } from '@netcracker/qubership-apihub-api-unifier'
import type { PackageKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { VersionChanges } from '@netcracker/qubership-apihub-ui-shared/entities/version-changelog'
import type { OpenAPIV3 } from 'openapi-types'
import { useMemo } from 'react'
import { useComparisonInternalDocumentContent } from './useComparisonInternalDocumentContent'
import { useComparisonInternalDocumentsByPackageVersion } from './useComparisonInternalDocumentsByPackageVersion'
import type { QueryResult } from './useInternalDocumentsByPackageVersion'

type Options = {
  previousOperation: OperationData | undefined
  currentOperation: OperationData | undefined
  versionChanges: VersionChanges | undefined
  currentPackageId: PackageKey | undefined
  currentVersionId: VersionKey | undefined
}

export function useComparedOperations(options: Options): QueryResult<unknown, Error> {
  const {
    previousOperation,
    currentOperation,
    versionChanges,
    currentPackageId,
    currentVersionId,
  } = options

  const {
    data: comparisonInternalDocuments,
    isLoading: isComparisonInternalDocumentsLoading,
    error: comparisonInternalDocumentsError,
  } = useComparisonInternalDocumentsByPackageVersion({
    currentPackageId: currentPackageId,
    currentVersionId: currentVersionId,
    previousPackageId: versionChanges?.previousVersionPackageKey,
    previousVersionId: versionChanges?.previousVersion,
  })

  const necessaryChange = useMemo(() => {
    return (versionChanges?.operations ?? []).find(
      change => {
        const currentOperationId = currentOperation?.operationKey
        const previousOperationId = previousOperation?.operationKey
        if (!currentOperationId && previousOperationId) {
          return change.previousOperation?.operationKey === previousOperationId
        }
        if (currentOperationId && !previousOperationId) {
          return change.currentOperation?.operationKey === currentOperationId
        }
        if (currentOperationId && previousOperationId) {
          return (
            change.currentOperation?.operationKey === currentOperationId &&
            change.previousOperation?.operationKey === previousOperationId
          )
        }
        return false
      },
    )
  }, [currentOperation?.operationKey, previousOperation?.operationKey, versionChanges?.operations])

  const comparisonInternalDocument = useMemo(
    () => comparisonInternalDocuments?.find(document => document.id === necessaryChange?.comparisonInternalDocumentId),
    [comparisonInternalDocuments, necessaryChange?.comparisonInternalDocumentId],
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

  const documentForOnlyPreviousOperation = previousOperation?.data as OpenAPIV3.Document | undefined
  const documentForOnlyCurrentOperation = currentOperation?.data as OpenAPIV3.Document | undefined

  const [operationPath] = useMemo(
    () => {
      const previousOperationPaths = Object.keys(documentForOnlyPreviousOperation?.paths ?? {})
      const currentOperationPaths = Object.keys(documentForOnlyCurrentOperation?.paths ?? {})
      const paths = new Set([...previousOperationPaths, ...currentOperationPaths])
      if (paths.size > 1) {
        console.warn('There are 2 paths. What should we do?')
      }
      return paths
    },
    [documentForOnlyCurrentOperation, documentForOnlyPreviousOperation],
  )

  const operation = useMemo(() => (
    operationPath
      ? (deserializedComparisonInternalDocument as OpenAPIV3.Document)?.paths?.[operationPath]
      : undefined
  ), [deserializedComparisonInternalDocument, operationPath])

  const internalDocumentWithOnlyOperation = useMemo(() => (
    deserializedComparisonInternalDocument ? {
      ...deserializedComparisonInternalDocument,
      paths: {
        [operationPath]: operation,
      },
    } : undefined
  ), [deserializedComparisonInternalDocument, operation, operationPath])

  return useMemo(
    () => ({
      data: internalDocumentWithOnlyOperation,
      isLoading: isComparisonInternalDocumentContentLoading || isComparisonInternalDocumentsLoading,
      error: comparisonInternalDocumentContentError || comparisonInternalDocumentsError,
    }),
    [
      comparisonInternalDocumentContentError,
      comparisonInternalDocumentsError,
      internalDocumentWithOnlyOperation,
      isComparisonInternalDocumentContentLoading,
      isComparisonInternalDocumentsLoading,
    ],
  )
}
