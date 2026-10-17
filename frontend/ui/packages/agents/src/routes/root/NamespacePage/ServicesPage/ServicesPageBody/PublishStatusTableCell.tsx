import { type FC, memo } from 'react'

import { VersionErrorIndicator } from '@netcracker/qubership-apihub-ui-shared/components/ErrorIndicators/VersionErrorIndicator'
import {
  LOADING_STATUS_MARKER_VARIANT,
  StatusMarker,
} from '@netcracker/qubership-apihub-ui-shared/components/StatusMarker'
import {
  COMPLETE_PUBLISH_STATUS,
  NONE_PUBLISH_STATUS,
  type PublishDetails,
  RUNNING_PUBLISH_STATUS,
} from '@netcracker/qubership-apihub-ui-shared/utils/packages-builder'
import { agent } from '@netcracker/qubership-apihub-ui-shared/utils/version-info'

import {
  COMPLETE_WITH_ERRORS_PUBLISH_STATUS_DESCRIPTION,
  PUBLISH_STATUS_TO_STATUS_DESCRIPTION_MAP,
  PUBLISH_STATUS_TO_STATUS_MARKER_VARIANT_MAP,
} from '../../constants'
import { StatusContent } from './StatusContent'

type PublishStatusTableCellProps = {
  publishDetails: PublishDetails
}

export const PublishStatusTableCell: FC<PublishStatusTableCellProps> = memo<PublishStatusTableCellProps>(({
  publishDetails: { status, hasErrors, changelogHasErrors },
}) => {
  if (status === NONE_PUBLISH_STATUS || status === RUNNING_PUBLISH_STATUS) {
    return <StatusMarker value={LOADING_STATUS_MARKER_VARIANT} />
  }

  if (status === COMPLETE_PUBLISH_STATUS && hasErrors) {
    return (
      <StatusContent
        marker={
          <VersionErrorIndicator
            app={agent}
            hasErrors={hasErrors}
            changelogHasErrors={changelogHasErrors}
            fontSize="extra-small"
          />
        }
        text={COMPLETE_WITH_ERRORS_PUBLISH_STATUS_DESCRIPTION}
      />
    )
  }

  return (
    <StatusContent
      marker={<StatusMarker value={PUBLISH_STATUS_TO_STATUS_MARKER_VARIANT_MAP[status]} />}
      text={PUBLISH_STATUS_TO_STATUS_DESCRIPTION_MAP[status]}
    />
  )
})

PublishStatusTableCell.displayName = 'PublishStatusTableCell'
