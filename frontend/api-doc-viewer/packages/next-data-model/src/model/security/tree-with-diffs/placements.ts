import { FieldPlacements } from "../../abstract/tree-with-diffs/field-placements"
import { NodeDiffsSeverityPlacemennt } from "../../abstract/tree-with-diffs/tree-node.interface"
import { SecurityTreeNodeKind, SecurityTreeNodeKinds } from "../types/node-kind"
import { SECURITY_ALTERNATIVES_DIFF_KEY } from "./diff-keys"

const Placement = NodeDiffsSeverityPlacemennt

/**
 * Field diff -> the row it belongs to. One placement per row instance. The one description of which
 * card row shows which field's badge: the severities aggregators fill these placements and the card
 * rows (`SecuritySchemeCardRows`) read them.
 */
export const SECURITY_FIELD_PLACEMENTS: Readonly<Partial<Record<SecurityTreeNodeKind, FieldPlacements>>> = {
  [SecurityTreeNodeKinds.SECURITY]: {
    // The `Optional` badge (anonymous access) sits in the section title row.
    allowsAnonymous: Placement.TitleRow,
  },
  [SecurityTreeNodeKinds.SECURITY_ALTERNATIVES]: {
    // The toolbar row belongs to the alternatives container.
    [SECURITY_ALTERNATIVES_DIFF_KEY]: Placement.SelectorRow,
  },
  [SecurityTreeNodeKinds.SECURITY_SCHEME]: {
    type: Placement.TitleRow,
    description: Placement.DescriptionRow,
    // The parameter-name row (OpenAPI `apiKey`, AsyncAPI `httpApiKey`) or the API key location row
    // (AsyncAPI `apiKey`): one of them per scheme type, so they share the placement.
    in: Placement.SecuritySchemeParameterNameRow,
    parameterName: Placement.SecuritySchemeParameterNameRow,
    scheme: Placement.SecuritySchemeHttpSchemeRow,
    bearerFormat: Placement.SecuritySchemeBearerFormatRow,
    openIdConnectUrl: Placement.SecuritySchemeOpenIdConnectUrlRow,
    requiredScopes: Placement.SecurityRequiredScopesRow,
  },
  [SecurityTreeNodeKinds.OAUTH_FLOW]: {
    authorizationUrl: Placement.OAuthFlowAuthorizationUrlRow,
    tokenUrl: Placement.OAuthFlowTokenUrlRow,
    refreshUrl: Placement.OAuthFlowRefreshUrlRow,
    scopes: Placement.OAuthFlowScopesRow,
  },
}

/** Rows a node renders: a whole add / remove badges each of them. */
export const SECURITY_NODE_PLACEMENTS: Readonly<Partial<Record<SecurityTreeNodeKind, readonly NodeDiffsSeverityPlacemennt[]>>> = {
  [SecurityTreeNodeKinds.SECURITY]: [Placement.TitleRow],
  [SecurityTreeNodeKinds.SECURITY_ALTERNATIVES]: [Placement.SelectorRow],
  [SecurityTreeNodeKinds.SECURITY_SCHEME]: [
    Placement.TitleRow,
    Placement.DescriptionRow,
    Placement.SecuritySchemeParameterNameRow,
    Placement.SecuritySchemeHttpSchemeRow,
    Placement.SecuritySchemeBearerFormatRow,
    Placement.SecuritySchemeOpenIdConnectUrlRow,
    Placement.SecurityRequiredScopesRow,
  ],
  [SecurityTreeNodeKinds.OAUTH_FLOW]: [
    Placement.TitleRow,
    Placement.OAuthFlowAuthorizationUrlRow,
    Placement.OAuthFlowTokenUrlRow,
    Placement.OAuthFlowRefreshUrlRow,
    Placement.OAuthFlowScopesRow,
  ],
}
