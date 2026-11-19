import { SecurityOAuthFlowType, SecurityRequiredScopesKind } from "../types/node-value"

const OAUTH_FLOW_NAMES: Readonly<Record<SecurityOAuthFlowType, string>> = {
  implicit: 'Implicit',
  password: 'Password',
  clientCredentials: 'Client Credentials',
  authorizationCode: 'Authorization Code',
}

const PARAMETER_LOCATION_LABELS: Readonly<Record<string, string>> = {
  header: 'Header',
  query: 'Query',
  cookie: 'Cookie',
  path: 'Path',
}

const API_KEY_LOCATION_LABELS: Readonly<Record<string, string>> = {
  user: 'User',
  password: 'Password',
}

/** Labels of the security props (label / value rows of a security scheme card), every API type. */
export const SECURITY_PROP_LABELS = {
  httpAuthorizationScheme: 'HTTP Authorization Scheme',
  bearerFormat: 'Bearer Format',
  openIdConnectUrl: 'OpenID Connect URL',
  authorizationUrl: 'Authorization URL',
  tokenUrl: 'Token URL',
  refreshUrl: 'Refresh URL',
  scopes: 'Scopes',
  roles: 'Roles',
  apiKeyLocation: 'API key location',
} as const

/** Parameter-name prop label split into the place word (from `in`) and the common rest: `Header` + ` parameter name`. */
export type SecurityParameterNameLabel = {
  readonly place: string
  readonly suffix: string
}

const PARAMETER_NAME_LABEL_SUFFIX = ' parameter name'

/** Plain text before the flow name in a flow part header: `Flow type **Authorization Code**`. */
export const SECURITY_OAUTH_FLOW_HEADER_PREFIX = 'Flow type'

/** The Security section title of every API type. */
export const SECURITY_SECTION_TITLE = 'Security'

/** The title-row badge of a Security section that allows anonymous access (OpenAPI `{}`). */
export const SECURITY_OPTIONAL_BADGE_TEXT = 'Optional'

/**
 * Display labels of a Security section, resolved in the data layer (never in JSX). The base holds
 * what every API type shares; each API type names its own scheme types and its unresolved text.
 * Design: docs/design/async-api/features/security.md -> "Fields: AsyncAPI vs OpenAPI".
 */
export abstract class SecurityDisplayLabels {
  /** Gray type text per scheme `type`; unknown types are shown as they are. */
  protected abstract readonly schemeTypeLabels: Readonly<Record<string, string>>

  /** The text row of a card whose scheme definition cannot be resolved. */
  public abstract readonly unresolvedSchemeText: string

  /** Option title of a security alternative: scheme names joined with ` + `. */
  public securityRequirementTitle(schemeNames: readonly string[]): string {
    return schemeNames.join(' + ')
  }

  public securitySchemeType(type: string | undefined): string | undefined {
    return type === undefined ? undefined : this.schemeTypeLabels[type] ?? type
  }

  /** Label of a scheme's own list of required scopes: `Roles` for OAS 3.1 roles, else `Scopes`. */
  public requiredScopeListLabel(kind: SecurityRequiredScopesKind): string {
    return kind === 'roles' ? SECURITY_PROP_LABELS.roles : SECURITY_PROP_LABELS.scopes
  }

  /** The flow name of a flow part header (`Flow type **Authorization Code**`). */
  public oauthFlowName(flowType: SecurityOAuthFlowType): string {
    return OAUTH_FLOW_NAMES[flowType]
  }

  /** Parameter-name prop label from `in`: `Header parameter name`, `Query parameter name`, … */
  public apiKeyParameterNameLabel(location: string | undefined): SecurityParameterNameLabel {
    const place = location === undefined ? undefined : PARAMETER_LOCATION_LABELS[location]
    return { place: place ?? 'API key', suffix: PARAMETER_NAME_LABEL_SUFFIX }
  }

  /** Value of the API key location prop (AsyncAPI `apiKey` `in`): `User` / `Password`. */
  public apiKeyLocation(location: string | undefined): string | undefined {
    return location === undefined ? undefined : API_KEY_LOCATION_LABELS[location] ?? location
  }
}
