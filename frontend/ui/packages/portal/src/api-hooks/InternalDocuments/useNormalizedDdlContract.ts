import type { VersionKey } from '@apihub/entities/keys'
import { filterRealmForDdlContract } from '@apihub/utils/internal-documents/filter-realm-for-ddl-contract'
import { INTERNAL_DOCUMENT_STRING_SYMBOL_MAPPING } from '@apihub/utils/internal-documents/constants'
import { isDdlApiSpecification } from '@apihub/utils/internal-documents/type-guards'
import { deserialize } from '@netcracker/qubership-apihub-api-unifier'
import type { Realm } from '@netcracker/qubership-apihub-ddlapi'
import type { DdlContractEntityDetails } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-ddl'
import type { PackageKey } from '@netcracker/qubership-apihub-ui-shared/utils/types'
import { useMemo } from 'react'
import type { QueryResultWithNoInternalDocument } from './shared-types'
import { useInternalDocumentContent } from './useInternalDocumentContent'
import { useInternalDocumentsByPackageVersion } from './useInternalDocumentsByPackageVersion'

type Options = {
  ddlContract: DdlContractEntityDetails | undefined
  packageId: PackageKey | undefined
  versionId: VersionKey | undefined
}

export function useNormalizedDdlContract(
  options: Options,
): QueryResultWithNoInternalDocument<Realm, Error> {
  const { ddlContract, packageId, versionId } = options

  const hasVersionInternalDocument = !!ddlContract?.versionInternalDocumentId

  const operationPackageKey = encodeURIComponent(packageId ?? '')
  const operationPackageVersion = encodeURIComponent(versionId ?? '')

  const {
    data: internalDocuments,
    isLoading: isInternalDocumentsLoading,
    error: internalDocumentsError,
  } = useInternalDocumentsByPackageVersion(operationPackageKey, operationPackageVersion)

  const internalDocumentWithDdlContract = useMemo(
    () => internalDocuments?.find(document => document.id === ddlContract?.versionInternalDocumentId),
    [internalDocuments, ddlContract?.versionInternalDocumentId],
  )

  const {
    data: internalDocumentContent,
    isLoading: isInternalDocumentContentLoading,
    error: internalDocumentContentError,
  } = useInternalDocumentContent(internalDocumentWithDdlContract?.hash)

  const deserializedInternalDocument = useMemo(() => {
    if (!internalDocumentContent) {
      return undefined
    }
    return deserialize(internalDocumentContent, INTERNAL_DOCUMENT_STRING_SYMBOL_MAPPING)
  }, [internalDocumentContent])

  const filteredInternalDocumentForDdlContract = useMemo(() => {
    if (!isDdlApiSpecification(deserializedInternalDocument) || !ddlContract) {
      return undefined
    }
    return filterRealmForDdlContract(deserializedInternalDocument, ddlContract)
  }, [deserializedInternalDocument, ddlContract])

  return useMemo(
    () => ({
      data: filteredInternalDocumentForDdlContract,
      isLoading: isInternalDocumentsLoading || isInternalDocumentContentLoading,
      error: internalDocumentsError || internalDocumentContentError,
      hasInternalDocument: hasVersionInternalDocument,
    }),
    [
      filteredInternalDocumentForDdlContract,
      internalDocumentContentError,
      internalDocumentsError,
      isInternalDocumentContentLoading,
      isInternalDocumentsLoading,
      hasVersionInternalDocument,
    ],
  )
}
