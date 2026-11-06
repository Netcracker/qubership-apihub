import { cn } from "@apihub/utils/common/cn"
import { useDisplayMode } from "@apihub/contexts/DisplayModeContext"
import { TextColors } from "../shared-styles/colors/text-colors"
import { LayoutSide } from "@apihub/types/internal/LayoutSide"
import { ArrayUtils } from "@apihub/utils/common/arrays"
import { resolveHttpMethodBadge } from "@apihub/utils/openapi/http-method-badge-config"
import {
  findOpenApiChild,
  isOpenApiExtensionsNode,
  isOpenApiRequestNode,
  isOpenApiResponsesNode,
  isOpenApiSecurityNode,
} from "@apihub/utils/openapi/node-type-checkers"
import { OpenApiSelection } from "@apihub/utils/openapi/view-selection"
import { OpenApiBlockEdges } from "@netcracker/qubership-apihub-next-data-model/model/openapi/layout"
import {
  OpenApiDeprecatedTagRow,
  OpenApiNodeVisibility,
  OpenApiOperationHeaderRow,
  OpenApiOperationRowVisibility,
} from "@netcracker/qubership-apihub-next-data-model/model/openapi/node-visibility"
import { OpenApiRowDiffs } from "@netcracker/qubership-apihub-next-data-model/model/openapi/tree-with-diffs/row-diffs"
import { OpenApiTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/openapi/types/aliases"
import { OpenApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/openapi/types/node-kind"
import { FC, ReactElement, useCallback, useMemo, useState } from "react"
import { AddressRow } from "../shared-components/AddressRow/AddressRow"
import { TagsWithDiffs } from "../shared-components/diffs/TagsWithDiffs"
import { ExternalDocsRow } from "../shared-components/ExternalDocsRow/ExternalDocsRow"
import { MarkdownTextRow } from "../shared-components/MarkdownTextRow/MarkdownTextRow"
import { TextRow } from "../shared-components/TextRow/TextRow"
import { TextValueVariant } from "../shared-components/TextValue/types"
import { TitleRow } from "../shared-components/TitleRow/TitleRow"
import { PrecededBy } from "../shared-components/WithPrecededByProps"
import '../shared-styles/preceded-by.css'
import { OPENAPI_SECTION_ORDER, OpenApiSectionIds } from "./config/section-order"
import { takeOpenApiSeverities } from "./diff-state"
import { buildExtensionsBlock } from "./extensions-blocks"
import { StackBlock, StackLayout } from "../shared-components/Layout/StackLayout"
import { useOpenApiViewerContext } from "./OpenApiViewerContext"
import { OpenApiViewState, OpenApiViewStateContext } from "./OpenApiViewStateContext"
import { buildRequestBlock } from "./request-blocks"
import { buildResponsesBlock } from "./responses-blocks"
import { buildSecurityBlock } from "./security-blocks"


export type OperationNode = OpenApiTreeNode<typeof OpenApiTreeNodeKinds.OPERATION>

type OperationNodeViewerProps = {
  node: OperationNode
  noHeading: boolean
}

/**
 * The operation: the header block (title, operation ID, address, description, external docs), then
 * the sections in config order, planned as one level (separator rows between blocks, the viewer's
 * top / bottom halves when configured). Owns the view state (selections) every level reads.
 * Design: features/operation-viewer.md, features/vertical-gaps.md.
 */
export const OperationNodeViewer: FC<OperationNodeViewerProps> = (props) => {
  const { node, noHeading } = props
  const { spacing } = useOpenApiViewerContext()
  const displayMode = useDisplayMode()
  const visibility = useMemo(() => OpenApiNodeVisibility.resolveOperation(node.value(), noHeading, displayMode), [node, noHeading, displayMode])

  // View state of the whole operation; a rebuilt tree (new source) starts fresh. Reset during render,
  // not in an effect: React re-runs this component before its children render, so the previous
  // tree's selections are never drawn (node ids are path-based and would match the new tree).
  const [selection, setSelection] = useState<OpenApiSelection>(new Map())
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const [stateOwner, setStateOwner] = useState(node)
  if (stateOwner !== node) {
    setStateOwner(node)
    setSelection(new Map())
    setCollapsed(new Set())
  }
  const select = useCallback((ownerNodeId: string, selectedNodeId: string) => {
    setSelection(current => new Map(current).set(ownerNodeId, selectedNodeId))
  }, [])
  const toggleCollapsed = useCallback((sectionNodeId: string) => {
    setCollapsed(current => {
      const next = new Set(current)
      if (!next.delete(sectionNodeId)) {
        next.add(sectionNodeId)
      }
      return next
    })
  }, [])
  const view: OpenApiViewState = useMemo(
    () => ({ selection, select, collapsed, toggleCollapsed, displayMode }),
    [selection, select, collapsed, toggleCollapsed, displayMode],
  )

  const blocks = useMemo(() => buildOperationBlocks(node, visibility, view), [node, visibility, view])

  return (
    <OpenApiViewStateContext.Provider value={view}>
      <div className={cn("flex flex-col")}>
        <StackLayout blocks={blocks} level="operation" outerHalves={spacing.viewerEdges} />
      </div>
    </OpenApiViewStateContext.Provider>
  )
}

function buildOperationBlocks(node: OperationNode, visibility: OpenApiOperationRowVisibility, view: OpenApiViewState): StackBlock[] {
  const security = findOpenApiChild(node, isOpenApiSecurityNode)
  const operationExtensions = findOpenApiChild(node, isOpenApiExtensionsNode, 'extensions')
  const request = findOpenApiChild(node, isOpenApiRequestNode)
  const responses = findOpenApiChild(node, isOpenApiResponsesNode)
  const responsesExtensions = findOpenApiChild(node, isOpenApiExtensionsNode, 'responsesExtensions')

  const sections = OPENAPI_SECTION_ORDER.operation.flatMap((sectionId): StackBlock[] => {
    switch (sectionId) {
      case OpenApiSectionIds.SECURITY:
        return security ? [buildSecurityBlock(security, view)] : []
      case OpenApiSectionIds.OPERATION_EXTENSIONS:
        return operationExtensions
          ? [buildExtensionsBlock(sectionId, { node: operationExtensions, variant: TextValueVariant.h2, testId: 'openapi-extensions-section' })]
          : []
      case OpenApiSectionIds.REQUEST:
        return request ? [buildRequestBlock(request, view)] : []
      case OpenApiSectionIds.RESPONSES:
        return responses ? [buildResponsesBlock(responses, responsesExtensions, view)] : []
      default:
        return []
    }
  })
  const header = buildOperationHeaderBlock(node, visibility)
  return header ? [header, ...sections] : sections
}

/** The header block: one block per visible row, in the data-layer order (`resolveOperationHeaderRows`). */
function buildOperationHeaderBlock(node: OperationNode, visibility: OpenApiOperationRowVisibility): StackBlock | undefined {
  const { deprecatedTagRow } = visibility
  const rows = OpenApiNodeVisibility.resolveOperationHeaderRows(visibility).map((row): StackBlock => ({
    id: row,
    ...OpenApiBlockEdges.single(OpenApiBlockEdges.operationHeaderRow(node, row, deprecatedTagRow)),
    payload: () => <OperationHeaderRow key={row} node={node} row={row} deprecatedTagRow={deprecatedTagRow} />,
  }))
  if (!ArrayUtils.isNonEmptyList(rows)) {
    return undefined
  }
  return {
    id: 'operation-header',
    ...OpenApiBlockEdges.container(rows),
    payload: () => <StackLayout key="operation-header" blocks={rows} level="operationHeader" />,
  }
}

type OperationHeaderRowProps = {
  node: OperationNode
  row: OpenApiOperationHeaderRow
  /** The deprecated tag (and its diff badge) sits on the title row, else the operation ID row, else the address row. */
  deprecatedTagRow: OpenApiDeprecatedTagRow
}

/** One operation header row. */
const OperationHeaderRow: FC<OperationHeaderRowProps> = ({ node, row, deprecatedTagRow }) => {
  const value = node.value()
  const severities = takeOpenApiSeverities(node)
  const deprecatedDiff = OpenApiRowDiffs.Operation.takeDeprecatedTagDiff(node)
  const hasDeprecatedTag = value?.deprecated === true || !!deprecatedDiff
  const renderDeprecatedTag = useCallback((layoutSide: LayoutSide): ReactElement => (
    hasDeprecatedTag
      ? (
        <TagsWithDiffs
          readOnly={false}
          writeOnly={false}
          deprecated={OpenApiRowDiffs.Operation.isDeprecatedOnSide(node, layoutSide)}
          deprecatedDiff={deprecatedDiff}
          layoutSide={layoutSide}
        />
      )
      : <></>
  ), [deprecatedDiff, hasDeprecatedTag, node])
  const diff = OpenApiRowDiffs.Operation.takeHeaderRowDiff(node, row, deprecatedTagRow)

  switch (row) {
    case 'title':
      return (
        <TitleRow
          data-precededby={PrecededBy.SEPARATOR_LAYOUT_ROW}
          value={value?.title ?? ''}
          expandable={false}
          variant={TextValueVariant.h1}
          subheader={renderDeprecatedTag}
          diff={diff}
          diffsSeverities={severities}
        />
      )
    case 'operationId':
      return (
        <TextRow
          data-precededby={PrecededBy.SEPARATOR_LAYOUT_ROW}
          value={value?.operationId ?? ''}
          variant={TextValueVariant.body2}
          textFontWeight="normal"
          textColor={TextColors.SECONDARY}
          trailing={deprecatedTagRow === 'operationId' && hasDeprecatedTag ? renderDeprecatedTag : undefined}
          diff={diff}
          diffsSeverities={severities}
          diffsSeverityPlacement={OpenApiRowDiffs.Operation.resolveHeaderRowSeverityPlacement(row, deprecatedTagRow)}
        />
      )
    case 'address':
      return (
        <AddressRow
          data-precededby={PrecededBy.SEPARATOR_LAYOUT_ROW}
          badge={resolveHttpMethodBadge(value?.method ?? '')}
          address={value?.path ?? ''}
          trailing={deprecatedTagRow === 'address' && hasDeprecatedTag ? renderDeprecatedTag : undefined}
          diff={diff}
          diffsSeverities={severities}
          diffsSeverityPlacement={OpenApiRowDiffs.Operation.resolveHeaderRowSeverityPlacement(row, deprecatedTagRow)}
        />
      )
    case 'description':
      return (
        <MarkdownTextRow
          data-precededby={PrecededBy.SEPARATOR_LAYOUT_ROW}
          value={value?.description ?? ''}
          variant={TextValueVariant.body2}
          diff={diff}
          diffsSeverities={severities}
        />
      )
    case 'externalDocs':
      return (
        <ExternalDocsRow
          data-precededby={PrecededBy.SEPARATOR_LAYOUT_ROW}
          resolveSide={(layoutSide) => OpenApiRowDiffs.Operation.resolveExternalDocsSide(node, layoutSide)}
          diff={diff}
          diffsSeverities={severities}
        />
      )
  }
}
