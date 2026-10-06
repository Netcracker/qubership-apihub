import { HighlightVariant } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { FC, memo } from "react"
import { SubheaderValueBase } from "./SubheaderValueBase"
import './SubheaderValue.css'
import { SubheaderValueAppearance } from "./types"
import { useSubheaderValueWithDiffsStyles } from "./useSubheaderValueWithDiffsStyles"

export type SubheaderValueWithDiffsProps = {
  isVisible: boolean
  value: unknown
  appearance?: SubheaderValueAppearance
  textHighlighterColor?: Exclude<HighlightVariant, HighlightVariant.Gray>
  backgroundColor?: HighlightVariant
}

export const SubheaderValueWithDiffs: FC<SubheaderValueWithDiffsProps> = memo<SubheaderValueWithDiffsProps>((props) => {
  const {
    isVisible,
    value,
    appearance = SubheaderValueAppearance.Text,
    textHighlighterColor,
    backgroundColor,
  } = props

  const className = useSubheaderValueWithDiffsStyles({
    appearance,
    textHighlighterColor,
    backgroundColor,
  })

  return (
    <SubheaderValueBase
      isVisible={isVisible}
      value={value}
      className={className}
    />
  )
})
