import { FieldPlacementsTable } from "../abstract/tree-with-diffs/field-placements"
import { NodeDiffsSeverityPlacemennt } from "../abstract/tree-with-diffs/tree-node.interface"
import { SECURITY_PROP_LABELS, SecurityDisplayLabels } from "./display/labels"
import { SecurityOAuthFlowRowVisibility, SecuritySchemeRowVisibility } from "./node-visibility"
import { SECURITY_FIELD_PLACEMENTS } from "./tree-with-diffs/placements"
import { SecurityTreeNodeKind, SecurityTreeNodeKinds } from "./types/node-kind"

/** One `label  value` row of a security card: what it shows and which badge it reads. */
export type SecurityPropRow = {
  /** Row id within its block (a flow's rows are prefixed by the viewer with the flow key). */
  readonly key: string
  /** The node value field the row shows (per side). */
  readonly field: string
  readonly label: string
  /** The severities slot of the row's floating badge (`SECURITY_FIELD_PLACEMENTS`). */
  readonly placement: NodeDiffsSeverityPlacemennt
  /** The value is a URL rendered as a link. */
  readonly link: boolean
  /** Display text of a side's raw value (a location code -> its label); the raw value when absent. */
  readonly format?: (raw: string) => string | undefined
}

type SchemePropRowDefinition = {
  readonly key: string
  readonly field: string
  readonly label: string
  readonly link: boolean
  readonly shown: (visibility: SecuritySchemeRowVisibility) => boolean
  readonly format?: (labels: SecurityDisplayLabels) => (raw: string) => string | undefined
}

type FlowPropRowDefinition = {
  readonly field: string
  readonly label: string
  readonly shown: (visibility: SecurityOAuthFlowRowVisibility) => boolean
}

/**
 * The scheme's `label  value` rows after the parameter-name row, in display order. The parameter-name
 * row itself is not table-shaped (its label carries the highlighted place word) and stays in the card.
 */
const SCHEME_PROP_ROWS: readonly SchemePropRowDefinition[] = [
  // AsyncAPI `apiKey`: `in` is where the key goes (`user` / `password`), shown as its label.
  { key: 'apiKeyLocation', field: 'in', label: SECURITY_PROP_LABELS.apiKeyLocation, link: false, shown: visibility => visibility.showApiKeyLocation, format: labels => location => labels.apiKeyLocation(location) },
  { key: 'scheme', field: 'scheme', label: SECURITY_PROP_LABELS.httpAuthorizationScheme, link: false, shown: visibility => visibility.showHttpScheme },
  { key: 'bearerFormat', field: 'bearerFormat', label: SECURITY_PROP_LABELS.bearerFormat, link: false, shown: visibility => visibility.showBearerFormat },
  { key: 'openIdConnectUrl', field: 'openIdConnectUrl', label: SECURITY_PROP_LABELS.openIdConnectUrl, link: true, shown: visibility => visibility.showOpenIdConnectUrl },
]

/** An OAuth flow part's URL rows, in display order (between the flow header and its scopes). */
const FLOW_PROP_ROWS: readonly FlowPropRowDefinition[] = [
  { field: 'authorizationUrl', label: SECURITY_PROP_LABELS.authorizationUrl, shown: visibility => visibility.showAuthorizationUrl },
  { field: 'tokenUrl', label: SECURITY_PROP_LABELS.tokenUrl, shown: visibility => visibility.showTokenUrl },
  { field: 'refreshUrl', label: SECURITY_PROP_LABELS.refreshUrl, shown: visibility => visibility.showRefreshUrl },
]

/**
 * The `label  value` rows of a security scheme card, for every API type: which rows a scheme / flow
 * shows (from the API type's visibility and labels) and the badge placement each row reads. The one
 * place that ties a card row to its field and placement.
 * Design: docs/design/openapi/entities/security.md -> "Scheme card".
 */
export class SecuritySchemeCardRows {
  public static schemeProps(visibility: SecuritySchemeRowVisibility, labels: SecurityDisplayLabels): SecurityPropRow[] {
    return SCHEME_PROP_ROWS.filter(row => row.shown(visibility)).map(row => ({
      key: row.key,
      field: row.field,
      label: row.label,
      placement: SecuritySchemeCardRows.placementOf(SecurityTreeNodeKinds.SECURITY_SCHEME, row.field),
      link: row.link,
      ...(row.format ? { format: row.format(labels) } : {}),
    }))
  }

  public static flowProps(visibility: SecurityOAuthFlowRowVisibility): SecurityPropRow[] {
    return FLOW_PROP_ROWS.filter(row => row.shown(visibility)).map(row => ({
      key: row.field,
      field: row.field,
      label: row.label,
      placement: SecuritySchemeCardRows.placementOf(SecurityTreeNodeKinds.OAUTH_FLOW, row.field),
      link: true,
    }))
  }

  /** The placement the parameter-name row reads (`<Place> parameter name  <name>`). */
  public static parameterNamePlacement(): NodeDiffsSeverityPlacemennt {
    return SecuritySchemeCardRows.placementOf(SecurityTreeNodeKinds.SECURITY_SCHEME, 'parameterName')
  }

  /** A card row's placement; every card row field is in the table (unit-tested), so a gap is a bug. */
  private static placementOf(kind: SecurityTreeNodeKind, field: string): NodeDiffsSeverityPlacemennt {
    const placement = FieldPlacementsTable.primary(SECURITY_FIELD_PLACEMENTS[kind], field)
    if (!placement) {
      throw new Error(`[Security] No severity placement for ${kind}.${field}`)
    }
    return placement
  }
}
