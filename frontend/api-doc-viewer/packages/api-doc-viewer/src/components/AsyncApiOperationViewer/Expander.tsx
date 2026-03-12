import { FC, useContext } from "react";
import { AsyncApiDevModeContext } from "./AsyncApiDevModeContext";
import { ExpandingCaret } from "../common/layout/Expander/ExpandingCaret";
import { NestingHorizontalIndicator } from "../common/NestingHorizontalIndicator";

type ExpanderProps = {
  expandable: boolean
  expanded?: boolean
  onClick?: () => void
  level: number
}

export const Expander: FC<ExpanderProps> = (props) => {
  const { expandable, expanded, onClick, level } = props
  const devMode = useContext(AsyncApiDevModeContext)

  const hasHorizontalLine = level > 0
  const onToggle = onClick ?? (() => {
    devMode && console.warn('Expander callback is not provided.')
  })

  if (!expandable && !hasHorizontalLine) {
    return null
  }

  return (
    <div className={`flex flex-row items-center justify-center ${hasHorizontalLine ? 'gap-0.5' : ''}`}>
      {hasHorizontalLine && <NestingHorizontalIndicator short={expandable} />}
      {expandable && expanded !== undefined && (
        <ExpandingCaret onToggle={onToggle} expanded={expanded} />
      )}
    </div>
  )
}
