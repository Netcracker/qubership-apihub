import { BuildingServiceLogger } from "../../../loggers"
import { NODE_LEVEL_DIFF_KEY } from "../../../model/abstract/tree-with-diffs/tree-node.interface"
import { DiffsRecord, isArray, isObject } from "../../../utilities"
import { SecurityAlternativeSpec, SecuritySchemeSpec, SecuritySpec } from "../../security/security-spec"
import { UnknownRecord } from "../../security/security-spec-builder"
import { SecuritySpecDiffsDecorator } from "../../security/security-spec-diffs-decorator"
import { SideContext, SideContexts, SideReader } from "../../shared/side-reader"
import { AsyncApiSecurityInput, AsyncApiSecuritySpecBuilder } from "./async-api-security-spec-builder"

/**
 * AsyncAPI Security section with diff records. `apiDiff` compares the list by index: an item added /
 * removed is an option (alternative) added / removed; field changes of an item are changes of its
 * scheme (the item is the definition). The section's own whole add / remove (the list appears,
 * disappears, or its presence flips) is written into the section's own record: AsyncAPI owners do not
 * carry child-section diffs. Inherited whole changes (operation / server added) come from the owner.
 * Design: docs/design/async-api/features/security.md -> "Diffs".
 */
export class AsyncApiSecuritySpecWithDiffsBuilder extends AsyncApiSecuritySpecBuilder {
  private readonly decorator: SecuritySpecDiffsDecorator

  constructor(logger: BuildingServiceLogger, referenceNamePropertyKey: symbol, private readonly reader: SideReader) {
    super(logger, referenceNamePropertyKey)
    this.decorator = new SecuritySpecDiffsDecorator(reader, this.flowScopesKey)
  }

  public override build(input: AsyncApiSecurityInput): SecuritySpec | undefined {
    const { source, owner } = input
    const list = isObject(owner) ? owner.security : undefined
    if (!isArray(list) || list.length === 0) {
      return undefined
    }
    const listField = this.reader.readField(owner, 'security', SideContexts.BOTH)
    const listContext = this.reader.childContext(listField)
    const alternatives: SecurityAlternativeSpec[] = []
    const alternativesRecord: DiffsRecord = {}
    let presence = SideContexts.NONE
    list.forEach((item, index) => {
      if (!isObject(item)) {
        return
      }
      const itemField = this.reader.readField(list, index, listContext)
      const itemContext = this.reader.childContext(itemField)
      presence = SideContexts.union(presence, itemContext)
      const alternative = this.buildAlternative(source, item, index)
      const scheme = alternative.schemes[alternative.schemeNames[0]]
      this.decorateScheme(scheme, item, itemContext)
      if (SideReader.isWholeChange(itemField.diff)) {
        alternativesRecord[String(alternatives.length)] = itemField.diff
      }
      alternatives.push(alternative)
    })
    const security: SecuritySpec = { isInheritedFromDocument: false, allowsAnonymous: false, alternatives }
    this.decorator.writeAlternativesRecord(alternatives, alternativesRecord)
    const securityRecord: DiffsRecord = {}
    const sectionDiff = SideReader.isWholeChange(listField.diff)
      ? listField.diff
      : this.reader.diffPresence(presence, security, [listField.diff, ...Object.values(alternativesRecord)])
    if (sectionDiff) {
      securityRecord[NODE_LEVEL_DIFF_KEY] = sectionDiff
    }
    this.reader.writeRecord(security, securityRecord)
    return security
  }

  private decorateScheme(scheme: SecuritySchemeSpec, item: UnknownRecord, itemContext: SideContext): void {
    if (this.resolveDefinition(item)) {
      this.decorator.decorateSchemeDefinition(scheme, item, itemContext, itemContext)
    }
    if (scheme.requiredScopesKind !== 'scopes' || !itemContext.before || !itemContext.after) {
      return
    }
    const scopesField = this.reader.readField(item, 'scopes', itemContext)
    const scopesContext = this.reader.childContext(scopesField)
    if (scopesContext.before && scopesContext.after) {
      this.decorator.decorateRequiredScopes(scheme, item.scopes, scopesContext)
      return
    }
    // The `scopes` list itself appeared / disappeared: one replace of the shown lists.
    const listOf = (value: unknown): string[] | undefined => (isArray(value) && value.length > 0 ? value.filter((scope): scope is string => typeof scope === 'string') : undefined)
    this.reader.writeDiff(scheme, 'requiredScopes', this.reader.diffShownValues(listOf(scopesField.before), listOf(scopesField.after), [scopesField.diff]))
  }
}
