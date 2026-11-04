import { Diff, DiffAction, isDiffReplace } from "@netcracker/qubership-apihub-api-diff"
import { BuildingServiceLogger } from "../../../loggers"
import { DiffsRecord, isArray, isObject } from "../../../utilities"
import { SecurityAlternativeSpec, SecuritySpec } from "../../security/security-spec"
import { UnknownRecord } from "../../security/security-spec-builder"
import { SecuritySpecDiffsDecorator } from "../../security/security-spec-diffs-decorator"
import { FieldSides, SideContext, SideContexts, SideReader } from "../../shared/side-reader"
import { OpenApiDiffsOperationFactsResolver } from "./openapi-diffs-operation-facts"
import { OpenApiSectionPresence } from "./openapi-section-presence"
import { OpenApiSecuritySpecBuilder } from "./openapi-security-spec-builder"
import { OpenApiOperationContext } from "./openapi-spec-transformer"

/** The collaborators the builder shares with the with-diffs transformer that owns it. */
export type OpenApiSecurityDiffsHost = {
  readonly reader: SideReader
  /** Facts of the operation (the sides where it exists). */
  readonly operationFacts: OpenApiDiffsOperationFactsResolver
  /** Presence of the section per side (its synthetic whole add / remove). */
  readonly presence: OpenApiSectionPresence
}

/** One list slot per side: `{}` (anonymous access) and / or a requirement naming schemes. */
type SecuritySlotSides = {
  readonly anonymous: SideContext
  readonly alternative: SideContext
  /** The slot's own diff and the scheme-key diffs inside it. */
  readonly causes: readonly (Diff | undefined)[]
}

/**
 * OpenAPI Security section with diff records: alternatives of one list (by index), or matched by
 * deep equality when the operation starts / stops overriding the document list; scheme records
 * under the requirement keys; definitions and required scopes by the shared decorator. The
 * anonymous requirement `{}` is not an alternative: its presence per side becomes the synthetic
 * `allowsAnonymous` diff (the title-row `Optional` badge), and a slot that is `{}` on one side
 * only is an alternative wholly added / removed on the other.
 * Design: docs/design/openapi/entities/security.md -> "Diffs", "Optional badge (anonymous access)".
 */
export class OpenApiSecuritySpecWithDiffsBuilder extends OpenApiSecuritySpecBuilder {
  private readonly decorator: SecuritySpecDiffsDecorator

  constructor(logger: BuildingServiceLogger, private readonly host: OpenApiSecurityDiffsHost) {
    super(logger)
    this.decorator = new SecuritySpecDiffsDecorator(host.reader, this.flowScopesKey)
  }

  private get reader(): SideReader {
    return this.host.reader
  }

  public override build(context: OpenApiOperationContext): SecuritySpec | undefined {
    const { source, operation } = context
    const operationSides = this.host.operationFacts.resolve(context).sides
    const operationSecurityField = this.reader.readField(operation, 'security', operationSides)
    const documentSecurityField = this.reader.readField(source, 'security', SideContexts.BOTH)
    const beforeUsesOperation = operationSecurityField.beforePresent
    const afterUsesOperation = operationSecurityField.afterPresent
    if (beforeUsesOperation === afterUsesOperation) {
      const listField = beforeUsesOperation ? operationSecurityField : documentSecurityField
      const list = beforeUsesOperation ? operation.security : source.security
      // The document list is shared by every operation: limit its sides to where the operation exists.
      return this.buildFromOneList(context, list, SideContexts.intersect(this.reader.childContext(listField), operationSides), !afterUsesOperation)
    }
    return this.buildFromSwitchedLists(
      context,
      beforeUsesOperation ? operationSecurityField.before : documentSecurityField.before,
      afterUsesOperation ? operationSecurityField.after : documentSecurityField.after,
      operationSecurityField.diff,
      !afterUsesOperation,
    )
  }

  private buildFromOneList(context: OpenApiOperationContext, list: unknown, listContext: SideContext, isInheritedFromDocument: boolean): SecuritySpec | undefined {
    if (!isArray(list) || list.length === 0) {
      return undefined
    }
    const alternatives: SecurityAlternativeSpec[] = []
    const alternativesRecord: DiffsRecord = {}
    let presence = SideContexts.NONE
    let anonymous = SideContexts.NONE
    const anonymousCauses: (Diff | undefined)[] = []
    list.forEach((requirement, index) => {
      if (!isObject(requirement)) {
        return
      }
      const alternativeField = this.reader.readField(list, index, listContext)
      const alternativeContext = this.reader.childContext(alternativeField)
      presence = SideContexts.union(presence, alternativeContext)
      const slot = this.resolveSlotSides(requirement, alternativeField)
      if (slot.anonymous.before || slot.anonymous.after) {
        anonymous = SideContexts.union(anonymous, slot.anonymous)
        anonymousCauses.push(...slot.causes)
      }
      if (!slot.alternative.before && !slot.alternative.after) {
        return
      }
      const alternative = this.buildAlternative(context, requirement)
      this.decorateAlternative(context, alternative, requirement, alternativeContext)
      const alternativeIndex = alternatives.length
      alternatives.push(alternative)
      // A slot that is `{}` on one side only holds this alternative on the other side alone.
      const wholeDiff = SideReader.isWholeChange(alternativeField.diff)
        ? alternativeField.diff
        : this.reader.diffPresence(slot.alternative, requirement, slot.causes)
      if (wholeDiff) {
        alternativesRecord[String(alternativeIndex)] = wholeDiff
      }
    })
    return this.createSecurity(isInheritedFromDocument, alternatives, alternativesRecord, presence, anonymous, anonymousCauses)
  }

  /**
   * The section spec and its records: the alternatives list gets the per-alternative entries and the
   * toolbar diff (the `securityAlternatives` container), the section its `allowsAnonymous` presence
   * diff (not an option). `undefined` when the list has neither alternatives nor `{}` on any side.
   */
  private createSecurity(
    isInheritedFromDocument: boolean,
    alternatives: SecurityAlternativeSpec[],
    alternativesRecord: DiffsRecord,
    presence: SideContext,
    anonymous: SideContext,
    anonymousCauses: readonly (Diff | undefined)[],
  ): SecuritySpec | undefined {
    const allowsAnonymous = anonymous.before || anonymous.after
    if (alternatives.length === 0 && !allowsAnonymous) {
      return undefined
    }
    const security: SecuritySpec = { isInheritedFromDocument, allowsAnonymous, alternatives }
    this.decorator.writeAlternativesRecord(alternatives, alternativesRecord)
    const securityRecord: DiffsRecord = {}
    const anonymousDiff = this.reader.diffPresence(anonymous, true, anonymousCauses)
    if (anonymousDiff) {
      securityRecord.allowsAnonymous = anonymousDiff
    }
    this.reader.writeRecord(security, securityRecord)
    this.host.presence.set(security, presence)
    return security
  }

  /**
   * Per side, whether a list slot is the anonymous requirement `{}` or names schemes. `apiDiff` pairs
   * slots by index, so one slot can be `{}` on one side and a requirement on the other.
   */
  private resolveSlotSides(requirement: UnknownRecord, field: FieldSides): SecuritySlotSides {
    const context = this.reader.childContext(field)
    const names = Object.keys(requirement)
    const beforeNames = field.diff && isDiffReplace(field.diff)
      ? (isObject(field.before) ? Object.keys(field.before) : [])
      : names.filter(name => this.reader.readField(requirement, name, context).beforePresent)
    const afterNames = names.filter(name => this.reader.readField(requirement, name, context).afterPresent)
    return {
      anonymous: { before: context.before && beforeNames.length === 0, after: context.after && afterNames.length === 0 },
      alternative: { before: context.before && beforeNames.length > 0, after: context.after && afterNames.length > 0 },
      causes: [field.diff, ...Object.values(this.reader.record(requirement) ?? {})],
    }
  }

  /**
   * The operation starts / stops overriding the document list: alternatives are matched by deep
   * equality; unmatched after ones are added, unmatched before ones removed (appended).
   */
  private buildFromSwitchedLists(
    context: OpenApiOperationContext,
    beforeList: unknown,
    afterList: unknown,
    cause: Diff | undefined,
    isInheritedFromDocument: boolean,
  ): SecuritySpec | undefined {
    const beforeAll = isArray(beforeList) ? beforeList.filter(isObject) : []
    const afterAll = isArray(afterList) ? afterList.filter(isObject) : []
    const anonymous = {
      before: beforeAll.some(OpenApiSecuritySpecBuilder.isAnonymousRequirement),
      after: afterAll.some(OpenApiSecuritySpecBuilder.isAnonymousRequirement),
    }
    const before = beforeAll.filter(requirement => !OpenApiSecuritySpecBuilder.isAnonymousRequirement(requirement))
    const after = afterAll.filter(requirement => !OpenApiSecuritySpecBuilder.isAnonymousRequirement(requirement))
    const unmatchedBefore = [...before]
    const alternatives: SecurityAlternativeSpec[] = []
    const alternativesRecord: DiffsRecord = {}
    for (const requirement of after) {
      const matchIndex = unmatchedBefore.findIndex(candidate => SideReader.deepEqual(candidate, requirement))
      if (matchIndex >= 0) {
        unmatchedBefore.splice(matchIndex, 1)
      } else {
        alternativesRecord[String(alternatives.length)] = this.reader.createDiff(DiffAction.add, { afterValue: requirement }, [cause])
      }
      alternatives.push(this.buildAlternative(context, requirement))
    }
    for (const requirement of unmatchedBefore) {
      alternativesRecord[String(alternatives.length)] = this.reader.createDiff(DiffAction.remove, { beforeValue: requirement }, [cause])
      alternatives.push(this.buildAlternative(context, requirement))
    }
    const presence = { before: beforeAll.length > 0, after: afterAll.length > 0 }
    return this.createSecurity(isInheritedFromDocument, alternatives, alternativesRecord, presence, anonymous, [cause])
  }

  private decorateAlternative(
    context: OpenApiOperationContext,
    alternative: SecurityAlternativeSpec,
    requirement: UnknownRecord,
    alternativeContext: SideContext,
  ): void {
    const alternativeRecord: DiffsRecord = {}
    for (const name of alternative.schemeNames) {
      const schemeField = this.reader.readField(requirement, name, alternativeContext)
      if (SideReader.isWholeChange(schemeField.diff)) {
        alternativeRecord[name] = schemeField.diff
      }
      const scheme = alternative.schemes[name]
      const schemeContext = this.reader.childContext(schemeField)
      this.decorator.decorateRequiredScopes(scheme, requirement[name], schemeContext)
      const definition = this.takeDefinition(context, name)
      if (definition) {
        this.decorator.decorateSchemeDefinition(scheme, definition, SideContexts.intersect(this.definitionSides(context, name), schemeContext), schemeContext)
      }
    }
    this.reader.writeRecord(alternative, alternativeRecord)
  }

  /** The sides where `components.securitySchemes[name]` exists. */
  private definitionSides(context: OpenApiOperationContext, name: string): SideContext {
    const componentsField = this.reader.readField(context.source, 'components', SideContexts.BOTH)
    const components = context.source.components
    const schemesField = this.reader.readField(components, 'securitySchemes', this.reader.childContext(componentsField))
    const securitySchemes = isObject(components) ? components.securitySchemes : undefined
    return this.reader.childContext(this.reader.readField(securitySchemes, name, this.reader.childContext(schemesField)))
  }
}
