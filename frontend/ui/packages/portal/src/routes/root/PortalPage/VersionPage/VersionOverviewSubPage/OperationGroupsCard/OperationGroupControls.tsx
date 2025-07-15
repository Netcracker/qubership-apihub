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

import { Box } from '@mui/material'
import { ButtonWithHint } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ButtonWithHint'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { API_TYPE_GRAPHQL, API_TYPE_REST } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import type { OperationGroup } from '@netcracker/qubership-apihub-ui-shared/entities/operation-groups'
import {
  DISABLED_BUTTON_COLOR,
  ENABLED_BUTTON_COLOR,
  GROUP_TYPE_REST_PATH_PREFIX,
} from '@netcracker/qubership-apihub-ui-shared/entities/operation-groups'
import { AddSquareIcon } from '@netcracker/qubership-apihub-ui-shared/icons/AddSquareIcon'
import { DeleteIcon } from '@netcracker/qubership-apihub-ui-shared/icons/DeleteIcon'
import { DownloadIcon } from '@netcracker/qubership-apihub-ui-shared/icons/DownloadIcon'
import { EditIcon } from '@netcracker/qubership-apihub-ui-shared/icons/EditIcon'
import { PublishIcon } from '@netcracker/qubership-apihub-ui-shared/icons/PublishIcon'
import type { FC } from 'react'
import { memo, useMemo } from 'react'

export type OperationGroupControlsProps = {
  operationGroup: OperationGroup
  onEditContent: (group: OperationGroup) => void
  onEdit: (group: OperationGroup) => void
  onDelete: (group: OperationGroup) => void
  onPublish: (group: OperationGroup) => void
  onExport: (group: OperationGroup) => void
}

export const OperationGroupControls: FC<OperationGroupControlsProps> = memo<OperationGroupControlsProps>(({
  operationGroup,
  onEditContent,
  onEdit,
  onDelete,
  onPublish,
  onExport,
}) => {
  const { isPrefixGroup, apiType, operationsCount } = operationGroup

  const isGraphQlGroup = apiType && API_TYPE_DISABLE_ACTION_MAP[apiType]
  const isDownloadButtonDisabled = /* isExporting || */ isGraphQlGroup || !operationsCount
  const isPublishButtonDisabled = isGraphQlGroup || !operationsCount

  const downloadButtonTitle = useMemo(
    () => {
      if (isGraphQlGroup) {
        return 'Export is not available for groups with GraphQL operations'
      }
      if (!operationsCount) {
        return 'Export is not available because there are no operations in the group'
      }
      return 'Export operations from the group'
    },
    [isGraphQlGroup, operationsCount],
  )

  const publishButtonTitle = useMemo(() => {
    if (isGraphQlGroup) {
      return 'Publish is not available for groups with GraphQL operations'
    }
    if (!operationsCount) {
      return 'Publish is not available because there are no operations in the group'
    }
    return 'Publish as Package Version'
  }, [isGraphQlGroup, operationsCount])

  return (
    <Box display="flex" gap={2}>
      <ButtonWithHint
        size="small"
        area-label="add"
        className="hoverable"
        disabled={isPrefixGroup}
        disableHint={false}
        hint={isPrefixGroup ? `Operations cannot be changed in the ${GROUP_TYPE_REST_PATH_PREFIX} group` : 'Change operations in the group'}
        startIcon={<AddSquareIcon color={ENABLED_BUTTON_COLOR} />}
        sx={{ visibility: 'hidden', height: '20px' }}
        onClick={() => onEditContent(operationGroup)}
        data-testid="AddButton"
      />
      <ButtonWithHint
        size="small"
        area-label="edit"
        className="hoverable"
        disableHint={false}
        hint="Edit group"
        startIcon={<EditIcon color={ENABLED_BUTTON_COLOR} />}
        sx={{ visibility: 'hidden', height: '20px' }}
        onClick={() => onEdit(operationGroup)}
        data-testid="EditButton"
      />
      <ButtonWithHint
        size="small"
        area-label="publish"
        className="hoverable"
        disableHint={false}
        disabled={isPublishButtonDisabled}
        hint={publishButtonTitle}
        startIcon={<PublishIcon color={isPublishButtonDisabled ? DISABLED_BUTTON_COLOR : ENABLED_BUTTON_COLOR} />}
        sx={{ visibility: 'hidden', height: '20px' }}
        onClick={() => onPublish(operationGroup)}
        data-testid="PublishButton"
      />
      <ButtonWithHint
        size="small"
        area-label="export"
        className="hoverable"
        disabled={isDownloadButtonDisabled}
        hint={downloadButtonTitle}
        startIcon={<DownloadIcon color={isDownloadButtonDisabled ? DISABLED_BUTTON_COLOR : ENABLED_BUTTON_COLOR} />}
        sx={{ visibility: 'hidden', height: '20px' }}
        onClick={() => onExport(operationGroup)}
        data-testid="ExportButton"
      />
      <ButtonWithHint
        size="small"
        area-label="delete"
        className="hoverable"
        disabled={isPrefixGroup}
        disableHint={false}
        hint={isPrefixGroup ? `Deletion is not available for the ${GROUP_TYPE_REST_PATH_PREFIX} group` : 'Delete group'}
        startIcon={<DeleteIcon color={ENABLED_BUTTON_COLOR} />}
        sx={{ visibility: 'hidden', height: '20px' }}
        onClick={() => onDelete(operationGroup)}
        data-testid="DeleteButton"
      />
    </Box>
  )
})

export const API_TYPE_DISABLE_ACTION_MAP: Record<ApiType, boolean> = {
  [API_TYPE_REST]: false,
  [API_TYPE_GRAPHQL]: true,
}
