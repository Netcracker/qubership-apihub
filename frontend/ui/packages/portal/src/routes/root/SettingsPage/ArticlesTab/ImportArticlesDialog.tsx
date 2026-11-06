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
import { Box, Button, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'
import type { ChangeEvent, FC } from 'react'
import { memo, useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { DialogForm } from '@netcracker/qubership-apihub-ui-shared/components/DialogForm'

import { useImportArticles } from '@portal/api-hooks/docs-backend/admin/useImportExport'

export type ImportArticlesDialogProps = Readonly<{
  open: boolean
  onClose: () => void
}>

export const ImportArticlesDialog: FC<ImportArticlesDialogProps> = memo<ImportArticlesDialogProps>(({ open, onClose }) => {
  const [importArticles, isImporting, isImported] = useImportArticles()
  const [archive, setArchive] = useState<File | undefined>()
  const { handleSubmit: handleFormSubmit } = useForm()

  useEffect(() => {
    if (open) {
      setArchive(undefined)
    }
  }, [open])

  useEffect(() => {
    if (isImported) {
      onClose()
    }
  }, [isImported, onClose])

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setArchive(event.target.files?.[0])
  }, [])

  const handleSubmit = useCallback(() => {
    archive && importArticles(archive)
  }, [archive, importArticles])

  return (
    <DialogForm open={open} onClose={onClose} onSubmit={handleFormSubmit(handleSubmit)}>
      <DialogTitle>Import Articles</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Upload a zip archive with <code>articles.yaml</code>, Markdown files and <code>articles/&lt;slug&gt;/**</code>,
          in the format produced by Export. Existing articles with the same slug are replaced.
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <Button variant="outlined" component="label" data-testid="ChooseArchiveButton">
            Choose archive
            <input type="file" accept=".zip,application/zip" hidden onChange={handleFileChange}/>
          </Button>
          <Typography variant="body2" noWrap>{archive?.name ?? 'No file selected'}</Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <LoadingButton variant="contained" type="submit" loading={isImporting} disabled={!archive} data-testid="ImportButton">
          Import
        </LoadingButton>
        <Button variant="outlined" onClick={onClose} disabled={isImporting} data-testid="CancelButton">
          Cancel
        </Button>
      </DialogActions>
    </DialogForm>
  )
})
