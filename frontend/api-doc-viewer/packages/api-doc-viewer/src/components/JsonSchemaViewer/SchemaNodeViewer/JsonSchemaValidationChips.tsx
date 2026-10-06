import { resolveDiffSideStyle } from "@apihub/utils/diffs/resolve-diff-side-style"
import { LayoutSide } from "@apihub/types/internal/LayoutSide"
import { ListSideItem } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/list-side-display"
import { JsonSchemaRowDiffs } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/tree-with-diffs/property-row-diffs"
import { AdditionalInfoPiece } from "@apihub/components/shared-components/AdditionalInfoPiece/AdditionalInfoPiece"
import { AdditionalInfoPieceUsage } from "@apihub/components/shared-components/AdditionalInfoPiece/types"
import { FC, memo } from "react"

export type JsonSchemaValidationChipsProps = {
  layoutSide: LayoutSide
  sideItems: readonly ListSideItem[]
}

export const JsonSchemaValidationChips: FC<JsonSchemaValidationChipsProps> = memo<JsonSchemaValidationChipsProps>((props) => {
  const { layoutSide, sideItems } = props

  if (!sideItems.length) {
    return null
  }

  return (
    <div className="flex flex-wrap items-start gap-2">
      {sideItems.map((sideItem, index) => {
        const style = resolveDiffSideStyle(sideItem.diff, layoutSide)
        return (
          <AdditionalInfoPiece
            key={`${sideItem.text}-${index}`}
            isVisible={true}
            value={sideItem.text}
            usage={AdditionalInfoPieceUsage.JsonSchemaValidation}
            textHighlighterColor={style.textHighlighterColor}
            borderShadowColor={style.borderShadowColor}
            isFontMuted={style.isFontMuted}
            isEmptyStringPlaceholder={JsonSchemaRowDiffs.Format.isEmptyStringDisplayValue(sideItem.text)}
          />
        )
      })}
    </div>
  )
})
