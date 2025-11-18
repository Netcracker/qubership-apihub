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
import { DIFF_META_KEY } from '@netcracker/qubership-apihub-api-diff'
import { isObject } from '@netcracker/qubership-apihub-ui-shared/utils/objects'

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
    data: listComparisonInternalDocumentsMetadata,
    isLoading: loadingListComparisonInternalDocumentsMetadata,
    error: errorComparisonInternalDocumentsMetadata,
  } = useComparisonInternalDocumentsByPackageVersion({
    currentPackageId: currentPackageId,
    currentVersionId: currentVersionId,
    previousPackageId: versionChanges?.previousVersionPackageKey,
    previousVersionId: versionChanges?.previousVersion,
  })

  const changeRelatedToComparedOperations = useMemo(() => {
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

  const comparisonInternalDocumentMetadata = useMemo(
    () => listComparisonInternalDocumentsMetadata?.find(
      document => document.id === changeRelatedToComparedOperations?.comparisonInternalDocumentId,
    ),
    [listComparisonInternalDocumentsMetadata, changeRelatedToComparedOperations?.comparisonInternalDocumentId],
  )

  const {
    data: rawComparisonInternalDocument,
    isLoading: loadingRawComparisonInternalDocument,
    error: errorComparisonInternalDocument,
  } = useComparisonInternalDocumentContent(comparisonInternalDocumentMetadata?.hash)

  const deserializedComparisonInternalDocument = useMemo(() => {
    if (!rawComparisonInternalDocument) {
      return undefined
    }
    return deserialize(rawComparisonInternalDocument, INTERNAL_DOCUMENT_STRING_SYMBOL_MAPPING)
  }, [rawComparisonInternalDocument])

  const documentForOnlyPreviousOperation = previousOperation?.data as OpenAPIV3.Document | undefined
  const documentForOnlyCurrentOperation = currentOperation?.data as OpenAPIV3.Document | undefined

  const [comparedOperationPath] = useMemo(
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

  const comparisonInternalDocumentWithOnlyOperation = useMemo(() => {
    if (!deserializedComparisonInternalDocument) {
      return undefined
    }
    // Leave the only operation with necessary path because ASV displays only 1 operation at the time
    const comparisonInternalDocumentPathObjects = (deserializedComparisonInternalDocument as OpenAPIV3.Document)?.paths ?? {}
    const paths = Object.keys(comparisonInternalDocumentPathObjects)
    for (const path of paths) {
      if (path !== comparedOperationPath) {
        delete comparisonInternalDocumentPathObjects[path]
      }
    }
    // Leave the only change for operation with necessary path because ASV takes the first item and doesn't know which operation is there
    if (DIFF_META_KEY in comparisonInternalDocumentPathObjects) {
      const whollyChangedPaths: Record<string, unknown> =
        isObject(comparisonInternalDocumentPathObjects[DIFF_META_KEY])
          ? comparisonInternalDocumentPathObjects[DIFF_META_KEY]
          : {}
      for (const whollyChangedPath of Object.keys(whollyChangedPaths)) {
        if (whollyChangedPath !== comparedOperationPath) {
          delete whollyChangedPaths[whollyChangedPath]
        }
      }
    }
    return deserializedComparisonInternalDocument
  }, [deserializedComparisonInternalDocument, comparedOperationPath])

  return useMemo(
    () => ({
      data: comparisonInternalDocumentWithOnlyOperation,
      isLoading: loadingRawComparisonInternalDocument || loadingListComparisonInternalDocumentsMetadata,
      error: errorComparisonInternalDocument || errorComparisonInternalDocumentsMetadata,
    }),
    [
      errorComparisonInternalDocument,
      errorComparisonInternalDocumentsMetadata,
      comparisonInternalDocumentWithOnlyOperation,
      loadingRawComparisonInternalDocument,
      loadingListComparisonInternalDocumentsMetadata,
    ],
  )
}
