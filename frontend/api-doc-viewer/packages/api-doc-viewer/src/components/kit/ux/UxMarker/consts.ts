import { annotation, breaking, deprecated, DiffType, nonBreaking, risky, unclassified } from "@netcracker/qubership-apihub-api-diff"

export const DIFF_TYPE_COLORS: Record<DiffType, string> = {
  [breaking]: '#ED4A54',
  [risky]: '#E98554',
  [deprecated]: '#FFB02E',
  [nonBreaking]: '#84CB7A',
  [annotation]: '#B866C9',
  [unclassified]: '#70A9EC',
}

export const DIFF_TYPE_NAME_MAP: Record<DiffType, string> = {
  [breaking]: 'breaking',
  [risky]: 'requires attention',
  [deprecated]: 'deprecated',
  [nonBreaking]: 'non-breaking',
  [unclassified]: 'unclassified',
  [annotation]: 'annotation',
}
