import { useMemo } from 'react'

import { deserialize } from '@netcracker/qubership-apihub-api-unifier'
import type { Realm } from '@netcracker/qubership-apihub-ddlapi'

import type { DdlContractEntity } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-ddl'
import type { DdlEntityChangeEntry } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-ddl-changelog'
import type { PackageKey, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

import { INTERNAL_DOCUMENT_STRING_SYMBOL_MAPPING } from '@apihub/utils/internal-documents/constants'
import { isDdlApiSpecification } from '@apihub/utils/internal-documents/type-guards'

import type { QueryResultWithNoInternalDocument } from './shared-types'
import { useComparisonInternalDocumentContent } from './useComparisonInternalDocumentContent'
import { useComparisonInternalDocumentsByPackageVersion } from './useComparisonInternalDocumentsByPackageVersion'

type Options = {
  previousDdlContract: DdlContractEntity | undefined
  currentDdlContract: DdlContractEntity | undefined
  ddlChanges: ReadonlyArray<DdlEntityChangeEntry> | undefined
  currentPackageId: PackageKey | undefined
  currentVersionId: VersionKey | undefined
  previousPackageId: PackageKey | undefined
  previousVersionId: VersionKey | undefined
}

export function useComparedDdlContracts(
  options: Options,
): QueryResultWithNoInternalDocument<Realm, Error> {
  const {
    previousDdlContract,
    currentDdlContract,
    ddlChanges,
    currentPackageId,
    currentVersionId,
    previousPackageId,
    previousVersionId,
  } = options

  const {
    data: listComparisonInternalDocumentsMetadata,
    isLoading: loadingListComparisonInternalDocumentsMetadata,
    error: errorComparisonInternalDocumentsMetadata,
  } = useComparisonInternalDocumentsByPackageVersion({
    currentPackageId,
    currentVersionId,
    previousPackageId,
    previousVersionId,
  })

  const changeRelatedToComparedDdlContracts = useMemo(() => {
    const currentDdlEntityId = currentDdlContract?.ddlEntityId
    const previousDdlEntityId = previousDdlContract?.ddlEntityId
    return (ddlChanges ?? []).find(change => {
      if (!currentDdlEntityId && previousDdlEntityId) {
        return change.previousDdlEntityData?.ddlEntityId === previousDdlEntityId
      }
      if (currentDdlEntityId && !previousDdlEntityId) {
        return change.ddlEntityData?.ddlEntityId === currentDdlEntityId
      }
      if (currentDdlEntityId && previousDdlEntityId) {
        return (
          change.ddlEntityData?.ddlEntityId === currentDdlEntityId &&
          change.previousDdlEntityData?.ddlEntityId === previousDdlEntityId
        )
      }
      return false
    })
  }, [currentDdlContract?.ddlEntityId, previousDdlContract?.ddlEntityId, ddlChanges])

  const hasComparisonInternalDocument = !!changeRelatedToComparedDdlContracts?.comparisonInternalDocumentId

  const comparisonInternalDocumentMetadata = useMemo(
    () =>
      listComparisonInternalDocumentsMetadata?.find(
        document => document.id === changeRelatedToComparedDdlContracts?.comparisonInternalDocumentId,
      ),
    [listComparisonInternalDocumentsMetadata, changeRelatedToComparedDdlContracts?.comparisonInternalDocumentId],
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

  const comparisonInternalDocument = useMemo(() => {
    if (!isDdlApiSpecification(deserializedComparisonInternalDocument)) {
      return undefined
    }
    return deserializedComparisonInternalDocument
  }, [deserializedComparisonInternalDocument])

  return useMemo(
    () => ({
      data: comparisonInternalDocument,
      isLoading: loadingRawComparisonInternalDocument || loadingListComparisonInternalDocumentsMetadata,
      error: errorComparisonInternalDocument || errorComparisonInternalDocumentsMetadata,
      hasInternalDocument: hasComparisonInternalDocument,
    }),
    [
      errorComparisonInternalDocument,
      errorComparisonInternalDocumentsMetadata,
      comparisonInternalDocument,
      loadingRawComparisonInternalDocument,
      loadingListComparisonInternalDocumentsMetadata,
      hasComparisonInternalDocument,
    ],
  )
}
