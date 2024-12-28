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
import type { Row } from '@tanstack/react-table'
import { Box, IconButton, Link, Tooltip, Typography } from '@mui/material'
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import KeyboardArrowRightOutlinedIcon from '@mui/icons-material/KeyboardArrowRightOutlined'
import type { Service } from '@apihub/entities/services'
import { useEventBus } from '../../../../EventBusProvider'
import { useParams } from 'react-router-dom'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import type { Spec } from '@netcracker/qubership-apihub-ui-shared/entities/specs'
import { isEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { OverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/OverflowTooltip'
import { LockIcon } from '@netcracker/qubership-apihub-ui-shared/icons/LockIcon'
import { SpecLogo } from '@netcracker/qubership-apihub-ui-shared/components/SpecLogo'

export type ServiceOrDocumentationTableCellProps = {
  value: Row<CellData>
  isPromoteStep?: boolean
  promoteStatus?: VersionStatus
}

type CellData = Partial<{
  service: Service
  spec: Spec
}>

export const ServiceOrDocumentationTableCell: FC<ServiceOrDocumentationTableCellProps> = memo<ServiceOrDocumentationTableCellProps>((
  {
    value: {
      depth,
      getCanExpand,
      getToggleExpandedHandler,
      getIsExpanded,
      parentRow,
      original: { service, spec },
    },
    isPromoteStep,
    promoteStatus,
  },
) => {
  const { agentId, namespaceKey } = useParams()
  const { showSpecificationDialog } = useEventBus()

  const promotable = useMemo(
    () => service?.availablePromoteStatuses?.includes(promoteStatus!),
    [service, promoteStatus],
  )

  if (service && isEmpty(service.specs)) {
    return (
      <OverflowTooltip title={service.key}>
        <Typography noWrap variant="inherit" color="#8F9EB4" pl={3}>{service.key}</Typography>
      </OverflowTooltip>
    )
  }

  return (
    <Box display="flex" alignItems="center" gap={1} pl={3 + depth * 2} height={19}>
      {getCanExpand() && (
        <IconButton sx={{ p: 0, ml: -3 }} onClick={getToggleExpandedHandler()}>
          {getIsExpanded()
            ? <KeyboardArrowDownOutlinedIcon sx={{ fontSize: '16px' }}/>
            : <KeyboardArrowRightOutlinedIcon sx={{ fontSize: '16px' }}/>}
        </IconButton>
      )}
      {service && (<>
          <OverflowTooltip title={service.key}>
            <Typography noWrap color={isPromoteStep && !promotable ? '#8F9EB4' : 'inherit'}
                        variant="inherit">{service.key}</Typography>
          </OverflowTooltip>
          {isPromoteStep && !promotable && (
            <Tooltip title="No grants to publish the service">
              <Box><LockIcon/></Box>
            </Tooltip>
          )}
        </>
      )}
      {spec && <>
        <SpecLogo value={spec.type}/>
        <OverflowTooltip title={spec.name}>
          <Link
            noWrap
            sx={{ '&:hover': { cursor: 'pointer' } }}
            onClick={() => showSpecificationDialog({
              spec: spec,
              agentId: agentId,
              namespaceKey: namespaceKey,
              service: parentRow?.original.service,
            })}
          >
            {spec.name}
          </Link>
        </OverflowTooltip>
      </>}
    </Box>
  )
})
