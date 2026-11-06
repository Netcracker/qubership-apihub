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

import { Box, Chip, Typography } from '@mui/material'
import type { FC } from 'react'
import { memo } from 'react'
import { useParams } from 'react-router-dom'

import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { CONTENT_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { MarkdownViewer } from '@netcracker/qubership-apihub-ui-shared/components/SpecificationDialog/MarkdownViewer'

import { useArticle } from '@portal/api-hooks/docs-backend/useArticle'
import { GuideBreadcrumbs } from '@portal/components/GuidesNavigation/GuideBreadcrumbs'
import { GuidePrevNext } from '@portal/components/GuidesNavigation/GuidePrevNext'
import { toArticleVersion, usePackageGuidesNavigation } from './usePackageGuidesNavigation'

export const GuidesCard: FC = memo(() => {
  const { versionId, guideSlug } = useParams()
  const [article, isLoading] = useArticle({ slug: guideSlug, version: toArticleVersion(versionId) })
  const { context } = usePackageGuidesNavigation()

  if (!guideSlug) {
    return <Placeholder invisible={false} area={CONTENT_PLACEHOLDER_AREA} message="No guide selected"/>
  }

  if (isLoading) {
    return <LoadingIndicator/>
  }

  if (!article) {
    return <Placeholder invisible={false} area={CONTENT_PLACEHOLDER_AREA} message="Guide not found"/>
  }

  return (
    <BodyCard
      header={
        <Box minWidth={0}>
          {context && context.breadcrumbs.length > 1 && (
            <GuideBreadcrumbs context={context} title={article.title} sx={{ fontSize: 12, mb: 0.5 }}/>
          )}
          <Box display="flex" alignItems="center" gap={1.5} minWidth={0}>
            <Typography variant="h3" noWrap>{article.title}</Typography>
            {article.labels.map(label => <Chip key={label} size="small" label={label}/>)}
          </Box>
        </Box>
      }
      subheader={article.subtitle}
      body={
        <Box height="100%" overflow="auto" data-testid="GuideBody">
          <MarkdownViewer value={article.bodyMd ?? ''}/>
          <GuidePrevNext context={context} sx={{ mt: 3 }}/>
        </Box>
      }
    />
  )
})
