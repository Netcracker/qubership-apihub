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
import { memo, useMemo } from 'react'
import { ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material'

import { useSelectedPreviewFileKey } from '../../useSelectedPreviewFile'
import type { SpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import { SpecLogo } from '@netcracker/qubership-apihub-ui-shared/components/SpecLogo'
import type { FileProblem } from '@apihub/entities/file-problems'
import { ERROR_FILE_PROBLEM_TYPE } from '@apihub/entities/file-problems'
import {
  ERROR_STATUS_MARKER_VARIANT,
  LOADING_STATUS_MARKER_VARIANT,
  StatusMarker,
  SUCCESS_STATUS_MARKER_VARIANT,
  WARNING_STATUS_MARKER_VARIANT,
} from '@netcracker/qubership-apihub-ui-shared/components/StatusMarker'
import type { FileKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'

export type PublishTabItemProps = {
  fileKey: FileKey
  fileType: SpecType
  fileTitle: string
  problems?: FileProblem[]
}

export const PublishTabItem: FC<PublishTabItemProps> = memo<PublishTabItemProps>(({
  fileKey,
  fileTitle,
  fileType,
  problems,
}) => {
  const [selectedPreviewFileKey, setSelectedPreviewFileKey] = useSelectedPreviewFileKey()

  return (
    <ListItem
      key={fileKey}
      secondaryAction={<PrepublishItemStatus problems={problems}/>}
      disablePadding
    >
      <ListItemButton
        key={fileKey}
        sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}
        selected={selectedPreviewFileKey === fileKey}
        onClick={() => setSelectedPreviewFileKey(fileKey)}
      >
        <ListItemIcon sx={{ minWidth: 2, mt: 0, mr: 1 }}>
          <SpecLogo value={fileType}/>
        </ListItemIcon>
        <ListItemText
          primary={fileTitle}
          secondary={fileKey}
          primaryTypographyProps={{ color: '#0068FF' }}
          secondaryTypographyProps={{ noWrap: true }}
        />
      </ListItemButton>
    </ListItem>
  )
})

type PrepublishItemStatusProps = {
  problems?: FileProblem[]
}

const PrepublishItemStatus: FC<PrepublishItemStatusProps> = memo<PrepublishItemStatusProps>(({ problems }) => {
  const hasErrors = useMemo(() => !!problems?.find(({ type }) => type === ERROR_FILE_PROBLEM_TYPE), [problems])

  if (!problems) {
    return (
      <StatusMarker
        value={LOADING_STATUS_MARKER_VARIANT}
        title="Validation is in progress"
        placement="right"
      />
    )
  }

  if (hasErrors) {
    return (
      <StatusMarker
        value={ERROR_STATUS_MARKER_VARIANT}
        title="Critical errors"
        placement="right"
      />
    )
  }

  if (isNotEmpty(problems)) {
    return (
      <StatusMarker
        value={WARNING_STATUS_MARKER_VARIANT}
        title="Validation errors"
        placement="right"
      />
    )
  }

  return (
    <StatusMarker
      value={SUCCESS_STATUS_MARKER_VARIANT}
      title="No problems"
      placement="right"
    />
  )
})
