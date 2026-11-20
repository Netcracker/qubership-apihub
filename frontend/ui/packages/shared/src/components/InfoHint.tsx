import type { CSSObject } from '@mui/material/styles'
import { styled } from '@mui/material/styles'
import type { SvgIconProps } from '@mui/material/SvgIcon'
import Tooltip from '@mui/material/Tooltip'
import { type FC, memo } from 'react'

import { InfoContextIcon } from '../icons/InfoContextIcon'
import type { TestableProps } from './Testable'

// The class the theme shows inside a hovered table row
const VISIBLE_ON_HOVER_CLASS_NAME = 'visible-on-hover'

/**
 * Shows the elements with the class `visible-on-hover` inside the styled element while it is hovered, holds keyboard
 * focus, or contains the element that holds it. A table row needs none of it for hover: the theme shows them there.
 */
export const VISIBLE_ON_HOVER_HOST_STYLES: CSSObject = {
  [`&:hover .${VISIBLE_ON_HOVER_CLASS_NAME}, &:focus-visible .${VISIBLE_ON_HOVER_CLASS_NAME}, &:has(:focus-visible) .${VISIBLE_ON_HOVER_CLASS_NAME}`]:
    {
      visibility: 'visible',
    },
}

type InfoHintProps = {
  tooltip: string
  fontSize?: SvgIconProps['fontSize']
  /**
   * The id of the hidden element with the tooltip text. The host names it in its `aria-describedby`, since the icon
   * itself is hidden from screen readers.
   */
  descriptionId: string
  /** Shows the icon at all times, where it otherwise waits for its host or a hovered table row. */
  alwaysVisible?: boolean
} & TestableProps

/**
 * An info icon with a tooltip, hidden until its host shows it with {@link VISIBLE_ON_HOVER_HOST_STYLES} or a table
 * row is hovered, unless `alwaysVisible` is set. Unlike `ErrorIndicator`, the icon takes no keyboard focus: it stands
 * inside a control such as a tab, an accordion summary, or a text field, which keeps the focus and carries the text as
 * its description through `descriptionId`.
 */
export const InfoHint: FC<InfoHintProps> = memo<InfoHintProps>(({
  tooltip,
  fontSize = 'small',
  descriptionId,
  alwaysVisible = false,
  'data-testid': dataTestId,
}) => (
  <>
    <Tooltip title={tooltip}>
      <HintIcon
        className={VISIBLE_ON_HOVER_CLASS_NAME}
        fontSize={fontSize}
        color="disabled"
        alwaysVisible={alwaysVisible}
        data-testid={dataTestId}
      />
    </Tooltip>
    <span id={descriptionId} hidden>{tooltip}</span>
  </>
))

InfoHint.displayName = 'InfoHint'

const HintIcon = styled(InfoContextIcon, {
  shouldForwardProp: prop => prop !== 'alwaysVisible',
})<{ alwaysVisible: boolean }>(({ alwaysVisible }) => ({
  visibility: alwaysVisible ? 'visible' : 'hidden',
}))
