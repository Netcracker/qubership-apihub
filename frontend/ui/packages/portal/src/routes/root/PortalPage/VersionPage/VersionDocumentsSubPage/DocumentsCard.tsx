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
import { memo, useMemo, useState } from 'react'
import { DocumentsTab } from './DocumentsTab'
import { useParams } from 'react-router-dom'
import { useDocument } from '../useDocument'
import { usePackageParamsWithRef } from '../../usePackageParamsWithRef'
import { DocumentsTabHeader } from './DocumentsTabHeader'
import { SelectedSubPageProvider } from './SelectedSubPageProvider'
import { useCurrentDocumentsList } from './CurrentDocumentsListProvider'
import { usePackageKind } from '../../usePackageKind'
import { SelectedDocumentContext } from './SelectedDocumentProvider'
import type { Document } from '@apihub/entities/documents'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { REF_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { DASHBOARD_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { CONTENT_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'

export const DocumentsCard: FC = memo(() => {
  const { documentId } = useParams()
  const refKey = useSearchParam(REF_SEARCH_PARAM)
  const [packageKind] = usePackageKind()
  const isDashboard = packageKind === DASHBOARD_KIND
  const [docPackageKey, docPackageVersion] = usePackageParamsWithRef()

  const [searchValue, setSearchValue] = useState<string>('')

  const [document, isLoading] = useDocument(docPackageKey, docPackageVersion, documentId)

  const currentDocumentsList = useCurrentDocumentsList()
  const filteredDocument = useMemo(() => {
    return {
      ...document,
      operations: document.operations.filter(operation => {
        const lowerCaseTitle = operation.title.toLowerCase()
        const lowerCaseValue = searchValue.toLowerCase()
        return lowerCaseTitle.includes(lowerCaseValue) || lowerCaseValue.includes(lowerCaseTitle)
      }),
    } as Document
  }, [document, searchValue])
  const { key, format, title, type, version, slug } = document
  const packageRef = currentDocumentsList.find(doc => doc.key === key)?.packageRef

  if (isDashboard && !refKey) {
    return (
      <Placeholder
        invisible={!!documentId}
        area={CONTENT_PLACEHOLDER_AREA}
        message="Please select a package"
      />
    )
  }

  if (!documentId) {
    return (
      <Placeholder
        invisible={!!documentId}
        area={CONTENT_PLACEHOLDER_AREA}
        message="No document selected"
      />
    )
  }

  return (
    <SelectedDocumentContext.Provider value={filteredDocument}>
      <SelectedSubPageProvider>
        <BodyCard
          header={(
            <DocumentsTabHeader
              title={title}
              version={version}
              slug={slug}
              type={type}
              format={format}
              searchValue={searchValue}
              setSearchValue={setSearchValue}
              isLoading={isLoading}
            />
          )}
          subheader={isDashboard ? packageRef?.name : ''}
          body={
            <DocumentsTab
              format={format}
              type={type}
              isDocumentLoading={isLoading}
            />
          }
        />
      </SelectedSubPageProvider>
    </SelectedDocumentContext.Provider>
  )
})
