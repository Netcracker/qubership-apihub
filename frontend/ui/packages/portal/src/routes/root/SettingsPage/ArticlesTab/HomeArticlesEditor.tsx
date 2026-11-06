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


import { Autocomplete, Box, Button, Chip, IconButton, List, ListItem, ListItemText, TextField, Tooltip, Typography } from '@mui/material'
import type { FC } from 'react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'

import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { ArrowDown } from '@netcracker/qubership-apihub-ui-shared/icons/ArrowDown'
import { ArrowUp } from '@netcracker/qubership-apihub-ui-shared/icons/ArrowUp'
import { DeleteIcon } from '@netcracker/qubership-apihub-ui-shared/icons/DeleteIcon'
import { PlusIcon } from '@netcracker/qubership-apihub-ui-shared/icons/PlusIcon'

import { useAdminArticles } from '@portal/api-hooks/docs-backend/admin/useAdminArticles'
import { useAdminHomeArticles, useSetHomeArticles } from '@portal/api-hooks/docs-backend/admin/useAdminHomeArticles'
import type { Article } from '@portal/api-hooks/docs-backend/types'
import { ARTICLE_SCOPE_GENERIC } from '@portal/api-hooks/docs-backend/types'

/**
 * Editor of the home page "Things worth reading first" list: an ordered selection of generic articles.
 * Edits are local until Save; the whole list is replaced at once.
 */
export const HomeArticlesEditor: FC = memo(() => {
  const [configured, isConfiguredLoading] = useAdminHomeArticles()
  const [articles, isArticlesLoading] = useAdminArticles(ARTICLE_SCOPE_GENERIC)
  const [saveHomeArticles, isSaving] = useSetHomeArticles()

  const configuredIds = useMemo(() => configured.map(item => item.articleId), [configured])
  const [selectedIds, setSelectedIds] = useState<ReadonlyArray<Key>>(configuredIds)
  const [candidate, setCandidate] = useState<Article | null>(null)

  // Reset local edits whenever the saved list changes (initial load, save, invalidation).
  useEffect(() => setSelectedIds(configuredIds), [configuredIds])

  const articlesById = useMemo(() => new Map(articles.map(article => [article.id, article])), [articles])
  const candidates = useMemo(() => articles.filter(article => !!article.id && !selectedIds.includes(article.id)), [articles, selectedIds])
  const dirty = useMemo(() => selectedIds.join('\0') !== configuredIds.join('\0'), [selectedIds, configuredIds])

  const move = useCallback((index: number, delta: number) => {
    setSelectedIds(ids => {
      const target = index + delta
      if (target < 0 || target >= ids.length) {
        return ids
      }
      const next = [...ids]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }, [])

  const remove = useCallback((index: number) => setSelectedIds(ids => ids.filter((_, i) => i !== index)), [])

  const add = useCallback(() => {
    if (candidate?.id) {
      setSelectedIds(ids => [...ids, candidate.id!])
      setCandidate(null)
    }
  }, [candidate])

  if (isConfiguredLoading || isArticlesLoading) {
    return <LoadingIndicator/>
  }

  return (
    <Box display="flex" flexDirection="column" gap={2} maxWidth={720} data-testid="HomeArticlesEditor">
      <Typography variant="body2" color="text.secondary">
        Guides shown on the home page under "Things worth reading first", in this order.
        When the list is empty, the home page shows the first 9 generic guides.
      </Typography>

      <List dense disablePadding sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
        {selectedIds.length === 0 && (
          <ListItem>
            <ListItemText secondary="No guides selected"/>
          </ListItem>
        )}
        {selectedIds.map((id, index) => {
          const article = articlesById.get(id)
          const saved = configured.find(item => item.articleId === id)
          const title = article?.title ?? saved?.title ?? id
          const slug = article?.slug ?? saved?.slug ?? ''
          const published = article ? article.published : saved?.published
          return (
            <ListItem
              key={id}
              divider={index < selectedIds.length - 1}
              data-testid="HomeArticleRow"
              secondaryAction={
                <Box display="flex" gap={0.5}>
                  <Tooltip title="Move up">
                    <span>
                      <IconButton size="small" disabled={index === 0} onClick={() => move(index, -1)} data-testid="MoveUpButton"><ArrowUp/></IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Move down">
                    <span>
                      <IconButton size="small" disabled={index === selectedIds.length - 1} onClick={() => move(index, 1)} data-testid="MoveDownButton"><ArrowDown/></IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Remove">
                    <IconButton size="small" onClick={() => remove(index)} data-testid="RemoveButton"><DeleteIcon/></IconButton>
                  </Tooltip>
                </Box>
              }
            >
              <Typography variant="body2" color="text.secondary" sx={{ width: 28, flexShrink: 0 }}>{index + 1}.</Typography>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1}>
                    {title}
                    {published === false && <Chip size="small" label="Unpublished" color="warning" variant="outlined"/>}
                  </Box>
                }
                secondary={slug}
              />
            </ListItem>
          )
        })}
      </List>

      <Box display="flex" gap={1} alignItems="center">
        <Autocomplete<Article>
          value={candidate}
          options={candidates}
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
          onChange={(_, value) => setCandidate(value)}
          renderInput={params => <TextField {...params} size="small" placeholder="Add a generic guide"/>}
          sx={{ flex: 1 }}
          data-testid="HomeArticleAutocomplete"
        />
        <Button variant="outlined" startIcon={<PlusIcon/>} disabled={!candidate} onClick={add} data-testid="AddHomeArticleButton">
          Add
        </Button>
      </Box>

      <Box display="flex" gap={1}>
        <Button
          variant="contained"
          disabled={!dirty || isSaving}
          onClick={() => saveHomeArticles({ articleIds: selectedIds })}
          data-testid="SaveHomeArticlesButton"
        >
          Save
        </Button>
        <Button variant="outlined" disabled={!dirty || isSaving} onClick={() => setSelectedIds(configuredIds)} data-testid="ResetHomeArticlesButton">
          Reset
        </Button>
      </Box>
    </Box>
  )
})
