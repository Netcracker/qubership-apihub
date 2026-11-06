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

import { Box, Button } from '@mui/material'
import type { FC } from 'react'
import { memo, useCallback, useState } from 'react'

import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { Toggler } from '@netcracker/qubership-apihub-ui-shared/components/Toggler'
import { PlusIcon } from '@netcracker/qubership-apihub-ui-shared/icons/PlusIcon'

import { useAdminArticles } from '@portal/api-hooks/docs-backend/admin/useAdminArticles'
import type { Article } from '@portal/api-hooks/docs-backend/types'
import { ARTICLE_SCOPE_PACKAGE } from '@portal/api-hooks/docs-backend/types'
import { ArticleDialog } from '@portal/components/GuidesAdmin/ArticleDialog'
import { ArticlesTable } from '@portal/components/GuidesAdmin/ArticlesTable'
import { NavigationEditor } from '@portal/components/GuidesAdmin/Navigation/NavigationEditor'
import type { PackageSettingsTabProps } from '../package-settings'

const ARTICLES_VIEW = 'articles'
const NAVIGATION_VIEW = 'navigation'
type View = typeof ARTICLES_VIEW | typeof NAVIGATION_VIEW
const VIEWS: View[] = [ARTICLES_VIEW, NAVIGATION_VIEW]
const VIEW_TITLES: Record<View, string> = {
  [ARTICLES_VIEW]: 'Articles',
  [NAVIGATION_VIEW]: 'Navigation',
}

/** Guides administration of one package: its package-scoped articles and their navigation tree. */
export const GuidesPackageSettingsTab: FC<PackageSettingsTabProps> = memo<PackageSettingsTabProps>(({ packageObject }) => {
  const packageId = packageObject.key
  const [articles, isLoading] = useAdminArticles(ARTICLE_SCOPE_PACKAGE, packageId)
  const [view, setView] = useState<View>(ARTICLES_VIEW)
  const [editedArticle, setEditedArticle] = useState<Article | null>(null)
  const [isArticleDialogOpen, setArticleDialogOpen] = useState(false)

  const handleCreate = useCallback(() => {
    setEditedArticle(null)
    setArticleDialogOpen(true)
  }, [])

  const handleEdit = useCallback((article: Article) => {
    setEditedArticle(article)
    setArticleDialogOpen(true)
  }, [])

  return (
    <BodyCard
      header={
        <Box display="flex" gap={2} alignItems="center" height="54px">
          <Toggler<View> mode={view} modes={VIEWS} modeToText={VIEW_TITLES} onChange={setView}/>
        </Box>
      }
      action={
        view === ARTICLES_VIEW && (
          <Button variant="contained" startIcon={<PlusIcon/>} onClick={handleCreate} data-testid="AddArticleButton">
            Add Article
          </Button>
        )
      }
      body={
        <>
          {view === NAVIGATION_VIEW && <NavigationEditor scope={ARTICLE_SCOPE_PACKAGE} packageId={packageId}/>}
          {view === ARTICLES_VIEW && <ArticlesTable articles={articles} isLoading={isLoading} onEdit={handleEdit}/>}
          <ArticleDialog
            open={isArticleDialogOpen}
            article={editedArticle}
            existingSlugs={articles.map(article => article.slug)}
            scope={ARTICLE_SCOPE_PACKAGE}
            packageId={packageId}
            onClose={() => setArticleDialogOpen(false)}
          />
        </>
      }
    />
  )
})
