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
import { memo } from 'react'
import { useParams } from 'react-router-dom'
import { Box } from '@mui/material'
import { usePublishedDocumentRaw } from '../usePublishedDocumentRaw'
import { usePackageParamsWithRef } from '../../usePackageParamsWithRef'
import { UnsupportedView } from './UnsupportedView'
import { JsonSchemaViewer } from '@netcracker/qubership-apihub-ui-shared/components/JsonSchemaViewer'
import type { FileFormat } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import { JSON_FILE_FORMAT, MD_FILE_FORMAT, YAML_FILE_FORMAT } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { MarkdownViewer } from '@netcracker/qubership-apihub-ui-shared/components/SpecificationDialog/MarkdownViewer'
import { isFastJsonSchema, toJsonSchema } from '@netcracker/qubership-apihub-ui-shared/utils/specifications'

export type FormatViewerProps = {
  format: FileFormat
}

export const FormatViewer: FC<FormatViewerProps> = memo<FormatViewerProps>(({ format }) => {
  const { documentId } = useParams()
  const [docPackageKey, docPackageVersion] = usePackageParamsWithRef()

  const [raw, isLoading] = usePublishedDocumentRaw({
    packageKey: docPackageKey,
    versionKey: docPackageVersion,
    slug: documentId!,
    enabled: !!docPackageKey,
  })

  if (isLoading) {
    return <LoadingIndicator/>
  }

  if (format === MD_FILE_FORMAT) {
    return (
      <Box height="100%" overflow="scroll">
        <MarkdownViewer value={raw}/>
      </Box>
    )
  }

  // todo think about one place for calculate document type
  if (format === JSON_FILE_FORMAT || format === YAML_FILE_FORMAT) {
    const schema = toJsonSchema(raw)
    if (isFastJsonSchema(schema)) {
      return <JsonSchemaViewer schema={schema as object}/>
    }
  }

  return <UnsupportedView documentId={documentId}/>
})

