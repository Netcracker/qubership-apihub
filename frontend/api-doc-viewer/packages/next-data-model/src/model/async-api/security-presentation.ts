import { SecurityDisplayLabels } from "../security/display/labels"
import { SecurityNodeVisibility } from "../security/node-visibility"
import { SecurityPresentation } from "../security/presentation"

/**
 * The Security section labels of AsyncAPI 3.0: its thirteen scheme types.
 * Design: docs/design/async-api/features/security.md -> "AsyncAPI 3.0 security schemes".
 */
export class AsyncApiSecurityDisplayLabels extends SecurityDisplayLabels {
  protected readonly schemeTypeLabels: Readonly<Record<string, string>> = {
    userPassword: 'User / Password',
    apiKey: 'API key',
    X509: 'X.509 certificate',
    symmetricEncryption: 'Symmetric encryption',
    asymmetricEncryption: 'Asymmetric encryption',
    httpApiKey: 'HTTP API key',
    http: 'HTTP',
    oauth2: 'OAuth 2.0',
    openIdConnect: 'OpenID Connect',
    plain: 'SASL PLAIN',
    scramSha256: 'SASL SCRAM-SHA-256',
    scramSha512: 'SASL SCRAM-SHA-512',
    gssapi: 'SASL GSSAPI',
  }

  public readonly unresolvedSchemeText = 'Security scheme reference cannot be resolved.'
}

/** AsyncAPI card rows: `httpApiKey` has a parameter name, `apiKey` an API key location (`user` / `password`). */
export class AsyncApiSecurityNodeVisibility extends SecurityNodeVisibility {
  protected readonly parameterNameTypes: ReadonlySet<string> = new Set(['httpApiKey'])
  protected readonly apiKeyLocationTypes: ReadonlySet<string> = new Set(['apiKey'])
}

export const ASYNC_API_SECURITY_DISPLAY_LABELS = new AsyncApiSecurityDisplayLabels()

export const ASYNC_API_SECURITY_NODE_VISIBILITY = new AsyncApiSecurityNodeVisibility()

export const ASYNC_API_SECURITY_PRESENTATION: SecurityPresentation = {
  labels: ASYNC_API_SECURITY_DISPLAY_LABELS,
  visibility: ASYNC_API_SECURITY_NODE_VISIBILITY,
}
