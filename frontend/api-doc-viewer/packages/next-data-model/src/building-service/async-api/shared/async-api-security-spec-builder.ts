import { BuildingServiceLogger } from "../../../loggers"
import { SecurityRequiredScopesKind } from "../../../model/security/types/node-value"
import { isArray, isObject, isString } from "../../../utilities"
import { SecurityAlternativeSpec, SecuritySpec } from "../../security/security-spec"
import { SecuritySpecBuilder, UnknownRecord } from "../../security/security-spec-builder"
import { SideReader } from "../../shared/side-reader"

/** The owner of a `security` list (the operation or a server) and the whole document it belongs to. */
export type AsyncApiSecurityInput = {
  readonly source: unknown
  readonly owner: unknown
}

/** Scheme types whose `scopes` field lists the required scopes. */
const REQUIRED_SCOPES_TYPES: ReadonlySet<string> = new Set(['oauth2', 'openIdConnect'])

/**
 * AsyncAPI 3.0 Security section of an operation or a server: the `security` list holds the schemes
 * themselves (resolved `$ref`s), each one alternative ("only one MUST be satisfied"); a scheme's own
 * `scopes` are its required scopes; OAuth flows declare `availableScopes`. A scheme is named by the
 * reference-name symbol, else by its `components.securitySchemes` key (same content), else by its
 * list position. Design: docs/design/async-api/features/security.md
 */
export class AsyncApiSecuritySpecBuilder extends SecuritySpecBuilder<AsyncApiSecurityInput> {
  public readonly flowScopesKey = 'availableScopes'

  constructor(logger: BuildingServiceLogger, protected readonly referenceNamePropertyKey: symbol) {
    super(logger)
  }

  public build(input: AsyncApiSecurityInput): SecuritySpec | undefined {
    const list = isObject(input.owner) ? input.owner.security : undefined
    if (!isArray(list) || list.length === 0) {
      return undefined
    }
    return {
      isInheritedFromDocument: false,
      allowsAnonymous: false,
      alternatives: list.map((item, index) => this.buildAlternative(input.source, item, index)),
    }
  }

  /** One list item: an alternative of one scheme. */
  public buildAlternative(source: unknown, item: unknown, index: number): SecurityAlternativeSpec {
    const name = this.resolveSchemeName(source, item, index)
    const definition = this.resolveDefinition(item)
    const type = isString(definition?.type) ? definition.type : undefined
    const requiredScopesKind: SecurityRequiredScopesKind = type !== undefined && REQUIRED_SCOPES_TYPES.has(type) ? 'scopes' : 'ignored'
    const scopes = definition?.scopes
    const requiredScopes = requiredScopesKind === 'scopes' && isArray(scopes) ? scopes.filter(isString) : []
    return {
      schemeNames: [name],
      schemes: { [name]: this.buildScheme(name, definition, requiredScopes, requiredScopesKind) },
    }
  }

  /** The scheme itself; `undefined` for a `$ref` the unifier could not resolve. */
  protected resolveDefinition(item: unknown): UnknownRecord | undefined {
    if (!isObject(item)) {
      return undefined
    }
    return isString(item.$ref) && item.type === undefined ? undefined : item
  }

  protected resolveSchemeName(source: unknown, item: unknown, index: number): string {
    if (isObject(item)) {
      const referenceName = item[this.referenceNamePropertyKey]
      if (isString(referenceName)) {
        return referenceName
      }
      if (isString(item.$ref) && item.type === undefined) {
        return item.$ref.split('/').at(-1) ?? item.$ref
      }
      const components = isObject(source) ? source.components : undefined
      const securitySchemes = isObject(components) ? components.securitySchemes : undefined
      if (isObject(securitySchemes)) {
        const match = Object.keys(securitySchemes).find(key => SideReader.deepEqual(securitySchemes[key], item))
        if (match) {
          return match
        }
      }
    }
    return `Security scheme ${index + 1}`
  }
}
