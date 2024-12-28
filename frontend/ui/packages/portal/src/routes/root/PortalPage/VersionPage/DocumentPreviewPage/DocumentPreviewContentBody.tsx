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
import React, { memo } from 'react'
import { Box } from '@mui/material'
import { useParams } from 'react-router-dom'
import { useDocument } from '../useDocument'
import { usePackageParamsWithRef } from '../../usePackageParamsWithRef'
import { useSchemaViewMode } from './useSchemaViewMode'
import { useSpecViewMode } from './useSpecViewMode'
import { RawSpecView } from '@netcracker/qubership-apihub-ui-shared/components/SpecificationDialog/RawSpecView'
import { DETAILED_SCHEMA_VIEW_MODE } from '@netcracker/qubership-apihub-ui-shared/entities/schema-view-mode'
import { useSpecItemUriHashParam } from '@netcracker/qubership-apihub-ui-shared/hooks/hashparams/useSpecItemUriHashParam'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import {
  DOC_OPERATION_VIEW_MODE,
  RAW_OPERATION_VIEW_MODE,
} from '@netcracker/qubership-apihub-ui-shared/entities/operation-view-mode'
import { DocSpecView } from '@apihub/components/DocSpecView'
import { JSON_FILE_FORMAT } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import { toFormattedJsonString } from '@netcracker/qubership-apihub-ui-shared/utils/strings'

export type DocumentPreviewContentBodyProps = {
  apiDescriptionDocument: string
  isLoading: boolean
}

export const DocumentPreviewContentBody: FC<DocumentPreviewContentBodyProps> = memo<DocumentPreviewContentBodyProps>(props => {
  const {
    apiDescriptionDocument,
    isLoading,
  } = props

  const { documentId } = useParams()
  const [docPackageKey, docPackageVersion] = usePackageParamsWithRef()
  const [{ type }] = useDocument(docPackageKey, docPackageVersion, documentId)
  const [mode] = useSpecViewMode()
  const [schemaViewMode = DETAILED_SCHEMA_VIEW_MODE] = useSchemaViewMode()
  const [specItemUri] = useSpecItemUriHashParam()

  let operationContentElement
  if (isLoading) {
    operationContentElement = <LoadingIndicator/>
  } else {
    operationContentElement = (
      <>
        {mode === DOC_OPERATION_VIEW_MODE && (
          <DocSpecView
            value={apiDescriptionDocument}
            type={type}
            format={JSON_FILE_FORMAT}
            sidebarEnabled={true}
            schemaViewMode={schemaViewMode}
            selectedUri={specItemUri}
          />
        )}
        {mode === RAW_OPERATION_VIEW_MODE && (
          <RawSpecView
            value={toFormattedJsonString(apiDescriptionDocument)}
            extension=".json"
            type={type}
          />
        )}
      </>
    )
  }

  return (
    <Box sx={{ height: '100%', overflow: 'scroll', pl: 3, pr: 2, position: 'relative' }}>
      {operationContentElement}
    </Box>
  )
})
