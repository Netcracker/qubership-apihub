import { cn } from "@apihub/utils/common/cn"
import { FC, memo } from "react"

export type JsoValueBaseProps = {
  isVisible: boolean
  value: unknown
  className?: string
}

export const JsoValueBase: FC<JsoValueBaseProps> = memo<JsoValueBaseProps>((props) => {
  const { isVisible, value, className } = props

  if (!isVisible) {
    return null
  }

  return (
    <span className={cn(className)}>
      {`${value}`}
    </span>
  )
})
