import type { FC, HTMLAttributes, ReactNode } from 'react'
import { memo } from 'react'
import omit from 'lodash-es/omit'
import type { BoxProps, TooltipProps } from '@mui/material'
import { Box, ListItem, Tooltip } from '@mui/material'
import { TextWithOverflowTooltip } from './TextWithOverflowTooltip'
import type { TestableProps } from './Testable'

export type OptionItemProps = {
  props: HTMLAttributes<HTMLLIElement>
  title: ReactNode
  overflowTooltipText?: string
  disabled?: boolean
  subtitle?: string
  indicator?: ReactNode
  chip?: ReactNode
  chipAlignSelf?: BoxProps['alignSelf']
  overflowTooltipPlacement?: TooltipProps['placement']
  tooltipProps?: Omit<TooltipProps, 'children'>
} & TestableProps

export const OptionItem: FC<OptionItemProps> = memo<OptionItemProps>(({
  props,
  title,
  overflowTooltipText,
  disabled,
  subtitle,
  indicator,
  chip,
  chipAlignSelf,
  overflowTooltipPlacement = 'right',
  tooltipProps: { title: tooltipTitle, ...rest } = {},
  'data-testid': dataTestId,
}) => {
  const resolvedOverflowTooltipText = overflowTooltipText ?? (typeof title === 'string' ? title : '')
  // MUI puts the option key into the props of renderOption, and the caller already sets it on this component
  const listItemProps = omit(props, 'key')

  return (
    <Tooltip
      placement="right"
      title={tooltipTitle}
      {...rest}
    >
      <Box>
        <ListItem
          {...listItemProps}
          data-testid={dataTestId}
          // todo 'disabled' prop is deprecated and does not work properly, transition to ListItemButton is required
          sx={{ pointerEvents: disabled ? 'none' : 'auto' }}
          disabled={disabled}
        >
          <Box width="100%" display="flex" alignItems="center" gap={0.5}>
            <Box display="flex" alignItems="center" minWidth={0} flex={1} gap={0.5} overflow="hidden">
              <Box minWidth={0} flexShrink={1} overflow="hidden">
                <TextWithOverflowTooltip
                  placement={overflowTooltipPlacement}
                  tooltipText={resolvedOverflowTooltipText}
                >
                  {title}
                </TextWithOverflowTooltip>
                {subtitle && (
                  <TextWithOverflowTooltip
                    placement={overflowTooltipPlacement}
                    tooltipText={subtitle}
                    sx={{ color: '#626D82' }}
                  >
                    {subtitle}
                  </TextWithOverflowTooltip>
                )}
              </Box>
              {indicator}
            </Box>
            {chip && <Box flexShrink={0} alignSelf={chipAlignSelf}>{chip}</Box>}
          </Box>
        </ListItem>
      </Box>
    </Tooltip>
  )
})

OptionItem.displayName = 'OptionItem'
