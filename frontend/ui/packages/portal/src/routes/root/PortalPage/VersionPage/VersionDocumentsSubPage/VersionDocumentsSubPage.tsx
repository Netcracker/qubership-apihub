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
import { memo } from 'react'
import { useParams } from 'react-router-dom'
import { DocumentsCard } from './DocumentsCard'
import { DocumentsSidebar } from './DocumentsSidebar'
import { CurrentDocumentsListProvider } from './CurrentDocumentsListProvider'
import { DocumentNotificationsDialog } from './DocumentNotificationsDialog/DocumentNotificationsDialog'
import { PageLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayout'
import { PAGE_TITLES } from '@portal/routes/pageTitles'
import { useVersionPageTitle } from '@portal/routes/useVersionPageTitle'
import { useDocument } from '../useDocument'
import { usePackageParamsWithRef } from '../../usePackageParamsWithRef'

export const VersionDocumentsSubPage: FC = memo(() => {
  const { documentId } = useParams()
  const [docPackageKey, docPackageVersion] = usePackageParamsWithRef()
  const [{ title: documentTitle }] = useDocument(docPackageKey, docPackageVersion, documentId)
  useVersionPageTitle(PAGE_TITLES.documents(documentTitle))

  return (
    <CurrentDocumentsListProvider>
      <PageLayout
        navigation={<DocumentsSidebar/>}
        body={<DocumentsCard/>}
        nestedPage
        data-testid="DocumentsTab"
      />
      <DocumentNotificationsDialog/>
    </CurrentDocumentsListProvider>
  )
})
