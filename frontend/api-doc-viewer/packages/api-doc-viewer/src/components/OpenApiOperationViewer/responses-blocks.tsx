import { OpenApiViewSelection } from "@apihub/utils/openapi/view-selection"
import { OpenApiBlockEdges } from "@netcracker/qubership-apihub-next-data-model/model/openapi/layout"
import { OpenApiTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/openapi/types/aliases"
import { OpenApiTreeNodeKinds } from "@netcracker/qubership-apihub-next-data-model/model/openapi/types/node-kind"
import { TextValueVariant } from "../shared-components/TextValue/types"
import { OPENAPI_SECTION_ORDER, OpenApiSectionIds } from "./config/section-order"
import { buildExtensionsBlock } from "./extensions-blocks"
import { StackBlock } from "../shared-components/Layout/StackLayout"
import { OpenApiViewState } from "./OpenApiViewStateContext"
import { buildResponseBlocks } from "./response-blocks"
import { ResponsesNode, ResponsesNodeViewer, ResponsesTitleRow } from "./ResponsesNodeViewer"

type ExtensionsNode = OpenApiTreeNode<typeof OpenApiTreeNodeKinds.EXTENSIONS>

/** The Responses section as a layout block: its h2 title row with the code selector, then its sub-blocks - elements of one level. */
export function buildResponsesBlock(node: ResponsesNode, extensionsNode: ExtensionsNode | undefined, view: OpenApiViewState): StackBlock {
  const sections = OPENAPI_SECTION_ORDER.responses.flatMap((sectionId): StackBlock[] => {
    if (sectionId === OpenApiSectionIds.SELECTED_RESPONSE) {
      const selected = OpenApiViewSelection.response(node, view.selection)
      return selected ? buildResponseBlocks(selected, view) : []
    }
    return extensionsNode
      ? [buildExtensionsBlock(sectionId, { node: extensionsNode, variant: TextValueVariant.h3, testId: 'openapi-responses-extensions-section' }, view)]
      : []
  })
  const children: [StackBlock, ...StackBlock[]] = [
    { id: 'title', ...OpenApiBlockEdges.single(OpenApiBlockEdges.responsesTitleRow(node)), payload: () => <ResponsesTitleRow key="title" node={node} /> },
    ...sections,
  ]
  return {
    id: 'responses',
    ...OpenApiBlockEdges.container(children),
    payload: () => <ResponsesNodeViewer key="responses" blocks={children} />,
  }
}
