import { BuildingServiceLogger } from "../../loggers"
import { SECURITY_OAUTH_FLOW_TYPES, SecurityOAuthFlowType, SecurityRequiredScopesKind } from "../../model/security/types/node-value"
import { isObject, isString } from "../../utilities"
import { SecurityOAuthFlowSpec, SecuritySchemeSpec, SecuritySpec } from "./security-spec"

export type UnknownRecord = Record<PropertyKey, unknown>

/**
 * Builds the Security section spec (`SecuritySpec`) of one API type from its own input. The base
 * reads a Security Scheme definition (the same object shape in OpenAPI and AsyncAPI: `type`,
 * `description`, `name`, `in`, `scheme`, `bearerFormat`, `flows`, `openIdConnectUrl`); each API type
 * says where the alternatives, the definitions and the required scopes come from.
 * Design: docs/design/async-api/features/security.md -> "Implementation plan".
 */
export abstract class SecuritySpecBuilder<TInput> {
  constructor(protected readonly logger: BuildingServiceLogger) { }

  /** The scope map of an OAuth flow: OpenAPI `scopes`, AsyncAPI `availableScopes`. */
  public abstract readonly flowScopesKey: string

  /** The section of `input`; `undefined` when it declares no security. */
  public abstract build(input: TInput): SecuritySpec | undefined

  /** A scheme (card) from its definition; `undefined` definition = not resolvable. */
  protected buildScheme(
    name: string,
    definition: UnknownRecord | undefined,
    requiredScopes: string[],
    requiredScopesKind: SecurityRequiredScopesKind,
  ): SecuritySchemeSpec {
    const type = isString(definition?.type) ? definition.type : undefined
    const flows = this.buildOAuthFlows(definition?.flows)
    return {
      name,
      isResolved: definition !== undefined,
      ...(type ? { type } : {}),
      ...(isString(definition?.description) ? { description: definition.description } : {}),
      ...(isString(definition?.in) ? { in: definition.in } : {}),
      ...(isString(definition?.name) ? { parameterName: definition.name } : {}),
      ...(isString(definition?.scheme) ? { scheme: definition.scheme } : {}),
      ...(isString(definition?.bearerFormat) ? { bearerFormat: definition.bearerFormat } : {}),
      ...(isString(definition?.openIdConnectUrl) ? { openIdConnectUrl: definition.openIdConnectUrl } : {}),
      requiredScopes,
      requiredScopesKind,
      ...(flows ? { flows } : {}),
    }
  }

  protected buildOAuthFlows(flows: unknown): Partial<Record<SecurityOAuthFlowType, SecurityOAuthFlowSpec>> | undefined {
    if (!isObject(flows)) {
      return undefined
    }
    const result: Partial<Record<SecurityOAuthFlowType, SecurityOAuthFlowSpec>> = {}
    for (const flowType of SECURITY_OAUTH_FLOW_TYPES) {
      const flow = flows[flowType]
      if (isObject(flow)) {
        result[flowType] = this.buildOAuthFlow(flowType, flow)
      }
    }
    return Object.keys(result).length > 0 ? result : undefined
  }

  protected buildOAuthFlow(flowType: SecurityOAuthFlowType, flow: UnknownRecord): SecurityOAuthFlowSpec {
    const scopes: Record<string, string> = {}
    const source = flow[this.flowScopesKey]
    if (isObject(source)) {
      for (const scope of Object.keys(source)) {
        const scopeDescription = source[scope]
        scopes[scope] = isString(scopeDescription) ? scopeDescription : ''
      }
    }
    return {
      flowType,
      ...(isString(flow.authorizationUrl) ? { authorizationUrl: flow.authorizationUrl } : {}),
      ...(isString(flow.tokenUrl) ? { tokenUrl: flow.tokenUrl } : {}),
      ...(isString(flow.refreshUrl) ? { refreshUrl: flow.refreshUrl } : {}),
      scopes,
    }
  }
}
