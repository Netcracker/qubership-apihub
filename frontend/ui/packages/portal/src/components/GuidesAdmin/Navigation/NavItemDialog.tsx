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
import { LoadingButton } from '@mui/lab'
import { Autocomplete, Box, Button, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from '@mui/material'
import type { FC } from 'react'
import { memo, useCallback, useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { DialogForm } from '@netcracker/qubership-apihub-ui-shared/components/DialogForm'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

import { useSaveNavItem } from '@portal/api-hooks/docs-backend/admin/useNavigationMutations'
import type { Article, NavItemDto, NavItemKind, NavItemRequest, NavSectionDto } from '@portal/api-hooks/docs-backend/types'
import { NAV_ITEM_KIND_GROUP, NAV_ITEM_KIND_GUIDE, NAV_MAX_DEPTH } from '@portal/api-hooks/docs-backend/types'
import { ErrorTextField } from '@portal/components/ErrorTextField'

export type NavItemDraft = Readonly<{
  // undefined = create
  id?: Key
  section: NavSectionDto
  request: NavItemRequest
}>

export type NavItemDialogProps = Readonly<{
  draft: NavItemDraft | null
  // Admin articles of the section's scope (all packages); filtered by the section's package here
  articles: ReadonlyArray<Article>
  // Every section of the edited tree; articles placed anywhere in it are not offered again
  sections: ReadonlyArray<NavSectionDto>
  onClose: () => void
}>

const NO_PARENT = ''

type FormData = {
  kind: NavItemKind
  article: Article | null
  title: string
  parentId: string
  displayOrder: number
}

type ParentOption = Readonly<{ id: Key; title: string; depth: number }>

export const NavItemDialog: FC<NavItemDialogProps> = memo<NavItemDialogProps>(({ draft, articles, sections, onClose }) => {
  const open = !!draft
  const [saveItem, isSaving] = useSaveNavItem()
  const { control, handleSubmit, reset, watch, clearErrors } = useForm<FormData>({
    defaultValues: { kind: NAV_ITEM_KIND_GUIDE, article: null, title: '', parentId: NO_PARENT, displayOrder: 0 },
  })
  const kind = watch('kind')

  // Articles of the section's package that are not placed yet (the edited item's own article stays selectable)
  const articleOptions = useMemo(() => {
    if (!draft) {
      return []
    }
    const placed = new Set(sections.flatMap(section => collectArticleIds(section.items)))
    return articles
      .filter(article => article.scope === draft.section.scope)
      .filter(article => !draft.section.packageId || article.packageId === draft.section.packageId)
      .filter(article => !placed.has(article.id!) || article.id === draft.request.articleId)
  }, [articles, draft, sections])

  // Groups of the section that can take one more level (the edited item and its descendants excluded)
  const parentOptions = useMemo<ParentOption[]>(() => {
    if (!draft) {
      return []
    }
    const subtreeHeight = draft.id ? heightOf(findItem(draft.section.items, draft.id)) : 1
    const options: ParentOption[] = []
    const walk = (items: ReadonlyArray<NavItemDto>, depth: number): void => {
      for (const item of items) {
        if (item.id === draft.id) {
          continue
        }
        if (item.kind === NAV_ITEM_KIND_GROUP && depth + subtreeHeight <= NAV_MAX_DEPTH) {
          options.push({ id: item.id, title: item.title, depth: depth })
        }
        walk(item.children, depth + 1)
      }
    }
    walk(draft.section.items, 1)
    return options
  }, [draft])

  useEffect(() => {
    if (draft) {
      reset({
        kind: draft.request.kind,
        article: articles.find(article => article.id === draft.request.articleId) ?? null,
        title: draft.request.title ?? '',
        parentId: draft.request.parentId ?? NO_PARENT,
        displayOrder: draft.request.displayOrder,
      })
    }
  }, [articles, draft, reset])

  const handleSave = useCallback((data: FormData) => {
    if (!draft) {
      return
    }
    const title = data.title.trim()
    saveItem({
      id: draft.id,
      request: {
        sectionId: draft.section.id,
        parentId: data.parentId || undefined,
        kind: data.kind,
        title: data.kind === NAV_ITEM_KIND_GROUP ? title : (title || undefined),
        articleId: data.kind === NAV_ITEM_KIND_GUIDE ? data.article?.id : undefined,
        displayOrder: data.displayOrder,
      },
    }, onClose)
  }, [draft, onClose, saveItem])

  return (
    <DialogForm open={open} onClose={onClose} onSubmit={handleSubmit(handleSave)} maxWidth="sm">
      <DialogTitle>{draft?.id ? 'Edit Navigation Item' : 'Add Navigation Item'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant="body2" color="text.secondary">Section: {draft?.section.title}</Typography>
        <Controller
          name="kind"
          control={control}
          render={({ field }) => (
            <TextField {...field} select label="Kind" disabled={isSaving || !!draft?.id} data-testid="ItemKindSelect">
              <MenuItem value={NAV_ITEM_KIND_GUIDE}>Guide</MenuItem>
              <MenuItem value={NAV_ITEM_KIND_GROUP}>Group (no page of its own)</MenuItem>
            </TextField>
          )}
        />
        {kind === NAV_ITEM_KIND_GUIDE && (
          <Controller
            name="article"
            control={control}
            rules={{ validate: (value: Article | null) => !!value || 'Guide is required' }}
            render={({ field: { value, onChange }, fieldState }) => (
              <Autocomplete<Article>
                value={value}
                options={articleOptions}
                getOptionLabel={article => article.title}
                isOptionEqualToValue={(option, selected) => option.id === selected.id}
                renderOption={(props, article) => (
                  <li {...props} key={article.id}>
                    <Box>
                      {article.title}
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        {article.slug}{article.published ? '' : ' (unpublished)'}
                      </Typography>
                    </Box>
                  </li>
                )}
                onChange={(_, selected) => onChange(selected)}
                disabled={isSaving}
                renderInput={params => (
                  <TextField {...params} required label="Guide" error={!!fieldState.error} helperText={fieldState.error?.message}/>
                )}
                data-testid="ItemArticleAutocomplete"
              />
            )}
          />
        )}
        <Controller
          name="title"
          control={control}
          rules={{ validate: (value: string) => kind !== NAV_ITEM_KIND_GROUP || !!value.trim() || 'Title is required for a group' }}
          render={({ field, fieldState }) => (
            <ErrorTextField
              field={field}
              fieldState={fieldState}
              clearErrors={clearErrors}
              required={kind === NAV_ITEM_KIND_GROUP}
              label={kind === NAV_ITEM_KIND_GROUP ? 'Title' : 'Title override'}
              helperText={kind === NAV_ITEM_KIND_GUIDE ? 'Leave empty to show the guide title' : undefined}
              disabled={isSaving}
              data-testid="ItemTitleTextField"
            />
          )}
        />
        <Box display="grid" gridTemplateColumns="1fr 120px" gap={2}>
          <Controller
            name="parentId"
            control={control}
            render={({ field }) => (
              <TextField {...field} select label="Parent group" disabled={isSaving} data-testid="ItemParentSelect">
                <MenuItem value={NO_PARENT}>— top level of the section —</MenuItem>
                {parentOptions.map(option => (
                  <MenuItem key={option.id} value={option.id} sx={{ pl: 2 + (option.depth - 1) * 2 }}>{option.title}</MenuItem>
                ))}
              </TextField>
            )}
          />
          <Controller
            name="displayOrder"
            control={control}
            render={({ field }) => (
              <TextField {...field} type="number" label="Order" disabled={isSaving} onChange={event => field.onChange(Number(event.target.value))} data-testid="ItemOrderTextField"/>
            )}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Box display="flex" gap={1}>
          <LoadingButton variant="contained" type="submit" loading={isSaving} data-testid="SaveItemButton">Save</LoadingButton>
          <Button variant="outlined" onClick={onClose} data-testid="CancelButton">Cancel</Button>
        </Box>
      </DialogActions>
    </DialogForm>
  )
})

function collectArticleIds(items: ReadonlyArray<NavItemDto>): Key[] {
  return items.flatMap(item => [...(item.articleId ? [item.articleId] : []), ...collectArticleIds(item.children)])
}

function findItem(items: ReadonlyArray<NavItemDto>, id: Key): NavItemDto | undefined {
  for (const item of items) {
    if (item.id === id) {
      return item
    }
    const found = findItem(item.children, id)
    if (found) {
      return found
    }
  }
  return undefined
}

function heightOf(item: NavItemDto | undefined): number {
  return item ? 1 + Math.max(0, ...item.children.map(heightOf)) : 1
}
