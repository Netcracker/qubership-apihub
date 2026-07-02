import { useMemo } from "react"

export type DdlApiPropertyValueAppearance = 'text' | 'block'

export type UseDdlApiPropertyValueStylesInput = {
  appearance: DdlApiPropertyValueAppearance
}

export function useDdlApiPropertyValueStyles(input: UseDdlApiPropertyValueStylesInput): string {
  const {
    appearance,
  } = input

  return useMemo(() => {
    return [
      'ddlapi-property-value',
      'subheader',
      appearance,
    ].filter(Boolean).join(' ')
  }, [appearance])
}
