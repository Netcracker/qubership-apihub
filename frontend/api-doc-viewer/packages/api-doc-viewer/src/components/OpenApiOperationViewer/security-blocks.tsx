import { OpenApiViewSelection } from "@apihub/utils/openapi/view-selection"
import { findSecurityAlternatives, getSecurityAlternatives } from "@apihub/utils/security/node-type-checkers"
import { OpenApiBlockEdges } from "@netcracker/qubership-apihub-next-data-model/model/openapi/layout"
import { SecurityBlockEdges } from "@netcracker/qubership-apihub-next-data-model/model/security/block-edges"
import { buildSecurityContentBlocks, buildSecurityToolbarBlock } from "../shared-components/Security/security-section-blocks"
import { StackBlock } from "../shared-components/Layout/StackLayout"
import { OpenApiSecuritySchemeCard } from "./OpenApiSecuritySchemeCard"
import { OpenApiViewState } from "./OpenApiViewStateContext"
import { OpenApiSecurityToolbarRow, SecurityNode, SecurityNodeViewer, SecurityTitleRow } from "./SecurityNodeViewer"

/**
 * The Security section as a layout block. Its elements: the title row (with the `Optional` badge of
 * anonymous access), the toolbar row when there is an alternative, then the selected alternative's
 * scheme cards (each card one element; 4px outside its border). The toolbar and content come from
 * `security-section-blocks.ts`; the selection lives in the operation view state.
 */
export function buildSecurityBlock(node: SecurityNode, view: OpenApiViewState): StackBlock {
  const selected = OpenApiViewSelection.alternative(node, view.selection)
  // An anonymous-only list (`[{}]`) has no alternative: the title row alone.
  const toolbar = findSecurityAlternatives(node)
  const hasAlternatives = getSecurityAlternatives(node).length > 0
  const children: [StackBlock, ...StackBlock[]] = [
    { id: 'security-title', ...OpenApiBlockEdges.single(SecurityBlockEdges.titleRow(node)), payload: () => <SecurityTitleRow key="security-title" node={node} /> },
    ...(toolbar && hasAlternatives ? [buildSecurityToolbarBlock(toolbar, () => <OpenApiSecurityToolbarRow key="security-toolbar" node={node} toolbar={toolbar} />)] : []),
    ...buildSecurityContentBlocks(selected, scheme => <OpenApiSecuritySchemeCard key={scheme.id} node={scheme} />),
  ]
  return {
    id: 'security',
    ...OpenApiBlockEdges.container(children),
    payload: () => <SecurityNodeViewer key="security" blocks={children} />,
  }
}
