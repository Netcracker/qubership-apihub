import type { VersionKey } from '@apihub/entities/keys'
import { INTERNAL_DOCUMENT_STRING_SYMBOL_MAPPING } from '@apihub/utils/internal-documents/constants'
import { isGraphApiSpecification, isOpenApiSpecification } from '@apihub/utils/internal-documents/type-guards'
import { removeComponents } from '@netcracker/qubership-apihub-api-processor'
import { deserialize } from '@netcracker/qubership-apihub-api-unifier'
import { API_TYPE_REST } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { isRestOperation, type OperationData } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type { PackageKey } from '@netcracker/qubership-apihub-ui-shared/utils/types'
import { useMemo } from 'react'
import { createMatcherArbitraryOperationPathWithCurrentOperationPath } from './matcher-arbitrary-operation-path-with-current-operation-path'
import { useInternalDocumentContent } from './useInternalDocumentContent'
import type { QueryResult } from './useInternalDocumentsByPackageVersion'
import { useInternalDocumentsByPackageVersion } from './useInternalDocumentsByPackageVersion'

type Options = {
  operation: OperationData | undefined
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

  const internalDocumentWithOperation = useMemo(
    () => internalDocuments?.find(document => document.id === operation?.versionInternalDocumentId),
    [internalDocuments, operation?.versionInternalDocumentId],
  )

  const {
    data: internalDocumentContent,
    isLoading: isInternalDocumentContentLoading,
    error: internalDocumentContentError,
  } = useInternalDocumentContent(internalDocumentWithOperation?.hash)

  const deserializedInternalDocument = useMemo(() => {
    if (!internalDocumentContent) {
      return undefined
    }
    return deserialize(internalDocumentContent, INTERNAL_DOCUMENT_STRING_SYMBOL_MAPPING)
  }, [internalDocumentContent])

  const filteredInternalDocumentForOperation = useMemo(
    () => {
      if (isOpenApiSpecification(deserializedInternalDocument)) {
        // Truncate REST specification and leave the only necessary path
        const operationPath = operation && isRestOperation(operation) ? operation.path : undefined
        const operationMethod = operation && isRestOperation(operation) ? operation.method : undefined
        if (!operationPath || !operationMethod) {
          return undefined
        }
        const match = createMatcherArbitraryOperationPathWithCurrentOperationPath(API_TYPE_REST, operationPath)
        const internalDocument = deserializedInternalDocument
        const { paths = {}, servers = [] } = internalDocument ?? {}
        const firstServer = servers[0]?.url
        const firstServerBasePath = firstServer ? new URL(firstServer).pathname : ''
        let foundPath
        for (const path of Object.keys(paths)) {
          const pathWithServer = firstServer ? `${firstServerBasePath}${path}` : path
          if (match?.(pathWithServer)) {
            foundPath = path
            break
          }
        }
        if (!foundPath) {
          return undefined
        }
        return removeComponents({
          ...internalDocument,
          paths: {
            [foundPath]: {
              [operationMethod]: paths![foundPath]![operationMethod],
            },
          },
        })
      }
      // GraphQL operations should be returned as is, because truncating is on ADV layer
      if (isGraphApiSpecification(deserializedInternalDocument)) {
        return deserializedInternalDocument
      }
      // Handle unrecognized operations
      return undefined
    },
    [deserializedInternalDocument, operation],
  )

  return useMemo(
    () => ({
      data: filteredInternalDocumentForOperation,
      isLoading: isInternalDocumentsLoading || isInternalDocumentContentLoading,
      error: internalDocumentsError || internalDocumentContentError,
    }),
    [
      filteredInternalDocumentForOperation,
      internalDocumentContentError,
      internalDocumentsError,
      isInternalDocumentContentLoading,
      isInternalDocumentsLoading,
    ],
  )
}
