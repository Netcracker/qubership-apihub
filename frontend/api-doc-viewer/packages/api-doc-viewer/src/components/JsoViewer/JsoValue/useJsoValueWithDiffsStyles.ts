import { HighlightVariant } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { DiffsClassesBuilder } from "@netcracker/qubership-apihub-next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/utilities"
import { useMemo } from "react"
import { useJsoValueStyles } from "./useJsoValueStyles"

export type JsoValueWithDiffsAppearance = 'text' | 'block'

export type UseJsoValueWithDiffsStylesInput = {
  appearance: JsoValueWithDiffsAppearance
  textHighlighterColor?: Exclude<HighlightVariant, HighlightVariant.Gray>
  borderShadowColor?: HighlightVariant
}

export function useJsoValueWithDiffsStyles(input: UseJsoValueWithDiffsStylesInput): string {
  const {
    appearance,
    textHighlighterColor,
    borderShadowColor,
  } = input

  const inheritedStyles = useJsoValueStyles({ appearance })

  return useMemo(() => {
    return [
      inheritedStyles,
      appearance === 'text' ? DiffsClassesBuilder.highlighter(textHighlighterColor) : '',
      appearance === 'block' ? DiffsClassesBuilder.borderShadow(borderShadowColor) : '',
    ].filter(Boolean).join(' ')
  }, [appearance, borderShadowColor, inheritedStyles, textHighlighterColor])
}
