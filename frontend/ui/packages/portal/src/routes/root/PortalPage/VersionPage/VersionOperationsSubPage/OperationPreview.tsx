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
import React, { memo, useMemo } from 'react'
import { OperationView } from '../OperationContent/OperationView/OperationView'
import { Box, Divider } from '@mui/material'
import { OperationViewModeSelector } from '../OperationViewModeSelector'
import type { OperationData } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type { OperationViewMode } from '@netcracker/qubership-apihub-ui-shared/entities/operation-view-mode'
import { OPERATION_PREVIEW_VIEW_MODES } from '@netcracker/qubership-apihub-ui-shared/entities/operation-view-mode'
import type { SchemaViewMode } from '@netcracker/qubership-apihub-ui-shared/entities/schema-view-mode'
import {
  useIsDocOperationViewMode,
  useIsRawOperationViewMode,
} from '@netcracker/qubership-apihub-ui-shared/hooks/operations/useOperationMode'
import { getFileDetails } from '@apihub/utils/file-details'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { NAVIGATION_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { SMALL_TOOLBAR_SIZE, Toolbar } from '@netcracker/qubership-apihub-ui-shared/components/Toolbar'
import { ToolbarTitle } from '@netcracker/qubership-apihub-ui-shared/components/ToolbarTitle'
import { OperationTitleWithMeta } from '@netcracker/qubership-apihub-ui-shared/components/Operations/OperationTitleWithMeta'
import { RawSpecView } from '@netcracker/qubership-apihub-ui-shared/components/SpecificationDialog/RawSpecView'
import { normalizeOpenApiDocument } from '@netcracker/qubership-apihub-ui-shared/utils/normalize'
import { YAML_FILE_VIEW_MODE } from '@netcracker/qubership-apihub-ui-shared/entities/file-format-view'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { removeComponents } from '@netcracker/qubership-apihub-api-processor'

export type OperationPreviewProps = {
  apiType: ApiType
  changedOperation: OperationData | undefined
  changedOperationContent: string
  isLoading: boolean
  mode: OperationViewMode
  schemaViewMode: SchemaViewMode | undefined
  productionMode?: boolean
}

// First Order Component //
export const OperationPreview: FC<OperationPreviewProps> = memo<OperationPreviewProps>((props) => {
  const {
    apiType, changedOperation, changedOperationContent,
    isLoading, mode, schemaViewMode, productionMode,
  } = props

  const isDocViewMode = useIsDocOperationViewMode(mode)
  const isRawViewMode = useIsRawOperationViewMode(mode)

  const {
    values: [rawContent],
    extension,
    type,
  } = getFileDetails(apiType, YAML_FILE_VIEW_MODE, changedOperationContent)

  const mergedDocument = useMemo(() => {
    const existingOperation = removeComponents(changedOperation?.data)
    return existingOperation
      ? normalizeOpenApiDocument(existingOperation, changedOperation?.data)
      : undefined
  }, [changedOperation])

  if (isLoading) {
    return (
      <LoadingIndicator/>
    )
  } else if (!changedOperation?.operationKey) {
    return (
      <Placeholder
        invisible={!!changedOperationContent}
        area={NAVIGATION_PLACEHOLDER_AREA}
        message="No content"
        testId="NoContentPlaceholder"
      />
    )
  }

  return (
    <Box height="inherit" display="grid" gridTemplateRows="auto 1fr" data-testid="OperationPreview">
      <Box>
        <Toolbar
          size={SMALL_TOOLBAR_SIZE}
          header={
            <ToolbarTitle
              value={
                <OperationTitleWithMeta
                  onlyTitle
                  operation={changedOperation}
                  badgeText={changedOperation.deprecated ? 'Deprecated' : undefined}
                />
              }
            />
          }
          action={<OperationViewModeSelector modes={OPERATION_PREVIEW_VIEW_MODES}/>}
        />
        <Divider orientation="horizontal" variant="fullWidth"/>
      </Box>

      <Box>
        {isDocViewMode && (
          <OperationView
            apiType={apiType}
            schemaViewMode={schemaViewMode}
            hideTryIt
            hideExamples
            noHeading
            productionMode={productionMode}
            comparisonMode={false}
            mergedDocument={mergedDocument}
          />
        )}
        {isRawViewMode && (
          <RawSpecView
            value={rawContent}
            extension={extension}
            type={type}
          />
        )}
      </Box>
    </Box>
  )
})
