import { takeSecuritySeverities } from "@apihub/utils/security/diff-state"
import { getSecurityToolbarOptions } from "@apihub/utils/security/node-type-checkers"
import { hasNodeDiffs } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/row-diffs-base"
import { NodeDiffsSeverityPlacemennt } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { SecurityDisplayLabels } from "@netcracker/qubership-apihub-next-data-model/model/security/display/labels"
import { SecurityRowDiffs } from "@netcracker/qubership-apihub-next-data-model/model/security/tree-with-diffs/row-diffs"
import { SecurityTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/security/types/aliases"
import { SecurityTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/security/types/node-kind"
import { FC, useMemo } from "react"
import { SelectorOption } from "../Selector/Selector"
import { PrecededBy } from "../WithPrecededByProps"
import { SecurityToolbar } from "./SecurityToolbar"


export type SecuritySectionNode = SecurityTreeNode<typeof SecurityTreeNodeKinds.SECURITY>
/** The toolbar's complex container; its nested nodes are the alternatives. */
export type SecurityAlternativesNode = SecurityTreeNode<typeof SecurityTreeNodeKinds.SECURITY_ALTERNATIVES>
export type SecurityAlternativeNode = SecurityTreeNode<typeof SecurityTreeNodeKinds.SECURITY_REQUIREMENT>

/**
 * Pieces of a Security section, shared by the API types: the alternatives toolbar row here, the
 * section's layout elements in `security-section-blocks.ts`. Anonymous access (OpenAPI `{}`) is no
 * alternative: the API type's title row shows it. Each API type composes them with its own title
 * row, card (`OpenApiSecuritySchemeCard` / `AsyncApiSecuritySchemeCard`) and selection state.
 * Design: docs/design/openapi/entities/security.md, docs/design/async-api/features/security.md.
 */

export type SecurityToolbarRowProps = {
  /** The section's `securityAlternatives` container (`findSecurityAlternatives`): options, row diff and badge. */
  toolbar: SecurityAlternativesNode
  labels: SecurityDisplayLabels
  /** The shown alternative (`resolveSelectedSecurityAlternative`). */
  selected: SecurityAlternativeNode | undefined
  onSelect: (alternative: SecurityAlternativeNode) => void
}

/** The alternatives toolbar; the selection lives with the API type's viewer. */
export const SecurityToolbarRow: FC<SecurityToolbarRowProps> = ({ toolbar, labels, selected, onSelect }) => {
  const alternatives = useMemo(() => getSecurityToolbarOptions(toolbar), [toolbar])
  const options: SelectorOption<SecurityAlternativeNode>[] = useMemo(() => alternatives.map((alternative, index) => ({
    node: alternative,
    title: labels.securityRequirementTitle(alternative.value()?.schemeNames ?? []),
    testId: `security-alternative-${index}`,
    // Markers show inner changes only (V9, as response codes and media types): a wholly added /
    // removed option shows only its green / red border.
    ...(hasNodeDiffs(alternative)
      ? { diffs: alternative.diffs, descendantDiffsSummary: SecurityRowDiffs.NodeLevel.takeChangesMarkerSummary(alternative) }
      : {}),
  })), [alternatives, labels])
  const selectedOption = options.find(option => option.node.id === selected?.id) ?? null

  return (
    <SecurityToolbar
      data-precededby={PrecededBy.SEPARATOR_LAYOUT_ROW}
      options={options}
      selectedOption={selectedOption}
      onSelectOption={(option) => onSelect(option.node)}
      diff={SecurityRowDiffs.Alternatives.takeToolbarRowDiff(toolbar)}
      severity={takeSecuritySeverities(toolbar)?.[NodeDiffsSeverityPlacemennt.SelectorRow]}
      isShownOnSide={(side) => SecurityRowDiffs.Alternatives.isToolbarShownOnSide(toolbar, side)}
    />
  )
}
