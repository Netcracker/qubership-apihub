import type { VersionKey } from '@apihub/entities/keys'
import { INTERNAL_DOCUMENT_STRING_SYMBOL_MAPPING } from '@apihub/utils/internal-documents/constants'
import { removeComponents } from '@netcracker/qubership-apihub-api-processor'
import { deserialize } from '@netcracker/qubership-apihub-api-unifier'
import type { OperationData } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type { PackageKey } from '@netcracker/qubership-apihub-ui-shared/utils/types'
import type { OpenAPIV3 } from 'openapi-types'
import { useMemo } from 'react'
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

  const documentForOnlyOperation = operation?.data as OpenAPIV3.Document | undefined

  const [operationPath] = useMemo(
    () => Object.keys(documentForOnlyOperation?.paths ?? {}),
    [documentForOnlyOperation],
  )

  const filteredInternalDocumentForOperation = useMemo(
    () => {
      if (!operationPath) {
        return undefined
      }
      const internalDocument = deserializedInternalDocument as OpenAPIV3.Document
      const internalDocumentPaths = internalDocument?.paths
      const internalDocumentPathObject = internalDocumentPaths?.[operationPath]
      return removeComponents({
        ...internalDocument,
        paths: {
          [operationPath]: internalDocumentPathObject,
        },
      })
    },
    [deserializedInternalDocument, operationPath],
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
