import { Diff } from "@netcracker/qubership-apihub-api-diff"
import { SECURITY_ALTERNATIVES_DIFF_KEY } from "../../model/security/tree-with-diffs/diff-keys"
import { SECURITY_OAUTH_FLOW_TYPES } from "../../model/security/types/node-value"
import { DiffsRecord, isArray, isObject, isString } from "../../utilities"
import { SideContext, SideContexts, SideReader } from "../shared/side-reader"
import { SecurityAlternativeSpec, SecurityOAuthFlowSpec, SecuritySchemeSpec } from "./security-spec"
import { UnknownRecord } from "./security-spec-builder"

/** Scheme-definition field -> scheme spec field. */
const SECURITY_SCHEME_FIELDS: ReadonlyArray<readonly [string, string]> = [
  ['type', 'type'],
  ['description', 'description'],
  ['in', 'in'],
  ['name', 'parameterName'],
  ['scheme', 'scheme'],
  ['bearerFormat', 'bearerFormat'],
  ['openIdConnectUrl', 'openIdConnectUrl'],
]

const OAUTH_FLOW_FIELDS: readonly string[] = ['authorizationUrl', 'tokenUrl', 'refreshUrl']

/**
 * The with-diffs part of a Security section, shared by the API types: diff records of a scheme
 * definition and its OAuth flows, of the required scopes, and of the toolbar. It reads a merged
 * `apiDiff` document per side (`SideReader`) and writes the records the record-driven aggregators
 * map to rows. The API-type builders say where the definitions and lists are.
 * Design: docs/design/openapi/features/diffs.md, docs/design/async-api/features/security.md.
 */
export class SecuritySpecDiffsDecorator {
  constructor(private readonly reader: SideReader, private readonly flowScopesKey: string) { }

  /**
   * The record of the alternatives list (the crawl value of the complex `securityAlternatives`
   * container): the per-alternative entries (`alternativesRecord`, keyed by index) plus the
   * toolbar's synthetic `alternatives` replace when any alternative was wholly added or removed,
   * typed by the strongest of them (row color + `SelectorRow` severity of the toolbar).
   */
  public writeAlternativesRecord(alternatives: SecurityAlternativeSpec[], alternativesRecord: DiffsRecord): void {
    this.reader.writeOptionsDiff(alternativesRecord, SECURITY_ALTERNATIVES_DIFF_KEY, alternativesRecord, SideReader.isWholeChange)
    this.reader.writeRecord(alternatives, alternativesRecord)
  }

  /** Scope list changes become one `requiredScopes` replace carrying both side lists. */
  public decorateRequiredScopes(scheme: SecuritySchemeSpec, scopes: unknown, scopesContext: SideContext): void {
    if (!scopesContext.before || !scopesContext.after || !isArray(scopes)) {
      return
    }
    const before: string[] = []
    const after: string[] = []
    const causes: (Diff | undefined)[] = []
    scopes.forEach((scope, index) => {
      const scopeField = this.reader.readField(scopes, index, scopesContext)
      if (scopeField.diff) {
        causes.push(scopeField.diff)
      }
      if (scopeField.beforePresent && isString(scopeField.before)) {
        before.push(scopeField.before)
      }
      if (scopeField.afterPresent && isString(scope)) {
        after.push(scope)
      }
    })
    const diff = this.reader.diffShownValues(before.length > 0 ? before : undefined, after.length > 0 ? after : undefined, causes)
    this.reader.writeDiff(scheme, 'requiredScopes', diff)
  }

  /**
   * Field diffs of a scheme definition and its flows. `definitionContext`: the sides where the
   * definition exists; `schemeContext`: the sides where the card exists.
   */
  public decorateSchemeDefinition(scheme: SecuritySchemeSpec, definition: UnknownRecord, definitionContext: SideContext, schemeContext: SideContext): void {
    const schemeRecord: DiffsRecord = {}
    for (const [sourceKey, targetKey] of SECURITY_SCHEME_FIELDS) {
      const diff = this.diffOfField(definition, sourceKey, definitionContext, schemeContext)
      if (diff) {
        schemeRecord[targetKey] = diff
      }
    }
    const flowsField = this.reader.readField(definition, 'flows', definitionContext)
    const flows = definition.flows
    if (isObject(flows) && scheme.flows) {
      const flowsContext = this.reader.childContext(flowsField)
      for (const flowType of SECURITY_OAUTH_FLOW_TYPES) {
        const flowSpec = scheme.flows[flowType]
        const flow = flows[flowType]
        if (!flowSpec || !isObject(flow)) {
          continue
        }
        const flowField = this.reader.readField(flows, flowType, flowsContext)
        const flowContext = this.reader.childContext(flowField)
        const flowDiff = this.reader.diffPresence(SideContexts.intersect(flowContext, schemeContext), flowSpec, [flowField.diff, flowsField.diff])
        if (flowDiff && schemeContext.before && schemeContext.after) {
          schemeRecord[flowType] = flowDiff
        }
        this.decorateOAuthFlow(flowSpec, flow, SideContexts.intersect(flowContext, schemeContext), schemeContext)
      }
    }
    this.reader.writeRecord(scheme, schemeRecord)
  }

  private decorateOAuthFlow(flowSpec: SecurityOAuthFlowSpec, flow: UnknownRecord, flowContext: SideContext, schemeContext: SideContext): void {
    const flowRecord: DiffsRecord = {}
    for (const field of OAUTH_FLOW_FIELDS) {
      const diff = this.diffOfField(flow, field, flowContext, schemeContext)
      if (diff) {
        flowRecord[field] = diff
      }
    }
    const scopesField = this.reader.readField(flow, this.flowScopesKey, flowContext)
    const scopes = flow[this.flowScopesKey]
    if (isObject(scopes) && flowContext.before && flowContext.after) {
      const scopesContext = this.reader.childContext(scopesField)
      const before: UnknownRecord = {}
      const after: UnknownRecord = {}
      const causes: (Diff | undefined)[] = [scopesField.diff]
      for (const scope of Object.keys(scopes)) {
        const scopeField = this.reader.readField(scopes, scope, scopesContext)
        causes.push(scopeField.diff)
        if (scopeField.beforePresent) {
          before[scope] = scopeField.before
        }
        if (scopeField.afterPresent) {
          after[scope] = scopeField.after
        }
      }
      const diff = this.reader.diffShownValues(before, after, causes)
      if (diff) {
        flowRecord.scopes = diff
      }
    }
    this.reader.writeRecord(flowSpec, flowRecord)
  }

  /**
   * Field diff of a definition field shown inside a card that exists on `schemeContext` sides:
   * the raw diff when the definition exists on both of those sides, else a diff of the shown values.
   */
  private diffOfField(owner: UnknownRecord, key: string, ownerContext: SideContext, schemeContext: SideContext): Diff | undefined {
    const field = this.reader.readField(owner, key, ownerContext)
    if (!schemeContext.before || !schemeContext.after) {
      return undefined // a wholly added / removed card is painted by its own node-level diff
    }
    if (ownerContext.before && ownerContext.after) {
      return field.diff
    }
    return this.reader.diffShownValues(field.before, field.after, [field.diff])
  }
}
