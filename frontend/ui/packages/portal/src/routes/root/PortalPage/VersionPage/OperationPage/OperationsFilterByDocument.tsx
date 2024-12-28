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

import type { FC } from 'react'
import React, { memo, useEffect, useState } from 'react'
import { Autocomplete, Box, InputLabel, TextField } from '@mui/material'
import { useDocuments } from '../useDocuments'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { Document } from '@apihub/entities/documents'
import { EMPTY_DOC } from '@apihub/entities/documents'
import { OptionItem } from '@netcracker/qubership-apihub-ui-shared/components/OptionItem'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

export type OperationsFilterByDocumentProps = {
  labelText?: string
  packageKey: Key
  versionKey: Key
  apiTypeFilter: ApiType
  defaultDocumentSlug?: Key
  onDocumentSelect: (document: Document | null) => void
}

const INPUT_FIELD_ID = 'filter-by-document'
const DEFAULT_FILTER_BY_DOCUMENT_LABEL = 'Filter by Document'

export const OperationsFilterByDocument: FC<OperationsFilterByDocumentProps> =
  memo<OperationsFilterByDocumentProps>((props) => {
    const {
      labelText,
      packageKey,
      versionKey,
      defaultDocumentSlug,
      apiTypeFilter,
      onDocumentSelect,
    } = props
    const { documents, isLoading: isDocumentsLoading } = useDocuments({
      packageKey: packageKey,
      versionKey: versionKey,
      apiType: apiTypeFilter,
    })

    const [selectedDocument, setSelectedDocument] = useState<Document>(EMPTY_DOC)

    useEffect(() => {
      if (isDocumentsLoading) {
        return
      }
      const newSelectedDocument = defaultDocumentSlug ? documents.find(doc => doc.slug === defaultDocumentSlug) : EMPTY_DOC
      newSelectedDocument ? setSelectedDocument(newSelectedDocument) : onDocumentSelect(EMPTY_DOC)
    }, [defaultDocumentSlug, documents, isDocumentsLoading, onDocumentSelect])

    return (
      <Box sx={{ my: '4px' }}>
        <InputLabel htmlFor={INPUT_FIELD_ID}>
          {labelText ?? DEFAULT_FILTER_BY_DOCUMENT_LABEL}
        </InputLabel>
        <Autocomplete
          autoSelect
          loading={isDocumentsLoading}
          options={documents}
          value={selectedDocument}
          renderOption={(props, { key, title }: Document) => {
            return (
              <OptionItem key={key} props={props} title={title!}/>
            )
          }}
          getOptionLabel={(option) => (option as Document).title ?? ''}
          isOptionEqualToValue={(option, value) => option.key === value.key}
          onChange={(_, option) => onDocumentSelect(option)}
          renderInput={(params) => (
            <TextField
              {...params}
              id={INPUT_FIELD_ID}
              placeholder="Document"
              sx={{ '& .MuiInputBase-root': { pt: '1px', pb: '1px' } }}
            />
          )}
          data-testid="DocumentFilter"
        />
      </Box>
    )
  })
