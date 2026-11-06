import {
  findOpenApiChild,
  getOpenApiChildren,
  isOpenApiParametersNode,
  isOpenApiRequestBodyNode,
} from "@apihub/utils/openapi/node-type-checkers"
import { OpenApiViewSelection } from "@apihub/utils/openapi/view-selection"
import { OpenApiDisplayLabels } from "@netcracker/qubership-apihub-next-data-model/model/openapi/display/labels"
import { OpenApiBlockEdges } from "@netcracker/qubership-apihub-next-data-model/model/openapi/layout"
import { OpenApiNodeVisibility } from "@netcracker/qubership-apihub-next-data-model/model/openapi/node-visibility"
import { OpenApiParameterLocation } from "@netcracker/qubership-apihub-next-data-model/model/openapi/types/node-value"
import { OPENAPI_SECTION_ORDER, OpenApiSectionId, OpenApiSectionIds } from "./config/section-order"
import { StackBlock } from "../shared-components/Layout/StackLayout"
import { isOpenApiSectionExpanded, OpenApiViewState } from "./OpenApiViewStateContext"
import { buildParametersBlock } from "./parameters-blocks"
import { RequestBodyNode, RequestBodyNodeViewer, RequestNode, RequestNodeViewer, RequestTitleRow } from "./RequestNodeViewer"

const PARAMETER_SECTION_LOCATIONS: Readonly<Partial<Record<OpenApiSectionId, OpenApiParameterLocation>>> = {
  [OpenApiSectionIds.PATH_PARAMETERS]: 'path',
  [OpenApiSectionIds.QUERY_PARAMETERS]: 'query',
  [OpenApiSectionIds.HEADER_PARAMETERS]: 'header',
  [OpenApiSectionIds.COOKIE_PARAMETERS]: 'cookie',
}

/** The Request section as a layout block: its h2 title row, then its sub-blocks - elements of one level. */
export function buildRequestBlock(node: RequestNode, view: OpenApiViewState): StackBlock {
  const children: [StackBlock, ...StackBlock[]] = [
    { id: 'title', ...OpenApiBlockEdges.single(OpenApiBlockEdges.sectionTitleRow(node)), payload: () => <RequestTitleRow key="title" node={node} /> },
    ...buildRequestChildBlocks(node, view),
  ]
  return {
    id: 'request',
    ...OpenApiBlockEdges.container(children),
    payload: () => <RequestNodeViewer key="request" blocks={children} />,
  }
}

/** Parameter groups and the Body, in config order. */
function buildRequestChildBlocks(node: RequestNode, view: OpenApiViewState): StackBlock[] {
  const groups = getOpenApiChildren(node, isOpenApiParametersNode)
  const requestBody = findOpenApiChild(node, isOpenApiRequestBodyNode)
  return OPENAPI_SECTION_ORDER.request.flatMap((sectionId): StackBlock[] => {
    const location = PARAMETER_SECTION_LOCATIONS[sectionId]
    if (location) {
      const group = groups.find(candidate => candidate.value()?.location === location)
      return group
        ? [buildParametersBlock(sectionId, {
          node: group,
          title: OpenApiDisplayLabels.parameterGroupTitle(location),
          testId: `openapi-${location}-parameters-section`,
        }, view)]
        : []
    }
    return requestBody ? [buildRequestBodyBlock(sectionId, requestBody, view)] : []
  })
}

function buildRequestBodyBlock(id: string, node: RequestBodyNode, view: OpenApiViewState): StackBlock {
  const description = OpenApiNodeVisibility.showRequestBodyDescription(node.value(), view.displayMode) ? OpenApiBlockEdges.descriptionRow(node) : undefined
  const elements = OpenApiBlockEdges.bodyElements(OpenApiBlockEdges.requestBodyTitleRow(node), description, OpenApiViewSelection.mediaType(node, view.selection), { expanded: isOpenApiSectionExpanded(view, node.id) })
  return {
    id,
    ...OpenApiBlockEdges.body(elements),
    payload: () => <RequestBodyNodeViewer key={id} node={node} elements={elements} />,
  }
}
