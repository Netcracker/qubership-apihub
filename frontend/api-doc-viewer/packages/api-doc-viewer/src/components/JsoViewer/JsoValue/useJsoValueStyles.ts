import { useMemo } from "react"

export type JsoValueAppearance = 'text' | 'block'

export type UseJsoValueStylesInput = {
  appearance: JsoValueAppearance
}

export function useJsoValueStyles(input: UseJsoValueStylesInput): string {
  const {
    appearance,
  } = input

  return useMemo(() => {
    return [
      'jso-value',
      'subheader',
      appearance, // 'text' | 'block'
    ].filter(Boolean).join(' ')
  }, [appearance])
}
