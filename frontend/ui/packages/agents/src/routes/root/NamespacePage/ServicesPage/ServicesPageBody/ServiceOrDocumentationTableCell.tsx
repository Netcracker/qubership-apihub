import type { FC, ReactNode } from 'react'
import { useMemo } from 'react'
import type { Row } from '@tanstack/react-table'
import { Box, IconButton, Link, Tooltip, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import KeyboardArrowRightOutlinedIcon from '@mui/icons-material/KeyboardArrowRightOutlined'
import type { Service } from '@agents/entities/services'
import { useEventBus } from '../../../../EventBusProvider'
import { useParams } from 'react-router-dom'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import type { Spec } from '@netcracker/qubership-apihub-ui-shared/entities/specs'
import { isEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { OverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/OverflowTooltip'
import { LockIcon } from '@netcracker/qubership-apihub-ui-shared/icons/LockIcon'
import { SpecLogo } from '@netcracker/qubership-apihub-ui-shared/components/SpecLogo'
import { DotIndicator } from '@netcracker/qubership-apihub-ui-shared/components/DotIndicator'
import type { PackageKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { SnapshotDocumentErrorIndicator } from './SnapshotDocumentErrorIndicator'

export type ServiceOrDocumentationTableCellProps = {
  value: Row<CellData>
  isPromoteStep?: boolean
  promoteStatus?: VersionStatus
  serviceNameAdornment?: ReactNode
}

type CellData = Partial<{
  service: Service
  spec: Spec
  snapshotHasErrors: boolean
  snapshotPackageKey: PackageKey
}>

// Not memo: TanStack keeps the same row object when the row opens, and memo would keep the chevron closed
export const ServiceOrDocumentationTableCell: FC<ServiceOrDocumentationTableCellProps> = (
  {
    value: {
      getCanExpand,
      getToggleExpandedHandler,
      getIsExpanded,
      parentRow,
      original: { service, spec, snapshotHasErrors },
    },
    isPromoteStep,
    promoteStatus,
    serviceNameAdornment,
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
      <ItemName>
        <OverflowTooltip title={service.key}>
          <Typography noWrap variant="inherit" color="action.disabled" pl={3}>{service.key}</Typography>
        </OverflowTooltip>
        {serviceNameAdornment}
      </ItemName>
    )
  }

  const documentErrorsPackageKey = parentRow?.original.snapshotHasErrors
    ? parentRow.original.snapshotPackageKey
    : undefined

  return (
    <Box display="flex" alignItems="center" gap={1} pl={3} height={19}>
      {getCanExpand() && (
        <IconButton sx={{ p: 0, ml: -3 }} onClick={getToggleExpandedHandler()}>
          {getIsExpanded()
            ? <KeyboardArrowDownOutlinedIcon sx={{ fontSize: '16px' }}/>
            : <KeyboardArrowRightOutlinedIcon sx={{ fontSize: '16px' }}/>}
        </IconButton>
      )}
      {service && (<>
          <ItemName>
            <OverflowTooltip title={service.key}>
              <Typography noWrap color={isPromoteStep && !promotable ? '#8F9EB4' : 'inherit'}
                          variant="inherit">{service.key}</Typography>
            </OverflowTooltip>
            {serviceNameAdornment}
          </ItemName>
          {snapshotHasErrors && (
            <ServiceDocumentErrorsDot color="error" data-testid="ServiceDocumentErrorsIndicator"/>
          )}
          {isPromoteStep && !promotable && (
            <Tooltip title="No grants to publish the service">
              <Box><LockIcon/></Box>
            </Tooltip>
          )}
        </>
      )}
      {spec && (
        <ItemName>
          <SpecLogo value={spec.type}/>
          <OverflowTooltip title={spec.name}>
            <Link
              noWrap
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
          {documentErrorsPackageKey && (
            <SnapshotDocumentErrorIndicator specKey={spec.key} snapshotPackageKey={documentErrorsPackageKey}/>
          )}
        </ItemName>
      )}
    </Box>
  )
}

const ServiceDocumentErrorsDot = styled(DotIndicator)({
  alignSelf: 'flex-start',
})

const ItemName = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  minWidth: 0,
}))
