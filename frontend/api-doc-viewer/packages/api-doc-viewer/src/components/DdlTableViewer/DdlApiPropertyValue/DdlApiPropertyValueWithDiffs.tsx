import { HighlightVariant } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { FC, memo } from "react"
import { DdlApiPropertyValueBase } from "./DdlApiPropertyValueBase"
import { DdlApiPropertyValueAppearance } from "./useDdlApiPropertyValueStyles"
import { useDdlApiPropertyValueWithDiffsStyles } from "./useDdlApiPropertyValueWithDiffsStyles"

export type DdlApiPropertyValueWithDiffsProps = {
  isVisible: boolean
  value: unknown
  appearance: DdlApiPropertyValueAppearance
  textHighlighterColor?: Exclude<HighlightVariant, HighlightVariant.Gray>
  backgroundColor?: HighlightVariant
}

export const DdlApiPropertyValueWithDiffs: FC<DdlApiPropertyValueWithDiffsProps> = memo<DdlApiPropertyValueWithDiffsProps>((props) => {
  const {
    isVisible,
    value,
    appearance,
    textHighlighterColor,
    backgroundColor,
  } = props

  const className = useDdlApiPropertyValueWithDiffsStyles({
    appearance,
    textHighlighterColor,
    backgroundColor,
  })

  return (
    <DdlApiPropertyValueBase
      isVisible={isVisible}
      value={value}
      className={className}
    />
  )
})
