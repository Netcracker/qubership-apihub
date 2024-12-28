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
import { Box } from '@mui/material'
import { useProjectVersionContent } from '../root/useProjectVersionContent'
import { useVersionSearchParam } from '../root/useVersionSearchParam'
import { useProject } from '../root/useProject'
import { includes } from '@netcracker/qubership-apihub-ui-shared/utils/filters'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { SearchBar } from '@netcracker/qubership-apihub-ui-shared/components/SearchBar'
import {
  CONTENT_PLACEHOLDER_AREA,
  NO_SEARCH_RESULTS,
  Placeholder,
} from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import type { ApiDocument } from '@apihub/components/ApiDocumentList'
import { ApiDocumentList } from '@apihub/components/ApiDocumentList'
import type { PublishedSpec } from '@apihub/entities/published-specs'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { DOC_SPEC_VIEW_MODE } from '@netcracker/qubership-apihub-ui-shared/components/SpecViewToggler'

export const Documents: FC = memo(() => {
  const [version] = useVersionSearchParam()
  const [project] = useProject()
  const packageKey = project?.packageKey

  const [versionContent, isLoading] = useProjectVersionContent({
    projectKey: packageKey,
    versionKey: version ?? undefined,
  })

  const [searchValue, setSearchState] = useState('')
  const specs = useMemo(
    () => versionContent?.specs?.filter(({ key, title }) => includes([key, title], searchValue)) ?? [],
    [versionContent?.specs, searchValue],
  )

  const apiDocuments = useMemo(
    () => toApiDocuments(versionContent?.specs, packageKey!, version!),
    [packageKey, version, versionContent?.specs],
  )

  if (isLoading) {
    return (
      <LoadingIndicator/>
    )
  }

  return (
    <>
      <Box sx={{ width: '250px', my: 2 }}>
        <SearchBar onValueChange={setSearchState}/>
      </Box>
      <Placeholder
        invisible={isNotEmpty(specs)}
        area={CONTENT_PLACEHOLDER_AREA}
        message={searchValue ? NO_SEARCH_RESULTS : 'No documentation'}
      >
        <ApiDocumentList
          isLoading={isLoading}
          value={apiDocuments}
        />
      </Placeholder>
    </>
  )
})

function toApiDocuments(specs: ReadonlyArray<PublishedSpec> | undefined, projectKey: Key, version: Key): ApiDocument[] {
  if (!specs) {
    return []
  }
  return specs.map(({ title, type, key, slug }) => ({
    title: title,
    type: type,
    subtitle: key,
    url: {
      pathname: `/portal/projects/${encodeURIComponent(projectKey!)}/${encodeURIComponent(version!)}/${encodeURIComponent(slug)}`,
      search: `mode=${DOC_SPEC_VIEW_MODE}`,
    },
  }))
}
