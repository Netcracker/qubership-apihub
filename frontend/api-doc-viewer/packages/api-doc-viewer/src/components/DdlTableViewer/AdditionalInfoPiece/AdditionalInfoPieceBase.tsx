import { FC, memo } from "react"

export type AdditionalInfoPieceBaseProps = {
  isVisible: boolean
  value: unknown
  className?: string
}

export const AdditionalInfoPieceBase: FC<AdditionalInfoPieceBaseProps> = memo<AdditionalInfoPieceBaseProps>((props) => {
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
