import type { VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { isRestOperation, type OperationData } from '@netcracker/qubership-apihub-ui-shared/entities/operations'

import { INTERNAL_DOCUMENT_STRING_SYMBOL_MAPPING } from '@apihub/utils/internal-documents/constants'
import { isGraphApiSpecification, isOpenApiSpecification } from '@apihub/utils/internal-documents/type-guards'
import { DIFF_META_KEY } from '@netcracker/qubership-apihub-api-diff'
import { REST_API_TYPE } from '@netcracker/qubership-apihub-api-processor'
import { deserialize } from '@netcracker/qubership-apihub-api-unifier'
import type { PackageKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { VersionChanges } from '@netcracker/qubership-apihub-ui-shared/entities/version-changelog'
import { isObject } from '@netcracker/qubership-apihub-ui-shared/utils/objects'
import type { OpenAPIV3 } from 'openapi-types'
import { useMemo } from 'react'
import { createMatcherArbitraryOperationPathWithCurrentOperationPath } from './matcher-arbitrary-operation-path-with-current-operation-path'
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

  const comparisonInternalDocumentWithOnlyOperation = useMemo(() => {
    if (!deserializedComparisonInternalDocument) {
      return undefined
    }
    if (isOpenApiSpecification(deserializedComparisonInternalDocument)) {
      const previousOperationPath = previousOperation && isRestOperation(previousOperation) ? previousOperation.path : undefined
      const currentOperationPath = currentOperation && isRestOperation(currentOperation) ? currentOperation.path : undefined
      const pathsSet = new Set([previousOperationPath, currentOperationPath])
      if (pathsSet.size > 1) {
        console.warn('There are 2 paths. What should we do?')
      }
      const comparedOperationPath = currentOperationPath ?? previousOperationPath

      const previousOperationMethod = previousOperation && isRestOperation(previousOperation) ? previousOperation.method : undefined
      const currentOperationMethod = currentOperation && isRestOperation(currentOperation) ? currentOperation.method : undefined
      const methodsSet = new Set([previousOperationMethod, currentOperationMethod])
      if (methodsSet.size > 1) {
        console.warn('There are 2 methods. What should we do?')
      }
      const comparedOperationMethod = currentOperationMethod ?? previousOperationMethod

      if (!comparedOperationPath || !comparedOperationMethod) {
        return undefined
      }

      const oasInternalDocument = deserializedComparisonInternalDocument
      const clonedOasComparisonInternalDocument: OpenAPIV3.Document = {
        ...oasInternalDocument,
        paths: {},
      }
      // Leave the only operation with necessary path because ASV displays only 1 operation at the time
      const { paths = {}, servers = [] } = oasInternalDocument
      const firstServer = servers[0]?.url
      const firstServerBasePath = firstServer ? new URL(firstServer).pathname : ''
      const match = createMatcherArbitraryOperationPathWithCurrentOperationPath(REST_API_TYPE, comparedOperationPath)
      let foundPath: string | undefined
      for (const path of Object.keys(paths)) {
        const pathWithServer = firstServer ? `${firstServerBasePath}${path}` : path
        if (match(pathWithServer)) {
          foundPath = path
          clonedOasComparisonInternalDocument.paths![path] = {
            [comparedOperationMethod]: paths![path]![comparedOperationMethod],
          }
          break
        }
      }
      // Leave the only change for operation with necessary path because ASV takes the first item and doesn't know which operation is there
      if (DIFF_META_KEY in paths && isObject(paths[DIFF_META_KEY])) {
        const whollyChangedPaths: Record<string, unknown> | undefined =
          isObject(paths[DIFF_META_KEY])
            ? paths[DIFF_META_KEY]
            : undefined
        if (whollyChangedPaths) {
          const clonedWhollyChangedPaths: Record<string, unknown> = {};
          (clonedOasComparisonInternalDocument.paths as Record<PropertyKey, unknown>)[DIFF_META_KEY] = clonedWhollyChangedPaths
          for (const whollyChangedPath of Object.keys(whollyChangedPaths)) {
            const whollyChangedPathWithServer = firstServer ? `${firstServerBasePath}${whollyChangedPath}` : whollyChangedPath
            if (match(whollyChangedPathWithServer)) {
              clonedWhollyChangedPaths[whollyChangedPath] = whollyChangedPaths[whollyChangedPath]
              break
            }
          }
        }
      }
      const operationsByPath = foundPath ? paths[foundPath] : undefined
      if (isObject(operationsByPath) && DIFF_META_KEY in operationsByPath) {
        const whollyChangedMethods: Record<string, unknown> | undefined =
          isObject(operationsByPath[DIFF_META_KEY])
            ? operationsByPath[DIFF_META_KEY]
            : undefined
        if (whollyChangedMethods) {
          let foundDiff: unknown
          for (const whollyChangedMethod of Object.keys(whollyChangedMethods)) {
            if (whollyChangedMethod === comparedOperationMethod) {
              foundDiff = whollyChangedMethods[whollyChangedMethod]
              break
            }
          }
          if (foundDiff) {
            (clonedOasComparisonInternalDocument.paths as Record<PropertyKey, unknown>)[DIFF_META_KEY] = {
              [foundPath!]: foundDiff,
            }
          }
        }
      }
      return clonedOasComparisonInternalDocument
    }
    if (isGraphApiSpecification(deserializedComparisonInternalDocument)) {
      return deserializedComparisonInternalDocument
    }
    return undefined
  }, [deserializedComparisonInternalDocument, previousOperation, currentOperation])

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
