import { useMemo } from "react"
import { SubheaderValueAppearance } from "./types"

export type UseSubheaderValueStylesInput = {
  appearance: SubheaderValueAppearance
}

export function useSubheaderValueStyles(input: UseSubheaderValueStylesInput): string {
  const { appearance } = input

  return useMemo(() => {
    return [
      'title-row-subheader-value',
      'subheader',
      appearance,
    ].filter(Boolean).join(' ')
  }, [appearance])
}
