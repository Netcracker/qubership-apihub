/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { FC } from 'react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Box } from '@mui/material'
import { DocumentList } from './DocumentList'
import { useParams } from 'react-router-dom'
import { useDocuments } from '../useDocuments'
import { usePackageKind } from '../../usePackageKind'
import { useFilteredPackageRefs, usePackageRef } from '../../../useRefPackage'
import { useSetCurrentDocumentsList } from './CurrentDocumentsListProvider'
import { useNavigation } from '../../../../NavigationProvider'
import { REF_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { DASHBOARD_KIND, PACKAGE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import type { PackageReference } from '@netcracker/qubership-apihub-ui-shared/entities/version-references'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import {
  DashboardPackageSelector,
} from '@netcracker/qubership-apihub-ui-shared/components/OperationFilters/DashboardPackageSelector'
import { SearchBar } from '@netcracker/qubership-apihub-ui-shared/components/SearchBar'

export const DocNavigation: FC = memo(() => {
  const { packageId: packageKey, versionId: versionKey } = useParams()

  const refKey = useSearchParam(REF_SEARCH_PARAM)
  const [packageRef] = usePackageRef(packageKey!, versionKey!, refKey)

  const { navigateToDocuments } = useNavigation()

  const [kind, isPackageKindLoading] = usePackageKind()
  const isDashboard: boolean | null = useMemo(() => kind === DASHBOARD_KIND ?? null, [kind])

  const selectedPackage = useMemo(() => {
    if (isPackageKindLoading) {
      return null
    }

    if (isDashboard) {
      return packageRef ? { packageKey: packageRef.key!, versionKey: packageRef.version! } : null
    } else {
      return { packageKey: packageKey!, versionKey: versionKey! }
    }
  }, [isDashboard, isPackageKindLoading, packageKey, packageRef, versionKey])

  const [searchValue, setSearchValue] = useState<string>('')

  const { documents, isInitialLoading } = useDocuments({
    packageKey: selectedPackage?.packageKey,
    versionKey: selectedPackage?.versionKey,
    enabled: selectedPackage !== null,
  })
  const filteredDocuments = useMemo(() => {
    return documents.filter(document => {
      const lowerCaseTitle = document.title.toLowerCase()
      const lowerCaseValue = searchValue.toLowerCase()
      return lowerCaseTitle.includes(lowerCaseValue) || lowerCaseValue.includes(lowerCaseTitle)
    })
  }, [documents, searchValue])

  const setCurrentDocumentsList = useSetCurrentDocumentsList()
  useEffect(() => {
    setCurrentDocumentsList(filteredDocuments)
  }, [filteredDocuments, setCurrentDocumentsList])

  const selectDashboardPackage = useCallback(
    (packageRef: PackageReference | null) => {
      if (packageRef && selectedPackage && packageRef.key === selectedPackage?.packageKey) {
        return
      }

      navigateToDocuments({
        packageKey: packageKey!,
        versionKey: versionKey!,
        search: {
          [REF_SEARCH_PARAM]: { value: packageRef?.key },
        },
      })
    },
    [navigateToDocuments, packageKey, selectedPackage, versionKey],
  )

  const { data: references, isLoading: isReferencesLoading } = useFilteredPackageRefs({
    packageKey: packageKey!,
    version: versionKey!,
    kind: PACKAGE_KIND,
    showAllDescendants: true,
    showUndeleted: true,
  })

  if (isPackageKindLoading) {
    return (
      <LoadingIndicator/>
    )
  }

  return (
    <Box height="100%" display="contents">
      {isDashboard && (
        <Box sx={{
          borderTop: '1px solid #D9D9D9',
          borderBottom: '1px solid #D9D9D9',
          p: 2,
        }}>
          <DashboardPackageSelector
            defaultPackageKey={refKey}
            onSelectPackage={selectDashboardPackage}
            labelText={SELECT_PACKAGE_TEXT}
            references={references}
            isLoading={isReferencesLoading}
          />
        </Box>
      )}
      <Box sx={{ p: 2 }}>
        <SearchBar value={searchValue} onValueChange={setSearchValue} data-testid="SearchDocuments"/>
      </Box>
      <DocumentList
        isLoading={isInitialLoading}
        documents={filteredDocuments}
      />
    </Box>
  )
})

const SELECT_PACKAGE_TEXT = 'Select Package'
