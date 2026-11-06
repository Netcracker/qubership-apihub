import { isArray, isObject, isString } from "../../../utilities"
import { SecurityAlternativeSpec, SecuritySchemeSpec, SecuritySpec } from "../../security/security-spec"
import { SecuritySpecBuilder, UnknownRecord } from "../../security/security-spec-builder"
import { OPENAPI_LOG_PREFIX } from "./log-prefix"
import { OpenApiOperationContext } from "./openapi-spec-transformer"

/**
 * OpenAPI Security section: the operation's `security` list, else the document's; each Security
 * Requirement Object is an alternative of the schemes it names, resolved in
 * `components.securitySchemes`; the required scopes are the requirement's lists (dialect decides
 * how they are read). The anonymous requirement `{}` is not an alternative: it sets
 * `allowsAnonymous` (the `Optional` badge). Design: docs/design/openapi/entities/security.md
 */
export class OpenApiSecuritySpecBuilder extends SecuritySpecBuilder<OpenApiOperationContext> {
  public readonly flowScopesKey = 'scopes'

  public build(context: OpenApiOperationContext): SecuritySpec | undefined {
    const { source, operation } = context
    const isInheritedFromDocument = operation.security === undefined
    const requirements = isInheritedFromDocument ? source.security : operation.security
    if (!isArray(requirements) || requirements.length === 0) {
      return undefined
    }
    const objects = requirements.filter(isObject)
    return {
      isInheritedFromDocument,
      allowsAnonymous: objects.some(OpenApiSecuritySpecBuilder.isAnonymousRequirement),
      alternatives: objects
        .filter(requirement => !OpenApiSecuritySpecBuilder.isAnonymousRequirement(requirement))
        .map(requirement => this.buildAlternative(context, requirement)),
    }
  }

  /** The anonymous requirement `{}`: no scheme is needed. */
  public static isAnonymousRequirement(requirement: UnknownRecord): boolean {
    return Object.keys(requirement).length === 0
  }

  public buildAlternative(context: OpenApiOperationContext, requirement: UnknownRecord): SecurityAlternativeSpec {
    const schemeNames = Object.keys(requirement)
    const schemes: Record<string, SecuritySchemeSpec> = {}
    for (const name of schemeNames) {
      const scopes = requirement[name]
      schemes[name] = this.buildRequirementScheme(context, name, isArray(scopes) ? scopes.filter(isString) : [])
    }
    return { schemeNames, schemes }
  }

  public takeDefinition(context: OpenApiOperationContext, name: string): UnknownRecord | undefined {
    const components = context.source.components
    const securitySchemes = isObject(components) ? components.securitySchemes : undefined
    const definition = isObject(securitySchemes) ? securitySchemes[name] : undefined
    return isObject(definition) ? definition : undefined
  }

  private buildRequirementScheme(context: OpenApiOperationContext, name: string, requiredScopes: string[]): SecuritySchemeSpec {
    const definition = this.takeDefinition(context, name)
    const type = isString(definition?.type) ? definition.type : undefined
    if (type && !context.dialect.securitySchemeTypes.has(type)) {
      this.logger.warn(`${OPENAPI_LOG_PREFIX} Security scheme type '${type}' is not defined in ${context.dialect.specVersion}.`)
    }
    const requiredScopesKind = context.dialect.resolveRequiredScopesKind(type)
    if (requiredScopesKind === 'ignored' && requiredScopes.length > 0) {
      this.logger.warn(`${OPENAPI_LOG_PREFIX} Scopes of security scheme '${name}' are ignored in ${context.dialect.specVersion}.`)
    }
    return this.buildScheme(name, definition, requiredScopes, requiredScopesKind)
  }
}
