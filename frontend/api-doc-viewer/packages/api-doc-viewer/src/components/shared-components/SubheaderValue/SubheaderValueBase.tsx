import { FC, memo } from "react"

export type SubheaderValueBaseProps = {
  isVisible: boolean
  value: unknown
  className?: string
}

export const SubheaderValueBase: FC<SubheaderValueBaseProps> = memo<SubheaderValueBaseProps>((props) => {
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
