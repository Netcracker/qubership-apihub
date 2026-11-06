import { SecurityDisplayLabels } from "../security/display/labels"
import { SecurityNodeVisibility } from "../security/node-visibility"
import { SecurityPresentation } from "../security/presentation"

/** The Security section labels of OpenAPI: its five scheme types. */
export class OpenApiSecurityDisplayLabels extends SecurityDisplayLabels {
  protected readonly schemeTypeLabels: Readonly<Record<string, string>> = {
    apiKey: 'API key',
    http: 'HTTP',
    oauth2: 'OAuth 2.0',
    openIdConnect: 'OpenID Connect',
    mutualTLS: 'Mutual TLS',
  }

  public readonly unresolvedSchemeText = 'Security scheme is not defined in components.'
}

/** OpenAPI card rows: `apiKey` has a parameter name; there is no API key location. */
export class OpenApiSecurityNodeVisibility extends SecurityNodeVisibility {
  protected readonly parameterNameTypes: ReadonlySet<string> = new Set(['apiKey'])
  protected readonly apiKeyLocationTypes: ReadonlySet<string> = new Set()
}

export const OPENAPI_SECURITY_DISPLAY_LABELS = new OpenApiSecurityDisplayLabels()

export const OPENAPI_SECURITY_NODE_VISIBILITY = new OpenApiSecurityNodeVisibility()

export const OPENAPI_SECURITY_PRESENTATION: SecurityPresentation = {
  labels: OPENAPI_SECURITY_DISPLAY_LABELS,
  visibility: OPENAPI_SECURITY_NODE_VISIBILITY,
}
