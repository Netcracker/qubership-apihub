import { OpenApiDisplayLabels } from "@netcracker/qubership-apihub-next-data-model/model/openapi/display/labels"
import {
  findOpenApiChild,
  isOpenApiContentNode,
  isOpenApiExtensionsNode,
  isOpenApiResponseHeadersNode,
} from "@apihub/utils/openapi/node-type-checkers"
import { OpenApiViewSelection } from "@apihub/utils/openapi/view-selection"
import { OpenApiBlockEdges } from "@netcracker/qubership-apihub-next-data-model/model/openapi/layout"
import { OpenApiNodeVisibility } from "@netcracker/qubership-apihub-next-data-model/model/openapi/node-visibility"
import { TextValueVariant } from "../shared-components/TextValue/types"
import { OPENAPI_SECTION_ORDER, OpenApiSectionIds } from "./config/section-order"
import { buildExtensionsBlock } from "./extensions-blocks"
import { StackBlock } from "../shared-components/Layout/StackLayout"
import { isOpenApiSectionExpanded, OpenApiViewState } from "./OpenApiViewStateContext"
import { buildParametersBlock } from "./parameters-blocks"
import { ContentNode, ResponseBodyViewer, ResponseDescriptionRow, ResponseNode } from "./ResponseBodyViewer"


/**
 * The sections of one (the selected) response as layout blocks — description, Headers, Extensions,
 * Body in `OPENAPI_SECTION_ORDER.response` order. They are sibling blocks of the Responses level
 * (next to the Responses Object extensions), so the planner separates them like any other blocks.
 * Block ids carry the response id: switching codes remounts the sections. Design: entities/responses.md.
 */
export function buildResponseBlocks(response: ResponseNode, view: OpenApiViewState): StackBlock[] {
  const headers = findOpenApiChild(response, isOpenApiResponseHeadersNode)
  const extensions = findOpenApiChild(response, isOpenApiExtensionsNode)
  const content = findOpenApiChild(response, isOpenApiContentNode)
  const hasBody = OpenApiViewSelection.mediaTypes(response).length > 0
  const id = (sectionId: string): string => `${response.id}:${sectionId}`

  return OPENAPI_SECTION_ORDER.response.flatMap((sectionId): StackBlock[] => {
    switch (sectionId) {
      case OpenApiSectionIds.RESPONSE_DESCRIPTION:
        return OpenApiNodeVisibility.showResponseDescription(response.value(), view.displayMode)
          ? [{
            id: id(sectionId),
            ...OpenApiBlockEdges.single(OpenApiBlockEdges.descriptionRow(response)),
            payload: () => <ResponseDescriptionRow key={id(sectionId)} node={response} />,
          }]
          : []
      case OpenApiSectionIds.RESPONSE_HEADERS:
        return headers
          ? [buildParametersBlock(id(sectionId), { node: headers, title: OpenApiDisplayLabels.RESPONSE_HEADERS_TITLE, testId: 'openapi-response-headers-section' }, view)]
          : []
      case OpenApiSectionIds.RESPONSE_EXTENSIONS:
        return extensions
          ? [buildExtensionsBlock(id(sectionId), { node: extensions, variant: TextValueVariant.h3, testId: 'openapi-response-extensions-section' }, view)]
          : []
      case OpenApiSectionIds.RESPONSE_BODY:
        return content && hasBody
          ? [buildResponseBodyBlock(id(sectionId), response, content, view)]
          : []
      default:
        return []
    }
  })
}

/** The response Body: its elements are decided here once, for its outer edges and for what it renders. */
function buildResponseBodyBlock(id: string, response: ResponseNode, content: ContentNode, view: OpenApiViewState): StackBlock {
  const elements = OpenApiBlockEdges.bodyElements(OpenApiBlockEdges.responseBodyTitleRow(content), undefined, OpenApiViewSelection.mediaType(response, view.selection), { expanded: isOpenApiSectionExpanded(view, content.id) })
  return {
    id,
    ...OpenApiBlockEdges.body(elements),
    payload: () => <ResponseBodyViewer key={id} node={response} content={content} elements={elements} />,
  }
}
