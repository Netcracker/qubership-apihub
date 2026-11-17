import { Box, styled, Tooltip } from '@mui/material'
import { type FC, memo, type ReactNode } from 'react'

import { WarningFilledIcon } from '@netcracker/qubership-apihub-ui-shared/icons/WarningFilledIcon'
import { WarningOutlinedIcon } from '@netcracker/qubership-apihub-ui-shared/icons/WarningOutlinedIcon'

import type { Service } from '@agents/entities/services'
import {
  MISSING_API_DOCUMENTS_LABEL_WARNING,
  type ServiceLabelWarning,
  serviceLabelWarningOf,
  UNEXPECTED_API_DOCUMENTS_LABEL_WARNING,
} from './serviceLabelWarnings'

type ServiceLabelWarningIndicatorProps = {
  service: Service
}

const SERVICE_LABEL_WARNING_TO_TOOLTIP_MAP: Record<ServiceLabelWarning, string> = {
  [MISSING_API_DOCUMENTS_LABEL_WARNING]:
    'A service label indicates that API documents are required for this service, but discovery did not find any. This service cannot be selected until API documents are available in the namespace.',
  [UNEXPECTED_API_DOCUMENTS_LABEL_WARNING]:
    'A service label indicates API documents are not expected, but discovery found documents. Align labels with the actual service or update discovery configuration.',
}

const SERVICE_LABEL_WARNING_TO_ICON_MAP: Record<ServiceLabelWarning, ReactNode> = {
  // The row of a service without API documents is grey
  [MISSING_API_DOCUMENTS_LABEL_WARNING]: <WarningOutlinedIcon color="disabled" fontSize="extra-small" />,
  [UNEXPECTED_API_DOCUMENTS_LABEL_WARNING]: <WarningFilledIcon color="warning" fontSize="extra-small" />,
}

export const ServiceLabelWarningIndicator: FC<ServiceLabelWarningIndicatorProps> = memo<
  ServiceLabelWarningIndicatorProps
>(({ service }) => {
  const warning = serviceLabelWarningOf(service)
  if (warning === undefined) {
    return null
  }

  // The tooltip sets its text as the aria-label of the box, and the role makes a screen reader read it
  return (
    <Tooltip title={SERVICE_LABEL_WARNING_TO_TOOLTIP_MAP[warning]}>
      <WarningIconBox role="img" data-testid="ServiceLabelWarningIndicator">
        {SERVICE_LABEL_WARNING_TO_ICON_MAP[warning]}
      </WarningIconBox>
    </Tooltip>
  )
})

ServiceLabelWarningIndicator.displayName = 'ServiceLabelWarningIndicator'

const WarningIconBox = styled(Box)({
  display: 'flex',
  flexShrink: 0,
})
