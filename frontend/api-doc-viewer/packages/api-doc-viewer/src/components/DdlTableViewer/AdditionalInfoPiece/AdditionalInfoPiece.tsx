import { HighlightVariant } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { FC, memo } from "react"
import { AdditionalInfoPieceBase } from "./AdditionalInfoPieceBase"
import { useAdditionalInfoPieceStyles } from "./useAdditionalInfoPieceStyles"
import '../styles/AdditionalInfoPiece.css'

export type AdditionalInfoPieceProps = {
  isVisible: boolean
  value: unknown
  textHighlighterColor?: Exclude<HighlightVariant, HighlightVariant.Gray>
  borderShadowColor?: HighlightVariant
  isFontMuted?: boolean
}

export const AdditionalInfoPiece: FC<AdditionalInfoPieceProps> = memo<AdditionalInfoPieceProps>((props) => {
  const {
    isVisible,
    value,
    textHighlighterColor,
    borderShadowColor,
    isFontMuted,
  } = props
  const { blockClassName, valueClassName } = useAdditionalInfoPieceStyles({
    textHighlighterColor,
    borderShadowColor,
    isFontMuted,
  })

  return (
    <AdditionalInfoPieceBase
      isVisible={isVisible}
      value={value}
      blockClassName={blockClassName}
      valueClassName={valueClassName}
    />
  )
})
