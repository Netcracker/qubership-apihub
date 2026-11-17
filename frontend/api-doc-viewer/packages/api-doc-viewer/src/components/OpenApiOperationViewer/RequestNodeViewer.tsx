import { cn } from "@apihub/utils/common/cn"
import { OpenApiDisplayLabels } from "@netcracker/qubership-apihub-next-data-model/model/openapi/display/labels"
import { OpenApiViewSelection } from "@apihub/utils/openapi/view-selection"
import { OpenApiBodyElements } from "@netcracker/qubership-apihub-next-data-model/model/openapi/layout"
import { OpenApiRowDiffs } from "@netcracker/qubership-apihub-next-data-model/model/openapi/tree-with-diffs/row-diffs"
import { OpenApiTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/openapi/types/aliases"
import { OpenApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/openapi/types/node-kind"
import { FC } from "react"
import { MarkdownTextRow } from "../shared-components/MarkdownTextRow/MarkdownTextRow"
import { TextValueVariant } from "../shared-components/TextValue/types"
import { TitleRow } from "../shared-components/TitleRow/TitleRow"
import { PrecededBy } from "../shared-components/WithPrecededByProps"
import { takeOpenApiSeverities } from "./diff-state"
import { MediaTypeContentSection } from "./MediaTypeContentSection"
import { StackBlock, StackLayout } from "../shared-components/Layout/StackLayout"
import { useOpenApiViewState } from "./OpenApiViewStateContext"


export type RequestNode = OpenApiTreeNode<typeof OpenApiTreeNodeKinds.REQUEST>
export type RequestBodyNode = OpenApiTreeNode<typeof OpenApiTreeNodeKinds.REQUEST_BODY>

type RequestNodeViewerProps = {
  /** Its elements (title row, sub-blocks), built by `buildRequestBlock` (the parent needs them for the Request's own edges). */
  blocks: readonly StackBlock[]
}

/**
 * "Request" (h2): parameter groups and the Body in config order. Layout block: `request-blocks.tsx`.
 * Design: entities/parameters.md, entities/request-body.md.
 */
export const RequestNodeViewer: FC<RequestNodeViewerProps> = ({ blocks }) => (
  <div data-testid="openapi-request-section" className={cn("flex flex-col")}>
    <StackLayout blocks={blocks} level="request" />
  </div>
)

type RequestTitleRowProps = {
  node: RequestNode
}

export const RequestTitleRow: FC<RequestTitleRowProps> = ({ node }) => (
  <TitleRow
    data-precededby={PrecededBy.SEPARATOR_LAYOUT_ROW}
    value={OpenApiDisplayLabels.REQUEST_TITLE}
    expandable={false}
    variant={TextValueVariant.h2}
    diff={OpenApiRowDiffs.Section.takeHeaderRowDiff(node)}
    diffsSeverities={takeOpenApiSeverities(node)}
  />
)

type RequestBodyNodeViewerProps = {
  node: RequestBodyNode
  /** The Body's elements, decided by `buildRequestBodyBlock` (`OpenApiBlockEdges.bodyElements`). */
  elements: OpenApiBodyElements
}

export const RequestBodyNodeViewer: FC<RequestBodyNodeViewerProps> = ({ node, elements }) => {
  const value = node.value()
  const severities = takeOpenApiSeverities(node)
  const { selection, select } = useOpenApiViewState()

  return (
    <MediaTypeContentSection
      testId="openapi-request-body-section"
      optionTestIdPrefix="request-media-type"
      mediaTypes={OpenApiViewSelection.mediaTypes(node)}
      selectedId={OpenApiViewSelection.mediaType(node, selection)?.id}
      onSelect={(mediaTypeId) => select(node.id, mediaTypeId)}
      headerDiff={OpenApiRowDiffs.RequestBody.takeHeaderRowDiff(node)}
      diffsSeverities={severities}
      isRequiredOnSide={(side) => OpenApiRowDiffs.RequestBody.isRequiredStarVisibleOnSide(node, side)}
      requiredTagDiff={OpenApiRowDiffs.RequestBody.takeRequiredTagDiff(node)}
      elements={elements}
      sectionNodeId={node.id}
      renderDescription={() => (
        <MarkdownTextRow
          data-precededby={PrecededBy.SEPARATOR_LAYOUT_ROW}
          value={value?.description ?? ''}
          variant={TextValueVariant.body2}
          diff={OpenApiRowDiffs.NodeLevel.takeRowDiff(node, 'description')}
          diffsSeverities={severities}
        />
      )}
    />
  )
}
