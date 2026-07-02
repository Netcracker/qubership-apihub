import { FC, memo } from "react"
import { AdditionalInfoPieceBase } from "./AdditionalInfoPieceBase"
import { useAdditionalInfoPieceStyles } from "./useAdditionalInfoPieceStyles"
import '../styles/AdditionalInfoPiece.css'

export type AdditionalInfoPieceProps = {
  isVisible: boolean
  value: unknown
}

export const AdditionalInfoPiece: FC<AdditionalInfoPieceProps> = memo<AdditionalInfoPieceProps>((props) => {
  const {
    isVisible,
    value,
  } = props
  const className = useAdditionalInfoPieceStyles()

  return (
    <AdditionalInfoPieceBase
      isVisible={isVisible}
      value={value}
      className={className}
    />
  )
})
