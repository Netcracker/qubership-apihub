import { FC, memo } from "react"

export type AdditionalInfoPieceBaseProps = {
  isVisible: boolean
  value: unknown
  blockClassName?: string
  valueClassName?: string
}

export const AdditionalInfoPieceBase: FC<AdditionalInfoPieceBaseProps> = memo<AdditionalInfoPieceBaseProps>((props) => {
  const { isVisible, value, blockClassName, valueClassName } = props

  if (!isVisible) {
    return null
  }

  return (
    <span className={blockClassName}>
      <span className={valueClassName || undefined}>
        {`${value}`}
      </span>
    </span>
  )
})
