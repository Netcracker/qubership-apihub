import { styled, Tooltip } from '@mui/material'
import type { CSSObject } from '@mui/material/styles'
import { type FC, memo } from 'react'

import type { TestableProps } from '@netcracker/qubership-apihub-ui-shared/components/Testable'
import { InfoContextIcon } from '@netcracker/qubership-apihub-ui-shared/icons/InfoContextIcon'
import type { Pixel } from '@netcracker/qubership-apihub-ui-shared/utils/types'

const INFO_HINT_CLASS_NAME = 'info-hint'

// These styles go on the element that an info hint describes, and show the hint while the element is hovered or
// holds keyboard focus, or contains the element that holds it
export const INFO_HINT_HOST_STYLES: CSSObject = {
  [`&:hover .${INFO_HINT_CLASS_NAME}, &:focus-visible .${INFO_HINT_CLASS_NAME}, &:has(:focus-visible) .${INFO_HINT_CLASS_NAME}`]:
    {
      visibility: 'visible',
    },
}

type InfoHintProps = {
  title: string
  size: Pixel
  // The host names this id in its aria-describedby: the icon is hidden from screen readers, so the host carries the
  // text as its description
  descriptionId: string
} & TestableProps

export const InfoHint: FC<InfoHintProps> = memo<InfoHintProps>(({
  title,
  size,
  descriptionId,
  'data-testid': dataTestId,
}) => (
  <>
    <Tooltip title={title}>
      <HintIcon className={INFO_HINT_CLASS_NAME} sx={{ fontSize: size }} data-testid={dataTestId} />
    </Tooltip>
    <span id={descriptionId} hidden>{title}</span>
  </>
))

InfoHint.displayName = 'InfoHint'

const HintIcon = styled(InfoContextIcon)({
  visibility: 'hidden',
})
