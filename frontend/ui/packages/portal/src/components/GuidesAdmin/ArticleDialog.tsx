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
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material'
import type { ChangeEvent, FC } from 'react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { DialogForm } from '@netcracker/qubership-apihub-ui-shared/components/DialogForm'
import { LabelsAutocomplete } from '@netcracker/qubership-apihub-ui-shared/components/LabelsAutocomplete'
import { MarkdownViewer } from '@netcracker/qubership-apihub-ui-shared/components/SpecificationDialog/MarkdownViewer'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { Package } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { PACKAGE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'

import { useApihubDocumentsRelay, useApihubVersionsRelay } from '@portal/api-hooks/docs-backend/admin/useApihubRelays'
import { useUploadArticleFiles } from '@portal/api-hooks/docs-backend/admin/useArticleFiles'
import { useCreateArticle, useUpdateArticle } from '@portal/api-hooks/docs-backend/admin/useArticleMutations'
import type { Article, ArticleRequest, ArticleScope, ArticleVisibility } from '@portal/api-hooks/docs-backend/types'
import {
  ARTICLE_SCOPE_GENERIC,
  ARTICLE_SCOPE_PACKAGE,
  ARTICLE_VISIBILITY_CORPORATE,
  ARTICLE_VISIBILITY_PUBLIC,
} from '@portal/api-hooks/docs-backend/types'
import { ErrorTextField } from '@portal/components/ErrorTextField'
import { parseMarkdownArticle, toArticleSlug } from '@portal/utils/markdown-articles'
import { ArticleFilesPanel } from './ArticleFilesPanel'

const ALL_VERSIONS = ''

type ArticleFormData = {
  // Derived from the title; never typed by the user
  slug: string
  markdownFileName: string
  title: string
  subtitle: string
  scope: ArticleScope
  visibility: ArticleVisibility
  bodyMd: string
  packageObject: Package | null
  version: string
  documentSlug: string
  labels: string[]
  displayOrder: number
  published: boolean
}

const DEFAULT_FORM_VALUES: ArticleFormData = {
  slug: '',
  markdownFileName: '',
  title: '',
  subtitle: '',
  scope: ARTICLE_SCOPE_GENERIC,
  visibility: ARTICLE_VISIBILITY_PUBLIC,
  bodyMd: '',
  packageObject: null,
  version: ALL_VERSIONS,
  documentSlug: '',
  labels: [],
  displayOrder: 0,
  published: false,
}

export type ArticleDialogProps = Readonly<{
  open: boolean
  // null = create a new article
  article: Article | null
  existingSlugs: ReadonlyArray<string>
  // Fixed scope of the created articles
  scope: ArticleScope
  // Fixed package of package-scoped articles
  packageId?: Key
  onClose: () => void
}>

export const ArticleDialog: FC<ArticleDialogProps> = memo<ArticleDialogProps>(({ open, article, existingSlugs, scope: fixedScope, packageId, onClose }) => {
  const isEdit = !!article
  const [createArticle, isCreating, isCreated, createdArticle] = useCreateArticle()
  const [updateArticle, isUpdating] = useUpdateArticle()
  const [uploadFiles, isUploadingFiles] = useUploadArticleFiles()
  const isSaving = isCreating || isUpdating || isUploadingFiles
  // Files chosen while creating: uploaded right after the article exists
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const uploadedForRef = useRef<string | null>(null)

  const { control, handleSubmit, reset, watch, setValue, clearErrors } = useForm<ArticleFormData>({
    defaultValues: DEFAULT_FORM_VALUES,
  })
  const scope = watch('scope')
  const bodyMd = watch('bodyMd')
  const title = watch('title')
  const slug = watch('slug')
  const markdownFileName = watch('markdownFileName')
  const packageObject = watch('packageObject')
  const version = watch('version')
  const [bodyError, setBodyError] = useState<string | undefined>()

  const [relayedVersions, isVersionsLoading] = useApihubVersionsRelay(scope === ARTICLE_SCOPE_PACKAGE ? packageObject?.key : undefined)
  // Articles are bound to version names; APIHUB relays "<version>@<revision>" keys
  const versions = useMemo(
    () => [...new Set(relayedVersions.map(item => item.version.split('@')[0]))],
    [relayedVersions],
  )
  // Documents are listed for the chosen version, or for the latest one when the article applies to all versions
  const documentsVersion = version || versions[0]
  const [documents, isDocumentsLoading] = useApihubDocumentsRelay(
    scope === ARTICLE_SCOPE_PACKAGE ? packageObject?.key : undefined,
    documentsVersion,
  )

  useEffect(() => {
    if (open) {
      setBodyError(undefined)
      setPendingFiles([])
      uploadedForRef.current = null
      reset(article ? toFormData(article) : toDefaultFormData(fixedScope, packageId))
    }
  }, [open, article, reset, fixedScope, packageId])

  // The slug is calculated from the title; an existing article keeps its slug (it is part of its URLs)
  useEffect(() => {
    if (!isEdit) {
      setValue('slug', toArticleSlug(title))
    }
  }, [isEdit, setValue, title])

  useEffect(() => {
    if (!open || !isCreated || !createdArticle?.id || uploadedForRef.current === createdArticle.id) {
      return
    }
    uploadedForRef.current = createdArticle.id
    const finish = async (): Promise<void> => {
      if (pendingFiles.length > 0) {
        await uploadFiles({ articleId: createdArticle.id!, files: pendingFiles })
      }
      onClose()
    }
    finish()
  }, [createdArticle, isCreated, onClose, open, pendingFiles, uploadFiles])

  const slugError = useMemo(() => {
    if (!slug) {
      return title ? 'The title does not produce a valid slug' : undefined
    }
    const isTaken = existingSlugs.some(existing => existing === slug && existing !== article?.slug)
    return isTaken ? `Article with slug "${slug}" already exists` : undefined
  }, [article?.slug, existingSlugs, slug, title])

  const handleMarkdownFile = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }
    const markdown = await file.text()
    const header = parseMarkdownArticle(markdown, file.name)
    setBodyError(undefined)
    setValue('bodyMd', markdown)
    setValue('markdownFileName', file.name)
    setValue('title', header.title)
    if (header.subtitle) {
      setValue('subtitle', header.subtitle)
    }
  }, [setValue])

  const handlePendingFiles = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? [])
    event.target.value = ''
    setPendingFiles(current => [...current, ...selected.filter(file => !current.some(existing => existing.name === file.name))])
  }, [])

  const handleSave = useCallback((data: ArticleFormData) => {
    if (slugError || !data.slug) {
      return
    }
    if (data.scope === ARTICLE_SCOPE_GENERIC && !data.bodyMd) {
      setBodyError('Upload a Markdown file with the article body')
      return
    }
    const request = toRequest(data)
    if (article?.id) {
      updateArticle({ id: article.id, request: request }, onClose)
    } else {
      createArticle(request)
    }
  }, [article?.id, createArticle, onClose, slugError, updateArticle])

  return (
    <DialogForm open={open} onClose={onClose} onSubmit={handleSubmit(handleSave)} maxWidth="md" width="900px">
      <DialogTitle>{isEdit ? 'Edit Article' : 'Create Article'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant="button">Main info</Typography>
        <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
          <Controller
            name="title"
            control={control}
            rules={{ required: 'Title is required' }}
            render={({ field, fieldState }) => (
              <ErrorTextField field={field} fieldState={fieldState} clearErrors={clearErrors} required label="Title" disabled={isSaving} data-testid="TitleTextField"/>
            )}
          />
          <TextField
            label="Slug"
            value={slug}
            InputProps={{ readOnly: true }}
            error={!!slugError}
            helperText={slugError ?? (isEdit ? 'Part of the guide URL, kept on edit' : 'Calculated from the title')}
            data-testid="SlugTextField"
          />
        </Box>
        <Controller
          name="subtitle"
          control={control}
          render={({ field, fieldState }) => (
            <ErrorTextField field={field} fieldState={fieldState} clearErrors={clearErrors} label="Subtitle" disabled={isSaving} data-testid="SubtitleTextField"/>
          )}
        />
        <Box display="grid" gridTemplateColumns={scope === ARTICLE_SCOPE_GENERIC ? '1fr 1fr' : '1fr'} gap={2}>
          {scope === ARTICLE_SCOPE_GENERIC && (
            <Controller
              name="visibility"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Audience" disabled={isSaving} data-testid="VisibilitySelect">
                  <MenuItem value={ARTICLE_VISIBILITY_PUBLIC}>Public (anonymous allowed)</MenuItem>
                  <MenuItem value={ARTICLE_VISIBILITY_CORPORATE}>Corporate (authenticated only)</MenuItem>
                </TextField>
              )}
            />
          )}
          <Controller
            name="displayOrder"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="number"
                label="Order"
                disabled={isSaving}
                onChange={event => field.onChange(Number(event.target.value))}
                data-testid="OrderTextField"
              />
            )}
          />
        </Box>
        <Controller
          name="labels"
          control={control}
          render={({ field: { value, onChange } }) => (
            <LabelsAutocomplete value={value} onChange={(_, labels) => onChange(labels)} disabled={isSaving}/>
          )}
        />

        {scope === ARTICLE_SCOPE_PACKAGE && (
          <>
            <Typography variant="button" sx={{ mt: 1 }}>APIHUB document</Typography>
            <Typography variant="body2" color="text.secondary">
              The guide body is a Markdown document published in the package version. Only its metadata is stored here.
            </Typography>
            <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
              <Controller
                name="version"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <Autocomplete
                    options={[ALL_VERSIONS, ...versions]}
                    getOptionLabel={option => (option === ALL_VERSIONS ? 'All versions' : option)}
                    value={value}
                    loading={isVersionsLoading}
                    disabled={isSaving || !packageObject}
                    onChange={(_, selected) => {
                      onChange(selected ?? ALL_VERSIONS)
                      setValue('documentSlug', '')
                    }}
                    renderInput={params => <TextField {...params} label="Version"/>}
                    data-testid="ArticleVersionSelect"
                  />
                )}
              />
              <Controller
                name="documentSlug"
                control={control}
                rules={{ required: 'Document is required' }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    select
                    required
                    label="Markdown document"
                    disabled={isSaving || !packageObject || isDocumentsLoading}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message ?? (documents.length === 0 && packageObject && !isDocumentsLoading ? 'No markdown documents in this version' : undefined)}
                    data-testid="ArticleDocumentSelect"
                  >
                    {documents.map(document => (
                      <MenuItem key={document.slug} value={document.slug}>{document.title} ({document.slug})</MenuItem>
                    ))}
                    {field.value && !documents.some(document => document.slug === field.value) && (
                      <MenuItem value={field.value}>{field.value}</MenuItem>
                    )}
                  </TextField>
                )}
              />
            </Box>
          </>
        )}

        {scope === ARTICLE_SCOPE_GENERIC && (
          <>
            <Typography variant="button" sx={{ mt: 1 }}>Markdown</Typography>
            <Box display="flex" alignItems="center" gap={2}>
              <Button variant="outlined" component="label" disabled={isSaving} sx={{ whiteSpace: 'nowrap', flexShrink: 0 }} data-testid="UploadMarkdownButton">
                {bodyMd ? 'Replace Markdown file' : 'Upload Markdown file'}
                <input type="file" accept=".md,.markdown,text/markdown" hidden onChange={handleMarkdownFile}/>
              </Button>
              <Typography variant="body2" color={bodyError ? 'error' : 'text.secondary'}>
                {bodyError ?? (markdownFileName || undefined) ?? (isEdit ? 'The current body is kept unless a file is uploaded' : 'The title and subtitle are taken from the file')}
              </Typography>
            </Box>
            {bodyMd && (
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2, maxHeight: 420, overflow: 'auto' }} data-testid="BodyPreview">
                <MarkdownViewer value={bodyMd}/>
              </Box>
            )}
          </>
        )}

        <Typography variant="button" sx={{ mt: 1 }}>Files</Typography>
        {isEdit && article
          ? <ArticleFilesPanel article={article} compact/>
          : (
            <Box>
              <Button variant="outlined" size="small" component="label" disabled={isSaving} data-testid="ChoosePendingFilesButton">
                Add files
                <input type="file" multiple hidden onChange={handlePendingFiles}/>
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {pendingFiles.length > 0
                  ? `${pendingFiles.length} file(s) will be uploaded after the article is created: ${pendingFiles.map(file => file.name).join(', ')}`
                  : 'Images and attachments; they are uploaded once the article is created and referenced by URL from the Markdown.'}
              </Typography>
            </Box>
          )}

        <Controller
          name="published"
          control={control}
          render={({ field: { value, onChange } }) => (
            <FormControlLabel
              control={<Checkbox checked={value} onChange={event => onChange(event.target.checked)} disabled={isSaving}/>}
              label="Published"
              data-testid="PublishedCheckbox"
            />
          )}
        />
      </DialogContent>
      <DialogActions>
        <LoadingButton variant="contained" type="submit" loading={isSaving} data-testid="SaveArticleButton">
          {isEdit ? 'Save' : 'Create'}
        </LoadingButton>
        <Button variant="outlined" onClick={onClose} disabled={isSaving} data-testid="CancelButton">
          Cancel
        </Button>
      </DialogActions>
    </DialogForm>
  )
})

function toDefaultFormData(scope: ArticleScope, packageId?: Key): ArticleFormData {
  return {
    ...DEFAULT_FORM_VALUES,
    scope: scope,
    packageObject: scope === ARTICLE_SCOPE_PACKAGE && packageId ? toPackageStub(packageId) : null,
  }
}

function toPackageStub(packageId: Key): Package {
  return { key: packageId, alias: packageId, name: packageId, kind: PACKAGE_KIND } as Package
}

function toFormData(article: Article): ArticleFormData {
  return {
    slug: article.slug,
    markdownFileName: '',
    title: article.title,
    subtitle: article.subtitle ?? '',
    scope: article.scope,
    visibility: article.visibility ?? ARTICLE_VISIBILITY_PUBLIC,
    bodyMd: article.bodyMd ?? '',
    packageObject: article.packageId
      ? toPackageStub(article.packageId)
      : null,
    version: article.version ?? ALL_VERSIONS,
    documentSlug: article.documentSlug ?? '',
    labels: [...article.labels],
    displayOrder: article.displayOrder,
    published: article.published ?? false,
  }
}

function toRequest(data: ArticleFormData): ArticleRequest {
  const common = {
    slug: data.slug.trim(),
    title: data.title.trim(),
    subtitle: data.subtitle.trim() || undefined,
    scope: data.scope,
    labels: data.labels,
    displayOrder: data.displayOrder,
    published: data.published,
  }
  return data.scope === ARTICLE_SCOPE_GENERIC
    ? { ...common, visibility: data.visibility, bodyMd: data.bodyMd }
    : {
      ...common,
      packageId: data.packageObject?.key,
      version: data.version || undefined,
      documentSlug: data.documentSlug,
    }
}
