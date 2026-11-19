import { DisplayMode } from "../abstract/display-mode"
import { isNonEmptyString } from "../../utilities"
import { DisplayModeRowCategories, DisplayModeRows } from "../abstract/display-mode-rows"
import { SecurityTreeNodeValueTypeOAuthFlow, SecurityTreeNodeValueTypeScheme } from "./types/node-value"

export type SecuritySchemeRowVisibility = {
  readonly showDescription: boolean
  /** `<Place> parameter name  <name>` (OpenAPI `apiKey`, AsyncAPI `httpApiKey`). */
  readonly showParameterName: boolean
  /** `API key location  User / Password` (AsyncAPI `apiKey`). */
  readonly showApiKeyLocation: boolean
  readonly showHttpScheme: boolean
  readonly showBearerFormat: boolean
  readonly showOpenIdConnectUrl: boolean
  /** The scheme's own `Scopes ▾` / `Roles ▾` list of required scopes (rows with `*`); hidden for `ignored` kinds. */
  readonly showRequiredScopeList: boolean
  /** The description text of every scope / role row of the card (flow scopes and the scheme's own list). */
  readonly showScopeDescriptions: boolean
  readonly showUnresolved: boolean
}

type SecuritySchemeRow = 'description' | 'parameterName' | 'apiKeyLocation' | 'httpScheme' | 'bearerFormat'
  | 'openIdConnectUrl' | 'requiredScopeList' | 'scopeDescriptions' | 'unresolved'

type SecurityOAuthFlowRow = 'authorizationUrl' | 'tokenUrl' | 'refreshUrl' | 'scopes'

/** Card rows by display-mode category: the scheme description and the scope / role descriptions are annotations. */
export const SECURITY_SCHEME_ROW_CATEGORIES: DisplayModeRowCategories<SecuritySchemeRow> = {
  description: 'annotation',
  parameterName: 'structure',
  apiKeyLocation: 'structure',
  httpScheme: 'structure',
  bearerFormat: 'structure',
  openIdConnectUrl: 'structure',
  requiredScopeList: 'structure',
  scopeDescriptions: 'annotation',
  unresolved: 'structure',
}

export const SECURITY_OAUTH_FLOW_ROW_CATEGORIES: DisplayModeRowCategories<SecurityOAuthFlowRow> = {
  authorizationUrl: 'structure',
  tokenUrl: 'structure',
  refreshUrl: 'structure',
  scopes: 'structure',
}

export type SecurityOAuthFlowRowVisibility = {
  readonly showAuthorizationUrl: boolean
  readonly showTokenUrl: boolean
  readonly showRefreshUrl: boolean
  readonly showScopes: boolean
}

/**
 * Row visibility of a security card. Works for plain and merged trees alike: a merged node value
 * keeps removed values, so "has content on either side" is "has a merged value". `simple` mode hides
 * the annotations (`SECURITY_*_ROW_CATEGORIES`); titles always show. Each API type says which scheme
 * types carry which rows. Design: docs/design/shared/features/display-mode-annotations.md.
 */
export abstract class SecurityNodeVisibility {
  /** Scheme types with a parameter name (`name` + `in`). */
  protected abstract readonly parameterNameTypes: ReadonlySet<string>
  /** Scheme types whose `in` is an API key location (no name). */
  protected abstract readonly apiKeyLocationTypes: ReadonlySet<string>

  public resolveSecurityScheme(value: SecurityTreeNodeValueTypeScheme | null, displayMode: DisplayMode): SecuritySchemeRowVisibility {
    const type = value?.type ?? ''
    const shown = DisplayModeRows.apply({
      description: isNonEmptyString(value?.description),
      parameterName: this.parameterNameTypes.has(type) && isNonEmptyString(value?.parameterName),
      apiKeyLocation: this.apiKeyLocationTypes.has(type) && isNonEmptyString(value?.in),
      httpScheme: type === 'http' && isNonEmptyString(value?.scheme),
      bearerFormat: type === 'http' && isNonEmptyString(value?.bearerFormat),
      openIdConnectUrl: type === 'openIdConnect' && isNonEmptyString(value?.openIdConnectUrl),
      requiredScopeList: !!value && value.requiredScopesKind !== 'ignored',
      scopeDescriptions: true,
      unresolved: !!value && !value.isResolved,
    }, SECURITY_SCHEME_ROW_CATEGORIES, displayMode)
    return {
      showDescription: shown.description,
      showParameterName: shown.parameterName,
      showApiKeyLocation: shown.apiKeyLocation,
      showHttpScheme: shown.httpScheme,
      showBearerFormat: shown.bearerFormat,
      showOpenIdConnectUrl: shown.openIdConnectUrl,
      showRequiredScopeList: shown.requiredScopeList,
      showScopeDescriptions: shown.scopeDescriptions,
      showUnresolved: shown.unresolved,
    }
  }

  public resolveOAuthFlow(value: SecurityTreeNodeValueTypeOAuthFlow | null, displayMode: DisplayMode): SecurityOAuthFlowRowVisibility {
    const shown = DisplayModeRows.apply({
      authorizationUrl: isNonEmptyString(value?.authorizationUrl),
      tokenUrl: isNonEmptyString(value?.tokenUrl),
      refreshUrl: isNonEmptyString(value?.refreshUrl),
      scopes: Object.keys(value?.scopes ?? {}).length > 0,
    }, SECURITY_OAUTH_FLOW_ROW_CATEGORIES, displayMode)
    return {
      showAuthorizationUrl: shown.authorizationUrl,
      showTokenUrl: shown.tokenUrl,
      showRefreshUrl: shown.refreshUrl,
      showScopes: shown.scopes,
    }
  }
}
