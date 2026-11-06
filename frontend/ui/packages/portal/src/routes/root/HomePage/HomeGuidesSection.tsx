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

import { Box, Button, Skeleton } from '@mui/material'
import type { FC } from 'react'
import { memo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { useDocsBackendEnabled } from '@netcracker/qubership-apihub-ui-shared/features/system-extensions/useSystemExtensions'

import { useArticles } from '@portal/api-hooks/docs-backend/useArticles'
import { useHomeArticles } from '@portal/api-hooks/docs-backend/useHomeArticles'
import { GUIDES_PAGE_PATH } from '../../../routes'
import { GuideCard } from '../GuidesPage/GuideCard'
import { HomeSection } from './HomeSection'

const HOME_GUIDES_LIMIT = 9

/**
 * "Things worth reading first": the generic guides an administrator configured for the home page, in that order.
 * When nothing is configured (or nothing configured is visible), falls back to the first generic guides.
 * Rendered only when the extension is registered and the current principal may read at least one guide.
 */
export const HomeGuidesSection: FC = memo(() => {
  const navigate = useNavigate()
  const docsBackendEnabled = useDocsBackendEnabled()
  const [configured, isConfiguredLoading] = useHomeArticles(docsBackendEnabled)
  const useFallback = docsBackendEnabled && !isConfiguredLoading && configured.length === 0
  const [fallback, isFallbackLoading] = useArticles({ limit: HOME_GUIDES_LIMIT, enabled: useFallback })
  const guides = useFallback ? fallback : configured
  const isLoading = isConfiguredLoading || isFallbackLoading

  const handleAllGuides = useCallback(() => navigate(GUIDES_PAGE_PATH), [navigate])

  if (!docsBackendEnabled || (!isLoading && guides.length === 0)) {
    return null
  }

  return (
    <HomeSection
      eyebrow="Start here"
      title="Things worth reading first"
      subtitle="The guides that apply wherever you integrate, in the order they are worth reading."
      action={<Button variant="text" onClick={handleAllGuides} data-testid="AllGuidesButton">All guides →</Button>}
      testId="HomeGuidesSection"
    >
      <Box display="grid" gap={2} gridTemplateColumns="repeat(auto-fill, minmax(280px, 1fr))">
        {isLoading
          ? Array.from({ length: 3 }, (_, index) => <Skeleton key={index} variant="rounded" height={96}/>)
          : guides.map(guide => <GuideCard key={guide.slug} article={guide}/>)}
      </Box>
    </HomeSection>
  )
})
