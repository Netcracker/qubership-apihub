import { Diff, isDiffAdd, isDiffRemove, isDiffRename } from "@netcracker/qubership-apihub-api-diff"
import { CHANGED_LAYOUT_SIDE, LayoutSide, ORIGIN_LAYOUT_SIDE } from "../../abstract/layout-side"
import { RowChangedPropertyMetaData } from "../../abstract/tree-with-diffs/row-changed-property-metadata"
import {
  BOTH_LAYOUT_SIDES,
  deriveRowDiff,
  hasNodeDiffs,
  NodeLevelRowDiffs,
  RowDiffsNode,
  SectionRowDiffs,
  SideListItem,
  takeFieldDiff,
  takeSideValue,
  takeValueField,
  toSideListItems,
  toStringList,
  toStringMap,
} from "../../abstract/tree-with-diffs/row-diffs-base"
import { DiffTypeOrder } from "../../abstract/tree-with-diffs/diff-type-order"
import {
  ChangedPropertyMetaData,
  HighlightVariant,
  NODE_LEVEL_DIFF_KEY,
  NodeDiffsSeverity,
  NodeDiffsSeverityPlacemennt,
} from "../../abstract/tree-with-diffs/tree-node.interface"
import { SecurityDisplayLabels, SecurityParameterNameLabel } from "../display/labels"
import { SECURITY_ALTERNATIVES_DIFF_KEY } from "./diff-keys"

/** The anonymous-access field of a `security` node (the `Optional` badge of the title row). */
const ALLOWS_ANONYMOUS_FIELD = 'allowsAnonymous'

class Security {
  /**
   * Section title row: a whole section add / remove, else a synthetic yellow `replace` when anonymous
   * access (`{}`) was added / removed - the `Optional` badge itself carries the green / red border.
   */
  public static takeTitleRowDiff(node: RowDiffsNode): ChangedPropertyMetaData | undefined {
    const anonymous = takeFieldDiff(node, ALLOWS_ANONYMOUS_FIELD)
    return SectionRowDiffs.takeHeaderRowDiff(node) ?? (anonymous ? RowChangedPropertyMetaData.buildRowReplace(anonymous.data) : undefined)
  }

  /** Diff of the `Optional` badge: none when the whole section is added / removed (its row color wins). */
  public static takeOptionalBadgeDiff(node: RowDiffsNode): ChangedPropertyMetaData | undefined {
    return SectionRowDiffs.takeHeaderRowDiff(node) ? undefined : takeFieldDiff(node, ALLOWS_ANONYMOUS_FIELD)
  }

  /** Whether the list allows anonymous access (`{}`) on a side: the `Optional` badge is shown there. */
  public static isAnonymousAllowedOnSide(node: RowDiffsNode, side: LayoutSide): boolean {
    const diff = takeFieldDiff(node, ALLOWS_ANONYMOUS_FIELD)?.data
    if (diff && !isDiffRename(diff)) {
      return takeSideValue(diff, side) === true
    }
    return NodeLevelRowDiffs.isPresentOnSide(node, side) && takeValueField(node, ALLOWS_ANONYMOUS_FIELD) === true
  }

}

/**
 * The toolbar: the complex `securityAlternatives` container of a Security section, whose nested
 * nodes are the alternatives (docs/design/shared/features/selector-options.md). It inherits the
 * section's whole add / remove.
 */
class Alternatives {
  /**
   * Security toolbar row: a whole section add / remove, else a yellow row when any alternative
   * (toolbar option) was wholly added or removed - the option itself keeps its green / red border.
   */
  public static takeToolbarRowDiff(container: RowDiffsNode): ChangedPropertyMetaData | undefined {
    const options = takeFieldDiff(container, SECURITY_ALTERNATIVES_DIFF_KEY)
    return SectionRowDiffs.takeHeaderRowDiff(container) ?? (options ? RowChangedPropertyMetaData.buildRowReplace(options.data) : undefined)
  }

  /** Whether the toolbar shows options and arrows on a side: not where the whole section was added / removed. */
  public static isToolbarShownOnSide(container: RowDiffsNode, side: LayoutSide): boolean {
    return NodeLevelRowDiffs.isPresentOnSide(container, side)
  }
}

/** One side of a scope row; absent = the scope does not exist on that side. */
export type SecurityScopeRowSide = {
  readonly description: string
  readonly required: boolean
}

/** A 2nd-level security prop: one OAuth scope (or a required scope no flow declares). */
export type SecurityScopeRow = {
  readonly name: string
  readonly origin?: SecurityScopeRowSide
  readonly changed?: SecurityScopeRowSide
  /**
   * Row background: scope added / removed / description replaced (text highlighter); a synthetic
   * yellow `replace` when only the required status changed; or the inherited whole-block diff.
   */
  readonly rowDiff?: ChangedPropertyMetaData
  /** The scope's own change only (added / removed / description replaced): its description's text highlighter. */
  readonly ownRowDiff?: ChangedPropertyMetaData
  /** `required` badge + side-exclusive `*`: the scope exists on both sides and its required status changed. */
  readonly requiredDiff?: ChangedPropertyMetaData
  /**
   * Floating badge of the row: the strongest of its own and its required change (caused at that
   * diff's declaration path); else, for a row painted by the inherited block diff, the block's badge.
   */
  readonly severity?: NodeDiffsSeverity
}

function requiredScopesOnSide(scheme: RowDiffsNode, side: LayoutSide): ReadonlySet<string> {
  return NodeLevelRowDiffs.isPresentOnSide(scheme, side)
    ? new Set(Scheme.resolveRequiredScopesSideItems(scheme, side).map(item => item.text))
    : new Set()
}

function takeTitleRowSeverity(node: RowDiffsNode): NodeDiffsSeverity | undefined {
  return hasNodeDiffs(node) ? node.diffsSeverities[NodeDiffsSeverityPlacemennt.TitleRow] : undefined
}

function buildScopeRow(
  name: string,
  origin: SecurityScopeRowSide | undefined,
  changed: SecurityScopeRowSide | undefined,
  scopesDiff: Diff | undefined,
  requiredScopesDiff: Diff | undefined,
  inheritedDiff: ChangedPropertyMetaData | undefined,
  inheritedSeverity: NodeDiffsSeverity | undefined,
): SecurityScopeRow {
  let ownRowDiff: Diff | undefined
  if (scopesDiff && origin && !changed) {
    ownRowDiff = deriveRowDiff(scopesDiff, 'remove', origin.description, undefined)
  } else if (scopesDiff && !origin && changed) {
    ownRowDiff = deriveRowDiff(scopesDiff, 'add', undefined, changed.description)
  } else if (scopesDiff && origin && changed && origin.description !== changed.description) {
    ownRowDiff = deriveRowDiff(scopesDiff, 'replace', origin.description, changed.description)
  }
  const requiredChanged = !!origin && !!changed && origin.required !== changed.required
  const requiredDiff = requiredChanged && requiredScopesDiff
    ? deriveRowDiff(requiredScopesDiff, changed.required ? 'add' : 'remove', origin.required || undefined, changed.required || undefined)
    : undefined
  // Row background: the scope's own change; else a synthetic yellow `replace` (no text highlighter)
  // when only its required status changed; else the inherited whole-block diff.
  const ownRowMetaData = ownRowDiff ? RowChangedPropertyMetaData.build(ownRowDiff) : undefined
  const rowDiff = ownRowMetaData
    ?? (requiredDiff ? RowChangedPropertyMetaData.buildRowReplace(requiredDiff) : inheritedDiff)
  const strongest = DiffTypeOrder.strongestDiff(ownRowDiff, requiredDiff)
  const severity = strongest ? DiffTypeOrder.toSeverity(strongest) : rowDiff ? inheritedSeverity : undefined
  return {
    name,
    ...(origin ? { origin } : {}),
    ...(changed ? { changed } : {}),
    ...(rowDiff ? { rowDiff } : {}),
    ...(ownRowMetaData ? { ownRowDiff: ownRowMetaData } : {}),
    ...(requiredDiff ? { requiredDiff: RowChangedPropertyMetaData.build(requiredDiff) } : {}),
    ...(severity ? { severity } : {}),
  }
}

/**
 * Scheme fields that are not content rows of the card: the title row shows `name` and the gray type
 * text (`type`); `requiredScopesKind` is a dialect decision and has no row of its own.
 */
const SCHEME_TITLE_ROW_FIELDS: ReadonlySet<string> = new Set(['name', 'type', 'requiredScopesKind'])

class Scheme {
  public static takeFieldRowDiff(node: RowDiffsNode, field: string): ChangedPropertyMetaData | undefined {
    return NodeLevelRowDiffs.takeRowDiff(node, field)
  }

  /**
   * Card title row: a whole card add / remove, else a synthetic yellow `replace` (no text
   * highlighter) when the scheme type changed. `buildRowReplace` drops the type values, so the origin
   * title keeps the scheme name (a string `beforeValue` would be shown in its place).
   */
  public static takeTitleRowDiff(node: RowDiffsNode): ChangedPropertyMetaData | undefined {
    const type = Scheme.takeTypeTextDiff(node)?.data
    return SectionRowDiffs.takeHeaderRowDiff(node)
      ?? (type ? RowChangedPropertyMetaData.buildRowReplace(type) : undefined)
  }

  /**
   * The gray type text's own diff (highlighter). A type change is shown on that text only: painting
   * the title row with it would make the origin side's title read the before TYPE instead of the name.
   */
  public static takeTypeTextDiff(node: RowDiffsNode): ChangedPropertyMetaData | undefined {
    return SectionRowDiffs.takeHeaderRowDiff(node) ? undefined : takeFieldDiff(node, 'type')
  }

  /**
   * Text highlighter of the gray type text on a side: yellow for a replaced type; green on the
   * changed side when the type appeared (e.g. the scheme definition was added to `components`);
   * red on the origin side when it disappeared. `undefined` = no marker.
   */
  public static resolveTypeTextHighlight(node: RowDiffsNode, side: LayoutSide): Exclude<HighlightVariant, HighlightVariant.Gray> | undefined {
    const diff = Scheme.takeTypeTextDiff(node)
    if (!diff) {
      return undefined
    }
    if (isDiffAdd(diff.data)) {
      return side === CHANGED_LAYOUT_SIDE ? HighlightVariant.Green : undefined
    }
    if (isDiffRemove(diff.data)) {
      return side === ORIGIN_LAYOUT_SIDE ? HighlightVariant.Red : undefined
    }
    return (side === ORIGIN_LAYOUT_SIDE ? diff.styles.before : diff.styles.after).textHighlighterColor
  }

  /** Parameter-name prop label per side, from `in`: `Header parameter name`, `Query parameter name`, … */
  public static resolveParameterNameLabel(node: RowDiffsNode, side: LayoutSide, labels: SecurityDisplayLabels): SecurityParameterNameLabel {
    return labels.apiKeyParameterNameLabel(NodeLevelRowDiffs.resolveSideField(node, 'in', side))
  }

  /**
   * The location's own diff: its text highlighter marks the place word of the parameter-name label
   * (`Header` / `Query` …), or the location value; ` parameter name` is never marked by it.
   */
  public static takeParameterLocationTextDiff(node: RowDiffsNode): ChangedPropertyMetaData | undefined {
    return takeFieldDiff(node, 'in')
  }

  /** Parameter-name prop row: a name change (highlighted value), else a location change (label only), else the whole card. */
  public static takeParameterNameRowDiff(node: RowDiffsNode): ChangedPropertyMetaData | undefined {
    const location = takeFieldDiff(node, 'in')
    return takeFieldDiff(node, 'parameterName')
      ?? (location ? RowChangedPropertyMetaData.buildRowReplace(location.data) : undefined)
      ?? NodeLevelRowDiffs.takeWholeNodeDiff(node)
  }

  /**
   * Whether the card has a change below its title row: the card was wholly added / removed, a field
   * of a content row changed (description, unresolved state, props, required scopes), or anything in
   * an OAuth flow part changed. A change of the title row alone (the scheme type) is not content.
   * Required scopes of a scheme that ignores them (OAS 3.0 non-OAuth types) have no row, so their
   * diff is not content either. Without content changes the card hides everything below its title
   * row behind one `Show N unchanged rows` row.
   * Design: docs/design/openapi/features/hiding-unchanged-nodes.md
   */
  public static isContentChanged(node: RowDiffsNode): boolean {
    if (NodeLevelRowDiffs.takeWholeNodeDiff(node)) {
      return true
    }
    const ignoresRequiredScopes = takeValueField(node, 'requiredScopesKind') === 'ignored'
    const isContentField = (field: string): boolean => field !== NODE_LEVEL_DIFF_KEY
      && !SCHEME_TITLE_ROW_FIELDS.has(field)
      && !(ignoresRequiredScopes && field === 'requiredScopes')
      && takeFieldDiff(node, field) !== undefined
    if (hasNodeDiffs(node) && Object.keys(node.diffs).some(isContentField)) {
      return true
    }
    return node.childrenNodes().some(flow => hasNodeDiffs(flow) && Object.keys(flow.diffs).length > 0)
  }

  /** Whether the card exists on a side (no frame on the side where it was wholly added / removed). */
  public static isCardPresentOnSide(node: RowDiffsNode, side: LayoutSide): boolean {
    return NodeLevelRowDiffs.isPresentOnSide(node, side)
  }

  public static resolveRequiredScopesSideItems(node: RowDiffsNode, side: LayoutSide): SideListItem[] {
    const merged = toStringList(takeValueField(node, 'requiredScopes'))
    const diff = takeFieldDiff(node, 'requiredScopes')?.data
    if (!diff || isDiffRename(diff)) {
      return merged.map(text => ({ text }))
    }
    return toSideListItems(toStringList(takeSideValue(diff, ORIGIN_LAYOUT_SIDE)), toStringList(takeSideValue(diff, CHANGED_LAYOUT_SIDE)), side)
  }

  /**
   * The scheme's own list of required scopes (rows with `*`): required scopes that no flow of the
   * scheme declares on either side - for oauth2 the undeclared ones (flows mark the rest), for
   * openIdConnect and OAS 3.1 roles (no flows) all of them.
   */
  public static resolveUndeclaredRequiredScopeRows(scheme: RowDiffsNode): SecurityScopeRow[] {
    const declared = new Set<string>()
    for (const flow of scheme.childrenNodes()) {
      for (const side of BOTH_LAYOUT_SIDES) {
        Object.keys(OAuthFlow.resolveSideScopes(flow, side) ?? {}).forEach(name => declared.add(name))
      }
    }
    const origin = requiredScopesOnSide(scheme, ORIGIN_LAYOUT_SIDE)
    const changed = requiredScopesOnSide(scheme, CHANGED_LAYOUT_SIDE)
    const names = [...new Set([...changed, ...origin])].filter(name => !declared.has(name))
    const requiredScopesDiff = takeFieldDiff(scheme, 'requiredScopes')?.data
    const schemeSeverity = takeTitleRowSeverity(scheme)
    return names.map(name => buildScopeRow(
      name,
      origin.has(name) ? { description: '', required: true } : undefined,
      changed.has(name) ? { description: '', required: true } : undefined,
      requiredScopesDiff,
      undefined,
      NodeLevelRowDiffs.takeWholeNodeDiff(scheme),
      schemeSeverity,
    ))
  }
}

class OAuthFlow {
  public static takeFieldRowDiff(node: RowDiffsNode, field: string): ChangedPropertyMetaData | undefined {
    return NodeLevelRowDiffs.takeRowDiff(node, field)
  }

  /** Scope map of the flow on a side; `undefined` where the flow does not exist. */
  public static resolveSideScopes(node: RowDiffsNode, side: LayoutSide): Record<string, string> | undefined {
    if (!NodeLevelRowDiffs.isPresentOnSide(node, side)) {
      return undefined
    }
    const diff = takeFieldDiff(node, 'scopes')?.data
    if (diff && !isDiffRename(diff)) {
      return toStringMap(takeSideValue(diff, side))
    }
    return toStringMap(takeValueField(node, 'scopes'))
  }

  /**
   * 2nd-level scope rows of a flow: the union of both sides' scopes (after-side order, removed
   * scopes after them), each with its per-side description and required status (from the scheme's
   * required scopes), its row diff, and its required diff.
   */
  public static resolveScopeRows(flow: RowDiffsNode, scheme: RowDiffsNode): SecurityScopeRow[] {
    const originScopes = OAuthFlow.resolveSideScopes(flow, ORIGIN_LAYOUT_SIDE)
    const changedScopes = OAuthFlow.resolveSideScopes(flow, CHANGED_LAYOUT_SIDE)
    const originRequired = requiredScopesOnSide(scheme, ORIGIN_LAYOUT_SIDE)
    const changedRequired = requiredScopesOnSide(scheme, CHANGED_LAYOUT_SIDE)
    const names = [...new Set([...Object.keys(changedScopes ?? {}), ...Object.keys(originScopes ?? {})])]
    const scopesDiff = takeFieldDiff(flow, 'scopes')?.data
    const requiredScopesDiff = takeFieldDiff(scheme, 'requiredScopes')?.data
    const flowDiff = NodeLevelRowDiffs.takeWholeNodeDiff(flow)
    // A wholly added / removed flow badges its rows with its title-row badge; a wholly replaced flow
    // has no whole-block badge, so its rows show the replace itself.
    const flowSeverity = SectionRowDiffs.takeHeaderRowDiff(flow)
      ? takeTitleRowSeverity(flow)
      : flowDiff ? DiffTypeOrder.toSeverity(flowDiff.data) : undefined
    return names.map(name => buildScopeRow(
      name,
      originScopes && name in originScopes ? { description: originScopes[name], required: originRequired.has(name) } : undefined,
      changedScopes && name in changedScopes ? { description: changedScopes[name], required: changedRequired.has(name) } : undefined,
      scopesDiff && !isDiffRename(scopesDiff) ? scopesDiff : undefined,
      requiredScopesDiff && !isDiffRename(requiredScopesDiff) ? requiredScopesDiff : undefined,
      flowDiff,
      flowSeverity,
    ))
  }
}

/**
 * Row-level diff accessors of a Security section, the same for every API type (OpenAPI, AsyncAPI):
 * the toolbar, the scheme cards, the OAuth flow parts and their scope rows. Viewers read these
 * instead of `node.diffs[...]`, so row semantics stay in the data layer.
 * Design: docs/design/openapi/entities/security.md, docs/design/async-api/features/security.md.
 */
export class SecurityRowDiffs {
  public static readonly NodeLevel = NodeLevelRowDiffs
  public static readonly Section = SectionRowDiffs
  public static readonly Security = Security
  public static readonly Alternatives = Alternatives
  public static readonly Scheme = Scheme
  public static readonly OAuthFlow = OAuthFlow
}
