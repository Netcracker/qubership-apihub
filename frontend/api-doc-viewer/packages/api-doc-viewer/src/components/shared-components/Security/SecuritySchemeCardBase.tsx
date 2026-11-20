import { cn } from "@apihub/utils/common/cn"
import { TextColors } from "../../shared-styles/colors/text-colors"
import { useDisplayMode } from "@apihub/contexts/DisplayModeContext"
import { useLayoutSpacing } from "@apihub/contexts/LayoutSpacingContext"
import { DisplayMode } from "@apihub/types/DisplayMode"
import { CHANGED_LAYOUT_SIDE, LayoutSide, ORIGIN_LAYOUT_SIDE } from "@apihub/types/internal/LayoutSide"
import { takeSecuritySeverities } from "@apihub/utils/security/diff-state"
import { getSecurityChildren, isSecurityOAuthFlowNode } from "@apihub/utils/security/node-type-checkers"
import { DiffsClassesBuilder } from "@netcracker/qubership-apihub-next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/utilities"
import {
  ChangedPropertyMetaData,
  NodeDiffsSeverity,
  NodeDiffsSeverityPlacemennt,
} from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { BlockEdges, LayoutPlanner } from "@netcracker/qubership-apihub-next-data-model/model/abstract/layout"
import { SECURITY_OAUTH_FLOW_HEADER_PREFIX, SECURITY_PROP_LABELS } from "@netcracker/qubership-apihub-next-data-model/model/security/display/labels"
import { SecuritySchemeCardRows } from "@netcracker/qubership-apihub-next-data-model/model/security/card-rows"
import { SecurityPresentation } from "@netcracker/qubership-apihub-next-data-model/model/security/presentation"
import { SecurityRowDiffs, SecurityScopeRow } from "@netcracker/qubership-apihub-next-data-model/model/security/tree-with-diffs/row-diffs"
import { SecurityTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/security/types/aliases"
import { SecurityTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/security/types/node-kind"
import { FC, Fragment, ReactElement, ReactNode, useState } from "react"
import { StackBlock, StackLayout } from "../Layout/StackLayout"
import { FramePosition } from "../Frame/types"
import { MarkdownTextRow } from "../MarkdownTextRow/MarkdownTextRow"
import { ShowUnchangedLabels } from "../ShowUnchangedRow/show-unchanged-labels"
import { ShowUnchangedTrigger } from "../ShowUnchangedRow/ShowUnchangedTrigger"
import { useOptionalUnchangedBlocksContext } from "../ShowUnchangedRow/UnchangedBlocksContext"
import { TextRow } from "../TextRow/TextRow"
import { TextValueVariant } from "../TextValue/types"
import { TitleRow } from "../TitleRow/TitleRow"
import { PrecededBy } from "../WithPrecededByProps"
import {
  SecurityFlowHeaderContent,
  SecurityFrameRow,
  SecurityPropContent,
  SecurityPropValue,
  SecurityRow,
  SecurityScopeContent,
  SecurityScopesToggleContent,
} from "./SecurityRows"
import { resolveValueHighlighter } from "./value-highlighter"

export type SecuritySchemeNode = SecurityTreeNode<typeof SecurityTreeNodeKinds.SECURITY_SCHEME>
type FlowNode = SecurityTreeNode<typeof SecurityTreeNodeKinds.OAUTH_FLOW>

/** Props of the API-type cards (`OpenApiSecuritySchemeCard`, `AsyncApiSecuritySchemeCard`). */
export type SecuritySchemeCardProps = {
  node: SecuritySchemeNode
}

type SecuritySchemeCardBaseProps = SecuritySchemeCardProps & {
  /** Labels and row visibility of the API type (data-layer instances). */
  presentation: SecurityPresentation
  /** Scheme name size; smaller than the section title it sits under (default h4 under an h2 / h3 title). */
  titleVariant?: TextValueVariant
}

type FramePositionResolver = (side: LayoutSide) => FramePosition | undefined

/**
 * One content row of the card; `diff` paints it and `severity` is its floating badge (the separators
 * around it continue both).
 */
type CardRow = {
  readonly key: string
  readonly diff: ChangedPropertyMetaData | undefined
  readonly severity: NodeDiffsSeverity | undefined
  readonly render: (framePosition: FramePositionResolver) => ReactElement
}

/** Collects the card rows in order (the grid columns are fixed fractions of the card, nothing to measure). */
class CardRows {
  public readonly rows: CardRow[] = []

  public add(row: CardRow): void {
    this.rows.push(row)
  }

  /** Keeps the title row (always the first one) and replaces every other row with `placeholder`. */
  public collapseContent(placeholder: CardRow): void {
    this.rows.splice(1, this.rows.length - 1, placeholder)
  }

  /** Each row as a layout element: edges from its own diff and badge (next-data-model). */
  public toBlocks(framePosition: FramePositionResolver): StackBlock[] {
    return this.rows.map(row => ({
      id: row.key,
      ...BlockEdges.single(BlockEdges.row(row)),
      payload: () => <Fragment key={row.key}>{row.render(framePosition)}</Fragment>,
    }))
  }
}

/**
 * Framed card of one security scheme of the selected alternative, for every API type: an opening
 * frame row (border at its top), the content rows with the separators around them, a closing frame
 * row (border at its bottom); frame row heights and tones from `LayoutPlanner.frameRow`. The
 * space outside the border is the card's own half-gap in the separators of the Security level.
 * Labels (scheme types, unresolved text) and which rows a scheme type has come from `presentation`.
 * Design: docs/design/openapi/entities/security.md -> "Scheme card", docs/design/async-api/features/security.md.
 */
export const SecuritySchemeCardBase: FC<SecuritySchemeCardBaseProps> = (props) => {
  const { node, presentation, titleVariant = TextValueVariant.h4 } = props
  const { labels } = presentation
  const displayMode = useDisplayMode()
  const spacing = useLayoutSpacing()
  const value = node.value()
  const severities = takeSecuritySeverities(node)
  const visibility = presentation.visibility.resolveSecurityScheme(value, displayMode)
  const flows = getSecurityChildren(node, isSecurityOAuthFlowNode)
  const [collapsedScopes, setCollapsedScopes] = useState<ReadonlySet<string>>(new Set())
  // Provided by the diffs viewers that hide unchanged content (OpenAPI); absent = show every row.
  const unchangedBlocks = useOptionalUnchangedBlocksContext()
  const toggleScopes = (key: string): void => setCollapsedScopes(current => {
    const next = new Set(current)
    if (next.has(key)) {
      next.delete(key)
    } else {
      next.add(key)
    }
    return next
  })

  const card = new CardRows()
  const titleDiff = SecurityRowDiffs.Scheme.takeTitleRowDiff(node)
  card.add({
    key: 'title',
    diff: titleDiff,
    severity: severities?.[NodeDiffsSeverityPlacemennt.TitleRow],
    render: (framePosition) => (
      <TitleRow
        data-precededby={PrecededBy.SEPARATOR_LAYOUT_ROW}
        value={value?.name ?? String(node.key)}
        expandable={false}
        variant={titleVariant}
        subheader={(side) => <SchemeTypeText node={node} presentation={presentation} layoutSide={side} />}
        diff={titleDiff}
        diffsSeverities={severities}
        framePosition={framePosition}
      />
    ),
  })
  if (visibility.showUnresolved) {
    const unresolvedDiff = SecurityRowDiffs.Section.takeHeaderRowDiff(node)
    card.add({
      key: 'unresolved',
      diff: unresolvedDiff,
      severity: undefined,
      render: (framePosition) => (
        <TextRow
          data-precededby={PrecededBy.SEPARATOR_LAYOUT_ROW}
          value={labels.unresolvedSchemeText}
          variant={TextValueVariant.body2}
          textFontWeight="normal"
          textColor={TextColors.MUTED}
          diff={unresolvedDiff}
          framePosition={framePosition}
        />
      ),
    })
  }
  if (visibility.showDescription) {
    const descriptionDiff = SecurityRowDiffs.Scheme.takeFieldRowDiff(node, 'description')
    card.add({
      key: 'description',
      diff: descriptionDiff,
      severity: severities?.[NodeDiffsSeverityPlacemennt.DescriptionRow],
      render: (framePosition) => (
        <MarkdownTextRow
          data-precededby={PrecededBy.SEPARATOR_LAYOUT_ROW}
          value={value?.description ?? ''}
          variant={TextValueVariant.body1}
          diff={descriptionDiff}
          diffsSeverities={severities}
          diffsSeverityPlacement={NodeDiffsSeverityPlacemennt.DescriptionRow}
          framePosition={framePosition}
        />
      ),
    })
  }

  if (visibility.showParameterName) {
    // Only the place word (`Header` / `Query` ...) takes the location's highlighter, never ` parameter name`.
    const locationDiff = SecurityRowDiffs.Scheme.takeParameterLocationTextDiff(node)
    const labelOf = (side: LayoutSide): ReactNode => {
      const { place, suffix } = SecurityRowDiffs.Scheme.resolveParameterNameLabel(node, side, labels)
      return <><span className={cn(`security-prop-label-place ${resolveValueHighlighter(locationDiff, side)}`)}>{place}</span>{suffix}</>
    }
    card.add(fieldPropRow({
      key: 'parameterName',
      node,
      field: 'parameterName',
      label: labelOf,
      rowDiff: SecurityRowDiffs.Scheme.takeParameterNameRowDiff(node),
      severity: severities?.[SecuritySchemeCardRows.parameterNamePlacement()],
    }))
  }
  for (const row of SecuritySchemeCardRows.schemeProps(visibility, labels)) {
    card.add(fieldPropRow({
      key: row.key,
      node,
      field: row.field,
      label: () => row.label,
      rowDiff: SecurityRowDiffs.Scheme.takeFieldRowDiff(node, row.field),
      severity: severities?.[row.placement],
      link: row.link,
      format: row.format,
    }))
  }
  const scopeRows: ScopeRowsOptions = { showDescriptions: visibility.showScopeDescriptions, collapsedScopes, toggleScopes }
  flows.forEach(flow => addFlowRows(card, flow, node, presentation, displayMode, scopeRows))

  // The scheme's own list of required scopes (rows with `*`): every required scope for openIdConnect
  // and OAS 3.1 roles (no flows), the ones no flow declares for oauth2. No separate prop row.
  if (visibility.showRequiredScopeList && value) {
    const requiredOnly = SecurityRowDiffs.Scheme.resolveUndeclaredRequiredScopeRows(node)
    if (requiredOnly.length > 0) {
      addScopeRows(
        card,
        'required',
        labels.requiredScopeListLabel(value.requiredScopesKind),
        requiredOnly,
        SecurityRowDiffs.NodeLevel.takeWholeNodeDiff(node),
        severities?.[NodeDiffsSeverityPlacemennt.TitleRow],
        scopeRows,
      )
    }
  }

  // Hiding unchanged nodes: a card without changes below its title row keeps the title row (the
  // structure stays readable) and hides all other rows - every flow part included - behind one
  // "three dots" row. Any content change shows the whole card. A revealed card stays revealed.
  const hiddenRowCount = card.rows.length - 1
  if (
    unchangedBlocks?.hideUnchangedNodes
    && hiddenRowCount > 0
    && !unchangedBlocks.revealedBlockIds.has(node.id)
    && !SecurityRowDiffs.Scheme.isContentChanged(node)
  ) {
    const label = ShowUnchangedLabels.rows(hiddenRowCount)
    card.collapseContent({
      key: 'show-unchanged',
      diff: undefined,
      severity: undefined,
      render: (framePosition) => (
        <SecurityRow
          data-precededby={PrecededBy.SEPARATOR_LAYOUT_ROW}
          testId="security-show-unchanged"
          framePosition={framePosition}
          renderSide={() => (
            <ShowUnchangedTrigger unchangedBlockId={node.id} label={label} onReveal={unchangedBlocks.revealBlock} />
          )}
        />
      ),
    })
  }

  const isPresent = (side: LayoutSide): boolean => SecurityRowDiffs.Scheme.isCardPresentOnSide(node, side)
  const middle: FramePositionResolver = (side) => isPresent(side) ? 'middle' : undefined
  const frameRow = LayoutPlanner.frameRow(node, spacing)
  const presence = { before: isPresent(ORIGIN_LAYOUT_SIDE), after: isPresent(CHANGED_LAYOUT_SIDE) }
  return (
    <div data-testid={`security-scheme-${String(node.key)}`} className={cn("flex flex-col")}>
      <SecurityFrameRow frameRow={frameRow} position="first" presence={presence} />
      <StackLayout
        blocks={card.toBlocks(middle)}
        level="card"
        outerHalves={true}
        separatorFramePositions={{ before: middle(ORIGIN_LAYOUT_SIDE), after: middle(CHANGED_LAYOUT_SIDE) }}
      />
      {/* Always the last row, so toggling `Scopes` never moves the border onto a content row. */}
      <SecurityFrameRow frameRow={frameRow} position="last" presence={presence} />
    </div>
  )
}

type FieldPropRowParams = {
  key: string
  node: SecuritySchemeNode | FlowNode
  field: string
  label: (side: LayoutSide) => ReactNode
  rowDiff: ChangedPropertyMetaData | undefined
  severity: NodeDiffsSeverity | undefined
  link?: boolean
  /** Display text of the side's raw value (a location code -> its label); the raw value by default. */
  format?: (text: string) => string | undefined
}

/** `label <gap> value`: the value per side; a replaced value gets the text highlighter. */
function fieldPropRow(params: FieldPropRowParams): CardRow {
  const { key, node, field, label, rowDiff, severity, link = false, format } = params
  const valueDiff = SecurityRowDiffs.NodeLevel.takeRowDiff(node, field)
  return {
    key,
    diff: rowDiff,
    severity,
    render: (framePosition) => (
      <SecurityRow
        data-precededby={PrecededBy.SEPARATOR_LAYOUT_ROW}
        testId={`security-prop-${key}`}
        framePosition={framePosition}
        diff={rowDiff}
        severity={severity}
        renderSide={(side) => {
          const raw = SecurityRowDiffs.NodeLevel.resolveSideField(node, field, side)
          const text = raw === undefined || !format ? raw : format(raw)
          return (
            <SecurityPropContent
              label={label(side)}
              value={text === undefined ? null : <SecurityPropValue text={text} href={link} highlighterClass={resolveValueHighlighter(valueDiff, side)} />}
            />
          )
        }}
      />
    ),
  }
}

function addFlowRows(
  card: CardRows,
  flow: FlowNode,
  scheme: SecuritySchemeNode,
  presentation: SecurityPresentation,
  displayMode: DisplayMode,
  scopeRows: ScopeRowsOptions,
): void {
  const value = flow.value()
  const severities = takeSecuritySeverities(flow)
  const visibility = presentation.visibility.resolveOAuthFlow(value, displayMode)
  const blockDiff = SecurityRowDiffs.Section.takeHeaderRowDiff(flow)
  const flowKey = `flow-${String(flow.key)}`
  card.add({
    key: flowKey,
    diff: blockDiff,
    severity: severities?.[NodeDiffsSeverityPlacemennt.TitleRow],
    render: (framePosition) => (
      <SecurityRow
        data-precededby={PrecededBy.SEPARATOR_LAYOUT_ROW}
        testId={`security-${flowKey}`}
        framePosition={framePosition}
        diff={blockDiff}
        severity={severities?.[NodeDiffsSeverityPlacemennt.TitleRow]}
        renderSide={() => (
          <SecurityFlowHeaderContent
            prefix={SECURITY_OAUTH_FLOW_HEADER_PREFIX}
            name={value ? presentation.labels.oauthFlowName(value.flowType) : String(flow.key)}
          />
        )}
      />
    ),
  })
  for (const row of SecuritySchemeCardRows.flowProps(visibility)) {
    card.add(fieldPropRow({
      key: `${flowKey}-${row.key}`,
      node: flow,
      field: row.field,
      label: () => row.label,
      rowDiff: SecurityRowDiffs.OAuthFlow.takeFieldRowDiff(flow, row.field),
      severity: severities?.[row.placement],
      link: row.link,
      format: row.format,
    }))
  }
  if (visibility.showScopes) {
    addScopeRows(card, flowKey, SECURITY_PROP_LABELS.scopes, SecurityRowDiffs.OAuthFlow.resolveScopeRows(flow, scheme), blockDiff, severities?.[NodeDiffsSeverityPlacemennt.TitleRow], scopeRows)
  }
}

/** Scope rows of one card: description visibility (annotations, `detailed` only) and the `Scopes ▾` toggle state. */
type ScopeRowsOptions = {
  readonly showDescriptions: boolean
  readonly collapsedScopes: ReadonlySet<string>
  readonly toggleScopes: (key: string) => void
}

/** `Scopes ▾` / `Roles ▾` toggle (expanded by default) and the 2nd-level scope rows under it. */
function addScopeRows(
  card: CardRows,
  key: string,
  label: string,
  scopes: readonly SecurityScopeRow[],
  blockDiff: ChangedPropertyMetaData | undefined,
  /** Severity of the whole block (flow / card): the badge of the `Scopes ▾` toggle row; scope rows carry their own (`SecurityScopeRow.severity`). */
  blockSeverity: NodeDiffsSeverity | undefined,
  { showDescriptions, collapsedScopes, toggleScopes }: ScopeRowsOptions,
): void {
  const expanded = !collapsedScopes.has(key)
  card.add({
    key: `${key}-scopes`,
    diff: blockDiff,
    severity: blockDiff ? blockSeverity : undefined,
    render: (framePosition) => (
      <SecurityRow
        data-precededby={PrecededBy.SEPARATOR_LAYOUT_ROW}
        framePosition={framePosition}
        diff={blockDiff}
        severity={blockDiff ? blockSeverity : undefined}
        renderSide={() => (
          <SecurityScopesToggleContent label={label} expanded={expanded} onToggle={() => toggleScopes(key)} />
        )}
      />
    ),
  })
  if (!expanded) {
    return
  }
  for (const scope of scopes) {
    card.add({
      key: `${key}-scope-${scope.name}`,
      diff: scope.rowDiff,
      severity: scope.severity,
      render: (framePosition) => (
        <SecurityRow
          data-precededby={PrecededBy.SEPARATOR_LAYOUT_ROW}
          testId={`security-scope-${scope.name}`}
          framePosition={framePosition}
          diff={scope.rowDiff}
          severity={scope.severity}
          renderSide={(side) => {
            const sideScope = side === ORIGIN_LAYOUT_SIDE ? scope.origin : scope.changed
            return sideScope
              ? (
                <SecurityScopeContent
                  name={scope.name}
                  description={showDescriptions ? sideScope.description : undefined}
                  required={sideScope.required}
                  descriptionHighlighterClass={resolveValueHighlighter(scope.ownRowDiff, side)}
                  requiredDiff={scope.requiredDiff}
                  layoutSide={side}
                />
              )
              : null
          }}
        />
      ),
    })
  }
}

/** Gray type text in the title row (JSON Schema / DDL type-label look); marked yellow / green / red when the type was replaced / appeared / disappeared. */
type SchemeTypeTextProps = {
  node: SecuritySchemeNode
  presentation: SecurityPresentation
  layoutSide: LayoutSide
}

const SchemeTypeText: FC<SchemeTypeTextProps> = ({ node, presentation, layoutSide }) => {
  const label = presentation.labels.securitySchemeType(SecurityRowDiffs.NodeLevel.resolveSideField(node, 'type', layoutSide))
  if (!label) {
    return <></>
  }
  const highlighter = DiffsClassesBuilder.highlighter(SecurityRowDiffs.Scheme.resolveTypeTextHighlight(node, layoutSide))
  return <span className={cn(`title-row-subheader-value subheader text ${highlighter}`)}>{label}</span>
}
