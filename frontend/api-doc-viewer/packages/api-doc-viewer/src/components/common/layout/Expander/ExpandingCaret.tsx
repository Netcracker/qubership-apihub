import type { FC } from 'react'
import { memo, MouseEventHandler } from 'react'
import { ArrowDownIcon } from '../../../kit/icons/ArrowDownIcon'
import { ArrowRightIcon } from '../../../kit/icons/ArrowRightIcon'

export type ExpandingCaretProps = {
  onToggle: MouseEventHandler
  expanded?: boolean
  testId?: string
}

export const ExpandingCaret: FC<ExpandingCaretProps> = memo<ExpandingCaretProps>(props => {
  const { onToggle, expanded, testId } = props
  return (
    <div className="hover:cursor-pointer" onClick={onToggle} data-testid={testId}>
      {expanded ? <ArrowDownIcon/> : <ArrowRightIcon/>}
    </div>
  )
})
