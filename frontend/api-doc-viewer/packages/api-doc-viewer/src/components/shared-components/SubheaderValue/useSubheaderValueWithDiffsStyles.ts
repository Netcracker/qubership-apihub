import { HighlightVariant } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { DiffsClassesBuilder } from "@netcracker/qubership-apihub-next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/utilities"
import { useMemo } from "react"
import { SubheaderValueAppearance } from "./types"
import { useSubheaderValueStyles } from "./useSubheaderValueStyles"

export type UseSubheaderValueWithDiffsStylesInput = {
  appearance: SubheaderValueAppearance
  textHighlighterColor?: Exclude<HighlightVariant, HighlightVariant.Gray>
  backgroundColor?: HighlightVariant
}

export function useSubheaderValueWithDiffsStyles(
  input: UseSubheaderValueWithDiffsStylesInput,
): string {
  const {
    appearance,
    textHighlighterColor,
    backgroundColor,
  } = input

  const inheritedStyles = useSubheaderValueStyles({ appearance })

  return useMemo(() => {
    return [
      inheritedStyles,
      DiffsClassesBuilder.highlighter(textHighlighterColor),
      DiffsClassesBuilder.background(backgroundColor),
    ].filter(Boolean).join(" ")
  }, [appearance, backgroundColor, inheritedStyles, textHighlighterColor])
}
