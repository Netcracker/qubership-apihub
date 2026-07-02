import { FC, memo } from "react"

export type DdlApiPropertyValueBaseProps = {
  isVisible: boolean
  value: unknown
  className?: string
}

export const DdlApiPropertyValueBase: FC<DdlApiPropertyValueBaseProps> = memo<DdlApiPropertyValueBaseProps>((props) => {
  const { isVisible, value, className } = props

  if (!isVisible) {
    return null
  }

  return (
    <span className={className}>
      {`${value}`}
    </span>
  )
})
