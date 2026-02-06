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

import { getFileDetails } from '@apihub/utils/file-details'
import { Box, Divider } from '@mui/material'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import {
  OperationTitleWithMeta,
} from '@netcracker/qubership-apihub-ui-shared/components/Operations/OperationTitleWithMeta'
import { NAVIGATION_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { RawSpecView } from '@netcracker/qubership-apihub-ui-shared/components/SpecificationDialog/RawSpecView'
import { SMALL_TOOLBAR_SIZE, Toolbar } from '@netcracker/qubership-apihub-ui-shared/components/Toolbar'
import { ToolbarTitle } from '@netcracker/qubership-apihub-ui-shared/components/ToolbarTitle'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { YAML_FILE_VIEW_MODE } from '@netcracker/qubership-apihub-ui-shared/entities/file-format-view'
import type { OperationViewMode } from '@netcracker/qubership-apihub-ui-shared/entities/operation-view-mode'
import { OPERATION_PREVIEW_VIEW_MODES } from '@netcracker/qubership-apihub-ui-shared/entities/operation-view-mode'
import { checkIfGraphQLOperation, type OperationData } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type { SchemaViewMode } from '@netcracker/qubership-apihub-ui-shared/entities/schema-view-mode'
import {
  useIsDocOperationViewMode,
  useIsRawOperationViewMode,
} from '@netcracker/qubership-apihub-ui-shared/hooks/operations/useOperationMode'
import type { FC } from 'react'
import { memo, useMemo } from 'react'
import { OperationView } from '../OperationContent/OperationView/OperationView'
import { OperationViewModeSelector } from '../OperationViewModeSelector'

export type OperationPreviewProps = {
  apiType: ApiType
  changedOperation: OperationData | undefined
  changedOperationContent: string
  // Feature "Internal documents"
  normalizedChangedOperation?: unknown
  // ---
  isLoading: boolean
  mode: OperationViewMode
  schemaViewMode: SchemaViewMode | undefined
  productionMode?: boolean
  maxWidthHeaderToolbar?: number
}

// First Order Component //
export const OperationPreview: FC<OperationPreviewProps> = memo<OperationPreviewProps>((props) => {
  const {
    apiType,
    changedOperation,
    changedOperationContent,
    // Feature "Internal documents"
    normalizedChangedOperation,
    // ---
    isLoading, mode, schemaViewMode,
    productionMode, maxWidthHeaderToolbar,
  } = props

  const [operationType, operationName] = useMemo(() => {
    if (!checkIfGraphQLOperation(changedOperation)) {
      return [undefined, undefined]
    }
    return [changedOperation.type, changedOperation.method]
  }, [changedOperation])

  const isDocViewMode = useIsDocOperationViewMode(mode)
  const isRawViewMode = useIsRawOperationViewMode(mode)

  const {
    values: [rawContent],
    extension,
    type,
  } = getFileDetails(apiType, YAML_FILE_VIEW_MODE, changedOperationContent)

  if (isLoading) {
    return (
      <LoadingIndicator />
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
          maxWidthHeaderToolbar={maxWidthHeaderToolbar}
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
          action={<OperationViewModeSelector modes={OPERATION_PREVIEW_VIEW_MODES} />}
        />
        <Divider orientation="horizontal" variant="fullWidth" />
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
            mergedDocument={normalizedChangedOperation}
            // GraphQL specific
            operationType={operationType}
            operationName={operationName}
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
