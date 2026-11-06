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
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import { Box, Chip, IconButton, Paper, Tooltip, Typography } from '@mui/material'
import type { FC } from 'react'
import { memo, useState } from 'react'

import { ConfirmationDialog } from '@netcracker/qubership-apihub-ui-shared/components/ConfirmationDialog/ConfirmationDialog'
import { DeleteIconMui } from '@netcracker/qubership-apihub-ui-shared/icons/DeleteIconMui'
import { EditIcon } from '@netcracker/qubership-apihub-ui-shared/icons/EditIcon'
import { PlusIcon } from '@netcracker/qubership-apihub-ui-shared/icons/PlusIcon'

import { useDeleteNavItem, useDeleteNavSection, useMoveNavItem } from '@portal/api-hooks/docs-backend/admin/useNavigationMutations'
import type { NavItemDto, NavSectionDto } from '@portal/api-hooks/docs-backend/types'
import { NAV_ITEM_KIND_GROUP, NAV_MAX_DEPTH } from '@portal/api-hooks/docs-backend/types'

export type NavigationSectionCardProps = Readonly<{
  section: NavSectionDto
  canMoveUp: boolean
  canMoveDown: boolean
  onMove: (delta: 1 | -1) => void
  onEdit: (section: NavSectionDto) => void
  onAddItem: (section: NavSectionDto, parent?: NavItemDto) => void
  onEditItem: (section: NavSectionDto, item: NavItemDto) => void
}>

export const NavigationSectionCard: FC<NavigationSectionCardProps> = memo<NavigationSectionCardProps>(({
  section,
  canMoveUp,
  canMoveDown,
  onMove,
  onEdit,
  onAddItem,
  onEditItem,
}) => {
  const [deleteSection, isDeletingSection] = useDeleteNavSection()
  const [deleteItem, isDeletingItem] = useDeleteNavItem()
  const [moveItem, isMovingItem] = useMoveNavItem()
  const [sectionToDelete, setSectionToDelete] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<NavItemDto | null>(null)

  const renderItems = (items: ReadonlyArray<NavItemDto>, depth: number): JSX.Element[] => items.map((item, index) => {
    const isGroup = item.kind === NAV_ITEM_KIND_GROUP
    return (
      <Box key={item.id} sx={{ pl: (depth - 1) * 3 }}>
        <Box
          display="flex"
          alignItems="center"
          gap={1}
          sx={{ py: 0.5, borderBottom: '1px solid', borderColor: 'divider', '&:hover .hoverable': { visibility: 'visible' } }}
          data-testid={isGroup ? 'NavEditorGroupRow' : 'NavEditorItemRow'}
        >
          <Chip label={item.kind} size="small" variant="outlined" sx={{ width: 64 }}/>
          <Typography sx={{ flex: 1 }} noWrap>
            {item.title}
            {!isGroup && item.slug && (
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>{item.slug}</Typography>
            )}
            {!isGroup && item.dangling && (
              <Typography component="span" variant="caption" color="error" sx={{ ml: 1 }}>article missing</Typography>
            )}
            {!isGroup && !item.dangling && item.published === false && (
              <Typography component="span" variant="caption" color="warning.main" sx={{ ml: 1 }}>unpublished</Typography>
            )}
          </Typography>
          <Box display="flex" alignItems="center" className="hoverable" visibility="hidden">
            <IconButton size="small" disabled={index === 0 || isMovingItem} aria-label="Move up" onClick={() => moveItem({ siblings: items, index: index, delta: -1 })}>
              <ArrowUpwardIcon fontSize="small"/>
            </IconButton>
            <IconButton size="small" disabled={index === items.length - 1 || isMovingItem} aria-label="Move down" onClick={() => moveItem({ siblings: items, index: index, delta: 1 })}>
              <ArrowDownwardIcon fontSize="small"/>
            </IconButton>
            {isGroup && depth < NAV_MAX_DEPTH && (
              <Tooltip title="Add child">
                <IconButton size="small" aria-label="Add child" onClick={() => onAddItem(section, item)} data-testid="AddChildItemButton">
                  <PlusIcon/>
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Edit">
              <IconButton size="small" aria-label="Edit item" onClick={() => onEditItem(section, item)} data-testid="EditItemButton">
                <EditIcon/>
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" aria-label="Delete item" disabled={isDeletingItem} onClick={() => setItemToDelete(item)} data-testid="DeleteItemButton">
                <DeleteIconMui fontSize="small"/>
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        {renderItems(item.children, depth + 1)}
      </Box>
    )
  })

  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-testid="NavEditorSection">
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <Typography variant="h3" sx={{ flex: 1 }} noWrap>
          {section.title}
          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>order {section.displayOrder}</Typography>
        </Typography>
        <IconButton size="small" disabled={!canMoveUp} aria-label="Move section up" onClick={() => onMove(-1)}><ArrowUpwardIcon fontSize="small"/></IconButton>
        <IconButton size="small" disabled={!canMoveDown} aria-label="Move section down" onClick={() => onMove(1)}><ArrowDownwardIcon fontSize="small"/></IconButton>
        <Tooltip title="Add item">
          <IconButton size="small" aria-label="Add item" onClick={() => onAddItem(section)} data-testid="AddItemButton"><PlusIcon/></IconButton>
        </Tooltip>
        <Tooltip title="Edit section">
          <IconButton size="small" aria-label="Edit section" onClick={() => onEdit(section)} data-testid="EditSectionButton"><EditIcon/></IconButton>
        </Tooltip>
        <Tooltip title="Delete section">
          <IconButton size="small" aria-label="Delete section" disabled={isDeletingSection} onClick={() => setSectionToDelete(true)} data-testid="DeleteSectionButton">
            <DeleteIconMui fontSize="small"/>
          </IconButton>
        </Tooltip>
      </Box>
      {section.items.length === 0 && <Typography variant="body2" color="text.secondary">No items.</Typography>}
      {renderItems(section.items, 1)}

      <ConfirmationDialog
        open={sectionToDelete}
        title={`Delete "${section.title}" section and its items?`}
        loading={isDeletingSection}
        onConfirm={() => { deleteSection(section); setSectionToDelete(false) }}
        onCancel={() => setSectionToDelete(false)}
      />
      <ConfirmationDialog
        open={!!itemToDelete}
        title={`Delete "${itemToDelete?.title}"${itemToDelete?.children.length ? ' and its children' : ''}?`}
        loading={isDeletingItem}
        onConfirm={() => { if (itemToDelete) { deleteItem(itemToDelete) } setItemToDelete(null) }}
        onCancel={() => setItemToDelete(null)}
      />
    </Paper>
  )
})
