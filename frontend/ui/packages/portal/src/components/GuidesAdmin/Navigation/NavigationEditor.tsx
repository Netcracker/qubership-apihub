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
import { Box, Button, Typography } from '@mui/material'
import type { FC } from 'react'
import { memo, useCallback, useState } from 'react'

import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { PlusIcon } from '@netcracker/qubership-apihub-ui-shared/icons/PlusIcon'

import { useAdminArticles } from '@portal/api-hooks/docs-backend/admin/useAdminArticles'
import { useAdminNavigation } from '@portal/api-hooks/docs-backend/admin/useAdminNavigation'
import { useMoveNavSection } from '@portal/api-hooks/docs-backend/admin/useNavigationMutations'
import type { ArticleScope, NavItemDto, NavSectionDto } from '@portal/api-hooks/docs-backend/types'
import { ARTICLE_SCOPE_GENERIC } from '@portal/api-hooks/docs-backend/types'
import type { NavItemDraft } from './NavItemDialog'
import { NavItemDialog } from './NavItemDialog'
import { NavigationSectionCard } from './NavigationSectionCard'
import type { NavSectionDraft } from './NavSectionDialog'
import { NavSectionDialog } from './NavSectionDialog'

export type NavigationEditorProps = Readonly<{
  scope: ArticleScope
  // Required for the package scope: the package whose tree is edited
  packageId?: Key
}>

/** Editor of the guides navigation tree of one scope: the generic tree or the tree of one package. */
export const NavigationEditor: FC<NavigationEditorProps> = memo<NavigationEditorProps>(({ scope, packageId }) => {
  const [sections, isLoading] = useAdminNavigation(scope, packageId)
  const [articles] = useAdminArticles(scope, packageId)
  const [moveSection, isMovingSection] = useMoveNavSection()

  const [sectionDraft, setSectionDraft] = useState<NavSectionDraft | null>(null)
  const [itemDraft, setItemDraft] = useState<NavItemDraft | null>(null)

  const ready = scope === ARTICLE_SCOPE_GENERIC || !!packageId

  const handleAddSection = useCallback(() => {
    setSectionDraft({ request: { scope: scope, packageId: packageId, title: '', displayOrder: sections.length + 1 } })
  }, [packageId, scope, sections.length])

  const handleEditSection = useCallback((section: NavSectionDto) => {
    setSectionDraft({ id: section.id, request: { scope: section.scope, packageId: section.packageId, title: section.title, displayOrder: section.displayOrder } })
  }, [])

  const handleAddItem = useCallback((section: NavSectionDto, parent?: NavItemDto) => {
    const siblings = parent ? parent.children : section.items
    setItemDraft({
      section: section,
      request: { sectionId: section.id, parentId: parent?.id, kind: 'guide', displayOrder: siblings.length + 1 },
    })
  }, [])

  const handleEditItem = useCallback((section: NavSectionDto, item: NavItemDto) => {
    setItemDraft({
      id: item.id,
      section: section,
      request: {
        sectionId: item.sectionId,
        parentId: item.parentId,
        kind: item.kind,
        title: item.kind === 'group' ? item.title : item.titleOverride,
        articleId: item.articleId,
        displayOrder: item.displayOrder,
      },
    })
  }, [])

  return (
    <Box display="flex" flexDirection="column" gap={2} sx={{ overflow: 'auto', maxHeight: 'calc(100vh - 230px)', pr: 1 }} data-testid="NavigationEditor">
      <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
        <Box flex={1}/>
        <Button
          variant="contained"
          startIcon={<PlusIcon/>}
          disabled={!ready}
          onClick={handleAddSection}
          data-testid="AddSectionButton"
        >
          Add Section
        </Button>
      </Box>

      <Typography variant="body2" color="text.secondary">
        Sections and groups structure the guides sidebar. Guides that are not placed here are listed in a trailing
        "Other" section; unpublished guides and empty groups are hidden from readers.
      </Typography>

      {!ready && <Typography color="text.secondary">No package selected.</Typography>}
      {ready && isLoading && <LoadingIndicator/>}
      {ready && !isLoading && sections.length === 0 && <Typography color="text.secondary">No sections yet.</Typography>}
      {ready && sections.map((section, index) => (
        <NavigationSectionCard
          key={section.id}
          section={section}
          canMoveUp={index > 0 && !isMovingSection}
          canMoveDown={index < sections.length - 1 && !isMovingSection}
          onMove={delta => moveSection({ sections: sections, index: index, delta: delta })}
          onEdit={handleEditSection}
          onAddItem={handleAddItem}
          onEditItem={handleEditItem}
        />
      ))}

      <NavSectionDialog draft={sectionDraft} onClose={() => setSectionDraft(null)}/>
      <NavItemDialog draft={itemDraft} articles={articles} sections={sections} onClose={() => setItemDraft(null)}/>
    </Box>
  )
})
