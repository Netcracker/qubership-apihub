import { buildRowDiffProps, toNodeDiffState } from "@apihub/components/shared-components/diffs/node-diff-props"
import { TitleRowProps } from "@apihub/components/shared-components/TitleRow/types"
import {
  DdlApiPropertyNodeWithDiffs,
  DdlApiPropertyRowValue,
  DdlApiTableHeaderNodeWithDiffs,
  takeDdlPropertyNodeDiffIfPresent,
  takeDdlPropertyTitleRowDiff,
  takeDdlTableNodeDiffIfPresent,
  takeDdlTableTitleRowDiff,
} from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/tree-with-diffs/property-row-diffs"

export type {
  DdlApiPropertyNodeWithDiffs,
  DdlApiPropertyRowValue,
} from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/tree-with-diffs/property-row-diffs"

export {
  DDL_COLUMN_FLAG_DIFF_KEYS,
  DDL_INDEX_FLAG_DIFF_KEYS,
} from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/tree-with-diffs/property-row-diffs"

export const takeNodeDiffIfPresent = takeDdlPropertyNodeDiffIfPresent

export function buildDdlPropertyTitleRowDiffProps(
  node: DdlApiPropertyNodeWithDiffs,
): Pick<TitleRowProps, "diff" | "descendantDiffs" | "diffsSeverities" | "highlightingMode"> {
  const rowDiffProps = buildRowDiffProps<DdlApiPropertyRowValue>(toNodeDiffState(node), {
    resolveDiff: () => takeDdlPropertyTitleRowDiff(node),
  })

  if (!rowDiffProps.diff) {
    return {}
  }

  return {
    ...rowDiffProps,
    highlightingMode: rowDiffProps.diff.highlightingMode,
  }
}

export function buildDdlTableTitleRowDiffProps(
  node: DdlApiTableHeaderNodeWithDiffs,
): Pick<TitleRowProps, "diff" | "descendantDiffs" | "diffsSeverities" | "highlightingMode"> {
  const rowDiffProps = buildRowDiffProps(toNodeDiffState(node), {
    resolveDiff: () => takeDdlTableTitleRowDiff(node),
  })

  if (!rowDiffProps.diff) {
    return {}
  }

  return {
    ...rowDiffProps,
    highlightingMode: rowDiffProps.diff.highlightingMode,
  }
}

export const takeTableNodeDiffIfPresent = takeDdlTableNodeDiffIfPresent
