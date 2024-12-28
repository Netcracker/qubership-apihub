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
import { memo, useCallback, useMemo, useState } from 'react'
import { Box, Tooltip } from '@mui/material'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { useParams } from 'react-router-dom'
import { useFullMainVersion } from '../../../FullMainVersionProvider'
import type { BuildType, OperationsGroupExportFormat } from '@netcracker/qubership-apihub-api-processor'
import {
  BUILD_TYPE,
  HTML_EXPORT_GROUP_FORMAT,
  JSON_EXPORT_GROUP_FORMAT,
  YAML_EXPORT_GROUP_FORMAT,
} from '@netcracker/qubership-apihub-api-processor'
import type { OperationGroup } from '@netcracker/qubership-apihub-ui-shared/entities/operation-groups'
import {
  DISABLED_BUTTON_COLOR,
  ENABLED_BUTTON_COLOR,
  GROUP_TYPE_REST_PATH_PREFIX,
} from '@netcracker/qubership-apihub-ui-shared/entities/operation-groups'
import { DEFAULT_API_TYPE } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { ButtonWithHint } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ButtonWithHint'
import { AddSquareIcon } from '@netcracker/qubership-apihub-ui-shared/icons/AddSquareIcon'
import { DeleteIcon } from '@netcracker/qubership-apihub-ui-shared/icons/DeleteIcon'
import { MenuButton } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/MenuButton'
import { DownloadIcon } from '@netcracker/qubership-apihub-ui-shared/icons/DownloadIcon'
import { PublishIcon } from '@netcracker/qubership-apihub-ui-shared/icons/PublishIcon'
import {
  MenuButtonContentWithSections,
} from '@netcracker/qubership-apihub-ui-shared/components/Buttons/MenuButtonContentWithSections'
import {
  useOperationsExport,
} from '@apihub/routes/root/PortalPage/VersionPage/VersionOverviewSubPage/OperationGroupsCard/useOperationsExport'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { API_TYPE_GRAPHQL, API_TYPE_REST } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

export type OperationGroupControlsProps = {
  operationGroup: OperationGroup
  onEditContent: (group: OperationGroup) => void
  onEdit: (group: OperationGroup) => void
  onDelete: (group: OperationGroup) => void
  onPublish: (group: OperationGroup) => void
}

export const OperationGroupControls: FC<OperationGroupControlsProps> = memo<OperationGroupControlsProps>(({
  operationGroup,
  onEditContent,
  onEdit,
  onDelete,
  onPublish,
}) => {
  const { isPrefixGroup, apiType, operationsCount } = operationGroup
  const [actionMenuOpen, setActionMenuOpen] = useState(false)

  const { packageId: packageKey } = useParams()
  const [exportOperations, isExporting] = useOperationsExport()
  const fullVersion = useFullMainVersion()

  const onExportButton = useCallback((group: OperationGroup, format: OperationsGroupExportFormat, buildType: BuildType) => {
    exportOperations({
      packageKey: packageKey!,
      versionKey: fullVersion!,
      groupName: group.groupName,
      apiType: group.apiType ?? DEFAULT_API_TYPE,
      format: format,
      buildType: buildType,
    })
  }, [exportOperations, fullVersion, packageKey])

  const isGraphQlGroup = apiType && API_TYPE_DISABLE_ACTION_MAP[apiType]
  const isDownloadButtonDisabled = isExporting || isGraphQlGroup || !operationsCount
  const isPublishButtonDisabled = isGraphQlGroup || !operationsCount

  const downloadButtonTitle = useMemo(
    () => {
      if (isGraphQlGroup) {
        return 'Downloading is not available for groups with GraphQL operations'
      }
      if (!operationsCount) {
        return 'Downloading is not available because there are no operations in the group'
      }
      return 'Download operations from the group'
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
        startIcon={<AddSquareIcon />}
        sx={{ visibility: 'hidden', height: '20px' }}
        onClick={() => onEditContent(operationGroup)}
        testId="AddButton"
      />
      <ButtonWithHint
        size="small"
        area-label="edit"
        className="hoverable"
        disableHint={false}
        hint="Edit group"
        startIcon={<EditOutlinedIcon />}
        sx={{ visibility: 'hidden', height: '20px' }}
        onClick={() => onEdit(operationGroup)}
        testId="EditButton"
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
        testId="PublishButton"
      />
      <Tooltip
        title={downloadButtonTitle}
        disableHoverListener={actionMenuOpen}
      >
        <Box sx={{ display: 'inline' }}>
          <MenuButton
            sx={{
              display: 'inline',
              ml: 1,
              visibility: actionMenuOpen || isExporting ? 'visible' : 'hidden',
              minWidth: 20,
              width: 20,
              height: 20,
              padding: 0,
              marginLeft: 0,
              '&:focus': {
                outline: isExporting ? 'none' : '',
              },
            }}
            className="hoverable"
            disabled={isDownloadButtonDisabled}
            size="small"
            isLoading={isExporting}
            icon={<DownloadIcon
              color={isDownloadButtonDisabled ? DISABLED_BUTTON_COLOR : ENABLED_BUTTON_COLOR} />}
            onClick={() => setActionMenuOpen(true)}
            onItemClick={event => event.stopPropagation()}
            onClose={() => setActionMenuOpen(false)}
            data-testid="DownloadMenuButton"
          >
            <MenuButtonContentWithSections
              content={{
                'Download combined specification ': [
                  {
                    onClick: () => onExportButton(operationGroup, YAML_EXPORT_GROUP_FORMAT, BUILD_TYPE.MERGED_SPECIFICATION),
                    title: 'Download as YAML',
                    testId: 'DownloadCombinedYamlMenuItem',
                  },
                  {
                    onClick: () => onExportButton(operationGroup, JSON_EXPORT_GROUP_FORMAT, BUILD_TYPE.MERGED_SPECIFICATION),
                    title: 'Download as JSON',
                    testId: 'DownloadCombinedJsonMenuItem',
                  },
                ],
                'Download reduced source specifications': [
                  {
                    onClick: () => onExportButton(operationGroup, YAML_EXPORT_GROUP_FORMAT, BUILD_TYPE.REDUCED_SOURCE_SPECIFICATIONS),
                    title: 'Download as YAML',
                    testId: 'DownloadReducedYamlMenuItem',
                  },
                  {
                    onClick: () => onExportButton(operationGroup, JSON_EXPORT_GROUP_FORMAT, BUILD_TYPE.REDUCED_SOURCE_SPECIFICATIONS),
                    title: 'Download as JSON',
                    testId: 'DownloadReducedJsonMenuItem',
                  },
                  {
                    onClick: () => onExportButton(operationGroup, HTML_EXPORT_GROUP_FORMAT, BUILD_TYPE.REDUCED_SOURCE_SPECIFICATIONS),
                    title: 'Download as HTML',
                    testId: 'DownloadReducedHtmlMenuItem',
                  },
                ],
              }}
            />
          </MenuButton>
        </Box>
      </Tooltip>
      <ButtonWithHint
        size="small"
        area-label="delete"
        className="hoverable"
        disabled={isPrefixGroup}
        disableHint={false}
        hint={isPrefixGroup ? `Deletion is not available for the ${GROUP_TYPE_REST_PATH_PREFIX} group` : 'Delete group'}
        startIcon={<DeleteIcon color="#626D82" />}
        sx={{ visibility: 'hidden', height: '20px' }}
        onClick={() => onDelete(operationGroup)}
        testId="DeleteButton"
      />
    </Box>
  )
})

export const API_TYPE_DISABLE_ACTION_MAP: Record<ApiType, boolean> = {
  [API_TYPE_REST]: false,
  [API_TYPE_GRAPHQL]: true,
}
