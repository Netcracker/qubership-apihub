import { getSecurityChildren, isSecuritySchemeNode } from "@apihub/utils/security/node-type-checkers"
import { SecurityBlockEdges } from "@netcracker/qubership-apihub-next-data-model/model/security/block-edges"
import { ReactElement } from "react"
import { StackBlock } from "../Layout/StackLayout"
import { SecuritySchemeNode } from "./SecuritySchemeCardBase"
import { SecurityAlternativeNode, SecurityAlternativesNode } from "./SecuritySectionBase"

/**
 * Layout elements of a Security section, shared by the API types: the toolbar row (alternatives, OR,
 * shown whenever there is an alternative) and the selected alternative's framed scheme cards (AND).
 * Each API type composes them with its own title row, card and selection state (`SecuritySectionBase`).
 */

/**
 * The toolbar row as a layout element, painted by the section's `securityAlternatives` container;
 * `render` draws the API type's `SecurityToolbarRow` (it owns the selection).
 */
export function buildSecurityToolbarBlock(toolbar: SecurityAlternativesNode, render: () => ReactElement): StackBlock {
  return {
    id: 'security-toolbar',
    ...SecurityBlockEdges.single(SecurityBlockEdges.toolbarRow(toolbar)),
    payload: render,
  }
}

/**
 * The selected alternative's content as layout elements: one element per card (4px outside its
 * border). `renderCard` draws the API type's card (keyed by the scheme id).
 */
export function buildSecurityContentBlocks(selected: SecurityAlternativeNode | undefined, renderCard: (scheme: SecuritySchemeNode) => ReactElement): StackBlock[] {
  return getSecurityChildren(selected, isSecuritySchemeNode).map(scheme => ({
    id: scheme.id,
    ...SecurityBlockEdges.single(SecurityBlockEdges.card(scheme)),
    payload: () => renderCard(scheme),
  }))
}
