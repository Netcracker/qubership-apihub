import { HighlightVariant } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { DiffsClassesBuilder } from "@netcracker/qubership-apihub-next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/utilities"
import { useMemo } from "react"
import { DdlApiPropertyValueAppearance, useDdlApiPropertyValueStyles } from "./useDdlApiPropertyValueStyles"

export type UseDdlApiPropertyValueWithDiffsStylesInput = {
  appearance: DdlApiPropertyValueAppearance
  textHighlighterColor?: Exclude<HighlightVariant, HighlightVariant.Gray>
  backgroundColor?: HighlightVariant
}

export function useDdlApiPropertyValueWithDiffsStyles(
  input: UseDdlApiPropertyValueWithDiffsStylesInput,
): string {
  const {
    appearance,
    textHighlighterColor,
    backgroundColor,
  } = input

  const inheritedStyles = useDdlApiPropertyValueStyles({ appearance })

  return useMemo(() => {
    return [
      inheritedStyles,
      DiffsClassesBuilder.highlighter(textHighlighterColor),
      DiffsClassesBuilder.background(backgroundColor),
    ].filter(Boolean).join(" ")
  }, [appearance, backgroundColor, inheritedStyles, textHighlighterColor])
}
