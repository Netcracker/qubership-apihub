import { OpenApiViewSelection } from "@apihub/utils/openapi/view-selection"
import { OpenApiBodyElements } from "@netcracker/qubership-apihub-next-data-model/model/openapi/layout"
import { OpenApiRowDiffs } from "@netcracker/qubership-apihub-next-data-model/model/openapi/tree-with-diffs/row-diffs"
import { OpenApiTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/openapi/types/aliases"
import { OpenApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/openapi/types/node-kind"
import { FC } from "react"
import { MarkdownTextRow } from "../shared-components/MarkdownTextRow/MarkdownTextRow"
import { TextValueVariant } from "../shared-components/TextValue/types"
import { PrecededBy } from "../shared-components/WithPrecededByProps"
import { takeOpenApiSeverities } from "./diff-state"
import { MediaTypeContentSection } from "./MediaTypeContentSection"
import { useOpenApiViewState } from "./OpenApiViewStateContext"

export type ResponseNode = OpenApiTreeNode<typeof OpenApiTreeNodeKinds.RESPONSE>
export type ContentNode = OpenApiTreeNode<typeof OpenApiTreeNodeKinds.CONTENT>

type ResponseNodeProps = {
  node: ResponseNode
}

type ResponseBodyViewerProps = ResponseNodeProps & {
  /** The response's `content` node: paints the Body title row and keeps its collapsed state. */
  content: ContentNode
  /** The Body's elements, decided by `response-blocks.tsx` (`OpenApiBlockEdges.bodyElements`). */
  elements: OpenApiBodyElements
}

/** The response Body; its media-type selection is kept per response in the view state. Layout blocks: `response-blocks.tsx`. */
export const ResponseBodyViewer: FC<ResponseBodyViewerProps> = ({ node, content, elements }) => {
  const { selection, select } = useOpenApiViewState()
  return (
    <MediaTypeContentSection
      testId="openapi-response-body-section"
      optionTestIdPrefix="response-media-type"
      mediaTypes={OpenApiViewSelection.mediaTypes(node)}
      selectedId={OpenApiViewSelection.mediaType(node, selection)?.id}
      onSelect={(mediaTypeId) => select(node.id, mediaTypeId)}
      headerDiff={OpenApiRowDiffs.ResponseBody.takeHeaderRowDiff(content)}
      diffsSeverities={takeOpenApiSeverities(content)}
      elements={elements}
      sectionNodeId={content.id}
    />
  )
}

/** The response description row. */
export const ResponseDescriptionRow: FC<ResponseNodeProps> = ({ node }) => (
  <MarkdownTextRow
    data-precededby={PrecededBy.SEPARATOR_LAYOUT_ROW}
    value={node.value()?.description ?? ''}
    variant={TextValueVariant.body2}
    diff={OpenApiRowDiffs.NodeLevel.takeRowDiff(node, 'description')}
    diffsSeverities={takeOpenApiSeverities(node)}
  />
)
