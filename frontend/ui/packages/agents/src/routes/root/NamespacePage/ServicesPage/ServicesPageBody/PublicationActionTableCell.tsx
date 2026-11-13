import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined'
import { Button } from '@mui/material'
import { styled } from '@mui/material/styles'
import { type FC, memo } from 'react'

import type { TestableProps } from '@netcracker/qubership-apihub-ui-shared/components/Testable'
import {
  COMPLETE_PUBLISH_STATUS,
  ERROR_PUBLISH_STATUS,
  type PublishDetails,
} from '@netcracker/qubership-apihub-ui-shared/utils/packages-builder'

import type { ServiceConfig } from '@agents/entities/publish-config'
import { useEventBus } from '../../../../EventBusProvider'
import { HoverLink } from './HoverLink'

type PublicationActionTableCellProps = TestableProps & {
  /** Undefined for a service that is not part of the current publication run. */
  serviceConfig: ServiceConfig | undefined
  publishDetails: PublishDetails
  versionLinkLabel: string
}

export const PublicationActionTableCell: FC<PublicationActionTableCellProps> = memo<PublicationActionTableCellProps>(({
  serviceConfig,
  publishDetails: { status, message },
  versionLinkLabel,
  'data-testid': dataTestId,
}) => {
  const { showPublicationErrorReportDialog } = useEventBus()

  if (!serviceConfig) {
    return null
  }

  if (status === COMPLETE_PUBLISH_STATUS) {
    return <HoverLink url={serviceConfig.apihubPackageUrl} label={versionLinkLabel} data-testid={dataTestId} />
  }

  if (status === ERROR_PUBLISH_STATUS && message) {
    return (
      <ErrorDetailsButton
        data-testid="ViewDetailsButton"
        variant="text"
        color="error"
        startIcon={<ErrorOutlinedIcon color="error" />}
        onClick={() =>
          showPublicationErrorReportDialog({
            downloadFilename: `${serviceConfig.serviceId}-publication-errors.txt`,
            errors: message,
          })}
      >
        Error Details
      </ErrorDetailsButton>
    )
  }

  return null
})

PublicationActionTableCell.displayName = 'PublicationActionTableCell'

const ErrorDetailsButton = styled(Button)({
  padding: 0,
  height: 10,
  whiteSpace: 'nowrap',
})
