import type { FC } from 'react'
import { TextWithOverflowTooltip } from './TextWithOverflowTooltip'

export const CustomTableHeadCell: FC<{ title: string }> = ({ title }) => {
  return (
    <TextWithOverflowTooltip
      tooltipText={title}
      sx={{
        fontSize: 'inherit',
        color: 'inherit',
      }}
    >
      {title}
    </TextWithOverflowTooltip>
  )
}
