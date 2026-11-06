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

import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import { LoadingButton } from '@mui/lab'
import { Box, Chip, Link, List, ListItem, ListItemText, Typography } from '@mui/material'
import type { ChangeEvent, FC } from 'react'
import { memo, useCallback, useState } from 'react'

import { ButtonWithHint } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ButtonWithHint'
import { ConfirmationDialog } from '@netcracker/qubership-apihub-ui-shared/components/ConfirmationDialog/ConfirmationDialog'
import { DeleteIconMui } from '@netcracker/qubership-apihub-ui-shared/icons/DeleteIconMui'
import { PlusIcon } from '@netcracker/qubership-apihub-ui-shared/icons/PlusIcon'

import { useArticleFiles, useDeleteArticleFile, useUploadArticleFiles } from '@portal/api-hooks/docs-backend/admin/useArticleFiles'
import { useDocsArticleFileUrl } from '@portal/api-hooks/docs-backend/docsRequests'
import type { Article, ArticleFileDto } from '@portal/api-hooks/docs-backend/types'
import { ARTICLE_SCOPE_GENERIC, ARTICLE_VISIBILITY_CORPORATE, ARTICLE_VISIBILITY_PUBLIC } from '@portal/api-hooks/docs-backend/types'
import { useShowSuccessNotification } from '@portal/routes/root/BasePage/Notification'

export type ArticleFilesPanelProps = Readonly<{
  // Admin view of the article (with id)
  article: Article
  compact?: boolean
}>

/** Images and attachments of one article: list, upload, copy URL, delete. Paths are relative to the article;
 * the audience follows the article (public only for generic public articles). */
export const ArticleFilesPanel: FC<ArticleFilesPanelProps> = memo<ArticleFilesPanelProps>(({ article, compact = false }) => {
  const articleId = article.id!
  const [files, isLoading] = useArticleFiles(articleId)
  const [uploadFiles, isUploading] = useUploadArticleFiles()

  const handleFilesChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (selected.length > 0) {
      await uploadFiles({ articleId: articleId, files: selected })
    }
  }, [articleId, uploadFiles])

  return (
    <Box data-testid="ArticleFilesPanel">
      <Box display="flex" alignItems="center" justifyContent="space-between" gap={2} mb={1}>
        {!compact && <Typography variant="button">Files</Typography>}
        <LoadingButton
          variant="outlined"
          size="small"
          component="label"
          loading={isUploading}
          startIcon={<PlusIcon/>}
          data-testid="UploadArticleFilesButton"
        >
          Upload files
          <input type="file" multiple hidden onChange={handleFilesChange}/>
        </LoadingButton>
      </Box>
      {!isLoading && files.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No files. Upload images or attachments and reference them from the Markdown by the copied URL.
        </Typography>
      )}
      <List dense disablePadding>
        {files.map(file => <ArticleFileRow key={file.path} file={file} article={article}/>)}
      </List>
    </Box>
  )
})

/** Audience of an article's files: public only for generic public articles, corporate otherwise. */
function articleFilesVisibility(article: Article): string {
  return article.scope === ARTICLE_SCOPE_GENERIC && article.visibility === ARTICLE_VISIBILITY_PUBLIC
    ? ARTICLE_VISIBILITY_PUBLIC
    : ARTICLE_VISIBILITY_CORPORATE
}

const ArticleFileRow: FC<{ file: ArticleFileDto; article: Article }> = memo(({ file, article }) => {
  const toUrl = useDocsArticleFileUrl()
  const showSuccess = useShowSuccessNotification()
  const [deleteFile, isDeleting] = useDeleteArticleFile()
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const articleId = article.id!
  const url = toUrl(article.slug, file.path)
  const name = file.path

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(url)
    showSuccess({ message: 'File URL copied to clipboard' })
  }, [showSuccess, url])

  return (
    <ListItem
      disableGutters
      secondaryAction={
        <Box display="flex" gap={0.5}>
          <ButtonWithHint size="small" aria-label="Copy URL" hint="Copy URL" startIcon={<ContentCopyOutlinedIcon fontSize="small"/>} onClick={handleCopy} data-testid="CopyFileUrlButton"/>
          <ButtonWithHint size="small" aria-label="Delete file" hint="Delete" disabled={isDeleting} startIcon={<DeleteIconMui fontSize="small"/>} onClick={() => setDeleteDialogOpen(true)} data-testid="DeleteFileButton"/>
        </Box>
      }
      data-testid="ArticleFileRow"
    >
      <ListItemText
        primary={<Link href={url} target="_blank" rel="noreferrer" underline="hover">{name}</Link>}
        secondary={`${file.contentType} · ${formatSize(file.size)}`}
      />
      <Chip size="small" label={articleFilesVisibility(article)} variant="outlined" sx={{ mr: 10 }}/>
      <ConfirmationDialog
        open={isDeleteDialogOpen}
        title={`Delete "${name}"?`}
        message="The article will show a broken link where this file is referenced."
        loading={isDeleting}
        onConfirm={() => { deleteFile({ articleId: articleId, file: file }); setDeleteDialogOpen(false) }}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </ListItem>
  )
})

function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
