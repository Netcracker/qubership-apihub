import { useMemo } from "react"

export function useAdditionalInfoPieceStyles(): string {
  return useMemo(() => {
    return [
      'additional-info-piece',
      'subheader',
      'block',
    ].join(' ')
  }, [])
}
