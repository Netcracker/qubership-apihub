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

import PublishOutlinedIcon from '@mui/icons-material/PublishOutlined'
import UnpublishedOutlinedIcon from '@mui/icons-material/UnpublishedOutlined'
import { Box } from '@mui/material'
import type { FC } from 'react'
import { memo, useCallback, useState } from 'react'

import { ButtonWithHint } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ButtonWithHint'
import { ConfirmationDialog } from '@netcracker/qubership-apihub-ui-shared/components/ConfirmationDialog/ConfirmationDialog'
import { DeleteIconMui } from '@netcracker/qubership-apihub-ui-shared/icons/DeleteIconMui'
import { EditIcon } from '@netcracker/qubership-apihub-ui-shared/icons/EditIcon'

import { useDeleteArticle, useSetArticlePublished } from '@portal/api-hooks/docs-backend/admin/useArticleMutations'
import type { Article } from '@portal/api-hooks/docs-backend/types'

export type ArticleActionsProps = Readonly<{
  article: Article
  onEdit: (article: Article) => void
}>

export const ArticleActions: FC<ArticleActionsProps> = memo<ArticleActionsProps>(({ article, onEdit }) => {
  const [deleteArticle, isDeleting] = useDeleteArticle()
  const [setPublished, isPublishing] = useSetArticlePublished()
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const handleDelete = useCallback(() => {
    deleteArticle(article)
    setDeleteDialogOpen(false)
  }, [article, deleteArticle])

  const handleTogglePublished = useCallback(
    () => setPublished({ article: article, published: !article.published }),
    [article, setPublished],
  )

  return (
    <>
      <Box display="flex" gap={1} visibility="hidden" className="hoverable" alignItems="center">
        <ButtonWithHint
          size="small"
          aria-label="Edit article"
          hint="Edit"
          startIcon={<EditIcon/>}
          onClick={() => onEdit(article)}
          data-testid="EditArticleButton"
        />
        <ButtonWithHint
          size="small"
          aria-label={article.published ? 'Unpublish article' : 'Publish article'}
          hint={article.published ? 'Unpublish' : 'Publish'}
          disabled={isPublishing}
          startIcon={article.published ? <UnpublishedOutlinedIcon fontSize="small"/> : <PublishOutlinedIcon fontSize="small"/>}
          onClick={handleTogglePublished}
          data-testid="TogglePublishedButton"
        />
        <ButtonWithHint
          size="small"
          aria-label="Delete article"
          hint="Delete"
          disabled={isDeleting}
          startIcon={<DeleteIconMui fontSize="small"/>}
          onClick={() => setDeleteDialogOpen(true)}
          data-testid="DeleteArticleButton"
        />
      </Box>
      <ConfirmationDialog
        open={isDeleteDialogOpen}
        title={`Delete "${article.title}" article?`}
        loading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </>
  )
})
