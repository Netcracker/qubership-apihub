import { cn } from "@apihub/utils/common/cn"
import type { FC } from 'react'
import { ExpandingCaret } from './ExpandingCaret'
import { NestingHorizontalIndicator } from "../../NestingHorizontalIndicator"
// import { defaultOnContextMenu } from '../../../../utils/common/event-handlers'
// import { ToggleContextMenuHandler } from '../../../kit/ux/UxContextMenu/types/ToggleContextMenuHandler'

export type ExpanderProps = {
  isRoot: boolean
  isOperation?: boolean
  isExpandable?: boolean
  expanded: boolean
  onToggleExpander: () => void
  testId?: string
  // onToggleContextMenu: ToggleContextMenuHandler
}

export const Expander: FC<ExpanderProps> = (props) => {
  const { isRoot, isOperation, isExpandable, expanded, onToggleExpander, testId/*, onToggleContextMenu */ } = props

  let expanderElement = null
  if (isExpandable) {
    expanderElement = (
      <div data-name="Expander" className={cn("flex flex-row items-center gap-0.5 w-full")}>
        {!isRoot && <NestingHorizontalIndicator short />}
        <ExpandingCaret onToggle={onToggleExpander} expanded={expanded} testId={testId} />
      </div>
    )
  } else if (isRoot) {
    expanderElement = <div className={cn("w-5")} />
  } else if (!isRoot && !isOperation) {
    expanderElement = <NestingHorizontalIndicator />
  }

  return (
    <>
      {expanderElement && (
        <div
          data-name="ExpanderContainer"
          className={cn('flex flex-row items-center pt-1.5')}
          // onContextMenu={defaultOnContextMenu(isExpandable, onToggleContextMenu)}
        >
          {expanderElement}
        </div>
      )}
    </>
  )
}
