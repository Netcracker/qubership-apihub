import { Box, styled, Typography } from '@mui/material'
import { type FC, memo, type ReactNode } from 'react'

import { OverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/OverflowTooltip'
import {
  LOADING_STATUS_MARKER_VARIANT,
  StatusMarker,
} from '@netcracker/qubership-apihub-ui-shared/components/StatusMarker'
import { CheckCircleIcon } from '@netcracker/qubership-apihub-ui-shared/icons/CheckCircleIcon'
import { ErrorIcon } from '@netcracker/qubership-apihub-ui-shared/icons/ErrorIcon'
import { WarningFilledIcon } from '@netcracker/qubership-apihub-ui-shared/icons/WarningFilledIcon'
import {
  COMPLETE_PUBLISH_STATUS,
  ERROR_PUBLISH_STATUS,
  type PublishDetails,
} from '@netcracker/qubership-apihub-ui-shared/utils/packages-builder'

const PUBLISHED_TEXT = 'Published successfully'
const PUBLISHED_WITH_ERRORS_TEXT = 'Published with errors'
const PUBLICATION_FAILED_TEXT = 'Publication failed'

type PublicationStatusIndicatorProps = {
  publishDetails: PublishDetails
}

/** The publication status of a service or of a snapshot: a spinner until it is final, then its icon and text. */
export const PublicationStatusIndicator: FC<PublicationStatusIndicatorProps> = memo<PublicationStatusIndicatorProps>(({
  publishDetails: { status, hasErrors, changelogHasErrors },
}) => {
  if (status === ERROR_PUBLISH_STATUS) {
    return <PublicationStatus icon={<ErrorIcon color="error" fontSize="small" />} text={PUBLICATION_FAILED_TEXT} />
  }
  if (status !== COMPLETE_PUBLISH_STATUS) {
    return <StatusMarker value={LOADING_STATUS_MARKER_VARIANT} />
  }
  if (hasErrors || changelogHasErrors) {
    return (
      <PublicationStatus
        icon={<WarningFilledIcon color="warning" fontSize="small" />}
        text={PUBLISHED_WITH_ERRORS_TEXT}
      />
    )
  }
  return (
    <PublicationStatus
      icon={<CheckCircleIcon color="secondary" fontSize="small" />}
      text={PUBLISHED_TEXT}
    />
  )
})

PublicationStatusIndicator.displayName = 'PublicationStatusIndicator'

type PublicationStatusProps = {
  icon: ReactNode
  text: string
}

const PublicationStatus: FC<PublicationStatusProps> = ({ icon, text }) => (
  <PublicationStatusRoot>
    {icon}
    <OverflowTooltip title={text}>
      <Typography noWrap variant="body2">{text}</Typography>
    </OverflowTooltip>
  </PublicationStatusRoot>
)

PublicationStatus.displayName = 'PublicationStatus'

// The text keeps the black of body2 inside a section header, whose color is the secondary grey, and stands 4 px after
// the icon, as in the design. StatusContent keeps 8 px, as the other statuses of its table columns do. The text is cut
// in a narrow column, such as the status column of a section header.
const PublicationStatusRoot = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  minWidth: 0,
}))
